/**
 * Generates the static SEO surface for the (client-rendered) site:
 *   - sitemap.xml
 *   - services/index.html                    (indexable "Services" page)
 *   - privacy/ offer/ terms/ cookies/        (legal pages, content in scripts/legal-content.mjs)
 *   - services/<slug>/index.html             (one indexable page per service,
 *                                             unique <title>/description/canonical
 *                                             + Service & BreadcrumbList JSON-LD)
 *
 * Data comes from Supabase (published services) when reachable, otherwise from
 * the catalogue embedded in index.html.
 *
 *   npm run build:seo
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LEGAL_DOCS, LEGAL_UI, LEGAL_UPDATED } from './legal-content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://wavesign.art';
const LANGS = ['ru', 'uk', 'en'];
const TODAY = new Date().toISOString().slice(0, 10);

const html = readFileSync(join(root, 'index.html'), 'utf8');

/* ---------- read runtime config from public-config.js ---------- */
function readProdConfig() {
  try {
    const cfg = readFileSync(join(root, 'public-config.js'), 'utf8');
    const block = cfg.slice(cfg.indexOf('var PROD'));
    const url = block.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
    const key = block.match(/supabaseAnonKey:\s*'([^']+)'/)?.[1];
    if (url && key && !/^PROD_SUPABASE/.test(url)) return { url, key };
  } catch {}
  return null;
}

/* ---------- fallback: pull the literals out of index.html ---------- */
function extractLiteral(name) {
  let start = html.indexOf(`const ${name} =`);
  if (start === -1) start = html.indexOf(`let ${name} =`);
  if (start === -1) throw new Error(`literal ${name} not found`);
  let i = html.indexOf('=', start) + 1;
  while (' \n\r\t'.includes(html[i])) i++;
  const opener = html[i];
  const closer = opener === '[' ? ']' : '}';
  let depth = 0,
    end = -1,
    inStr = null;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (ch === '\\') { j++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === opener) depth++;
    else if (ch === closer && --depth === 0) { end = j; break; }
  }
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${html.slice(i, end + 1)});`)();
}

function fromEmbedded() {
  const cats = extractLiteral('SERVICE_CATEGORIES');
  const catalog = extractLiteral('SERVICES_CATALOG');
  const desc = extractLiteral('SERVICE_DETAIL_DESCRIPTIONS');
  return catalog.map((s) => ({
    slug: s.id,
    title: s.name,
    short: desc[s.id] || {},
    description: desc[s.id] || {},
    seo_title: {},
    seo_description: {},
    category: cats.find((c) => c.id === s.categoryId)?.name || {},
    price: s.price || {},
    image: null,
    sort: catalog.indexOf(s),
  }));
}

async function fromSupabase(cfg) {
  const h = { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` };
  const q = (p) => fetch(`${cfg.url}/rest/v1/${p}`, { headers: h }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const [cats, svcs] = await Promise.all([
    q('categories?select=id,slug,name&is_published=eq.true'),
    q('services?select=slug,title,short_description,description,seo_title,seo_description,price_amount,price_currency,price_type,price_unit,main_image_url,sort_order,category_id&is_published=eq.true&order=sort_order'),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));
  return svcs.map((s) => ({
    slug: s.slug,
    title: s.title || {},
    short: s.short_description || {},
    description: s.description || {},
    seo_title: s.seo_title || {},
    seo_description: s.seo_description || {},
    category: (s.category_id && catById.get(s.category_id)?.name) || {},
    price: { amount: s.price_amount, currency: s.price_currency, type: s.price_type, unit: s.price_unit },
    image: s.main_image_url || null,
    sort: s.sort_order,
  }));
}

/* ---------- helpers ---------- */
const pick = (o, l) => (o && (o[l] || o.ru || o.uk || o.en)) || '';
const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const xmlEsc = (s) => String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c]));

function seoBlock({ title, description, canonical, image, type, breadcrumbLd, serviceLd }) {
  const img = image || `${ORIGIN}/og-cover.png`;
  const alt = [`<link rel="alternate" hreflang="x-default" href="${canonical}">`]
    .concat(LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${canonical}?lang=${l}">`))
    .join('\n');
  return `<!-- SEO:start (generated by scripts/build-seo.mjs) -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="WaveSign Studio">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#150E20">
<meta name="format-detection" content="telephone=no">
<meta name="application-name" content="WaveSign Studio">
<link rel="canonical" href="${canonical}">
${alt}
<link rel="icon" type="image/png" href="/new_logo.png">
<link rel="apple-touch-icon" href="/new_logo.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="WaveSign Studio">
<meta property="og:locale" content="ru_RU">
<meta property="og:locale:alternate" content="uk_UA">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
${serviceLd ? `<script type="application/ld+json" id="${serviceLd['@type'] === 'ItemList' ? 'seo-itemlist' : 'seo-service'}">\n${JSON.stringify(serviceLd)}\n</script>` : ''}
${breadcrumbLd ? `<script type="application/ld+json" id="seo-breadcrumb">\n${JSON.stringify(breadcrumbLd)}\n</script>` : ''}
<!-- SEO:end -->`;
}

function makePage(replacementSeo) {
  let out = html.replace(/<!-- SEO:start[\s\S]*?<!-- SEO:end -->/, replacementSeo);
  // page lives at /services/<slug>/ or /services/ — resolve root-relative assets
  out = out.replace('<meta name="viewport"', '<base href="/">\n<meta name="viewport"');
  return out;
}

/* ---------- run ---------- */
const forceEmbedded = process.argv.includes('--embedded');
const cfg = forceEmbedded ? null : readProdConfig();
let services;
try {
  services = cfg ? await fromSupabase(cfg) : fromEmbedded();
  console.log(`SEO source: ${cfg ? 'Supabase' : 'embedded catalogue'} — ${services.length} services`);
} catch (e) {
  console.warn('Supabase unreachable, using embedded catalogue —', e);
  services = fromEmbedded();
}
services.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

/* wipe old generated service pages */
const servicesDir = join(root, 'services');
if (existsSync(servicesDir)) {
  for (const d of readdirSync(servicesDir)) rmSync(join(servicesDir, d), { recursive: true, force: true });
}
mkdirSync(servicesDir, { recursive: true });

/* /services/ hub */
const hubTitle = 'Услуги студии — WaveSign Studio';
const hubDesc =
  'Все услуги WaveSign: логотип и фирменный стиль, анимация лого, графический дизайн, макеты под печать, сайты под ключ, Telegram-боты, ИИ-агенты, Web3 и смарт-контракты, аудит безопасности.';
writeFileSync(
  join(servicesDir, 'index.html'),
  makePage(
    seoBlock({
      title: hubTitle,
      description: hubDesc,
      canonical: `${ORIGIN}/services/`,
      type: 'website',
      breadcrumbLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'WaveSign', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Услуги', item: `${ORIGIN}/services/` },
        ],
      },
      serviceLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Услуги WaveSign',
        itemListElement: services.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: pick(s.title, 'ru'),
          url: `${ORIGIN}/services/${s.slug}/`,
        })),
      },
    }),
  ),
  'utf8',
);

/* one page per service */
for (const s of services) {
  const name = pick(s.title, 'ru') || s.slug;
  const title = pick(s.seo_title, 'ru') || `${name} — WaveSign Studio`;
  const description =
    pick(s.seo_description, 'ru') ||
    stripTags(pick(s.short, 'ru') || pick(s.description, 'ru')).slice(0, 200) ||
    hubDesc;
  const canonical = `${ORIGIN}/services/${s.slug}/`;
  const image = s.image ? new URL(s.image, ORIGIN + '/').href : `${ORIGIN}/og-cover.png`;
  const rawAmount = s.price?.amount ?? s.price?.from ?? null;
  const offers =
    s.price?.type === 'on_request' || rawAmount == null
      ? undefined
      : {
          '@type': 'Offer',
          price: String(rawAmount),
          priceCurrency: s.price?.currency || 'USD',
          availability: 'https://schema.org/InStock',
          url: canonical,
        };

  const seo = seoBlock({
    title,
    description,
    canonical,
    image,
    type: 'article',
    serviceLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name,
      serviceType: name,
      description,
      url: canonical,
      image,
      provider: { '@type': 'Organization', name: 'WaveSign Studio', url: `${ORIGIN}/` },
      areaServed: ['RU', 'UA', 'KZ', 'BY', 'PL', 'DE', 'GB', 'US'],
      ...(pick(s.category, 'ru') ? { category: pick(s.category, 'ru') } : {}),
      ...(offers ? { offers } : {}),
    },
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'WaveSign', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Услуги', item: `${ORIGIN}/services/` },
        { '@type': 'ListItem', position: 3, name, item: canonical },
      ],
    },
  });

  mkdirSync(join(servicesDir, s.slug), { recursive: true });
  writeFileSync(join(servicesDir, s.slug, 'index.html'), makePage(seo), 'utf8');
}


/* ---------- legal pages: /privacy/ /offer/ /terms/ /cookies/ ---------- */
const LANG_LABEL = { ru: 'RU', uk: 'UA', en: 'EN' };
const para = (s) => `<p>${s}</p>`;

function renderSections(sections) {
  return sections
    .map(([heading, ...body]) => {
      let out = `<h2>${esc(heading)}</h2>`;
      let list = [];
      const flush = () => {
        if (list.length) out += `<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
        list = [];
      };
      for (const line of body) {
        if (line.startsWith('- ')) list.push(line.slice(2));
        else { flush(); out += para(line); }
      }
      flush();
      return `<section>${out}</section>`;
    })
    .join('\n');
}

function legalPage(doc) {
  const canonical = `${ORIGIN}/${doc.slug}/`;
  const seo = seoBlock({
    title: `${doc.title.ru} — WaveSign Studio`,
    description: doc.desc.ru,
    canonical,
    type: 'article',
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'WaveSign', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: doc.title.ru, item: canonical },
      ],
    },
  });
  const titles = JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, `${doc.title[l]} — WaveSign Studio`])));
  const body = LANGS.map(
    (l) => `<article class="doc" lang="${l}" data-lang="${l}"${l === 'ru' ? '' : ' hidden'}>
<h1>${esc(doc.title[l])}</h1>
<p class="meta">${esc(LEGAL_UI.updated[l])}: ${LEGAL_UPDATED}</p>
${renderSections(doc.sections[l])}
</article>`,
  ).join('\n');
  const nav = (l) =>
    LEGAL_DOCS.map(
      (d) => `<a href="/${d.slug}/"${d.slug === doc.slug ? ' aria-current="page"' : ''}>${esc(d.title[l])}</a>`,
    ).join('');
  const navs = LANGS.map(
    (l) => `<nav class="docs" aria-label="${esc(LEGAL_UI.docs[l])}" lang="${l}" data-lang="${l}"${l === 'ru' ? '' : ' hidden'}>${nav(l)}</nav>`,
  ).join('\n');
  const home = LANGS.map(
    (l) => `<a class="home" href="/" lang="${l}" data-lang="${l}"${l === 'ru' ? '' : ' hidden'}>&larr; ${esc(LEGAL_UI.home[l])}</a>`,
  ).join('');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${seo}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Pixelify+Sans:wght@400..700&family=Unbounded:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--text:#FBE8FF;--muted:rgba(251,232,255,.72);--bg:#150E20;--accent:#EE99FF;--line:rgba(251,232,255,.12)}
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:linear-gradient(180deg,#09060e 0%,#160c2a 45%,#2b1a52 100%),var(--bg);background-attachment:fixed;color:var(--text);font-family:"Nunito",system-ui,sans-serif;font-weight:600;line-height:1.65}
a{color:var(--accent);text-underline-offset:3px}
.wrap{width:min(860px,100%);margin:0 auto;padding:0 24px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;height:88px}
.brand{display:inline-flex;align-items:center;gap:12px;text-decoration:none}
.brand img{width:38px;height:38px}
.brand span{font-family:"Pixelify Sans",monospace;font-size:30px;line-height:1;color:#c061ff}
.langs{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:rgba(251,232,255,.06)}
.langs button{border:0;border-radius:999px;padding:6px 12px;background:transparent;color:var(--muted);font:800 13px "Nunito",sans-serif;cursor:pointer}
.langs button[aria-pressed="true"]{background:rgba(251,232,255,.16);color:var(--text)}
.home{display:inline-block;margin:8px 0 28px;font-weight:800;text-decoration:none}
h1{font-family:"Unbounded","Nunito",sans-serif;font-size:clamp(28px,5vw,44px);line-height:1.1;font-weight:700;margin-bottom:10px}
.meta{color:var(--muted);font-size:14px;margin-bottom:36px}
h2{font-size:20px;font-weight:800;margin:34px 0 10px;color:var(--text)}
p,li{color:var(--muted);font-size:16px}
p+p,ul+p,p+ul{margin-top:10px}
ul{padding-left:22px}
li+li{margin-top:6px}
b{color:var(--text)}
.docs{display:flex;flex-wrap:wrap;gap:8px 22px;margin:56px 0 0;padding-top:24px;border-top:1px solid var(--line);font-size:14px}
.docs a{text-decoration:none;color:var(--muted)}
.docs a:hover,.docs a[aria-current]{color:var(--accent)}
footer{padding:20px 0 48px;color:rgba(251,232,255,.5);font-size:13px}
[hidden]{display:none!important}
</style>
</head>
<body>
<div class="wrap">
<header>
<a class="brand" href="/" aria-label="WaveSign"><img src="/new_logo.png" alt=""><span>WaveSign</span></a>
<div class="langs" role="group" aria-label="Language">${LANGS.map((l) => `<button type="button" data-set-lang="${l}" aria-pressed="${l === 'ru'}">${LANG_LABEL[l]}</button>`).join('')}</div>
</header>
<main>
${home}
${body}
${navs}
</main>
<footer data-rights>© 2026 WaveSign Studio. Все права защищены.</footer>
</div>
<script>
(function () {
  var KEY = 'wavesign-lang', LANGS = ['ru', 'uk', 'en'], TITLES = ${titles}, RIGHTS = { ru: 'Все права защищены.', uk: 'Всі права захищені.', en: 'All rights reserved.' };
  function norm(c) {
    c = String(c || '').toLowerCase().split(/[-_]/)[0];
    return c === 'ua' ? 'uk' : LANGS.indexOf(c) > -1 ? c : null;
  }
  function stored() {
    try { var v = norm(localStorage.getItem(KEY)); if (v) return v; } catch (e) {}
    var m = document.cookie.match(/(?:^|; )wavesign-lang=([^;]*)/);
    return m ? norm(decodeURIComponent(m[1])) : null;
  }
  function apply(lang) {
    document.documentElement.lang = lang;
    document.title = TITLES[lang];
    var r = document.querySelector('[data-rights]');
    if (r) r.textContent = '© ' + new Date().getFullYear() + ' WaveSign Studio. ' + RIGHTS[lang];
    [].forEach.call(document.querySelectorAll('[data-lang]'), function (n) { n.hidden = n.getAttribute('data-lang') !== lang; });
    [].forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang)); });
  }
  function save(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.cookie = KEY + '=' + encodeURIComponent(lang) + ';max-age=31536000;path=/;samesite=lax';
  }
  var q = norm(new URLSearchParams(location.search).get('lang'));
  apply(q || stored() || norm(navigator.language) || 'ru');
  [].forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
    b.addEventListener('click', function () { var l = b.getAttribute('data-set-lang'); save(l); apply(l); });
  });
})();
</script>
</body>
</html>
`;
}

for (const doc of LEGAL_DOCS) {
  mkdirSync(join(root, doc.slug), { recursive: true });
  writeFileSync(join(root, doc.slug, 'index.html'), legalPage(doc), 'utf8');
}

/* sitemap.xml */
const urls = [];
const addUrl = (loc, priority, changefreq) => {
  urls.push(
    `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${TODAY}</lastmod>\n` +
      `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n` +
      LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEsc(loc)}?lang=${l}"/>`,
      ).join('\n') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(loc)}"/>\n  </url>`,
  );
};
addUrl(`${ORIGIN}/`, '1.0', 'weekly');
addUrl(`${ORIGIN}/services/`, '0.9', 'weekly');
for (const s of services) addUrl(`${ORIGIN}/services/${s.slug}/`, '0.8', 'monthly');
for (const d of LEGAL_DOCS) addUrl(`${ORIGIN}/${d.slug}/`, '0.3', 'yearly');

writeFileSync(
  join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join('\n') +
    `\n</urlset>\n`,
  'utf8',
);

console.log(`wrote sitemap.xml (${urls.length} urls), services/index.html, ${services.length} service pages, ${LEGAL_DOCS.length} legal pages`);

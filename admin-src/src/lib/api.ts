import { supabase } from './supabase';
import type { Category, Service, ServiceImage, ServiceWithRelations } from './types';
import type { CategoryFormValues, ServiceFormValues } from './schemas';
import { removeUploadedImage } from './image';

const SERVICE_SELECT =
  '*, category:categories(*), images:service_images(*)';

export interface ServiceFilters {
  search?: string;
  status?: 'all' | 'published' | 'hidden';
  categoryId?: string | 'all';
  sort?: ServiceSort;
}

export type ServiceSort =
  | 'order'
  | 'updated_desc'
  | 'created_desc'
  | 'title_asc'
  | 'price_asc'
  | 'price_desc';

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // confirm this account is actually an administrator
  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (adminErr) throw adminErr;
  if (!adminRow) {
    await supabase.auth.signOut();
    throw new Error('Этот аккаунт не имеет прав администратора.');
  }
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
export async function listCategories(includeHidden = true): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('sort_order').order('created_at');
  if (!includeHidden) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(values: CategoryFormValues): Promise<Category> {
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true });
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: values.name,
      slug: values.slug,
      is_published: values.is_published,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  id: string,
  values: Partial<CategoryFormValues>,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(values)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function setCategoryPublished(id: string, isPublished: boolean) {
  const { error } = await supabase
    .from('categories')
    .update({ is_published: isPublished })
    .eq('id', id);
  if (error) throw error;
}

export async function countServicesInCategory(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteCategory(id: string) {
  const used = await countServicesInCategory(id);
  if (used > 0) {
    throw new Error(
      `В категории ${used} ${plural(used, ['услуга', 'услуги', 'услуг'])}. Перенесите их в другую категорию перед удалением.`,
    );
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCategories(ids: string[]) {
  const { error } = await supabase.rpc('reorder_categories', { p_ids: ids });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------
export async function listServices(filters: ServiceFilters = {}): Promise<ServiceWithRelations[]> {
  let query = supabase.from('services').select(SERVICE_SELECT);

  if (filters.status === 'published') query = query.eq('is_published', true);
  if (filters.status === 'hidden') query = query.eq('is_published', false);
  if (filters.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `title->>ru.ilike.${term},title->>uk.ilike.${term},title->>en.ilike.${term},slug.ilike.${term}`,
    );
  }

  switch (filters.sort ?? 'order') {
    case 'updated_desc':
      query = query.order('updated_at', { ascending: false });
      break;
    case 'created_desc':
      query = query.order('created_at', { ascending: false });
      break;
    case 'title_asc':
      query = query.order('title->>ru', { ascending: true });
      break;
    case 'price_asc':
      query = query.order('price_amount', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('price_amount', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('sort_order').order('created_at');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as ServiceWithRelations[]).map(sortImages);
}

export async function getService(id: string): Promise<ServiceWithRelations | null> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? sortImages(data as ServiceWithRelations) : null;
}

export async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  let query = supabase.from('services').select('id').eq('slug', slug);
  if (exceptId) query = query.neq('id', exceptId);
  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return Boolean(data);
}

function toServiceRow(values: ServiceFormValues) {
  return {
    title: values.title,
    slug: values.slug,
    short_description: values.short_description,
    description: values.description,
    price_type: values.price_type,
    price_amount: values.price_type === 'on_request' ? null : values.price_amount,
    price_currency: values.price_currency,
    price_unit: values.price_unit,
    main_image_url: values.main_image_url,
    is_published: values.is_published,
    sort_order: values.sort_order,
    sub_group: values.sub_group,
    category_id: values.category_id,
    seo_title: values.seo_title,
    seo_description: values.seo_description,
    og_image_url: values.og_image_url,
  };
}

async function syncGallery(serviceId: string, gallery: ServiceFormValues['gallery']) {
  const { data: existing, error } = await supabase
    .from('service_images')
    .select('*')
    .eq('service_id', serviceId);
  if (error) throw error;

  const desiredUrls = new Set(gallery.map((g) => g.image_url));
  const existingByUrl = new Map((existing as ServiceImage[]).map((r) => [r.image_url, r]));

  const toDelete = (existing as ServiceImage[]).filter((r) => !desiredUrls.has(r.image_url));
  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from('service_images')
      .delete()
      .in(
        'id',
        toDelete.map((r) => r.id),
      );
    if (delErr) throw delErr;
    await Promise.allSettled(toDelete.map((r) => removeUploadedImage(r.image_url)));
  }

  const toInsert = gallery
    .map((g, index) => ({ ...g, sort_order: index }))
    .filter((g) => !existingByUrl.has(g.image_url))
    .map((g) => ({ service_id: serviceId, image_url: g.image_url, sort_order: g.sort_order }));
  if (toInsert.length) {
    const { error: insErr } = await supabase.from('service_images').insert(toInsert);
    if (insErr) throw insErr;
  }

  // refresh sort order for the images that already existed
  await Promise.all(
    gallery.map((g, index) => {
      const row = existingByUrl.get(g.image_url);
      if (!row || row.sort_order === index) return Promise.resolve();
      return supabase.from('service_images').update({ sort_order: index }).eq('id', row.id);
    }),
  );
}

export async function createService(values: ServiceFormValues): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert(toServiceRow(values))
    .select()
    .single();
  if (error) throw error;
  const service = data as Service;
  await syncGallery(service.id, values.gallery);
  return service;
}

export async function updateService(id: string, values: ServiceFormValues): Promise<Service> {
  const prev = await getService(id);
  const { data, error } = await supabase
    .from('services')
    .update(toServiceRow(values))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await syncGallery(id, values.gallery);

  // clean up a replaced main image that we own and no longer reference anywhere
  if (
    prev?.main_image_url &&
    prev.main_image_url !== values.main_image_url &&
    !values.gallery.some((g) => g.image_url === prev.main_image_url)
  ) {
    await removeUploadedImage(prev.main_image_url).catch(() => undefined);
  }
  return data as Service;
}

export async function setServicePublished(id: string, isPublished: boolean) {
  const { error } = await supabase
    .from('services')
    .update({ is_published: isPublished })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const svc = await getService(id);
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
  if (svc) {
    const urls = [svc.main_image_url, ...svc.images.map((i) => i.image_url)].filter(
      Boolean,
    ) as string[];
    await Promise.allSettled(urls.map((u) => removeUploadedImage(u)));
  }
}

export async function reorderServices(ids: string[]) {
  const { error } = await supabase.rpc('reorder_services', { p_ids: ids });
  if (error) throw error;
}

export async function duplicateService(id: string): Promise<Service> {
  const src = await getService(id);
  if (!src) throw new Error('Услуга не найдена');

  const base = src.slug.replace(/-copy(-\d+)?$/, '');
  let slug = `${base}-copy`;
  let n = 2;
  while (await slugExists(slug)) slug = `${base}-copy-${n++}`;

  const { data, error } = await supabase
    .from('services')
    .insert({
      title: addSuffix(src.title, ' (копия)'),
      slug,
      short_description: src.short_description,
      description: src.description,
      price_type: src.price_type,
      price_amount: src.price_amount,
      price_currency: src.price_currency,
      price_unit: src.price_unit,
      main_image_url: src.main_image_url,
      seo_title: src.seo_title,
      seo_description: src.seo_description,
      og_image_url: src.og_image_url,
      is_published: false,
      sort_order: src.sort_order + 1,
      sub_group: src.sub_group,
      category_id: src.category_id,
    })
    .select()
    .single();
  if (error) throw error;

  const clone = data as Service;
  if (src.images.length) {
    const { error: imgErr } = await supabase.from('service_images').insert(
      src.images.map((img, index) => ({
        service_id: clone.id,
        image_url: img.image_url,
        sort_order: index,
      })),
    );
    if (imgErr) throw imgErr;
  }
  return clone;
}

// ---------------------------------------------------------------------------
// dashboard
// ---------------------------------------------------------------------------
export interface DashboardStats {
  total: number;
  published: number;
  hidden: number;
  categories: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [total, published, categories] = await Promise.all([
    supabase.from('services').select('id', { count: 'exact', head: true }),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);
  if (total.error) throw total.error;
  if (published.error) throw published.error;
  if (categories.error) throw categories.error;
  const totalCount = total.count ?? 0;
  const publishedCount = published.count ?? 0;
  return {
    total: totalCount,
    published: publishedCount,
    hidden: totalCount - publishedCount,
    categories: categories.count ?? 0,
  };
}

export async function getRecentServices(limit = 6): Promise<ServiceWithRelations[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_SELECT)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ServiceWithRelations[]).map(sortImages);
}

// ---------------------------------------------------------------------------
// drafts (server-side autosave for existing services)
// ---------------------------------------------------------------------------
export async function getDraft(serviceId: string): Promise<{ data: unknown; updated_at: string } | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('service_drafts')
    .select('data, updated_at')
    .eq('user_id', uid)
    .eq('service_id', serviceId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveDraft(serviceId: string, data: unknown) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase
    .from('service_drafts')
    .upsert({ user_id: uid, service_id: serviceId, data }, { onConflict: 'user_id,service_id' });
}

export async function deleteDraft(serviceId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase.from('service_drafts').delete().eq('user_id', uid).eq('service_id', serviceId);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sortImages(s: ServiceWithRelations): ServiceWithRelations {
  return { ...s, images: [...(s.images ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}

function addSuffix(text: Record<string, string | undefined>, suffix: string) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(text)) if (v) out[k] = v + suffix;
  return out;
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

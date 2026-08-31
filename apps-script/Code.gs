/**
 * WaveSign — приём заявок с сайта и отправка их в Telegram.
 *
 * Разворачивается как Google Apps Script Web App:
 *   Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Полученный URL вида https://script.google.com/macros/s/AKfyc.../exec
 * нужно вставить в index.html в константу ORDER_ENDPOINT.
 *
 * Токен бота и chat id храним в Script Properties (Project Settings →
 * Script Properties), чтобы они не лежали в коде:
 *   BOT_TOKEN = 1234567890:AA...   (от @BotFather)
 *   CHAT_ID   = 123456789          (свой id можно узнать у @userinfobot)
 * CHAT_ID может содержать несколько получателей через запятую.
 * Необязательно: FORM_SECRET — если задан, тот же ключ должен слать сайт.
 */

var PROPS = PropertiesService.getScriptProperties();

function doPost(e) {
  try {
    var data = parseBody_(e);

    var secret = PROPS.getProperty('FORM_SECRET');
    if (secret && data.secret !== secret) {
      return json_({ ok: false, error: 'forbidden' });
    }

    // Ловушка для ботов: скрытое поле, которое человек не заполняет.
    if (data.company) {
      return json_({ ok: true });
    }

    var text = buildMessage_(data);
    var results = sendToTelegram_(text);

    var failed = results.filter(function (r) { return !r.ok; });
    if (failed.length) {
      return json_({ ok: false, error: failed[0].description || 'telegram error' });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'wavesign order form' });
}

/** Разбирает тело запроса: JSON, form-urlencoded или multipart. */
function parseBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    var type = e.postData.type || '';
    if (type.indexOf('json') !== -1 || raw.charAt(0) === '{') {
      try { return JSON.parse(raw); } catch (err) { /* падаем в parameter */ }
    }
  }
  var out = {};
  var params = (e.parameter || {});
  for (var key in params) out[key] = params[key];
  return out;
}

function buildMessage_(data) {
  var lines = [
    '<b>🆕 Новая заявка с сайта</b>',
    '',
    '<b>Услуга:</b> ' + esc_(data.service),
    '<b>Идея:</b> ' + esc_(data.idea),
    '<b>Бюджет:</b> ' + esc_(data.budget),
    '<b>Контакты:</b> ' + esc_(data.contact)
  ];

  var meta = [];
  if (data.lang) meta.push('язык: ' + esc_(data.lang));
  if (data.page) meta.push('страница: ' + esc_(data.page));
  meta.push('время: ' + Utilities.formatDate(new Date(), 'Europe/Kyiv', 'dd.MM.yyyy HH:mm'));
  lines.push('', '<i>' + meta.join(' · ') + '</i>');

  return lines.join('\n');
}

function sendToTelegram_(text) {
  var token = PROPS.getProperty('BOT_TOKEN');
  var chats = String(PROPS.getProperty('CHAT_ID') || '').split(',');

  if (!token || !chats[0]) {
    throw new Error('BOT_TOKEN или CHAT_ID не заданы в Script Properties');
  }

  return chats.map(function (chatId) {
    chatId = chatId.trim();
    if (!chatId) return { ok: true };
    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });
    try {
      return JSON.parse(response.getContentText());
    } catch (err) {
      return { ok: false, description: response.getContentText() };
    }
  });
}

function esc_(value) {
  var str = String(value == null ? '' : value).trim();
  if (!str) return '—';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Разовая проверка: запустить из редактора — в чат придёт тестовая заявка. */
function testSend() {
  var results = sendToTelegram_(buildMessage_({
    service: 'логотип',
    idea: 'тестовая заявка из Apps Script',
    budget: '500$',
    contact: '@wavesign',
    lang: 'ru',
    page: 'test'
  }));
  Logger.log(JSON.stringify(results));
}

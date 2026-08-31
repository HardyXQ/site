# Заявки с сайта → Telegram (Google Apps Script)

Форма заказа на сайте отправляет данные POST-запросом в веб-приложение Google
Apps Script, а оно пересылает их ботом в ваш Telegram. Токен бота остаётся на
стороне Google и в коде сайта не светится.

## 1. Создать бота

1. Написать [@BotFather](https://t.me/BotFather) → `/newbot` → получить токен вида
   `1234567890:AAH...`.
2. Открыть чат со своим ботом и нажать **Start** (без этого бот не сможет вам писать).
3. Узнать свой chat id: написать [@userinfobot](https://t.me/userinfobot) — он пришлёт
   число, например `123456789`.
   Если заявки должны падать в группу — добавьте бота в группу, отправьте туда любое
   сообщение и откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates`, там будет
   `"chat":{"id":-100...}` (id группы отрицательный).

## 2. Развернуть скрипт

1. Открыть [script.google.com](https://script.google.com) → **New project**.
2. Содержимое `Code.gs` из этой папки скопировать в редактор (заменив весь код по умолчанию).
3. **Project Settings** (шестерёнка) → **Script Properties** → **Add script property**:
   | Property | Value |
   |---|---|
   | `BOT_TOKEN` | токен от BotFather |
   | `CHAT_ID` | ваш chat id (можно несколько через запятую) |
   | `FORM_SECRET` | *(необязательно)* любая строка-пароль |
4. Проверка: выбрать функцию `testSend` → **Run** → разрешить доступ аккаунту.
   В Telegram должна прийти тестовая заявка.
5. **Deploy** → **New deployment** → тип **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy**, скопировать URL вида `https://script.google.com/macros/s/AKfyc.../exec`.

## 3. Подключить сайт

В `index.html` найти блок «Отправка заявок в Telegram» (ближе к концу файла) и вписать URL:

```js
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfyc.../exec";
const ORDER_SECRET = "";   // заполнить, только если задан FORM_SECRET
```

Пока `ORDER_ENDPOINT` пустой, кнопка «заказать» работает по-старому — открывает
почтовый клиент (mailto).

## Что уходит в Telegram

Услуга, описание идеи, бюджет, контакты, язык интерфейса, адрес страницы и время
(часовой пояс `Europe/Kyiv` — меняется в `buildMessage_`).

## Полезно знать

- После **любого изменения кода** нужно сделать **Deploy → Manage deployments →
  ✏️ → Version: New version → Deploy**, иначе на сайте продолжит работать старая версия.
- Скрытое поле `company` в форме — ловушка для спам-ботов: если оно заполнено,
  заявка молча отбрасывается.
- Обязательные поля на сайте — «описание идеи» и «контакты для связи».
- Логи ошибок: в редакторе Apps Script → **Executions**.

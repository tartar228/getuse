// Настройки приложения. Название можно поменять здесь, оно попадает в заголовок
// и в текст «Поделиться дропом».
export const APP_TITLE = 'GetUse';

// Для ссылки «Поделиться дропом» (этап 2): t.me/<бот>/<приложение>.
// Задаются через .env: VITE_BOT_USERNAME=... VITE_APP_SHORT_NAME=...
export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || '';
export const APP_SHORT_NAME = import.meta.env.VITE_APP_SHORT_NAME || '';

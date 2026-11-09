import { APP_TITLE, BOT_USERNAME, APP_SHORT_NAME } from './config.js';
import { PLATFORMS } from './game/platforms.js';
import { TIERS } from './game/value.js';
import { openTelegramLink } from './telegram.js';
import { rub } from './format.js';

// Ссылка на игру: t.me/<бот>/<приложение>, иначе t.me/<бот>, иначе адрес страницы
export function gameLink() {
  if (BOT_USERNAME && APP_SHORT_NAME) return `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}`;
  if (BOT_USERNAME) return `https://t.me/${BOT_USERNAME}`;
  return window.location.href.split('#')[0];
}

// «Поделиться дропом» через Telegram share
export function shareDrop(drop) {
  const text =
    `${APP_TITLE}: выбил @${drop.name} (${PLATFORMS[drop.platform].name}) — ` +
    `${TIERS[drop.tier].name}, ≈ ${rub(drop.price)}! Попробуй и ты:`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(gameLink())}&text=${encodeURIComponent(text)}`;
  openTelegramLink(url);
}

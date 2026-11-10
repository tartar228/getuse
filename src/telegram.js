// Тонкая обёртка над Telegram WebApp SDK. Вне Telegram (обычный браузер)
// все методы тихо ничего не делают, чтобы игру можно было отлаживать на ПК.

const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// initData пустая вне Telegram, даже если скрипт SDK загрузился
export const isTelegram = Boolean(tg && tg.initData);

const atLeast = (v) => {
  try {
    return Boolean(tg?.isVersionAtLeast?.(v));
  } catch {
    return false;
  }
};

const PAGE_COLOR = '#0b0e1a';
const SURFACE_COLOR = '#131830';

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (atLeast('7.7')) tg.disableVerticalSwipes();
    // фирменная тёмная тема: шапка, фон и нижняя панель Telegram под цвет игры
    if (atLeast('6.1')) {
      tg.setHeaderColor(PAGE_COLOR);
      tg.setBackgroundColor(PAGE_COLOR);
    }
    if (atLeast('7.10')) tg.setBottomBarColor(SURFACE_COLOR);
  } catch {
    /* старые клиенты */
  }
}

// ---------- кнопка «Назад» ----------
let backHandler = null;

export const backButton = {
  available: Boolean(tg && atLeast('6.1')),
  show(handler) {
    if (!this.available) return;
    this.hide();
    backHandler = handler;
    tg.BackButton.onClick(backHandler);
    tg.BackButton.show();
  },
  hide() {
    if (!this.available) return;
    if (backHandler) tg.BackButton.offClick(backHandler);
    backHandler = null;
    tg.BackButton.hide();
  },
};

// ---------- вибрация ----------
const hf = atLeast('6.1') ? tg?.HapticFeedback : undefined;

export const haptic = {
  tick: () => hf?.impactOccurred('light'),
  thud: () => hf?.impactOccurred('heavy'),
  select: () => hf?.selectionChanged(),
  success: () => hf?.notificationOccurred('success'),
  warn: () => hf?.notificationOccurred('warning'),
};

// ---------- облачное хранилище ----------
const cs = atLeast('6.9') ? tg?.CloudStorage : undefined;

const withTimeout = (promise, ms = 6000) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('cloud timeout')), ms))]);

export const cloud = {
  available: Boolean(cs && isTelegram),
  getItems: (keys) =>
    withTimeout(new Promise((res, rej) => cs.getItems(keys, (e, v) => (e ? rej(e) : res(v))))),
  setItem: (key, value) =>
    withTimeout(new Promise((res, rej) => cs.setItem(key, value, (e, ok) => (e ? rej(e) : res(ok))))),
  removeItems: (keys) =>
    withTimeout(new Promise((res, rej) => cs.removeItems(keys, (e, ok) => (e ? rej(e) : res(ok))))),
};

// ---------- ссылки и шаринг ----------
export function openTelegramLink(url) {
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}

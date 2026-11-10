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

const PAGE_COLOR = '#0b0c0e';
const SURFACE_COLOR = '#161618';

// На телефонах открываем игру на весь экран без плашки Telegram сверху (Bot API 8.0+).
// На компьютере оставляем обычное окно. Отступы под кнопки Telegram и вырез экрана клиент
// отдаёт сам в CSS-переменных --tg-safe-area-inset-* и --tg-content-safe-area-inset-*,
// их использует theme.css (--safe-top, --safe-bottom).
const MOBILE = new Set(['ios', 'android', 'android_x']);

// Полный экран можно выключить в профиле (выбор помнится на устройстве)
const FS_KEY = 'getuse_fullscreen';
const readFs = () => {
  try {
    return localStorage.getItem(FS_KEY) !== '0';
  } catch {
    return true;
  }
};

export const fullscreen = {
  available: Boolean(tg && atLeast('8.0') && MOBILE.has(tg.platform)),
  enabled: readFs(),
  set(on) {
    this.enabled = on;
    try {
      localStorage.setItem(FS_KEY, on ? '1' : '0');
    } catch {
      /* хранилище недоступно */
    }
    try {
      if (on) tg.requestFullscreen();
      else tg.exitFullscreen();
    } catch {
      /* клиент без поддержки */
    }
  },
};

// Полоса сверху под кнопки Telegram (в полном экране): если клиент отдал для неё высоту, вешаем класс tg-strip,
// и шапка кладёт баланс в эту полосу по центру (см. .tg-strip в styles.css)
function syncStrip() {
  const root = document.documentElement;
  const h = parseFloat(getComputedStyle(root).getPropertyValue('--tg-content-safe-area-inset-top')) || 0;
  root.classList.toggle('tg-strip', Boolean(tg?.isFullscreen) && h > 0);
}

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
    if (fullscreen.available && fullscreen.enabled && !tg.isFullscreen) tg.requestFullscreen();
    for (const ev of ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged']) tg.onEvent?.(ev, syncStrip);
    syncStrip();
  } catch {
    /* старые клиенты */
  }
}

// Профиль игрока из Telegram: имя, @ник и фото. Фото Telegram отдаёт не всегда
// (по документации только при запуске из меню вложений), поэтому есть запасной вариант с буквой.
export function userInfo() {
  const u = tg?.initDataUnsafe?.user;
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username || 'Игрок';
  return { name, username: u?.username || '', photo: u?.photo_url || '', initial: [...name][0].toUpperCase() };
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

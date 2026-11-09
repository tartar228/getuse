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

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (atLeast('7.7')) tg.disableVerticalSwipes();
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

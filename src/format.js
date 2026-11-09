import { CURRENCY, AT_RATE } from './game/economy.js';

export const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

// @: меньше 10 — с одним знаком (0.2 @), иначе целое
export function fmtAt(rub) {
  const v = rub / AT_RATE;
  return `${v < 10 ? (Math.round(v * 10) / 10).toLocaleString('ru-RU') : fmt(v)} @`;
}

export const rub = (n) => `${fmt(n)} ${CURRENCY}`;

// «1 700 ₽ (68 @)»
export const rubAt = (n) => `${rub(n)} (${fmtAt(n)})`;

// Шанс в процентах: 71.3%, 6.1%, 0.45%, 0.016%
export function fmtPct(p) {
  const v = p * 100;
  if (v >= 10) return `${v.toFixed(1)}%`;
  if (v >= 1) return `${v.toFixed(1)}%`;
  if (v >= 0.1) return `${v.toFixed(2)}%`;
  if (v > 0) return `${v.toFixed(3)}%`;
  return '—';
}

export const oneIn = (p) => (p > 0 ? `1 из ${fmt(1 / p)}` : 'не выпадает');

// Множитель: ×12, ×1.5, ×0.3
export function fmtMult(m) {
  const v = m >= 10 ? Math.round(m) : +m.toFixed(2);
  return `×${v}`;
}

// 3:07
export function fmtTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// 45 мин · 2 ч 10 мин · 1 д 4 ч
export function fmtDuration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} ч ${min % 60} мин` : `${h} ч`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} д ${h % 24} ч` : `${d} д`;
}

// +12% / −5%
export function fmtDelta(ratio) {
  const v = Math.round((ratio - 1) * 100);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;
}

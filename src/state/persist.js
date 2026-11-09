import { cloud } from '../telegram.js';
import { PLATFORM_ORDER } from '../game/platforms.js';

// Сохранение: Telegram CloudStorage (основное) + localStorage (запасной вариант и кеш).
// При загрузке берётся более свежая копия по savedAt.
//
// В CloudStorage значение ограничено 4096 символами, поэтому состояние режется на ключи:
//   meta       — всё, кроме коллекции и рынка, + число кусков каждого вида
//   inv0..invN — коллекция, по INV_CHUNK юзов в виде [id, name, индекс платформы, ts]
//   mk0..mkN   — состояние биржи (JSON), нарезанное по MK_CHUNK символов
// Индекс платформы — позиция в PLATFORM_ORDER, порядок менять нельзя.

const LS_KEY = 'getuse_state_v1';
const INV_CHUNK = 60;
const MK_CHUNK = 3500;
const FLUSH_DELAY = 1000;

const pack = (c) => [c.id, c.name, PLATFORM_ORDER.indexOf(c.platform), c.ts];
const unpack = ([id, name, pi, ts]) => ({ id, name, platform: PLATFORM_ORDER[pi], ts });

// Состояние → набор ключей {имя: строка}
function split(state) {
  const { collection, market, ...rest } = state;
  const keys = {};
  let inv = 0;
  for (let i = 0; i < collection.length; i += INV_CHUNK) {
    keys[`inv${inv++}`] = JSON.stringify(collection.slice(i, i + INV_CHUNK).map(pack));
  }
  let mk = 0;
  if (market) {
    const str = JSON.stringify(market);
    for (let i = 0; i < str.length; i += MK_CHUNK) keys[`mk${mk++}`] = str.slice(i, i + MK_CHUNK);
  }
  keys.meta = JSON.stringify({ ...rest, inv, mk });
  return keys;
}

// Набор ключей → состояние
function join(keys) {
  if (!keys.meta) return null;
  const { inv, mk, ...rest } = JSON.parse(keys.meta);
  let collection = [];
  for (let i = 0; i < inv; i++) collection = collection.concat(JSON.parse(keys[`inv${i}`] || '[]').map(unpack));
  let market = null;
  if (mk) {
    let str = '';
    for (let i = 0; i < mk; i++) str += keys[`mk${i}`] || '';
    try {
      market = JSON.parse(str);
    } catch {
      market = null; // рынок будет создан заново
    }
  }
  return { ...rest, collection, market };
}

const keyNames = (meta) => [
  ...Array.from({ length: meta.inv }, (_, i) => `inv${i}`),
  ...Array.from({ length: meta.mk }, (_, i) => `mk${i}`),
];

// ---------- localStorage ----------

function localSave(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(split(state)));
  } catch {
    /* приватный режим или переполнение — не критично */
  }
}

function localLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? join(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

// ---------- CloudStorage ----------

let cloudKeys = new Set(); // какие ключи лежат в облаке (для чистки лишних)

async function cloudLoad() {
  const got = await cloud.getItems(['meta']);
  if (!got.meta) return null;
  const names = keyNames(JSON.parse(got.meta));
  const rest = names.length ? await cloud.getItems(names) : {};
  cloudKeys = new Set(['meta', ...names]);
  return join({ meta: got.meta, ...rest });
}

export async function loadState() {
  const local = localLoad();
  let remote = null;
  if (cloud.available) {
    try {
      remote = await cloudLoad();
    } catch {
      /* облако недоступно — играем с локальной копией */
    }
  }
  const best = [local, remote].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
  return best || null;
}

let timer = null;
let inflight = false;
let queued = null;
const written = new Map(); // ключ -> последнее записанное значение

async function flush() {
  if (!cloud.available || inflight || !queued) return;
  inflight = true;
  const state = queued;
  queued = null;
  try {
    const keys = split(state);
    // meta пишем последней: она никогда не указывает на ненаписанные куски
    const order = Object.keys(keys).filter((k) => k !== 'meta').concat('meta');
    for (const k of order) {
      if (written.get(k) !== keys[k]) {
        await cloud.setItem(k, keys[k]);
        written.set(k, keys[k]);
        cloudKeys.add(k);
      }
    }
    const stale = [...cloudKeys].filter((k) => !(k in keys));
    if (stale.length) {
      await cloud.removeItems(stale);
      stale.forEach((k) => {
        cloudKeys.delete(k);
        written.delete(k);
      });
    }
  } catch {
    // не вышло — попробуем со следующим сохранением; локальная копия уже есть
    if (!queued) queued = state;
  } finally {
    inflight = false;
    if (queued && !timer) timer = setTimeout(runFlush, FLUSH_DELAY * 3);
  }
}

function runFlush() {
  timer = null;
  flush();
}

export function saveState(state) {
  const stamped = { ...state, savedAt: Date.now() };
  localSave(stamped);
  queued = stamped;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runFlush, FLUSH_DELAY);
}

// Вызывается, когда приложение сворачивают или закрывают
export function flushNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  flush();
}

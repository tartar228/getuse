import { cloud } from '../telegram.js';
import { PLATFORM_ORDER } from '../game/platforms.js';

// Сохранение: Telegram CloudStorage (основное) + localStorage (запасной вариант и кеш).
// При загрузке берётся более свежая копия по savedAt.
//
// В CloudStorage значение ограничено 4096 символами, поэтому коллекция режется на куски:
//   meta       — всё состояние, кроме коллекции, + число кусков
//   inv0..invN — по CHUNK юзов в виде [id, name, индекс платформы, ts]
// Индекс платформы — позиция в PLATFORM_ORDER, порядок менять нельзя.

const LS_KEY = 'getuse_state_v1';
const CHUNK = 60;
const FLUSH_DELAY = 1000;

const pack = (c) => [c.id, c.name, PLATFORM_ORDER.indexOf(c.platform), c.ts];
const unpack = ([id, name, pi, ts]) => ({ id, name, platform: PLATFORM_ORDER[pi], ts });

function split(state) {
  const { collection, ...rest } = state;
  const chunks = [];
  for (let i = 0; i < collection.length; i += CHUNK) {
    chunks.push(JSON.stringify(collection.slice(i, i + CHUNK).map(pack)));
  }
  return { meta: { ...rest, chunks: chunks.length }, chunks };
}

// ---------- localStorage ----------

function localSave(state) {
  try {
    const { meta, chunks } = split(state);
    localStorage.setItem(LS_KEY, JSON.stringify({ meta, chunks }));
  } catch {
    /* приватный режим или переполнение — не критично */
  }
}

function localLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { meta, chunks } = JSON.parse(raw);
    const { chunks: _n, ...rest } = meta;
    return { ...rest, collection: chunks.flatMap((c) => JSON.parse(c).map(unpack)) };
  } catch {
    return null;
  }
}

// ---------- CloudStorage ----------

async function cloudLoad() {
  const got = await cloud.getItems(['meta']);
  if (!got.meta) return null;
  const { chunks: n, ...rest } = JSON.parse(got.meta);
  const keys = Array.from({ length: n }, (_, i) => `inv${i}`);
  const items = keys.length ? await cloud.getItems(keys) : {};
  const collection = keys.flatMap((k) => JSON.parse(items[k] || '[]').map(unpack));
  writtenChunks = n; // чтобы потом убрать лишние куски, если коллекция уменьшится
  return { ...rest, collection };
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
const written = new Map(); // key -> последнее записанное значение
let writtenChunks = null; // сколько кусков лежит в облаке (null — не знаем)

async function flush() {
  if (!cloud.available || inflight || !queued) return;
  inflight = true;
  const state = queued;
  queued = null;
  try {
    const { meta, chunks } = split(state);
    // сначала куски, потом meta: meta никогда не указывает на ненаписанные куски
    for (let i = 0; i < chunks.length; i++) {
      if (written.get(`inv${i}`) !== chunks[i]) {
        await cloud.setItem(`inv${i}`, chunks[i]);
        written.set(`inv${i}`, chunks[i]);
      }
    }
    const metaStr = JSON.stringify(meta);
    if (written.get('meta') !== metaStr) {
      await cloud.setItem('meta', metaStr);
      written.set('meta', metaStr);
    }
    if (writtenChunks !== null && writtenChunks > chunks.length) {
      const stale = [];
      for (let i = chunks.length; i < writtenChunks; i++) stale.push(`inv${i}`);
      await cloud.removeItems(stale);
      stale.forEach((k) => written.delete(k));
    }
    writtenChunks = chunks.length;
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

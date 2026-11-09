import { rollDrop } from './generator.js';
import { PLATFORMS, PLATFORM_ORDER } from './platforms.js';
import { TIERS, niceRound } from './value.js';
import { hydrate } from './appraise.js';
import { dayKey } from './daily.js';

// Симуляция биржи без сервера. Рынок живёт «шагами» по одной минуте: на каждом шаге
// меняются тренды, начинаются и заканчиваются события, NPC покупают лоты игрока,
// появляются офферы и лоты. Если игрока не было, пропущенные шаги досчитываются при входе
// (не больше суток), а результат показывается в сводке.

export const STEP = 60 * 1000;
export const MAX_STEPS = 24 * 60;
export const SUMMARY_MIN_STEPS = 3;
export const FEE = 0.05; // комиссия биржи с продажи лота игрока
const LOT_TARGET = 14;
const HIST_EVERY = 10; // шагов между точками истории
const HIST_LEN = 72;
const NEWS_LEN = 25;
const LOG_LEN = 20;
const MAX_OFFERS = 5;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`;

// ---------- ники NPC ----------
const NICK_A = ['dark', 'neo', 'lucky', 'pixel', 'ice', 'mr', 'big', 'tiny', 'crazy', 'night', 'solar', 'cool', 'fast', 'sleepy', 'red', 'old', 'wild', 'cyber', 'lazy', 'happy'];
const NICK_B = ['wolf', 'fox', 'trader', 'whale', 'hunter', 'cat', 'bro', 'dealer', 'monk', 'panda', 'ghost', 'king', 'owl', 'shark', 'bear', 'broker', 'rider', 'buyer', 'seller', 'fan'];
export function npcNick() {
  const n = Math.random() < 0.5 ? String(Math.floor(rnd(1, 99))) : '';
  return pick(NICK_A) + pick(NICK_B) + n;
}

// ---------- мета юза для рынка ----------
const catOf = (tags) =>
  tags.some((t) => t.startsWith('Известный ник')) ? 'star' : tags.some((t) => t.startsWith('Мем')) ? 'meme' : null;

// Всё, что нужно рынку знать о юзе, без повторного разбора имени
export function marketInfo(d) {
  return { platform: d.platform, tier: d.tier, base: d.price, cat: catOf(d.tags), short: d.name.length <= 4 };
}

// ---------- события ----------
const matches = (scope, info) =>
  scope.all ||
  (scope.platform && scope.platform === info.platform) ||
  (scope.tier !== undefined && scope.tier === info.tier) ||
  (scope.cat && scope.cat === info.cat) ||
  (scope.short && info.short);

const EVENT_TEMPLATES = [
  () => {
    const p = pick(PLATFORM_ORDER);
    return { scope: { platform: p }, mult: 1.25, minutes: 60, text: `Хайп на ${PLATFORMS[p].name}-юзы: +25% на час` };
  },
  () => {
    const p = pick(PLATFORM_ORDER);
    return { scope: { platform: p }, mult: 0.8, minutes: 60, text: `Отток аудитории из ${PLATFORMS[p].name}: юзы дешевеют на 20%` };
  },
  () => {
    const t = Math.floor(rnd(1, 5));
    return { scope: { tier: t }, mult: 1.3, minutes: 90, text: `Коллекционеры скупают тир «${TIERS[t].name}»: +30%` };
  },
  () => ({ scope: { cat: 'meme' }, mult: 1.4, minutes: 75, text: 'Мем-сезон: мемные юзы +40%' }),
  () => ({ scope: { cat: 'star' }, mult: 1.35, minutes: 60, text: 'Ники известных людей в тренде: +35%' }),
  () => ({ scope: { short: true }, mult: 1.3, minutes: 90, text: 'Охота за короткими юзами (до 4 символов): +30%' }),
  () => ({ scope: { all: true }, mult: 0.88, minutes: 60, text: 'Рынок остывает: −12% на всё' }),
  () => ({ scope: { all: true }, mult: 1.12, minutes: 60, text: 'Рынок оживился: +12% на всё' }),
];

// ---------- множители рынка ----------
// Итоговая цена = базовая цена юза × тренд платформы × тренд тира × события × насыщение
export function marketMult(m, info) {
  let x = m.trends.p[info.platform] * m.trends.t[info.tier] * (1 - (m.sat[info.platform] || 0));
  for (const e of m.events) if (matches(e.scope, info)) x *= e.mult;
  return x;
}

export const fairPrice = (m, info) => Math.max(1, niceRound(info.base * marketMult(m, info)));

// Индексы для графиков (100 = норма)
function indexOfPlatform(m, platform) {
  let x = m.trends.p[platform] * (1 - (m.sat[platform] || 0));
  for (const e of m.events) if (e.scope.all || e.scope.platform === platform) x *= e.mult;
  return Math.round(x * 100);
}
function indexOfTier(m, tier) {
  let x = m.trends.t[tier];
  for (const e of m.events) if (e.scope.all || e.scope.tier === tier) x *= e.mult;
  return Math.round(x * 100);
}
export const currentIndex = { platform: indexOfPlatform, tier: indexOfTier };

// Вероятность, что NPC купит лот игрока за очередную минуту.
// Чем дешевле относительно справедливой цены, тем быстрее; дорогие тиры покупают реже.
export function saleChance(ask, fair, tier) {
  const r = ask / fair;
  const f = r <= 1 ? Math.min(12, Math.exp(5 * (1 - r))) : Math.exp(-7 * (r - 1));
  return Math.min(0.5, (1 / 90) * f * (1 / (1 + tier * 0.35)));
}

// ---------- создание рынка ----------
function sampleHistory(m) {
  for (const p of PLATFORM_ORDER) (m.hist.p[p] ||= []).push(indexOfPlatform(m, p));
  TIERS.forEach((_, t) => (m.hist.t[t] ||= []).push(indexOfTier(m, t)));
  for (const k of [...Object.values(m.hist.p), ...Object.values(m.hist.t)]) {
    while (k.length > HIST_LEN) k.shift();
  }
}

function walkTrends(m) {
  const walk = (x) => Math.min(1.5, Math.max(0.7, x + (1 - x) * 0.01 + gauss() * 0.006));
  for (const p of PLATFORM_ORDER) m.trends.p[p] = walk(m.trends.p[p]);
  m.trends.t = m.trends.t.map(walk);
}

function makeLot(m, t) {
  const pid = pick(PLATFORM_ORDER);
  // в ленте должно быть на что посмотреть: чаще выкладываем что-то выше «Обычного»
  let best = rollDrop(pid);
  if (Math.random() < 0.75) {
    for (let k = 0; k < 8 && best.tier < 1; k++) best = rollDrop(pid);
  }
  if (Math.random() < 0.4) {
    for (let k = 0; k < 2; k++) {
      const d = rollDrop(pid);
      if (d.tier > best.tier) best = d;
    }
  }
  const info = marketInfo(best);
  const ask = Math.max(1, niceRound(fairPrice(m, info) * rnd(0.88, 1.3)));
  return { id: uid(), name: best.name, platform: pid, tier: best.tier, base: best.price, cat: info.cat || undefined, ask, seller: npcNick(), ts: t };
}

export function createMarket(now) {
  const m = {
    t: now,
    steps: 0,
    lots: [],
    listings: [],
    offers: [],
    events: [],
    news: [],
    log: [],
    sat: {},
    trends: { p: Object.fromEntries(PLATFORM_ORDER.map((p) => [p, 1])), t: TIERS.map(() => 1) },
    hist: { p: {}, t: {} },
    summary: null,
  };
  // предыстория для графиков: 24 точки случайного блуждания
  for (let i = 0; i < 24; i++) {
    for (let k = 0; k < HIST_EVERY; k++) walkTrends(m);
    sampleHistory(m);
  }
  while (m.lots.length < LOT_TARGET) m.lots.push(makeLot(m, now));
  return m;
}

// ---------- один шаг рынка ----------
function pushNews(m, t, text) {
  m.news.unshift({ id: uid(), t, text });
  if (m.news.length > NEWS_LEN) m.news.length = NEWS_LEN;
}

function stepOnce(w, t, sum) {
  const m = w.market;
  m.steps++;
  walkTrends(m);
  for (const p of Object.keys(m.sat)) m.sat[p] = m.sat[p] < 0.002 ? 0 : m.sat[p] * 0.995;

  // события
  const alive = [];
  for (const e of m.events) {
    if (e.until <= t) pushNews(m, t, `Закончилось: ${e.text}`);
    else alive.push(e);
  }
  m.events = alive;
  if (m.events.length < 3 && Math.random() < 1 / 90) {
    const tpl = pick(EVENT_TEMPLATES)();
    m.events.push({ id: uid(), scope: tpl.scope, mult: tpl.mult, text: tpl.text, from: t, until: t + tpl.minutes * rnd(0.7, 1.3) * STEP });
    pushNews(m, t, tpl.text);
    sum.events.push(tpl.text);
  }

  // NPC-лоты: часть выкупают другие NPC, появляются новые
  m.lots = m.lots.filter(() => Math.random() > 0.025);
  let spawn = 0;
  while (m.lots.length < LOT_TARGET && spawn++ < 2) m.lots.push(makeLot(m, t));

  // покупатели лотов игрока
  const keep = [];
  for (const l of m.listings) {
    const info = { platform: l.platform, tier: l.tier, base: l.base, cat: l.cat || null, short: l.name.length <= 4 };
    if (Math.random() < saleChance(l.ask, fairPrice(m, info), l.tier)) {
      const gain = Math.floor(l.ask * (1 - FEE));
      w.coins += gain;
      w.lifetime.marketSales++;
      if (w.tasks.day === dayKey(t)) w.tasks.marketSales++;
      m.sat[l.platform] = Math.min(0.4, (m.sat[l.platform] || 0) + 0.03);
      m.log.unshift({ t, name: l.name, platform: l.platform, price: gain, buyer: npcNick() });
      if (m.log.length > LOG_LEN) m.log.length = LOG_LEN;
      sum.sold.push({ name: l.name, platform: l.platform, price: gain });
      sum.earned += gain;
    } else keep.push(l);
  }
  m.listings = keep;

  // офферы на юзы из коллекции
  m.offers = m.offers.filter((o) => o.until > t && w.collection.some((c) => c.id === o.itemId));
  if (m.offers.length < MAX_OFFERS && w.collection.length && Math.random() < 1 / 35) {
    const free = w.collection.filter((c) => !m.offers.some((o) => o.itemId === c.id));
    if (free.length) {
      // чем дороже юз, тем больше внимания покупателей
      const hyd = free.map(hydrate);
      const weights = hyd.map((d) => Math.sqrt(d.price));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let idx = 0;
      while (idx < weights.length - 1 && (r -= weights[idx]) > 0) idx++;
      const d = hyd[idx];
      const price = Math.max(1, niceRound(fairPrice(m, marketInfo(d)) * rnd(0.7, 1.3)));
      m.offers.push({ id: uid(), itemId: d.id, name: d.name, platform: d.platform, price, buyer: npcNick(), until: t + rnd(3, 6) * 3600 * 1000 });
      sum.newOffers++;
    }
  }

  if (m.steps % HIST_EVERY === 0) sampleHistory(m);
}

// ---------- продвижение времени ----------
// Возвращает тот же state, если шаг ещё не наступил. Работает на копии и мутирует её.
export function advanceMarket(state, now) {
  if (!state.market) return { ...state, market: createMarket(now) };
  const due = Math.floor((now - state.market.t) / STEP);
  if (due <= 0) return state;
  const steps = Math.min(due, MAX_STEPS);

  const w = {
    coins: state.coins,
    collection: state.collection,
    lifetime: { ...state.lifetime },
    tasks: { ...state.tasks },
    market: JSON.parse(JSON.stringify(state.market)),
  };
  const sum = { sold: [], earned: 0, newOffers: 0, events: [] };
  const start = w.market.t;
  for (let i = 1; i <= steps; i++) stepOnce(w, start + i * STEP, sum);
  w.market.t = due > steps ? now : start + steps * STEP;

  if (steps >= SUMMARY_MIN_STEPS && (sum.sold.length || sum.newOffers || sum.events.length)) {
    const prev = w.market.summary;
    w.market.summary = {
      from: prev ? prev.from : start,
      to: w.market.t,
      sold: [...(prev?.sold || []), ...sum.sold],
      earned: (prev?.earned || 0) + sum.earned,
      newOffers: (prev?.newOffers || 0) + sum.newOffers,
      events: [...(prev?.events || []), ...sum.events],
    };
  }
  return { ...state, coins: w.coins, lifetime: w.lifetime, tasks: w.tasks, market: w.market };
}

import { analyze } from './analyze.js';
import { valuate } from './value.js';
import { PLATFORMS } from './platforms.js';

// Оценка юза по имени и платформе. Цена, тир и разбор всегда выводятся из имени,
// поэтому в сохранении хранятся только {id, name, platform, ts}: это мало места
// и цены автоматически подтягиваются, если формулу ценности поправят.
export function appraise(name, platformId) {
  const v = valuate(analyze(name), PLATFORMS[platformId]);
  return { tier: v.tier, price: v.price, v0: v.v0, tags: v.tags, breakdown: v.breakdown, series: v.series };
}

export const hydrate = (raw) => ({ ...raw, ...appraise(raw.name, raw.platform) });

// no — порядковый номер крутки (для подписи «№ 1 234»)
export const toRaw = (d) => (d.no ? { id: d.id, name: d.name, platform: d.platform, ts: d.ts, no: d.no } : { id: d.id, name: d.name, platform: d.platform, ts: d.ts });

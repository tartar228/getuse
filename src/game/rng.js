// Генератор с сидом — нужен для симуляции шансов (scripts/simulate.mjs).
// В игре используется Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// entries: [[значение, вес], ...]
export function pickWeighted(rng, entries) {
  let total = 0;
  for (const e of entries) total += e[1];
  let r = rng() * total;
  for (const e of entries) {
    r -= e[1];
    if (r < 0) return e[0];
  }
  return entries[entries.length - 1][0];
}

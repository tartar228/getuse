// Симуляция дропа: считает реальные шансы тиров для каждой платформы
// и сохраняет их в src/game/dropStats.json (оттуда их берёт интерфейс).
// Запуск: npm run stats [-- --samples=200000] [-- --quiet]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../src/game/rng.js';
import { PLATFORMS, PLATFORM_ORDER } from '../src/game/platforms.js';
import { rollDrop } from '../src/game/generator.js';
import { TIERS } from '../src/game/value.js';
import { WORD_COUNT } from '../src/game/words.js';
import { SPIN_COST, sellValue, scrapValue } from '../src/game/economy.js';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const samplesArg = args.find((a) => a.startsWith('--samples='));
const N = samplesArg ? Number(samplesArg.split('=')[1]) : 200000;

const out = { samples: N, platforms: {} };
let invalid = 0;

for (const pid of PLATFORM_ORDER) {
  const p = PLATFORMS[pid];
  const rng = mulberry32(12345 + pid.length * 977);
  const tiers = new Array(TIERS.length).fill(0);
  const pools = { junk: 0, pattern: 0, word: 0 };
  const examples = TIERS.map(() => []);
  let sum = 0;
  let lenSum = 0;
  let evInstant = 0; // сколько ₽ даёт крутка при лучшем из «продать сразу» / «разобрать»
  const tierSum = new Array(TIERS.length).fill(0);

  for (let i = 0; i < N; i++) {
    const d = rollDrop(pid, rng);
    if (!p.validate(d.name)) invalid++;
    tiers[d.tier]++;
    pools[d.pool]++;
    sum += d.price;
    tierSum[d.tier] += d.price;
    evInstant += Math.max(sellValue(d), scrapValue(d));
    lenSum += d.name.length;
    if (examples[d.tier].length < 6 && !examples[d.tier].some((e) => e.name === d.name)) {
      examples[d.tier].push({ name: d.name, price: d.price });
    }
  }

  out.platforms[pid] = {
    tiers: tiers.map((c) => c / N),
    pools: Object.fromEntries(Object.entries(pools).map(([k, c]) => [k, c / N])),
    avgPrice: Math.round(sum / N),
    avgLen: +(lenSum / N).toFixed(2),
    evInstant: +(evInstant / N).toFixed(1),
  };

  if (!quiet) {
    console.log(`\n== ${p.name} (x${p.priceMult}) ==  средняя цена ${Math.round(sum / N)}, средняя длина ${(lenSum / N).toFixed(1)}`);
    TIERS.forEach((t, i) => {
      const pr = tiers[i] / N;
      const one = pr > 0 ? `1 из ${Math.round(1 / pr)}` : '—';
      console.log(
        `  ${t.name.padEnd(11)} ${(pr * 100).toFixed(3).padStart(8)}%  ${one.padStart(10)}   ${examples[i].map((e) => `${e.name}(${e.price})`).join(' ')}`,
      );
    });
    console.log(
      `  Вклад тиров в среднюю цену: ${tierSum.map((v, i) => `${TIERS[i].name[0]}${Math.round((v / sum) * 100)}%`).join(' ')}`,
    );
    console.log(
      `  Мгновенная продажа: ${(evInstant / N).toFixed(1)} ₽ за крутку при цене ${SPIN_COST} ₽ → окупаемость ×${(evInstant / N / SPIN_COST).toFixed(2)}`,
    );
    const rarePlus = tiers.slice(2).reduce((a, b) => a + b, 0) / N;
    console.log(`  Редкий+ : ${(rarePlus * 100).toFixed(2)}%  → в среднем 1 из ${Math.round(1 / rarePlus)} круток`);
  }
}

writeFileSync(
  fileURLToPath(new URL('../src/game/dropStats.json', import.meta.url)),
  JSON.stringify(out, null, 2) + '\n',
);

console.log(`\nСлов в словаре: ${WORD_COUNT}. Круток на платформу: ${N}. Невалидных юзов: ${invalid}.`);
if (invalid) process.exit(1);

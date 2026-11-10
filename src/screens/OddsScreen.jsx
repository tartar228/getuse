import { PLATFORMS } from '../game/platforms.js';
import { TIERS, priceOf } from '../game/value.js';
import { POOL_WEIGHTS, POOL_NAMES } from '../game/generator.js';
import { WORD_COUNT } from '../game/words.js';
import stats from '../game/dropStats.json';
import { fmt, rub, fmtPct, oneIn } from '../format.js';

// Шансы тиров взяты из симуляции (npm run stats), а не посчитаны на глаз:
// тир зависит от итоговой ценности юза, поэтому аналитически их не выписать.
export default function OddsScreen({ platform, luck = 1 }) {
  const p = PLATFORMS[platform];
  const s = stats.platforms[platform];

  return (
    <div className="screen">
      <h2 className="h2">
        <span className="pmark">{p.icon}</span> Шансы: {p.name}
      </h2>

      <div className="card">
        <div className="card-title">Тиры</div>
        {TIERS.map((t, i) => {
          const from = priceOf(t.min, p);
          const to = i + 1 < TIERS.length ? priceOf(TIERS[i + 1].min, p) : null;
          return (
            <div className="odds-row" key={t.id}>
              <span className="dot" style={{ background: t.color }} />
              <span className="odds-name">{t.name}</span>
              <span className="odds-pct">{fmtPct(s.tiers[i])}</span>
              <span className="odds-one">{oneIn(s.tiers[i])}</span>
              <span className="odds-price">
                {i === 0 ? `до ${rub(to)}` : to ? `${fmt(from)}–${rub(to)}` : `от ${rub(from)}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-title">Откуда берутся юзы</div>
        {POOL_WEIGHTS.map(([id]) => (
          <div className="odds-row" key={id}>
            <span className="odds-name">{POOL_NAMES[id]}</span>
            <span className="odds-pct">{fmtPct(s.pools[id])}</span>
          </div>
        ))}
        <p className="note">
          Паттерны: повторы, палиндромы, лесенки. Слова: оцениваем по словарю на {WORD_COUNT} слов.
          Цена зависит от длины, слова, чистоты, паттерна и платформы (×{p.priceMult}).
        </p>
      </div>

      <p className="note">
        Это шансы без удачи. Удача ×L делает floor(L) попыток и оставляет лучшую, а с шансом дробной части ещё одну.
        {luck > 1
          ? ` У тебя сейчас ×${luck.toFixed(2)}: редкие юзы выпадают примерно в ${luck.toFixed(1)} раза чаще.`
          : ' Сейчас удача ×1.00: назначь талисманы в коллекции, и она вырастет.'}
      </p>
      <p className="note">
        Шансы посчитаны симуляцией на {fmt(stats.samples)} круток для этой платформы. Средняя цена
        юза — {rub(s.avgPrice)}.
      </p>
    </div>
  );
}

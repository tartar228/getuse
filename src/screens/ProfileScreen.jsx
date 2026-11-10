import { TIERS } from '../game/value.js';
import { rub, rubAt } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';

// Профиль: витрина из 3 лучших юзов, стоимость коллекции и статистика
export default function ProfileScreen({ items, coins, lifetime, onOpen, onShare }) {
  const best = [...items].sort((a, b) => b.price - a.price || b.ts - a.ts).slice(0, 3);
  const total = items.reduce((s, d) => s + d.price, 0);
  const owned = TIERS.map((_, i) => items.filter((d) => d.tier === i).length);

  return (
    <div className="screen">
      <h2 className="h2">Витрина</h2>
      {best.length === 0 ? (
        <div className="card">
          <p className="note">Здесь появятся три самых дорогих юза из твоей коллекции.</p>
        </div>
      ) : (
        <div className="showcase">
          {best.map((d, i) => (
            <button
              key={d.id}
              className="show-card"
              style={{ '--tier': TIERS[d.tier].color }}
              onClick={() => onOpen(d.id)}
            >
              <span className="show-place">{i + 1}</span>
              <span className="show-name">@{d.name}</span>
              <span className="show-meta">
                <PlatformMark id={d.platform} /> {TIERS[d.tier].name}
              </span>
              <span className="show-price">{rubAt(d.price)}</span>
            </button>
          ))}
        </div>
      )}
      {best.length > 0 && (
        <button className="link" onClick={() => onShare(best[0])}>
          Поделиться лучшим юзом
        </button>
      )}

      <div className="summary card">
        <div>
          <div className="summary-num">{rub(total)}</div>
          <div className="summary-lbl">стоимость коллекции</div>
        </div>
        <div>
          <div className="summary-num">{items.length}</div>
          <div className="summary-lbl">юзов в коллекции</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Статистика</div>
        <div className="stat-row">
          <span>Баланс</span>
          <b>{rubAt(coins)}</b>
        </div>
        <div className="stat-row">
          <span>Всего круток</span>
          <b>{lifetime.spins}</b>
        </div>
        {TIERS.map((t, i) => (
          <div className="stat-row" key={t.id}>
            <span>
              <span className="dot" style={{ background: t.color }} /> {t.name}
            </span>
            <span>
              в коллекции <b>{owned[i]}</b> · выбито <b>{lifetime.tiers[i]}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

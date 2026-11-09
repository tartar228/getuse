import { useState } from 'react';
import SlotReveal from '../components/SlotReveal.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import { rub, rubAt, fmtMult } from '../format.js';

export default function SpinScreen({
  platform,
  onPlatform,
  current,
  onSpin,
  onRevealed,
  onDecide,
  stats,
  onOdds,
}) {
  const [skipKey, setSkipKey] = useState(0);
  const p = PLATFORMS[platform];
  const drop = current?.drop;
  const revealing = Boolean(current && !current.revealed);
  const decided = Boolean(current && current.revealed);
  const tier = drop ? TIERS[drop.tier] : null;

  return (
    <div className="screen">
      <div className="chips" role="tablist">
        {PLATFORM_ORDER.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === platform}
            className={id === platform ? 'chip active' : 'chip'}
            disabled={Boolean(current)}
            onClick={() => onPlatform(id)}
          >
            <span className="chip-icon">{PLATFORMS[id].icon}</span>
            {PLATFORMS[id].name}
          </button>
        ))}
      </div>

      <div className="rules">{p.rules.join(' · ')}</div>

      <div
        className={`stage ${decided ? `tier-${drop.tier}` : ''}`}
        style={decided ? { '--tier': tier.color } : undefined}
        onClick={() => revealing && setSkipKey((k) => k + 1)}
      >
        {drop ? (
          <SlotReveal
            key={drop.id}
            name={drop.name}
            tier={drop.tier}
            skipKey={skipKey}
            onDone={onRevealed}
          />
        ) : (
          <div className="slot idle">@?????</div>
        )}

        {decided && (
          <div className="result">
            <div className="tier-badge" style={{ background: tier.color }}>
              {tier.name}
            </div>
            <div className="price">≈ {rubAt(drop.price)}</div>
            <div className="calc">
              <div className="calc-row">
                <span>База за длину ({drop.breakdown.len} симв.)</span>
                <span>{rub(drop.breakdown.base)}</span>
              </div>
              {drop.breakdown.rows.map((r) => (
                <div className="calc-row" key={r.label}>
                  <span>{r.label}</span>
                  <span className={r.mult >= 1 ? 'mult up' : 'mult down'}>{fmtMult(r.mult)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!current && (
        <button className="btn primary big" onClick={onSpin}>
          Крутить
        </button>
      )}
      {revealing && (
        <button className="btn big" onClick={() => setSkipKey((k) => k + 1)}>
          Пропустить
        </button>
      )}
      {decided && (
        <div className="actions">
          <button className="btn primary" onClick={() => onDecide('keep')}>
            В коллекцию
          </button>
          <button className="btn" onClick={() => onDecide('sell')}>
            Продать сразу
            <small>+{rub(sellValue(drop))}</small>
          </button>
          <button className="btn" onClick={() => onDecide('scrap')}>
            Разобрать
            <small>+{rub(scrapValue(drop))}</small>
          </button>
        </div>
      )}

      <button className="link" onClick={onOdds}>
        Шансы выпадения →
      </button>

      <div className="session">
        <div className="session-title">Крутки за сессию: {stats.spins}</div>
        <div className="session-tiers">
          {TIERS.map((t, i) => (
            <div className="session-tier" key={t.id} title={t.name}>
              <span className="dot" style={{ background: t.color }} />
              {stats.tiers[i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

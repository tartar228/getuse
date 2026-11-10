import { useState } from 'react';
import SlotReveal from '../components/SlotReveal.jsx';
import PlatformMark from '../components/PlatformMark.jsx';
import DropEffects from '../components/DropEffects.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import { rub, rubAt, fmtTime } from '../format.js';

export default function SpinScreen({
  platform,
  onPlatform,
  current,
  onSpin,
  onRevealed,
  onDecide,
  onShare,
  lifetime,
  onOdds,
  spins,
  nextIn,
  coins,
  buy1,
  buy5,
  onBuy,
}) {
  const [skipKey, setSkipKey] = useState(0);
  const [fxId, setFxId] = useState(null);
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
            <PlatformMark id={id} />
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
            instant={decided}
            skipKey={skipKey}
            onDone={() => {
              setFxId(drop.id);
              onRevealed();
            }}
          />
        ) : (
          <div className="slot idle">@?????</div>
        )}

        {decided && fxId === drop.id && (
          <DropEffects key={`fx-${drop.id}`} tier={drop.tier} color={tier.color} playId={drop.id} />
        )}

        {decided && (
          <div className="result">
            <div className="tier-badge" style={{ '--tier': tier.color }}>
              {tier.name}
            </div>
            <div className="price">≈ {rubAt(drop.price)}</div>
            <PriceBreakdown breakdown={drop.breakdown} />
          </div>
        )}
      </div>

      {!current && (
        <>
          <button className="btn primary big" onClick={onSpin} disabled={spins <= 0}>
            {spins > 0 ? `Крутить · осталось ${spins}` : 'Нет круток'}
          </button>
          {nextIn !== null && (
            <div className="rules">
              Следующая бесплатная крутка через {fmtTime(nextIn)}
            </div>
          )}
          <div className="buy">
            <button className="btn" onClick={() => onBuy(1)} disabled={coins < buy1}>
              +1 крутка
              <small>{rubAt(buy1)}</small>
            </button>
            <button className="btn" onClick={() => onBuy(5)} disabled={coins < buy5}>
              +5 круток
              <small>{rubAt(buy5)}</small>
            </button>
          </div>
        </>
      )}
      {revealing && (
        <button className="btn big" onClick={() => setSkipKey((k) => k + 1)}>
          Пропустить
        </button>
      )}
      {decided && (
        <>
          <div className="actions">
            <button className="btn primary" onClick={() => onDecide('keep')}>
              В коллекцию
            </button>
            <ConfirmButton ask={drop.tier >= 3} hint={`+${rub(sellValue(drop))}`} onConfirm={() => onDecide('sell')}>
              Продать сразу
            </ConfirmButton>
            <ConfirmButton ask={drop.tier >= 3} hint={`+${rub(scrapValue(drop))}`} onConfirm={() => onDecide('scrap')}>
              Разобрать
            </ConfirmButton>
          </div>
          <button className="link" onClick={() => onShare(drop)}>
            Поделиться дропом
          </button>
        </>
      )}

      <button className="link" onClick={onOdds}>
        Шансы выпадения →
      </button>

      <div className="session">
        <div className="session-title">Всего круток: {lifetime.spins}</div>
        <div className="session-tiers">
          {TIERS.map((t, i) => (
            <div className="session-tier" key={t.id} title={t.name}>
              <span className="dot" style={{ background: t.color }} />
              {lifetime.tiers[i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

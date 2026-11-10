import { useMemo, useState } from 'react';
import { ReelPlate, IdlePlate } from '../components/Plate.jsx';
import Plate from '../components/Plate.jsx';
import Icon from '../components/Icon.jsx';
import Num from '../components/Num.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import DropEffects from '../components/DropEffects.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import { Rarity, Mods, platformLine } from '../components/Verdict.jsx';
import { fmtAt, fmtThin } from '../format.js';

export const COUNTS = [1, 2, 3, 5];

export default function SpinScreen({
  platform,
  onPlatform,
  pending,
  revealed,
  onSpin,
  onRevealed,
  onDecide,
  onDecideAll,
  onShare,
  spins,
  count,
  onCount,
  level,
  free,
  capacity,
  onOpenSpins,
  onOpenCollection,
  onOdds,
}) {
  const [skipKey, setSkipKey] = useState(0);
  const [fxId, setFxId] = useState(null);
  const [leaving, setLeaving] = useState(() => new Set());

  // самый ценный юз показываем большим, остальные «выглядывают» списком
  const sorted = useMemo(() => (pending ? [...pending].sort((a, b) => b.v0 - a.v0) : []), [pending]);
  const hero = sorted[0] || null;
  const rest = sorted.slice(1);
  const revealing = Boolean(hero && !revealed);
  const decided = Boolean(hero && revealed);
  const tier = hero ? TIERS[hero.tier] : null;
  const restTotal = pending ? pending.reduce((s, d) => s + sellValue(d), 0) : 0;
  const n = Math.min(count, Math.max(1, spins));

  const keep = (id) => {
    if (free <= 0 || leaving.has(id)) return;
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      onDecide(id, 'keep');
      setLeaving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, 190);
  };

  const cycle = () => {
    const i = COUNTS.indexOf(count);
    onCount(COUNTS[(i + 1) % COUNTS.length]);
  };

  return (
    <div className="spin">
      <div className="spin-main">
        <div className="seg-row" role="tablist">
          {PLATFORM_ORDER.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={id === platform}
              className={id === platform ? 'seg-pill active' : 'seg-pill'}
              disabled={Boolean(pending)}
              onClick={() => onPlatform(id)}
            >
              {PLATFORMS[id].name.replace(' (Twitter)', '')}
            </button>
          ))}
        </div>

        <div
          className={`stage ${decided ? `tier-${hero.tier}` : ''}`}
          style={decided ? { '--tier': tier.color } : undefined}
          onClick={() => revealing && setSkipKey((k) => k + 1)}
        >
          <span className="stage-glow" aria-hidden="true" />
          <div className="plate-wrap">
            {hero ? (
              <ReelPlate
                key={hero.id}
                name={hero.name}
                platform={hero.platform}
                tier={hero.tier}
                series={hero.series}
                instant={decided}
                skipKey={skipKey}
                onDone={() => {
                  setFxId(hero.id);
                  onRevealed();
                }}
              />
            ) : (
              <IdlePlate platform={platform} />
            )}
          </div>
          {decided && fxId === hero.id && (
            <DropEffects key={`fx-${hero.id}`} tier={hero.tier} color={tier.color} playId={hero.id} />
          )}
        </div>

        <div className={hero ? 'verdict' : 'verdict idle'}>
          {decided && (
            <button className="icon-btn stage-share" onClick={() => onShare(hero)} aria-label="Поделиться дропом">
              <Icon name="share" size={18} />
            </button>
          )}
          {!hero && (
            <>
              <div className="rarity idle">Готов крутить</div>
              <div className="rules">{PLATFORMS[platform].rules.join(' · ')}</div>
            </>
          )}
          {revealing && <div className="rarity spinning">Крутим</div>}
          {decided && (
            <div className="result" key={hero.id}>
              <Rarity tier={hero.tier} />
              {hero.no > 0 && <div className="spin-no">№ {fmtThin(hero.no)}</div>}
              <div className="price-xl">
                <Num value={hero.price} from={0} duration={800} />
                <span className="cur"> ₽</span>
              </div>
              <div className="price-at">≈ {fmtAt(hero.price)}</div>
              <div className="platform-line">{platformLine(hero)}</div>
              <Mods breakdown={hero.breakdown} />
            </div>
          )}
        </div>

        <div className="lvl">
          <div className="lvl-top">
            <span>
              Уровень {level.level} · {fmtThin(level.into)}/{fmtThin(level.need)}
            </span>
            {level.next && (
              <span className="muted">
                Ур. {level.next.level}: {level.next.short}
              </span>
            )}
          </div>
          <ProgressBar value={level.into} max={level.need} label="Опыт до следующего уровня" />
        </div>

        <button className="row-link" onClick={onOpenCollection}>
          <span className="row-icon">
            <Icon name="slots" size={18} />
          </span>
          <span>Слоты</span>
          <span className="row-val">
            свободно <b>{free}</b> из {capacity}
          </span>
          <Icon name="chevron" size={16} />
        </button>

        {decided && (
          <>
            <div className="act">
              <button className="btn-white" disabled={free <= 0} onClick={() => keep(hero.id)}>
                {free > 0 ? 'В коллекцию' : 'Нет мест'}
              </button>
              <ConfirmButton
                className="btn-sec"
                ask={hero.tier >= 3}
                hint={fmtThin(sellValue(hero))}
                onConfirm={() => onDecide(hero.id, 'sell')}
              >
                Продать
              </ConfirmButton>
              <ConfirmButton
                className="btn-round"
                ask={hero.tier >= 3}
                label={`Разобрать на запчасти: +${scrapValue(hero)} ₽`}
                onConfirm={() => onDecide(hero.id, 'scrap')}
              >
                <Icon name="recycle" size={20} />
              </ConfirmButton>
            </div>
            <div className="act-hint">
              {free <= 0 ? 'Коллекция заполнена: продай юз или купи места. ' : ''}
              <Icon name="recycle" size={12} /> разобрать: +{fmtThin(scrapValue(hero))} ₽
            </div>
          </>
        )}

        {decided && rest.length > 0 && (
          <div className="rest">
            <div className="overline">Ещё выпало · {rest.length}</div>
            {rest.map((d, i) => (
              <div className={leaving.has(d.id) ? 'rrow out' : 'rrow'} key={d.id} style={{ animationDelay: `${i * 45}ms` }}>
                <div className="rcol">
                  <span className="rtier" style={{ color: TIERS[d.tier].color }}>
                    <span className="rdot" style={{ background: TIERS[d.tier].color }} />
                    {TIERS[d.tier].name}
                  </span>
                  <Plate name={d.name} platform={d.platform} series={d.series} size="sm" />
                </div>
                <span className="rprice">{fmtThin(d.price)} ₽</span>
                <button className="mini-btn" disabled={free <= 0} onClick={() => keep(d.id)}>
                  {free > 0 ? 'В коллекцию' : 'Нет мест'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="spin-foot">
        {!pending && (
          <>
            <button className="count-btn" onClick={cycle} aria-label={`Крутить за раз: ${count}`}>
              ×{count}
            </button>
            {spins > 0 ? (
              <button className="btn-white big" onClick={() => onSpin(n)}>
                Крутить
                <span className="chip-in">
                  <Icon name="bolt" size={13} />
                  {n}
                </span>
              </button>
            ) : (
              <button className="btn-white big" onClick={onOpenSpins}>
                Купить крутки
              </button>
            )}
            <button className="foot-icon" onClick={onOdds} aria-label="Шансы выпадения">
              <Icon name="odds" size={20} />
              <span>Шансы</span>
            </button>
          </>
        )}
        {revealing && (
          <button className="btn-dark big" onClick={() => setSkipKey((k) => k + 1)}>
            Пропустить
          </button>
        )}
        {decided && pending.length > 1 && (
          <button className="btn-white big caps" onClick={() => onDecideAll('sell')}>
            Продать остальные · {fmtThin(restTotal)} ₽
          </button>
        )}
      </div>
    </div>
  );
}

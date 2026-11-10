import Plate from '../components/Plate.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { Rarity, Mods, platformLine } from '../components/Verdict.jsx';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import { LUCK_BONUS } from '../game/talismans.js';
import { fmtAt, fmtThin } from '../format.js';

// Карточка юза из коллекции
export default function ItemScreen({ drop, isTalisman, onSell, onScrap, onShare, onList, onTalisman, onUntalisman }) {
  if (!drop) return <div className="screen"><p className="note">Этого юза уже нет в коллекции.</p></div>;
  const tier = TIERS[drop.tier];
  // у талисмана продажа и разбор всегда с подтверждением: пропадёт удача
  const ask = drop.tier >= 3 || isTalisman;
  return (
    <div className="screen">
      <div className={`stage tier-${drop.tier}`} style={{ '--tier': tier.color }}>
        <span className="stage-glow" aria-hidden="true" />
        <div className="plate-wrap">
          <Plate name={drop.name} platform={drop.platform} series={drop.series} size="lg" />
        </div>
      </div>

      <div className="verdict">
        <button className="icon-btn stage-share" onClick={() => onShare(drop)} aria-label="Поделиться">
          <Icon name="share" size={18} />
        </button>
        <div className="result">
          <Rarity tier={drop.tier} />
          {drop.no > 0 && <div className="spin-no">№ {fmtThin(drop.no)}</div>}
          <div className="price-xl">
            {fmtThin(drop.price)}
            <span className="cur"> ₽</span>
          </div>
          <div className="price-at">≈ {fmtAt(drop.price)}</div>
          <div className="platform-line">{platformLine(drop)}</div>
          <Mods breakdown={drop.breakdown} />
        </div>
      </div>

      <div className="act">
        <button className="btn-white" onClick={onList}>
          На биржу
        </button>
        <ConfirmButton className="btn-sec" ask={ask} hint={fmtThin(sellValue(drop))} onConfirm={onSell}>
          Продать
        </ConfirmButton>
        <ConfirmButton className="btn-round" ask={ask} label={`Разобрать: +${scrapValue(drop)} ₽`} onConfirm={onScrap}>
          <Icon name="recycle" size={20} />
        </ConfirmButton>
      </div>
      <div className="act-hint">
        «На биржу» обычно выгоднее, чем «Продать» сразу. <Icon name="recycle" size={12} /> разобрать: +{fmtThin(scrapValue(drop))} ₽
      </div>

      <section className="tal-card">
        <div className="overline">Талисман</div>
        {isTalisman ? (
          <>
            <p className="note">Этот юз талисман редкости «{tier.name}»: даёт удачу +{LUCK_BONUS[drop.tier].toFixed(2)}.</p>
            <button className="btn-outline" onClick={onUntalisman}>
              Снять талисман
            </button>
          </>
        ) : (
          <>
            <p className="note">
              Талисман даёт удачу +{LUCK_BONUS[drop.tier].toFixed(2)}. Он один на редкость «{tier.name}»; если место занято, новый
              заменит прежний.
            </p>
            <button className="btn-outline" onClick={onTalisman}>
              Сделать талисманом
            </button>
          </>
        )}
      </section>

      <div>
        <div className="overline">Из чего цена</div>
        <PriceBreakdown breakdown={drop.breakdown} />
      </div>
    </div>
  );
}

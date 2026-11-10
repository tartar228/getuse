import AccountCard, { Nick } from '../components/AccountCard.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { Mods, CardFoot, platformLine } from '../components/Verdict.jsx';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import { LUCK_BONUS } from '../game/talismans.js';
import { fmtThin } from '../format.js';

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
        <AccountCard
          platform={drop.platform}
          tier={drop.tier}
          nick={<Nick text={`@${drop.name}`} />}
          sub={platformLine(drop)}
          foot={<CardFoot tier={drop.tier} price={drop.price} />}
        />
      </div>

      <div className="under">
        <div className="under-line">
          <span>{drop.no > 0 ? `№ ${fmtThin(drop.no)}` : ''}</span>
          <button className="icon-btn sm" onClick={() => onShare(drop)} aria-label="Поделиться">
            <Icon name="share" size={16} />
          </button>
        </div>
        <Mods breakdown={drop.breakdown} />
      </div>

      <div className="act">
        <button className="btn-white" onClick={onList}>
          На биржу
        </button>
        <ConfirmButton className="btn-sec" ask={ask} hint={`${fmtThin(sellValue(drop))} ₽`} onConfirm={onSell}>
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

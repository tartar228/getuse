import Icon from './Icon.jsx';
import { TIERS } from '../game/value.js';
import { modChips } from '../game/modifiers.js';
import { PLATFORMS } from '../game/platforms.js';
import { fmtMult } from '../format.js';

export function Rarity({ tier }) {
  const t = TIERS[tier];
  return (
    <div className="rarity" style={{ color: t.color }}>
      {tier >= 3 ? <Icon name="star" size={14} /> : <span className="rdot" style={{ background: t.color }} />}
      {t.name}
    </div>
  );
}

export function Mods({ breakdown }) {
  const chips = modChips(breakdown);
  return (
    <div className="mods">
      {chips.map((c) => (
        <span key={c.kind + c.label} className={c.off ? 'mod off' : 'mod'}>
          {c.label}
          {!c.off && <b className={c.mult < 1 ? 'down' : ''}> {fmtMult(c.mult)}</b>}
        </span>
      ))}
    </div>
  );
}

// «Telegram · Коллекционный»: платформа и пометка о длине; слово и множители видны в строке модификаторов
export function platformLine(d, extra = '') {
  const marks = d.tags.filter((t) => t === 'Коллекционный' || t === 'Короткий');
  return [PLATFORMS[d.platform].name, ...marks, extra].filter(Boolean).join(' · ');
}

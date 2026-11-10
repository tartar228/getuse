import { useState } from 'react';
import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { fairPrice, marketInfo, FEE } from '../game/market.js';
import { speedLabel } from './ExchangeScreen.jsx';
import { rub, rubAt, fmt, fmtDelta } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';

const PRESETS = [
  { label: '−20%', k: 0.8 },
  { label: '−10%', k: 0.9 },
  { label: 'Рынок', k: 1 },
  { label: '+10%', k: 1.1 },
  { label: '+25%', k: 1.25 },
];

// Выставить юз из коллекции на биржу по своей цене
export default function ListScreen({ drop, market, onList }) {
  const fair = drop ? fairPrice(market, marketInfo(drop)) : 0;
  const [text, setText] = useState(String(fair));
  if (!drop) {
    return (
      <div className="screen">
        <p className="note">Этого юза уже нет в коллекции.</p>
      </div>
    );
  }

  const ask = Math.round(Number(text.replace(/\s/g, '').replace(',', '.')));
  const valid = Number.isFinite(ask) && ask >= 1 && ask <= 1e9;
  const tier = TIERS[drop.tier];

  return (
    <div className="screen">
      <div className={`stage tier-${drop.tier}`} style={{ '--tier': tier.color }}>
        <div className="item-name">@{drop.name}</div>
        <div className="item-platform">
          <PlatformMark id={drop.platform} /> {PLATFORMS[drop.platform].name} · {tier.name}
        </div>
        <div className="price">Рыночная цена: {rubAt(fair)}</div>
      </div>

      <div className="card">
        <div className="card-title">Твоя цена, ₽</div>
        <input
          className="input"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d\s]/g, ''))}
        />
        <div className="chips" style={{ marginTop: 8 }}>
          {PRESETS.map((p) => (
            <button key={p.label} className="chip" onClick={() => setText(String(Math.max(1, Math.round(fair * p.k))))}>
              {p.label}
            </button>
          ))}
        </div>
        {valid && (
          <div style={{ marginTop: 10 }}>
            <div className="stat-row">
              <span>К рынку</span>
              <b className={ask / fair <= 1 ? 'mult up' : 'mult down'}>{fmtDelta(ask / fair)}</b>
            </div>
            <div className="stat-row">
              <span>Получишь после комиссии {Math.round(FEE * 100)}%</span>
              <b>{rub(Math.floor(ask * (1 - FEE)))}</b>
            </div>
            <div className="stat-row">
              <span>Продастся</span>
              <b>{speedLabel(ask, fair, drop.tier)}</b>
            </div>
          </div>
        )}
        <p className="note" style={{ marginTop: 8 }}>
          Чем дешевле относительно рынка, тем быстрее найдётся покупатель. Продажи на бирже сбивают цену платформы: не
          выставляй слишком много однотипного.
        </p>
      </div>

      <button className="btn primary big" disabled={!valid} onClick={() => onList(ask)}>
        {valid ? `Выставить за ${fmt(ask)} ₽` : 'Введи цену'}
      </button>
    </div>
  );
}

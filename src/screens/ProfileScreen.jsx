import Icon from '../components/Icon.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { useState } from 'react';
import { TIERS } from '../game/value.js';
import { perksOfLevel } from '../game/levels.js';
import { fmtAt, fmtLuck, fmtThin } from '../format.js';
import { fullscreen, userInfo } from '../telegram.js';

// ближайшие уровни с ништяками для списка
function upcoming(level, count = 4) {
  const out = [];
  for (let n = level + 1; out.length < count && n < level + 40; n++) {
    const p = perksOfLevel(n);
    if (p.length) out.push({ level: n, text: p.join(', ') });
  }
  return out;
}

// Профиль: уровень и ништяки, витрина из 3 лучших юзов, стоимость коллекции и статистика
export default function ProfileScreen({ items, coins, lifetime, level, luck, onOpen, onShare }) {
  const best = [...items].sort((a, b) => b.price - a.price || b.ts - a.ts).slice(0, 3);
  const total = items.reduce((s, d) => s + d.price, 0);
  const owned = TIERS.map((_, i) => items.filter((d) => d.tier === i).length);
  const me = userInfo();
  const [fs, setFs] = useState(fullscreen.enabled);

  return (
    <div className="screen">
      <div className="prof-head">
        <UserAvatar className="big" />
        <div className="prof-id">
          <h1 className="display">{me.name}</h1>
          {me.username && <div className="prof-user">@{me.username}</div>}
          <div className="chips-row">
            <span className="badge-chip">ур. {level.level}</span>
            <span className="badge-chip">в игре {fmtThin(lifetime.spins)} круток</span>
            <span className="badge-chip">удача {fmtLuck(luck)}</span>
          </div>
        </div>
      </div>

      <section>
        <div className="lvl-top">
          <span>
            Уровень {level.level} · {fmtThin(level.into)}/{fmtThin(level.need)}
          </span>
          <span className="muted">до следующего {fmtThin(level.need - level.into)} XP</span>
        </div>
        <ProgressBar value={level.into} max={level.need} label="Опыт" />
        <p className="note" style={{ marginTop: 8 }}>
          Опыт даёт каждая крутка (тем больше, чем реже юз), продажа на бирже, бонусы и награды заданий. Уровень на шансы не влияет: за
          каждый уровень монеты и 1 @, а ещё ништяки:
        </p>
        <div className="plain-list">
          {upcoming(level.level).map((p) => (
            <div className="stat-row" key={p.level}>
              <span>Уровень {p.level}</span>
              <b className="wrap">{p.text}</b>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="overline">Витрина</div>
        {best.length === 0 ? (
          <p className="note">Здесь появятся три самых дорогих юза из твоей коллекции.</p>
        ) : (
          <div className="plain-list">
            {best.map((d, i) => (
              <button key={d.id} className="crow" onClick={() => onOpen(d.id)}>
                <span className="crow-main">
                  <span className="rtier" style={{ color: TIERS[d.tier].color }}>
                    <span className="rdot" style={{ background: TIERS[d.tier].color }} />
                    {i + 1} · {TIERS[d.tier].name}
                  </span>
                  <span className="rnick">
                    <Icon name={d.platform} size={14} />@{d.name}
                  </span>
                </span>
                <span className="crow-price">
                  {fmtThin(d.price)} ₽<small>({fmtAt(d.price)})</small>
                </span>
              </button>
            ))}
          </div>
        )}
        {best.length > 0 && (
          <button className="link" onClick={() => onShare(best[0])}>
            Поделиться лучшим юзом
          </button>
        )}
      </section>

      {fullscreen.available && (
        <section>
          <div className="overline">Настройки</div>
          <button
            className="switch-row"
            role="switch"
            aria-checked={fs}
            onClick={() => {
              fullscreen.set(!fs);
              setFs(!fs);
            }}
          >
            <span>Полный экран</span>
            <span className={fs ? 'switch on' : 'switch'} aria-hidden="true" />
          </button>
          <p className="note">Сверху остаётся зона кнопок Telegram. Если она кажется пустой, выключи: игра откроется в обычном окне.</p>
        </section>
      )}

      <section>
        <div className="overline">Статистика</div>
        <div className="plain-list">
          <div className="stat-row">
            <span>Баланс</span>
            <b>
              {fmtThin(coins)} ₽ <span className="muted">({fmtAt(coins)})</span>
            </b>
          </div>
          <div className="stat-row">
            <span>Стоимость коллекции</span>
            <b>
              {fmtThin(total)} ₽ <span className="muted">({fmtAt(total)})</span>
            </b>
          </div>
          <div className="stat-row">
            <span>Юзов в коллекции</span>
            <b>{items.length}</b>
          </div>
          <div className="stat-row">
            <span>Всего круток</span>
            <b>{fmtThin(lifetime.spins)}</b>
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
      </section>
    </div>
  );
}

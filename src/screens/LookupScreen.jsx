import { useEffect, useMemo, useState } from 'react';
import AccountCard, { Nick } from '../components/AccountCard.jsx';
import Icon from '../components/Icon.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { Mods, CardFoot, platformLine } from '../components/Verdict.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { lookup, nameProblem, normalizeName } from '../game/lookup.js';
import { fmtAt, fmtThin } from '../format.js';
import { haptic } from '../telegram.js';

// Своя клавиатура: нижний регистр, цифры и разделители. Ряды как на обычной раскладке.
const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const LAST = ['.', '_', '-'];

// Пробив: введи любой юз и узнай, сколько он стоил бы в игре. Оценка по тем же правилам, что у выпавших юзов.
export default function LookupScreen({ platform: initialPlatform }) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const p = PLATFORMS[platform];

  const name = normalizeName(text);
  const problem = useMemo(() => (name ? nameProblem(name, platform) : 'Введи юз'), [name, platform]);

  const press = (ch) => {
    haptic.select();
    setText((t) => (t.length < p.maxLen ? t + ch : t));
  };
  const erase = () => {
    haptic.select();
    setText((t) => t.slice(0, -1));
  };
  const run = () => {
    if (problem) return;
    haptic.success();
    setResult(lookup(name, platform));
  };

  // физическая клавиатура (компьютер): буквы, цифры, разделители, Backspace, Enter
  useEffect(() => {
    if (result) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') erase();
      else if (e.key === 'Enter') run();
      else if (/^[a-zA-Z0-9._-]$/.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const again = () => {
    setResult(null);
    setText('');
  };

  if (result && !result.problem) {
    const r = result;
    return (
      <div className="screen lookup">
        <div className="overline">Пробив юза</div>
        <AccountCard
          platform={r.platform}
          tier={r.tier}
          nick={<Nick text={`@${r.name}`} />}
          sub={platformLine(r)}
          foot={<CardFoot tier={r.tier} price={r.price} animate />}
          className="lk-card"
        />
        <Mods breakdown={r.breakdown} />

        <div>
          <div className="overline">Из чего цена</div>
          <PriceBreakdown breakdown={r.breakdown} />
        </div>

        {r.others.length > 0 && (
          <div>
            <div className="overline">На других платформах</div>
            <div className="plain-list">
              {r.others.map((o) => (
                <div className="stat-row" key={o.platform}>
                  <span>
                    <Icon name={o.platform} size={14} /> {PLATFORMS[o.platform].name}
                  </span>
                  <b>
                    {fmtThin(o.price)} ₽ <span className="muted">({fmtAt(o.price)})</span>
                  </b>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="note">Оценка игровая: юзы выдуманные и с настоящими аккаунтами никак не связаны.</p>
        <button className="btn-white big" onClick={again}>
          Пробить другой юз
        </button>
      </div>
    );
  }

  return (
    <div className="screen lookup">
      <div>
        <div className="overline">Пробив юза</div>
        <h1 className="display">Введи юз</h1>
        <p className="note">Узнаешь, сколько он стоил бы в игре: оценка по тем же правилам, что у выпавших юзов.</p>
      </div>

      <div className="seg-row" role="tablist">
        {PLATFORM_ORDER.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === platform}
            className={id === platform ? 'seg-pill active' : 'seg-pill'}
            onClick={() => {
              haptic.select();
              setPlatform(id);
            }}
          >
            {PLATFORMS[id].name.replace(' (Twitter)', '')}
          </button>
        ))}
      </div>

      <AccountCard
        platform={platform}
        nick={<Nick text={`@${name || 'username'}`} className={name ? '' : 'idle'} after={<span className="caret" aria-hidden="true" />} />}
        sub={PLATFORMS[platform].name}
        className="lk-card"
      />
      <div className={name && problem ? 'lk-hint bad' : 'lk-hint'}>
        {name && problem ? problem : p.rules.slice(0, 2).join(' · ')}
      </div>

      <div className="kbd" role="group" aria-label="Клавиатура">
        {ROWS.map((row, i) => (
          <div className="kbd-row" key={row}>
            {[...row].map((ch) => (
              <button key={ch} className="key" onClick={() => press(ch)}>
                {ch}
              </button>
            ))}
            {i === ROWS.length - 1 && (
              <button className="key wide" onClick={erase} aria-label="Стереть">
                <Icon name="backspace" size={20} />
              </button>
            )}
          </div>
        ))}
        <div className="kbd-row">
          {LAST.map((ch) => (
            <button key={ch} className="key" onClick={() => press(ch)}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-white big caps" disabled={Boolean(problem)} onClick={run}>
        Пробить · бесплатно
      </button>
    </div>
  );
}

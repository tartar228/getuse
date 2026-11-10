import { cloneElement, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { TIERS } from '../game/value.js';
import { haptic } from '../telegram.js';

// Карточка юза в виде шапки профиля из интерфейса соцсети. У каждой платформы свой вид (цвета, аватар, значки):
// Telegram, TikTok, Instagram, X, YouTube; размер у всех одинаковый. Цвет редкости идёт в --tier.
// Значок «подтверждён» появляется у эпических и выше (у мифика на X он золотой).
export default function AccountCard({ platform, tier = null, nick, sub, foot, spinning = false, className = '' }) {
  const verified = tier !== null && tier >= 3;
  const badge = verified ? (
    <span className={tier >= 5 ? 'vbadge gold' : 'vbadge'} aria-label="подтверждён">
      <Icon name="verified" size={18} />
    </span>
  ) : null;
  const nickNode =
    badge && isValidElement(nick) && nick.type === Nick
      ? cloneElement(nick, { reserve: 24, after: (<>{nick.props.after}{badge}</>) })
      : nick;
  return (
    <div
      className={`acard ${spinning ? 'spinning' : ''} ${className}`}
      data-p={platform}
      style={tier === null ? undefined : { '--tier': TIERS[tier].color }}
    >
      {platform === 'telegram' && (
        <span className="acard-deco" aria-hidden="true">
          <Icon name="qr" size={18} />
        </span>
      )}
      <div className="acard-top">
        <span className="av">
          <Icon name={platform} size={22} />
          {platform === 'tiktok' && (
            <i className="av-plus" aria-hidden="true">
              <Icon name="plus" size={11} />
            </i>
          )}
        </span>
        <div className="acard-id">
          {nickNode}
          {sub && <div className="acard-sub">{sub}</div>}
        </div>
      </div>
      {foot && <div className="acard-foot">{foot}</div>}
    </div>
  );
}

// ---------- подгонка ника под ширину ----------
let ctx;
const canvas = () => (ctx ||= document.createElement('canvas').getContext('2d'));

// ширина каждого символа в em и размер шрифта, при котором ник влезает в строку
function fitText(el, text, min, max, reserve = 0) {
  const cs = getComputedStyle(el);
  const c = canvas();
  c.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
  const widths = [...text].map((ch) => c.measureText(ch).width / 100);
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const size = Math.max(min, Math.min(max, Math.floor((((el.clientWidth - reserve) * 0.98) / total) * 10) / 10));
  return { widths, size };
}

const REEL = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rnd = () => REEL[Math.floor(Math.random() * REEL.length)];
// лента символов барабана: последний равен первому, чтобы прокрутка зацикливалась
const makeStrip = () => {
  const s = Array.from({ length: 7 }, rnd);
  return [...s, s[0]];
};

// Ник крупным шрифтом приложения. С `reel` символы крутятся барабанами по вертикали с размытием
// и останавливаются слева направо с лёгким «перелётом»; у дорогих редкостей последние символы тормозят дольше.
// reel = { tier, skipKey, onDone, instant }: skipKey при смене останавливает всё сразу.
export function Nick({ text, reel, className = '', after, reserve = 0 }) {
  const box = useRef(null);
  const [fit, setFit] = useState({ widths: [], size: 30 });

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const run = () => setFit(fitText(el, text, 14, 30, reserve));
    run();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, reserve]);

  return (
    <div ref={box} className={`nick ${className}`} style={{ fontSize: fit.size }} aria-label={text}>
      {reel ? <Reels text={text} widths={fit.widths} {...reel} /> : text}
      {after}
    </div>
  );
}

function Reels({ text, widths, tier, skipKey, onDone, instant = false }) {
  const len = text.length;
  const [locked, setLocked] = useState(instant ? len : 1); // «@» стоит сразу
  const lockedRef = useRef(1);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finishRef = useRef(null);
  const startInstant = useRef(instant).current;
  const strips = useMemo(() => [...text].map(makeStrip), [text]);

  useEffect(() => {
    if (startInstant) return undefined;
    let cancelled = false;
    let timer;
    lockedRef.current = 1;
    setLocked(1);

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timer);
      lockedRef.current = len;
      setLocked(len);
      doneRef.current?.();
    };
    finishRef.current = finish;

    const delayFor = (i) => 110 + (i >= len - 2 ? tier * 140 : 0);
    const lockNext = () => {
      if (cancelled) return;
      lockedRef.current += 1;
      setLocked(lockedRef.current);
      haptic.select();
      if (lockedRef.current >= len) finish();
      else timer = setTimeout(lockNext, delayFor(lockedRef.current));
    };
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer = reduced ? setTimeout(finish, 150) : setTimeout(lockNext, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, tier, len, startInstant]);

  const prevSkip = useRef(skipKey);
  useEffect(() => {
    if (prevSkip.current === skipKey) return;
    prevSkip.current = skipKey;
    finishRef.current?.();
  }, [skipKey]);

  return [...text].map((ch, i) => {
    const w = { width: `${widths[i] ?? 0.6}em` };
    return i < locked ? (
      <span key={`l${i}`} className={startInstant ? 'reel done still' : 'reel done'} style={w}>
        <span className="reel-final">{ch}</span>
      </span>
    ) : (
      <span key={`r${i}`} className="reel" style={w}>
        <span className="reel-strip" style={{ animationDelay: `${-((i * 67) % 320)}ms` }}>
          {strips[i].map((c, j) => (
            <i key={j}>{c}</i>
          ))}
        </span>
      </span>
    );
  });
}

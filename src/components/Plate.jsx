import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { PLATFORMS } from '../game/platforms.js';
import { haptic } from '../telegram.js';

// Юзернейм в виде номерной плашки: белая рамка, слева юз узким моноширинным шрифтом,
// справа отделённый вертикальной линией «регион» — код платформы и значок.
// Размеры: lg — главная плашка с отражением, md/sm/xs — мини-плашки для списков.
// series — цветная особая серия: red, blue, yellow, black (см. seriesOf в game/value.js).

// размер шрифта главной плашки так, чтобы любой юз влезал в одну строку
export const plateFont = (len) => Math.max(14, Math.min(42, Math.floor(270 / ((len + 1) * 0.6))));

export function PlateShell({ platform, size = 'md', series, fs, className = '', children }) {
  return (
    <div className={`plate ${size} ${series ? `s-${series}` : ''} ${className}`} style={fs ? { '--fs': `${fs}px` } : undefined}>
      <div className="plate-main">{children}</div>
      <div className="plate-region">
        <b>{PLATFORMS[platform].icon}</b>
        <Icon name={platform} size={size === 'lg' ? 15 : 11} />
      </div>
    </div>
  );
}

// Статичная плашка
export default function Plate({ name, platform, size = 'md', series, className }) {
  return (
    <PlateShell platform={platform} size={size} series={series} className={className} fs={size === 'lg' ? plateFont(name.length) : undefined}>
      <span className="plate-text" aria-label={`@${name}`}>
        @{name}
      </span>
    </PlateShell>
  );
}

const REEL = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rnd = () => REEL[Math.floor(Math.random() * REEL.length)];
// лента символов для одного барабана: последний символ равен первому, чтобы прокрутка зацикливалась
const makeStrip = () => {
  const s = Array.from({ length: 7 }, rnd);
  return [...s, s[0]];
};

// Плашка с барабанами: символы крутятся по вертикали с размытием и останавливаются
// слева направо с лёгким «перелётом». У дорогих тиров последние символы тормозят дольше.
// skipKey: при смене значения остановка происходит мгновенно.
export function ReelPlate({ name, platform, tier, series, skipKey, onDone, instant = false }) {
  const [locked, setLocked] = useState(instant ? name.length : 0);
  const lockedRef = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finishRef = useRef(null);
  const startInstant = useRef(instant).current;
  const strips = useMemo(() => [...name].map(makeStrip), [name]);

  useEffect(() => {
    const len = name.length;
    let cancelled = false;
    let timer;
    if (startInstant) {
      lockedRef.current = len;
      setLocked(len);
      return undefined;
    }
    lockedRef.current = 0;
    setLocked(0);

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
  }, [name, tier, startInstant]);

  const prevSkip = useRef(skipKey);
  useEffect(() => {
    if (prevSkip.current === skipKey) return;
    prevSkip.current = skipKey;
    finishRef.current?.();
  }, [skipKey]);

  return (
    <PlateShell platform={platform} size="lg" series={series} fs={plateFont(name.length)}>
      <span className="plate-text reels" aria-label={`@${name}`}>
        <span className="reel-at">@</span>
        {[...name].map((ch, i) =>
          i < locked ? (
            <span key={`l${i}`} className={startInstant ? 'reel done still' : 'reel done'}>
              <span className="reel-final">{ch}</span>
            </span>
          ) : (
            <span key={`r${i}`} className="reel">
              <span className="reel-strip" style={{ animationDelay: `${-((i * 67) % 320)}ms` }}>
                {strips[i].map((c, j) => (
                  <i key={j}>{c}</i>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
    </PlateShell>
  );
}

// Пустая плашка (до первой крутки)
export function IdlePlate({ platform }) {
  return (
    <PlateShell platform={platform} size="lg" fs={38}>
      <span className="plate-text idle">@?????</span>
    </PlateShell>
  );
}

import { useEffect, useRef, useState } from 'react';
import { haptic } from '../telegram.js';

const SCRAMBLE = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rnd = () => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];

// Символы раскрываются по очереди слева направо, как барабаны слот-машины.
// У дорогих тиров последние символы раскрываются медленнее — интрига.
// skipKey: при смене значения раскрытие мгновенно завершается.
export default function SlotReveal({ name, tier, skipKey, onDone, instant = false }) {
  const [locked, setLocked] = useState(instant ? name.length : 0);
  const [scramble, setScramble] = useState(() => [...name].map(rnd));
  const lockedRef = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finishRef = useRef(null);
  // дроп уже раскрыт (например, восстановлен из сохранения) — анимацию не играем
  const startInstant = useRef(instant).current;

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

    const spinner = setInterval(() => {
      setScramble([...name].map((_, i) => (i < lockedRef.current ? name[i] : rnd())));
    }, 55);

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timer);
      clearInterval(spinner);
      lockedRef.current = len;
      setLocked(len);
      doneRef.current?.();
    };
    finishRef.current = finish;

    const delayFor = (i) => {
      const base = 120;
      const lastTwo = i >= len - 2;
      return base + (lastTwo ? tier * 140 : 0);
    };

    const lockNext = () => {
      if (cancelled) return;
      lockedRef.current += 1;
      setLocked(lockedRef.current);
      haptic.tick();
      if (lockedRef.current >= len) {
        finish();
      } else {
        timer = setTimeout(lockNext, delayFor(lockedRef.current));
      }
    };
    timer = setTimeout(lockNext, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(spinner);
    };
  }, [name, tier, startInstant]);

  const prevSkip = useRef(skipKey);
  useEffect(() => {
    if (prevSkip.current === skipKey) return;
    prevSkip.current = skipKey;
    finishRef.current?.();
  }, [skipKey]);

  // чтобы длинные юзы влезали в одну строку
  const size = Math.max(20, Math.min(38, Math.floor(300 / (name.length + 1) / 0.62)));

  return (
    <div className="slot" style={{ fontSize: size }} aria-label={name}>
      <span className="slot-at">@</span>
      {[...name].map((ch, i) => (
        <span key={i} className={i < locked ? 'slot-ch locked' : 'slot-ch'}>
          {i < locked ? ch : scramble[i]}
        </span>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { fmtThin } from '../format.js';

// Число со счётчиком: при смене значения плавно докручивается от прежнего (или от `from` при первом показе).
export default function Num({ value, from, duration = 650, format = fmtThin }) {
  const [shown, setShown] = useState(from ?? value);
  const cur = useRef(from ?? value);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const a = cur.current;
    if (reduced || a === value) {
      cur.current = value;
      setShown(value);
      return undefined;
    }
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const v = a + (value - a) * (1 - Math.pow(1 - k, 3));
      cur.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(Math.round(shown))}</>;
}

import { useEffect, useState } from 'react';

// Кнопка необратимого действия: у дорогих юзов (ask) нужно нажать дважды, второе нажатие в течение 3 секунд.
// className — вид кнопки (по умолчанию вторичная), label — подпись для круглых кнопок без текста.
export default function ConfirmButton({ ask, hint, onConfirm, children, className = 'btn', label, disabled }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const click = () => {
    if (ask && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  return (
    <button className={armed ? `${className} armed` : className} onClick={click} aria-label={label} disabled={disabled}>
      {armed ? (
        <>
          Точно?
          {hint !== undefined && <small>ещё раз</small>}
        </>
      ) : (
        <>
          {children}
          {hint !== undefined && <small>{hint}</small>}
        </>
      )}
    </button>
  );
}

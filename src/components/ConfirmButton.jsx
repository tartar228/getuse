import { useEffect, useState } from 'react';

// Кнопка необратимого действия: у дорогих юзов (ask) нужно нажать дважды, второе нажатие в течение 3 секунд.
export default function ConfirmButton({ ask, hint, onConfirm, children }) {
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
    <button className={armed ? 'btn armed' : 'btn'} onClick={click}>
      {armed ? 'Точно?' : children}
      <small>{armed ? 'нажми ещё раз' : hint}</small>
    </button>
  );
}

import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// Шторка снизу: оверлайн, огромный заголовок капсом, круглая кнопка закрытия.
// Закрывается по тапу на затемнение и по ✕; на закрытие есть короткая анимация.
export default function BottomSheet({ open, onClose, overline, title, children }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;
  return (
    <div className={closing ? 'sheet-wrap out' : 'sheet-wrap'} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            {overline && <div className="overline">{overline}</div>}
            <h2 className="display">{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

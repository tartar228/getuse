// Тосты: стеклянные пилюли сверху. Не забирают фокус, экранные читалки озвучивают их вежливо (aria-live).
export default function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          {t.title && <b>{t.title}</b>}
          {t.text}
        </div>
      ))}
    </div>
  );
}

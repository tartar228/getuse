// Мини-график индекса цены (100 = норма)
export default function Sparkline({ values, color = 'var(--accent)' }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values, 100);
  const max = Math.max(...values, 100);
  const span = Math.max(1, max - min);
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / span) * 26).toFixed(1)}`)
    .join(' ');
  const base = 28 - ((100 - min) / span) * 26;
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1={base} y2={base} stroke="var(--line)" strokeDasharray="2 2" strokeWidth="0.6" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

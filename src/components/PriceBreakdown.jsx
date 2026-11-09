import { rub, fmtMult } from '../format.js';

// «Из чего цена»: база за длину и список множителей с пояснением
export default function PriceBreakdown({ breakdown }) {
  return (
    <div className="calc">
      <div className="calc-row">
        <span>База за длину ({breakdown.len} симв.)</span>
        <span>{rub(breakdown.base)}</span>
      </div>
      {breakdown.rows.map((r) => (
        <div className="calc-row" key={r.label}>
          <span>{r.label}</span>
          <span className={r.mult >= 1 ? 'mult up' : 'mult down'}>{fmtMult(r.mult)}</span>
        </div>
      ))}
    </div>
  );
}

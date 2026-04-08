import { cn } from '@/lib/utils';
import type { QtyMismatchRow } from '../types';

const COLUMN_ORDER = [
  'lineNo',
  'sku',
  'orderedQty',
  'packedQty',
  'shippedQty',
  'orderedQtyFromCsv',
  'code',
  'tolerancePct',
  'deviationPct',
  'signedDeltaQty',
  'signedDeviationPct',
  'direction',
];

function headerLabel(key: string): string {
  const map: Record<string, string> = {
    lineNo: 'Line',
    sku: 'SKU',
    orderedQty: 'Ordered qty',
    packedQty: 'Packed qty',
    shippedQty: 'Shipped qty',
    orderedQtyFromCsv: 'Ordered (file)',
    code: 'Code',
    tolerancePct: 'Tolerance %',
    deviationPct: 'Deviation %',
    signedDeltaQty: 'Δ Qty',
    signedDeviationPct: 'Δ %',
    direction: 'Direction',
  };
  if (map[key]) return map[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—';
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function columnKeys(rows: QtyMismatchRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) set.add(k);
  }
  const ordered = COLUMN_ORDER.filter((k) => set.has(k));
  const rest = [...set].filter((k) => !COLUMN_ORDER.includes(k)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function QtyMismatchRowsTable({
  rows,
  className,
  title,
}: {
  rows: QtyMismatchRow[];
  className?: string;
  /** Optional heading above the table */
  title?: string;
}) {
  if (!rows.length) return null;
  const keys = columnKeys(rows);
  return (
    <div className={cn('space-y-2', className)}>
      {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        <table className="w-full min-w-[min(100%,720px)] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/80">
              {keys.map((k) => (
                <th
                  key={k}
                  className="whitespace-nowrap px-2 py-2.5 font-semibold text-foreground first:pl-3 last:pr-3"
                >
                  {headerLabel(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 odd:bg-muted/15">
                {keys.map((k) => (
                  <td
                    key={k}
                    className="max-w-[14rem] whitespace-nowrap px-2 py-2 align-top tabular-nums text-foreground first:pl-3 last:pr-3"
                  >
                    <span className="inline-block max-w-full truncate align-top" title={formatCell(row[k])}>
                      {formatCell(row[k])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

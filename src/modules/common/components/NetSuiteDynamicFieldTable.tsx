import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Row = Record<string, unknown>;

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export type NetSuiteDynamicFieldTableProps = {
  rows: Row[];
  isLoading?: boolean;
  /** Optional stable row key from field names */
  rowKeyFields?: string[];
  className?: string;
  emptyMessage?: string;
  /** NetSuite field id → header label (falls back to id). */
  columnLabels?: Record<string, string>;
  /** Preferred column order (e.g. org `item_fields`); remaining keys sort after. */
  columnsOrder?: string[];
};

/**
 * Renders arbitrary NetSuite line rows: union of all keys becomes table columns (sorted, or ordered by `columnsOrder` first).
 */
export function NetSuiteDynamicFieldTable({
  rows,
  isLoading,
  rowKeyFields = ['line_id', 'line_no', 'id', 'sku'],
  className,
  emptyMessage = 'No line rows returned.',
  columnLabels,
  columnsOrder,
}: NetSuiteDynamicFieldTableProps) {
  const columns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => s.add(k)));
    const all = Array.from(s);
    const preferred = (columnsOrder ?? []).filter((c) => s.has(c));
    const rest = all.filter((c) => !preferred.includes(c)).sort((a, b) => a.localeCompare(b));
    return [...preferred, ...rest];
  }, [rows, columnsOrder]);

  const rowKey = (row: Row, idx: number) => {
    for (const k of rowKeyFields) {
      const v = row[k];
      if (v != null && String(v).trim() !== '') return `${k}:${String(v)}`;
    }
    return `row-${idx}`;
  };

  if (isLoading) {
    return (
      <div className={cn('flex min-h-[100px] items-center justify-center gap-2 rounded-xl border border-border/80 py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading line data…</span>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className={cn('rounded-lg border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border/80 shadow-sm', className)}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => {
              const header = columnLabels?.[col]?.trim() || col;
              return (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  title={columnLabels?.[col] && columnLabels[col] !== col ? col : undefined}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={rowKey(row, idx)} className="border-b border-border/40 last:border-0 odd:bg-muted/[0.15]">
              {columns.map((col) => (
                <td key={col} className="max-w-[min(280px,40vw)] px-3 py-2 align-top font-mono text-xs break-words text-foreground">
                  {cellStr(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

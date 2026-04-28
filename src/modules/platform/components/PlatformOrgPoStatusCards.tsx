import type { PlatformOrgMetrics } from '../types';
import { cn } from '@/lib/utils';

type MetricsInput = PlatformOrgMetrics | Record<string, unknown> | undefined;

function asRecord(m: MetricsInput): Record<string, unknown> {
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

export function metricsHasPoStatusBreakdown(metrics: MetricsInput): boolean {
  const poByStatus = pickPoByStatus(asRecord(metrics));
  return !!(poByStatus && Object.keys(poByStatus).length > 0);
}

function pickPoByStatus(obj: Record<string, unknown>): Record<string, number> | null {
  const raw =
    obj.poByStatus ??
    obj.po_by_status ??
    obj.purchaseOrdersByStatus ??
    obj.po_counts_by_status;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && !Number.isNaN(Number(v))) out[k] = Number(v);
  }
  return Object.keys(out).length ? out : null;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const ACCENT = [
  'border-l-blue-500/80 bg-blue-500/[0.06]',
  'border-l-emerald-500/80 bg-emerald-500/[0.06]',
  'border-l-amber-500/80 bg-amber-500/[0.06]',
  'border-l-violet-500/80 bg-violet-500/[0.06]',
  'border-l-sky-500/80 bg-sky-500/[0.06]',
  'border-l-rose-500/80 bg-rose-500/[0.06]',
  'border-l-teal-500/80 bg-teal-500/[0.06]',
];

/** Compact PO counts by workflow/status — driven by metrics.poByStatus-style payloads from GET organization. */
export function PlatformOrgPoStatusCards({ metrics }: { metrics: MetricsInput }) {
  const poByStatus = pickPoByStatus(asRecord(metrics));
  if (!poByStatus || Object.keys(poByStatus).length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/25 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No PO status breakdown</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Status counts appear when the API includes poByStatus (or equivalent) on organization metrics.
        </p>
      </div>
    );
  }

  const sorted = Object.entries(poByStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">Purchase orders by status</h3>
          <p className="text-xs text-muted-foreground">Counts from tenant metrics snapshot</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map(([status, count], i) => (
          <div
            key={status}
            className={cn(
              'rounded-2xl border border-border/60 border-l-[4px] p-4 shadow-sm transition-colors',
              ACCENT[i % ACCENT.length]
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{humanizeKey(status)}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

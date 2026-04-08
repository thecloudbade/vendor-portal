import type { PlatformOrgMetrics } from '../types';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Building2, FileText, Layers, Send, Users } from 'lucide-react';

type MetricsInput = PlatformOrgMetrics | Record<string, unknown> | undefined;

function asRecord(m: MetricsInput): Record<string, unknown> {
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

function num(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
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

function formatScalar(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

const USED_KEYS = new Set([
  'purchaseOrderCount',
  'purchase_order_count',
  'poCount',
  'totalPurchaseOrders',
  'total_purchase_orders',
  'vendorCount',
  'vendor_count',
  'vendorsCount',
  'vendorUserCount',
  'vendor_user_count',
  'vendorUsersCount',
  'submissionCount',
  'submission_count',
  'submissionsCount',
  'poByStatus',
  'po_by_status',
  'purchaseOrdersByStatus',
]);

interface StatTileProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  borderClass: string;
  iconWrapClass: string;
}

function StatTile({ label, value, icon: Icon, borderClass, iconWrapClass }: StatTileProps) {
  return (
    <div
      className={cn(
        'surface-card-interactive rounded-2xl border border-border/60 p-5 shadow-card',
        borderClass
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1 tabular-nums">{value}</p>
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            iconWrapClass
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}

export function PlatformOrgMetricsDashboard({ metrics }: { metrics: MetricsInput }) {
  const o = asRecord(metrics);
  const po =
    num(
      o,
      'purchaseOrderCount',
      'purchase_order_count',
      'poCount',
      'totalPurchaseOrders',
      'total_purchase_orders'
    ) ?? '—';
  const vendors =
    num(o, 'vendorCount', 'vendor_count', 'vendorsCount') ?? '—';
  const vendorUsers =
    num(o, 'vendorUserCount', 'vendor_user_count', 'vendorUsersCount') ?? '—';
  const submissions =
    num(o, 'submissionCount', 'submission_count', 'submissionsCount') ?? '—';

  const poByStatus = pickPoByStatus(o);
  const maxStatus = poByStatus
    ? Math.max(1, ...Object.values(poByStatus).map((n) => (typeof n === 'number' ? n : 0)))
    : 0;

  const extras: { key: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(o)) {
    if (USED_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) continue;
    extras.push({ key, value });
  }

  const nestedExtras: { key: string; value: Record<string, unknown> }[] = [];
  for (const [key, value] of Object.entries(o)) {
    if (USED_KEYS.has(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      nestedExtras.push({ key, value: value as Record<string, unknown> });
    }
  }

  const showKpiRow =
    po !== '—' ||
    vendors !== '—' ||
    vendorUsers !== '—' ||
    submissions !== '—' ||
    (poByStatus && Object.keys(poByStatus).length > 0);

  if (!showKpiRow && extras.length === 0 && nestedExtras.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
        No metrics returned for this organization yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showKpiRow ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Purchase orders"
          value={po}
          icon={FileText}
          borderClass="border-l-4 border-l-blue-500/80"
          iconWrapClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatTile
          label="Vendors"
          value={vendors}
          icon={Building2}
          borderClass="border-l-4 border-l-slate-400/90"
          iconWrapClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
        />
        <StatTile
          label="Vendor users"
          value={vendorUsers}
          icon={Users}
          borderClass="border-l-4 border-l-emerald-500/75"
          iconWrapClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        />
        <StatTile
          label="Submissions"
          value={submissions}
          icon={Send}
          borderClass="border-l-4 border-l-violet-500/75"
          iconWrapClass="bg-violet-500/10 text-violet-700 dark:text-violet-400"
        />
      </div>
      ) : null}

      {poByStatus && Object.keys(poByStatus).length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card shadow-card">
          <div className="border-b border-border/60 bg-muted/25 px-5 py-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-base font-semibold leading-tight">POs by status</h3>
                <p className="text-sm text-muted-foreground">Distribution across purchase order states</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {Object.entries(poByStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = maxStatus > 0 ? Math.round((count / maxStatus) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{humanizeKey(status)}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {(extras.length > 0 || nestedExtras.length > 0) && (
        <div className="rounded-2xl border border-border/80 bg-card shadow-card">
          <div className="border-b border-border/60 bg-muted/25 px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-base font-semibold leading-tight">Additional metrics</h3>
                <p className="text-sm text-muted-foreground">Other fields returned by the API</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {extras.map(({ key, value }) => (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="text-muted-foreground">{humanizeKey(key)}</span>
                <span className="font-medium tabular-nums text-foreground">{formatScalar(value)}</span>
              </div>
            ))}
            {nestedExtras.map(({ key, value }) => (
              <div key={key} className="px-5 py-4">
                <p className="mb-2 text-sm font-medium text-foreground">{humanizeKey(key)}</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(value).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                    >
                      <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
                      <dd className="text-right font-medium text-foreground">{formatScalar(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

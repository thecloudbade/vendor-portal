import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrganizationsRollupPages } from '../api/platform.api';
import {
  aggregateOrgDirectoryMetrics,
  readNumericMetric,
  sortOrgsByPurchaseOrderVolume,
} from '../utils/aggregateOrgMetrics';
import type { PlatformOrgListItem } from '../types';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTES } from '@/modules/common/constants/routes';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Building2,
  FileText,
  Layers,
  Loader2,
  Send,
  Store,
  Users,
} from 'lucide-react';

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function StatTile({
  label,
  value,
  icon: Icon,
  borderClass,
  iconWrapClass,
}: {
  label: string;
  value: number | string;
  icon: typeof FileText;
  borderClass: string;
  iconWrapClass: string;
}) {
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
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconWrapClass)}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}

export function PlatformOverviewPage() {
  const navigate = useNavigate();

  const rollupQuery = useQuery({
    queryKey: ['platform', 'organizations', 'rollup-pages'],
    queryFn: fetchOrganizationsRollupPages,
    staleTime: 45_000,
  });

  const orgs = rollupQuery.data?.organizations ?? [];
  const agg = useMemo(() => aggregateOrgDirectoryMetrics(orgs), [orgs]);
  const sortedTop = useMemo(() => sortOrgsByPurchaseOrderVolume(orgs).slice(0, 25), [orgs]);

  const poStatusEntries = useMemo(() => Object.entries(agg.poByStatus).sort((a, b) => b[1] - a[1]), [agg.poByStatus]);
  const maxPoStatus = poStatusEntries.length ? Math.max(1, ...poStatusEntries.map(([, n]) => n)) : 1;

  const orgPickerSorted = useMemo(
    () => [...orgs].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id)),
    [orgs]
  );

  const truncatedBanner =
    rollupQuery.data?.truncated === true ? (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        Totals aggregate <strong>{orgs.length}</strong> organizations loaded — directory reports{' '}
        <strong>{rollupQuery.data?.apiReportedTotalOrgs ?? orgs.length}</strong> total tenants. Increase pagination sync on the
        backend if clusters exceed {orgs.length}.
      </div>
    ) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Platform overview"
          description="Cross-tenant analytics, tenant picker, and PO pipeline indicators. Open Sessions in the sidebar for audit telemetry."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={ROUTES.PLATFORM.ORGANIZATIONS}>
              Organization directory
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {rollupQuery.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading tenant metrics…
        </div>
      ) : rollupQuery.isError ? (
        <p className="text-sm text-destructive">{(rollupQuery.error as Error).message}</p>
      ) : (
        <>
          {truncatedBanner}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Organizations onboarded"
              value={rollupQuery.data?.apiReportedTotalOrgs ?? orgs.length}
              icon={Building2}
              borderClass="border-l-4 border-l-violet-500/80"
              iconWrapClass="bg-violet-500/10 text-violet-700 dark:text-violet-400"
            />
            <StatTile
              label="Purchase orders (summed)"
              value={agg.purchaseOrders || '—'}
              icon={FileText}
              borderClass="border-l-4 border-l-blue-500/80"
              iconWrapClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatTile
              label="Vendors"
              value={agg.vendors || '—'}
              icon={Store}
              borderClass="border-l-4 border-l-slate-400/90"
              iconWrapClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
            />
            <StatTile
              label="Vendor portal users"
              value={agg.vendorUsers || '—'}
              icon={Users}
              borderClass="border-l-4 border-l-amber-500/75"
              iconWrapClass="bg-amber-500/10 text-amber-800 dark:text-amber-400"
            />
            <StatTile
              label="Vendor submissions"
              value={agg.submissions || '—'}
              icon={Send}
              borderClass="border-l-4 border-l-emerald-500/75"
              iconWrapClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            />
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
            <CardHeader className="border-b border-border/60 bg-muted/25">
              <CardTitle className="text-base">Jump to organization</CardTitle>
              <CardDescription>Open tenant detail — metrics, NetSuite routing, vendor & PO APIs when enabled.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <Select
                disabled={orgPickerSorted.length === 0}
                onValueChange={(id) => navigate(ROUTES.PLATFORM.ORG_DETAIL(id))}
              >
                <SelectTrigger className="max-w-xl rounded-xl">
                  <SelectValue placeholder={orgPickerSorted.length ? 'Select organization…' : 'No tenants'} />
                </SelectTrigger>
                <SelectContent>
                  {orgPickerSorted.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name || o.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" className="rounded-xl sm:w-auto" asChild>
                <Link to={ROUTES.PLATFORM.ORGANIZATIONS}>Browse directory</Link>
              </Button>
            </CardContent>
          </Card>

          {poStatusEntries.length > 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card shadow-card">
              <div className="border-b border-border/60 bg-muted/25 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-base font-semibold leading-tight">PO workload by status</h3>
                    <p className="text-sm text-muted-foreground">
                      Aggregated from each tenant&apos;s metrics payload — indicative only until streaming analytics ships.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {poStatusEntries.map(([status, count]) => {
                  const pct = maxPoStatus > 0 ? Math.round((count / maxPoStatus) * 100) : 0;
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Tenants by PO volume</h2>
              <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground" asChild>
                <Link to={ROUTES.PLATFORM.ORGANIZATIONS}>Full directory</Link>
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/80 shadow-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Organization</th>
                    <th className="px-4 py-3 font-medium">POs</th>
                    <th className="px-4 py-3 font-medium">Vendors</th>
                    <th className="px-4 py-3 font-medium">Vendor users</th>
                    <th className="px-4 py-3 font-medium">Submissions</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedTop.map((org: PlatformOrgListItem) => (
                    <tr key={org.id} className="bg-card hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-foreground hover:text-primary hover:underline" to={ROUTES.PLATFORM.ORG_DETAIL(org.id)}>
                          {org.name || org.id}
                        </Link>
                        <div className="font-mono text-[10px] text-muted-foreground">{org.id}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {readNumericMetric(org, ['purchaseOrderCount', 'purchase_order_count', 'poCount', 'totalPurchaseOrders']) || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {readNumericMetric(org, ['vendorCount', 'vendor_count']) || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {readNumericMetric(org, ['vendorUserCount', 'vendor_user_count']) || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {readNumericMetric(org, ['submissionCount', 'submission_count']) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" className="rounded-lg" asChild>
                          <Link to={ROUTES.PLATFORM.ORG_DETAIL(org.id)}>
                            Open
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedTop.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No organizations loaded.</p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

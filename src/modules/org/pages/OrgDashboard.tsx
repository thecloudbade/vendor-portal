import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog, getOrgPOs, getOrgRecentUploads, getVendors } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { ORG_DASHBOARD_PO_STATUS_OPEN } from '../constants/poStatusFilters';
import { formatDateTime } from '@/modules/common/utils/format';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { FileText, Building2, Upload, AlertTriangle, ArrowRight } from 'lucide-react';
import { backToState } from '@/modules/common/utils/navigationState';

export function OrgDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const listBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const { user } = useAuth();
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['org', 'pos', { status: ORG_DASHBOARD_PO_STATUS_OPEN }],
    queryFn: () => getOrgPOs({ status: ORG_DASHBOARD_PO_STATUS_OPEN, pageSize: 10 }),
    refetchOnWindowFocus: false,
  });
  const { data: vendorsData } = useQuery({
    queryKey: ['org', 'vendors'],
    queryFn: () => getVendors(),
    refetchOnWindowFocus: false,
  });
  const { data: mismatchAudit, isLoading: mismatchLoading } = useQuery({
    queryKey: ['org', 'audit', 'qty-mismatch-total'],
    queryFn: () => getAuditLog({ page: 1, pageSize: 1, eventType: 'QTY_MISMATCH' }),
    refetchOnWindowFocus: false,
  });
  const { data: recentUploads, isLoading: recentUploadsLoading } = useQuery({
    queryKey: ['org', 'uploads-recent', 'count'],
    queryFn: () => getOrgRecentUploads({ page: 1, pageSize: 1 }),
    refetchOnWindowFocus: false,
  });

  const pendingPOs = posData?.data ?? [];
  const vendors = vendorsData?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-card to-muted/50 shadow-sm ring-1 ring-black/[0.04] dark:from-primary/[0.12] dark:via-card dark:to-muted/30 dark:ring-white/[0.06]">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/15"
          aria-hidden
        />
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description={
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {user?.orgName ? (
                <>
                  <span className="font-medium text-foreground">{user.orgName}</span>
                  <span className="text-muted-foreground"> — </span>
                </>
              ) : null}
              Open orders, vendors, and uploads at a glance.
            </p>
          }
          className="relative z-[1] flex-col gap-5 pb-6 pt-6 sm:px-6 sm:pt-7 sm:pb-7"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card-interactive border-l-4 border-l-blue-500/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stat-label">Open POs</p>
              {posLoading ? (
                <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="stat-value mt-1">{pendingPOs.length}</p>
              )}
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <FileText className="h-5 w-5" />
            </span>
          </div>
          <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
            <Link to={ROUTES.ORG.POS} className="inline-flex items-center gap-1">
              View all orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="surface-card-interactive border-l-4 border-l-slate-400/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stat-label">Vendors</p>
              <p className="stat-value mt-1">{vendors.length}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600">
              <Building2 className="h-5 w-5" />
            </span>
          </div>
          <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
            <Link to={ROUTES.ORG.VENDORS} className="inline-flex items-center gap-1">
              Manage vendors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="surface-card-interactive border-l-4 border-l-amber-500/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stat-label">Exceptions</p>
              {mismatchLoading ? (
                <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="stat-value mt-1">{mismatchAudit?.total ?? 0}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Quantity mismatches</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
          <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
            <Link
              to={`${ROUTES.ORG.AUDIT}?eventType=QTY_MISMATCH`}
              className="inline-flex items-center gap-1"
            >
              View mismatch log <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="surface-card-interactive border-l-4 border-l-violet-500/70 p-5">
          <Link
            to={ROUTES.ORG.UPLOADS}
            className="group -m-5 block rounded-xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="View recent uploads"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="stat-label">Uploads</p>
                {recentUploadsLoading ? (
                  <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <p className="stat-value mt-1 tabular-nums">{recentUploads?.total ?? 0}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Total</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
                <Upload className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-primary group-hover:underline">
              View recent uploads <ArrowRight className="inline h-3.5 w-3.5 align-middle" />
            </p>
          </Link>
          <Button variant="link" className="mt-2 h-auto p-0 text-sm font-medium text-primary" asChild>
            <Link to={ROUTES.ORG.POS} className="inline-flex items-center gap-1">
              Browse by PO <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <CardTitle className="text-lg">Awaiting vendor documents</CardTitle>
          <CardDescription className="text-base">Orders waiting on vendor documents.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {posLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          ) : pendingPOs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No pending purchase orders"
              description="Nothing in this list right now."
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to={ROUTES.ORG.POS}>Go to purchase orders</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50 bg-muted/15 dark:bg-muted/10">
              {pendingPOs.map((po) => {
                const modifiedAt = po.updatedAt ?? po.createdAt;
                return (
                  <li
                    key={po.id}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted/25"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a, button')) return;
                      navigate(ROUTES.ORG.PO_DETAIL(po.id), { state: listBack });
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div className="min-w-0">
                            <Link
                              to={ROUTES.ORG.PO_DETAIL(po.id)}
                              state={listBack}
                              className="text-base font-semibold tracking-tight text-foreground hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {po.poNumber}
                            </Link>
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">{po.vendorName ?? po.vendorId}</span>
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-row items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5 sm:pt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                              Modified
                            </span>
                            <time
                              dateTime={modifiedAt}
                              className="text-xs tabular-nums text-muted-foreground"
                            >
                              {formatDateTime(modifiedAt)}
                            </time>
                          </div>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="w-full shrink-0 rounded-lg sm:w-auto" asChild>
                        <Link to={ROUTES.ORG.PO_DETAIL(po.id)} state={listBack} onClick={(e) => e.stopPropagation()}>
                          Open PO
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

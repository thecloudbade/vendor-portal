import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorPOs, getVendorUploads } from '../api/vendor.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { formatDateTime } from '@/modules/common/utils/format';
import { FileText, Upload, Bell, Search, ArrowRight, Inbox } from 'lucide-react';
import { useMemo } from 'react';
import { backToState } from '@/modules/common/utils/navigationState';

export function VendorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const listBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const { user } = useAuth();
  const vendorId = user?.vendorId;

  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['vendor', 'pos', 'dashboard', vendorId],
    queryFn: () => getVendorPOs({ page: 1, pageSize: 5 }),
    enabled: !!vendorId,
  });
  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ['vendor', 'uploads', 'dashboard-count', vendorId],
    queryFn: () => getVendorUploads({ page: 1, pageSize: 5 }),
    enabled: !!vendorId,
  });

  const recentPOs = posData?.data ?? [];
  const uploadTotal = uploadsData?.total ?? uploadsData?.data?.length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your workspace"
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link to={ROUTES.VENDOR.PO_SEARCH}>
              <Search className="mr-2 h-4 w-4" />
              Search POs
            </Link>
          </Button>
        }
      />

      {!vendorId ? (
        <EmptyState
          icon={Inbox}
          title="Account not linked to a vendor"
          description="Contact your buyer to finish account setup."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-card-interactive border-l-4 border-l-emerald-500 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="stat-label">Recent POs</p>
                  {posLoading ? (
                    <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-muted" />
                  ) : (
                    <p className="stat-value mt-1">{recentPOs.length}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Recent</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
              <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
                <Link to={ROUTES.VENDOR.PO_SEARCH} className="inline-flex items-center gap-1">
                  Search & view all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="surface-card-interactive border-l-4 border-l-teal-500/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="stat-label">Recent uploads</p>
                  {uploadsLoading ? (
                    <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-muted" />
                  ) : (
                    <p className="stat-value mt-1 tabular-nums">{uploadTotal}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Last submissions</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-800">
                  <Upload className="h-5 w-5" />
                </span>
              </div>
              <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
                <Link to={ROUTES.VENDOR.UPLOADS} className="inline-flex items-center gap-1">
                  Full history <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="surface-card-interactive border-l-4 border-l-cyan-500/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="stat-label">Notifications</p>
                  <p className="stat-value mt-1">—</p>
                  <p className="mt-1 text-xs text-muted-foreground">Status & mismatch alerts</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-800">
                  <Bell className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No new notifications</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
            <CardHeader className="border-b border-border/60 bg-emerald-50/40 px-6 py-5 dark:bg-emerald-950/20">
              <CardTitle className="text-lg">Orders ready for documents</CardTitle>
              <CardDescription className="text-base">Open an order to upload files.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {posLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/70" />
                  ))}
                </div>
              ) : recentPOs.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="You are all caught up"
                  description="Nothing to show yet. Try PO search."
                  action={
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link to={ROUTES.VENDOR.PO_SEARCH}>Search purchase orders</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {recentPOs.map((po) => (
                    <li
                      key={po.id}
                      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 sm:flex-row sm:items-center sm:justify-between"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a, button')) return;
                        navigate(ROUTES.VENDOR.PO_DETAIL(po.id), { state: listBack });
                      }}
                    >
                      <div className="min-w-0">
                        <Link
                          to={ROUTES.VENDOR.PO_DETAIL(po.id)}
                          state={listBack}
                          className="font-semibold text-foreground hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {po.poNumber}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Last modified {formatDateTime(po.updatedAt ?? po.createdAt)}
                        </p>
                      </div>
                      {isMongoObjectIdString(po.id) ? (
                        <Button
                          asChild
                          size="sm"
                          className="shrink-0 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Link to={ROUTES.VENDOR.UPLOAD(po.id)} onClick={(e) => e.stopPropagation()}>
                            Upload documents
                          </Link>
                        </Button>
                      ) : (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Button asChild size="sm" variant="outline" className="rounded-lg">
                            <Link
                              to={ROUTES.VENDOR.PO_DETAIL(po.id)}
                              state={listBack}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View PO
                            </Link>
                          </Button>
                          <span className="max-w-[9rem] text-right text-[10px] text-muted-foreground">Upload unavailable</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

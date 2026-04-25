import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVendorDetail,
  getVendorUsers,
  approveVendor,
  getNetSuiteIntegration,
  postNetSuiteSyncPurchaseOrders,
  getOrgPOs,
} from '../api/org.api';
import type { VendorDetail, VendorPortalUser, PendingVendorInvitation } from '../types';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { VendorInviteDialog } from '../components/VendorInviteDialog';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { canInviteVendorUsers } from '@/modules/common/constants/roles';
import { DataTable } from '@/modules/common/components/DataTable';
import type { Column } from '@/modules/common/components/DataTable';
import type { POListItem } from '../types';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { backToState, type AppLocationState } from '@/modules/common/utils/navigationState';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { canSyncNetSuitePurchaseOrders } from '@/modules/common/constants/roles';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShoppingCart,
  UserPlus,
  Users,
} from 'lucide-react';

function makeVendorPoColumns(back: AppLocationState): Column<POListItem>[] {
  return [
    {
      id: 'poNumber',
      header: 'PO #',
      cell: (r) => (
        <Link
          to={ROUTES.ORG.PO_DETAIL(r.id)}
          state={back}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.poNumber}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: (r) => formatDateTime(r.createdAt),
    },
    {
      id: 'updatedAt',
      header: 'Last modified',
      cell: (r) => formatDateTime(r.updatedAt ?? r.createdAt),
    },
  ];
}

function userStatusBadge(status: string | undefined) {
  const s = (status ?? '').toLowerCase();
  const base = 'rounded-full px-2 py-0.5 text-xs font-medium';
  if (s === 'active') return <span className={`${base} bg-green-600 text-white`}>Active</span>;
  if (s === 'pending' || s === 'invited')
    return <span className={`${base} bg-muted text-muted-foreground`}>Pending invite</span>;
  if (s === 'inactive' || s === 'disabled')
    return <span className={`${base} border border-border`}>Inactive</span>;
  return <span className={`${base} border border-border`}>{status ?? '—'}</span>;
}

function inviteStatusBadge(status: string | undefined) {
  const s = (status ?? '').toLowerCase();
  const base = 'rounded-full px-2 py-0.5 text-xs font-medium';
  if (s === 'sent') return <span className={`${base} bg-primary/15 text-primary`}>Sent</span>;
  return <span className={`${base} border border-border`}>{status ?? '—'}</span>;
}

const portalUserColumns: Column<VendorPortalUser>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (r) => <span className="font-medium">{r.name?.trim() ? r.name : '—'}</span>,
  },
  { id: 'email', header: 'Email', cell: (r) => r.email },
  {
    id: 'status',
    header: 'Status',
    cell: (r) => userStatusBadge(r.status),
  },
  {
    id: 'lastLoginAt',
    header: 'Last login',
    cell: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt) : '—'),
  },
  {
    id: 'createdAt',
    header: 'Created',
    cell: (r) => formatDateTime(r.createdAt),
  },
];

const pendingInvitationColumns: Column<PendingVendorInvitation>[] = [
  { id: 'email', header: 'Email', cell: (r) => r.email },
  { id: 'status', header: 'Status', cell: (r) => inviteStatusBadge(r.status) },
  {
    id: 'expiresAt',
    header: 'Expires',
    cell: (r) => formatDateTime(r.expiresAt),
  },
  {
    id: 'createdAt',
    header: 'Sent',
    cell: (r) => formatDateTime(r.createdAt),
  },
];

function isVendorApproved(v: VendorDetail): boolean {
  if (v.approved === true) return true;
  const s = v.status.toLowerCase();
  return s === 'approved' || s === 'active';
}

export function VendorDetailsPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const listBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const poColumns = useMemo(() => makeVendorPoColumns(listBack), [listBack]);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  const tabFromUrl = searchParams.get('tab');
  /** Default: purchase orders first; `?tab=users` for the users tab. */
  const activeTab: 'pos' | 'users' = tabFromUrl === 'users' ? 'users' : 'pos';
  const poPage = parseListPageParam(searchParams.get('poPage'));
  const poPageSize = 10;
  const poQFromUrl = searchParams.get('poQ') ?? '';

  const [poSearch, setPoSearch] = useState(poQFromUrl);
  useEffect(() => {
    setPoSearch(poQFromUrl);
  }, [poQFromUrl]);

  const debouncedPoSearch = useDebounce(poSearch, 300);

  const prevPoQ = useRef<string | null>(null);
  useEffect(() => {
    if (prevPoQ.current === null) {
      prevPoQ.current = debouncedPoSearch;
      return;
    }
    if (prevPoQ.current === debouncedPoSearch) return;
    prevPoQ.current = debouncedPoSearch;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (debouncedPoSearch.trim()) n.set('poQ', debouncedPoSearch.trim());
        else n.delete('poQ');
        n.set('poPage', '1');
        return n;
      },
      { replace: true }
    );
  }, [debouncedPoSearch, setSearchParams]);

  const setActiveTab = (v: 'pos' | 'users') => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === 'users') n.set('tab', 'users');
        else n.delete('tab');
        return n;
      },
      { replace: true }
    );
  };

  const setPoPage = (p: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (p <= 1) n.delete('poPage');
        else n.set('poPage', String(p));
        return n;
      },
      { replace: true }
    );
  };

  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ['org', 'vendor', vendorId],
    queryFn: () => getVendorDetail(vendorId!),
    enabled: !!vendorId,
  });

  const {
    data: vendorUsersData,
    isLoading: vendorUsersLoading,
    error: vendorUsersError,
  } = useQuery({
    queryKey: ['org', 'vendor', vendorId, 'users'],
    queryFn: () => getVendorUsers(vendorId!),
    enabled: !!vendorId && activeTab === 'users',
  });

  const { data: netsuiteStatus } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
    enabled: !!vendorId && activeTab === 'pos',
  });

  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['org', 'pos', 'vendor-detail', vendorId, debouncedPoSearch, poPage, poPageSize],
    queryFn: () =>
      getOrgPOs({
        vendorId: vendorId!,
        q: debouncedPoSearch || undefined,
        page: poPage,
        pageSize: poPageSize,
      }),
    enabled: !!vendorId && activeTab === 'pos',
  });

  const approveMutation = useMutation({
    mutationFn: () => approveVendor(vendorId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      toast({ title: 'Vendor approved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const syncPOMutation = useMutation({
    mutationFn: () => postNetSuiteSyncPurchaseOrders({ vendorId: vendorId! }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'pos'] });
      toast({
        title: 'POs synced from NetSuite',
        description: `POs from NetSuite: ${data.purchaseOrdersFromNetSuite ?? 0} · upserted: ${data.purchaseOrdersUpserted ?? 0} · skipped (no vendor): ${data.purchaseOrdersSkippedNoVendor ?? 0} · lines: ${data.lineItemsWritten ?? 0}`,
      });
    },
    onError: (e: Error) => toast({ title: 'PO sync failed', description: e.message, variant: 'destructive' }),
  });

  if (!vendorId) {
    return <p className="text-muted-foreground">Invalid vendor.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vendor…
      </div>
    );
  }

  if (error || !vendor) {
    return <p className="text-destructive">Could not load vendor.</p>;
  }

  const portalUsers = vendorUsersData?.users ?? [];
  const pendingInvitations = vendorUsersData?.pendingInvitations ?? [];
  const hasNoUsersAndNoPending = portalUsers.length === 0 && pendingInvitations.length === 0;
  const canSyncFromNetSuite = netsuiteStatus?.configured === true;
  const canSyncPOsUi =
    canSyncFromNetSuite &&
    user?.userType === 'org' &&
    canSyncNetSuitePurchaseOrders(user.role);
  const approved = isVendorApproved(vendor);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={ROUTES.ORG.VENDORS}>
            <ArrowLeft className="h-4 w-4" />
            Back to vendors
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <span className="min-w-0 break-words">{vendor.name}</span>
            <span
              className={
                approved
                  ? 'inline-flex shrink-0 items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground'
                  : 'inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
              }
            >
              {approved ? 'Approved' : 'Pending approval'}
            </span>
            {vendor.inactive && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-xs">
                Inactive
              </span>
            )}
            {vendor.category && (
              <span className="inline-flex shrink-0 max-w-full truncate rounded-full border border-border px-2 py-0.5 text-xs">
                {vendor.category}
              </span>
            )}
          </h1>
          {vendor.vendorCode ? (
            <p className="text-sm text-muted-foreground">Code: {vendor.vendorCode}</p>
          ) : null}
        </div>
        {!approved && (
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="w-full gap-2 sm:w-auto sm:shrink-0"
            size="sm"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve vendor
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pos' | 'users')} className="w-full">
        <TabsList className="h-auto w-full max-w-md flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="pos" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            Purchase orders
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg">Purchase orders</CardTitle>
                <p className="text-sm text-muted-foreground">Orders for this vendor.</p>
              </div>
              {canSyncPOsUi ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-2"
                  disabled={syncPOMutation.isPending}
                  onClick={() => syncPOMutation.mutate()}
                >
                  {syncPOMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync from NetSuite
                </Button>
              ) : canSyncFromNetSuite ? (
                <p className="max-w-xs text-xs text-muted-foreground">Admins can sync. Ask an org admin.</p>
              ) : (
                <p className="max-w-xs text-xs text-muted-foreground">Connect NetSuite in Settings to sync.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number…"
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <DataTable<POListItem>
                columns={poColumns}
                data={posData?.data ?? []}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => navigate(ROUTES.ORG.PO_DETAIL(r.id), { state: listBack })}
                total={posData?.total ?? 0}
                page={poPage}
                pageSize={poPageSize}
                onPageChange={setPoPage}
                isLoading={posLoading}
                emptyIcon={ShoppingCart}
                emptyTitle="No purchase orders for this vendor"
                emptyMessage="Sync above or add POs elsewhere."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">Vendor portal users</CardTitle>
              <PermissionGate permission={canInviteVendorUsers}>
                <Button type="button" size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Invite user
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {vendorUsersLoading && (
                <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                </div>
              )}
              {vendorUsersError && !vendorUsersLoading && (
                <p className="text-sm text-destructive">Could not load vendor users. Try again later.</p>
              )}
              {!vendorUsersLoading && !vendorUsersError && hasNoUsersAndNoPending && (
                <EmptyState
                  icon={Users}
                  title="No portal users yet"
                  description="Invite users by email."
                  action={
                    <PermissionGate permission={canInviteVendorUsers}>
                      <Button type="button" size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" />
                        Invite first user
                      </Button>
                    </PermissionGate>
                  }
                />
              )}
              {!vendorUsersLoading && !vendorUsersError && !hasNoUsersAndNoPending && (
                <div className="space-y-8">
                  {portalUsers.length > 0 ? (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">Active users</h3>
                      <DataTable<VendorPortalUser>
                        data={portalUsers}
                        columns={portalUserColumns}
                        keyExtractor={(r) => r.id}
                        total={0}
                        emptyTitle="No active users"
                        emptyMessage="No one has accepted an invite yet."
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active portal users yet. Pending invitations are listed below.
                    </p>
                  )}
                  {pendingInvitations.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">Pending invitations</h3>
                      <DataTable<PendingVendorInvitation>
                        data={pendingInvitations}
                        columns={pendingInvitationColumns}
                        keyExtractor={(r) => r.id}
                        total={0}
                        emptyTitle="No pending invitations"
                        emptyMessage="Invites expire after the date shown."
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <VendorInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        vendorId={vendor.id}
        mode="invite"
        onSuccess={() => setInviteOpen(false)}
      />
    </div>
  );
}

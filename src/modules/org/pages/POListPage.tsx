import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrgPOs, getVendors, getNetSuiteIntegration, postNetSuiteSyncPurchaseOrders } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { POListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { ORG_PO_LIST_STATUS_OPTIONS } from '../constants/poStatusFilters';
import { formatDateTime } from '@/modules/common/utils/format';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { canSyncNetSuitePurchaseOrders } from '@/modules/common/constants/roles';
import { ClipboardList, Loader2, RefreshCw, Search } from 'lucide-react';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { backToState } from '@/modules/common/utils/navigationState';

const ALL_VENDORS = '__all__';
const ALL_STATUS = '__all__';

export function POListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const listBack = backToState(location.pathname, location.search);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseListPageParam(searchParams.get('page'));
  const qFromUrl = searchParams.get('q') ?? '';
  const statusRaw = searchParams.get('status');
  const status =
    statusRaw && ORG_PO_LIST_STATUS_OPTIONS.some((o) => o.value === statusRaw) ? statusRaw : ALL_STATUS;
  const vendorParam = searchParams.get('vendor')?.trim();
  const vendorId = vendorParam && vendorParam.length > 0 ? vendorParam : ALL_VENDORS;

  const [searchInput, setSearchInput] = useState(qFromUrl);
  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  const debouncedSearch = useDebounce(searchInput, 300);
  const pageSize = 10;

  const prevDebouncedQ = useRef<string | null>(null);
  useEffect(() => {
    if (prevDebouncedQ.current === null) {
      prevDebouncedQ.current = debouncedSearch;
      return;
    }
    if (prevDebouncedQ.current === debouncedSearch) return;
    prevDebouncedQ.current = debouncedSearch;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (debouncedSearch.trim()) n.set('q', debouncedSearch.trim());
        else n.delete('q');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  }, [debouncedSearch, setSearchParams]);

  const setVendorFilter = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === ALL_VENDORS) n.delete('vendor');
        else n.set('vendor', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const setStatusFilter = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === ALL_STATUS) n.delete('status');
        else n.set('status', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const setPage = (p: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (p <= 1) n.delete('page');
        else n.set('page', String(p));
        return n;
      },
      { replace: true }
    );
  };

  const { data: posData, isLoading } = useQuery({
    queryKey: ['org', 'pos', { q: debouncedSearch, status, vendorId, page, pageSize }],
    queryFn: () =>
      getOrgPOs({
        q: debouncedSearch || undefined,
        status: status === ALL_STATUS ? undefined : status,
        vendorId: vendorId === ALL_VENDORS ? undefined : vendorId,
        page,
        pageSize,
      }),
    refetchOnWindowFocus: false,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['org', 'vendors'],
    queryFn: () => getVendors(),
    refetchOnWindowFocus: false,
  });

  const { data: netsuiteStatus } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
    refetchOnWindowFocus: false,
  });

  const vendors = vendorsData?.data ?? [];
  const pos = posData?.data ?? [];
  const canPullPOsFromNetSuite = netsuiteStatus?.configured === true;
  const canSyncPOsUi =
    canPullPOsFromNetSuite &&
    user?.userType === 'org' &&
    canSyncNetSuitePurchaseOrders(user.role);

  const selectedVendorName = useMemo(() => {
    if (vendorId === ALL_VENDORS) return null;
    return vendors.find((v) => v.id === vendorId)?.name ?? vendorId;
  }, [vendorId, vendors]);

  const syncPOsMutation = useMutation({
    mutationFn: () => {
      if (vendorId === ALL_VENDORS) {
        return Promise.reject(new Error('Select a vendor in the filter first'));
      }
      return postNetSuiteSyncPurchaseOrders({ vendorId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'pos'] });
      toast({
        title: 'POs synced from NetSuite',
        description: `From NetSuite: ${data.purchaseOrdersFromNetSuite ?? 0} · upserted: ${data.purchaseOrdersUpserted ?? 0} · skipped (no vendor): ${data.purchaseOrdersSkippedNoVendor ?? 0} · line items written: ${data.lineItemsWritten ?? 0}`,
      });
    },
    onError: (e: Error) => toast({ title: 'PO sync failed', description: e.message, variant: 'destructive' }),
  });

  const columns: Column<POListItem>[] = [
    {
      id: 'poNumber',
      header: 'PO Number',
      cell: (row) => (
        <Link
          to={ROUTES.ORG.PO_DETAIL(row.id)}
          state={listBack}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      cell: (row) => (
        <Link
          to={ROUTES.ORG.VENDOR_DETAIL(row.vendorId)}
          className="text-muted-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.vendorName ?? row.vendorId}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.status}</span>
      ),
    },
    { id: 'createdAt', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'updatedAt',
      header: 'Last modified',
      cell: (row) => formatDateTime(row.updatedAt ?? row.createdAt),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase orders"
        actions={
          canSyncPOsUi ? (
            <Button
              type="button"
              variant="secondary"
              disabled={vendorId === ALL_VENDORS || syncPOsMutation.isPending}
              title={
                vendorId === ALL_VENDORS
                  ? 'Select a vendor in the filter below to sync only that vendor’s POs from NetSuite.'
                  : `Sync POs for ${selectedVendorName ?? 'this vendor'} from NetSuite`
              }
              onClick={() => syncPOsMutation.mutate()}
            >
              {syncPOsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync POs from NetSuite
            </Button>
          ) : undefined
        }
      />

      {!canPullPOsFromNetSuite && (
        <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Connect NetSuite in Settings to sync POs.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={vendorId} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VENDORS}>All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} {v.vendorCode ? `(${v.vendorCode})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>All statuses</SelectItem>
            {ORG_PO_LIST_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canSyncPOsUi && vendorId === ALL_VENDORS && (
          <p className="w-full text-xs text-muted-foreground sm:w-auto sm:min-w-0">Choose a vendor to sync.</p>
        )}
      </div>

      <DataTable<POListItem>
        data={pos}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(ROUTES.ORG.PO_DETAIL(row.id), { state: listBack })}
        total={posData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyIcon={ClipboardList}
        emptyTitle={
          vendorId !== ALL_VENDORS
            ? 'No purchase orders for this vendor'
            : debouncedSearch.trim()
              ? 'No matching purchase orders'
              : 'No purchase orders yet'
        }
        emptyMessage={
          vendorId !== ALL_VENDORS
            ? canSyncPOsUi
              ? 'Sync POs from the header or open the vendor page.'
              : 'Ask an admin to sync POs, or open the vendor page.'
            : debouncedSearch.trim()
              ? 'Try different search or filters.'
              : 'No POs yet. Create or sync orders to see them here.'
        }
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getPlatformOrganizationPurchaseOrders,
  getPlatformOrganizationVendors,
} from '../api/platform.api';
import type { PlatformOrgMetrics, PlatformTenantPurchaseOrderRow, PlatformTenantVendorRow } from '../types';
import { PlatformOrgPoStatusCards } from './PlatformOrgPoStatusCards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/modules/common/components/DataTable';
import type { Column } from '@/modules/common/components/DataTable';

type MetricsInput = PlatformOrgMetrics | Record<string, unknown> | undefined;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function PlatformOrgTenantPurchaseOrdersPanel({
  orgId,
  orgName,
  metrics,
}: {
  orgId: string;
  orgName: string;
  metrics?: MetricsInput;
}) {
  const enabled = Boolean(orgId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [orgId]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const poQuery = useQuery({
    queryKey: ['platform', 'tenant-purchase-orders', orgId, { page, pageSize }],
    queryFn: () => getPlatformOrganizationPurchaseOrders(orgId, { page, pageSize }),
    enabled,
    staleTime: 45_000,
    retry: false,
  });

  const columns = useMemo<Column<PlatformTenantPurchaseOrderRow>[]>(
    () => [
      {
        id: 'poNumber',
        header: 'PO #',
        cell: (r) => <span className="font-medium">{r.poNumber ?? r.id}</span>,
      },
      { id: 'status', header: 'Status', cell: (r) => r.status ?? '—' },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: (r) => r.vendorName ?? r.vendorId ?? '—',
      },
      {
        id: 'updated',
        header: 'Updated',
        cell: (r) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            {r.updatedAt ?? r.createdAt ?? '—'}
          </span>
        ),
      },
    ],
    []
  );

  if (!enabled) return null;

  const poPending = poQuery.isLoading;
  const poUnavailable = poQuery.data === null && !poQuery.isError;

  return (
    <div className="space-y-6">
      <PlatformOrgPoStatusCards metrics={metrics} />

      <div>
        <p className="text-sm text-muted-foreground">
          Purchase orders for{' '}
          <span className="font-medium text-foreground">{orgName}</span>
          {' '}when df-vendor exposes cross-tenant reads for SUPERADMIN (otherwise org admins manage POs under{' '}
          <span className="font-mono text-xs">/org/*</span>).
        </p>
      </div>

      {!poPending && poUnavailable ? (
        <Card className="rounded-2xl border-dashed border-border/80 bg-muted/15 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Listing API not configured</CardTitle>
            <CardDescription>
              Ask backend to implement{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                GET /platform/organizations/:orgId/purchase-orders
              </code>{' '}
              for SUPERADMIN (supports pagination query params).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Purchase orders</CardTitle>
                <CardDescription>
                  {poQuery.data
                    ? `${poQuery.data.total} total · page ${poQuery.data.page} of ${poQuery.data.totalPages ?? 1}`
                    : 'Tenant PO snapshot'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                  disabled={poPending}
                >
                  <SelectTrigger className="h-9 w-[88px]" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {poQuery.isError ? (
              <p className="py-6 text-sm text-destructive">{(poQuery.error as Error).message}</p>
            ) : (
              <DataTable<PlatformTenantPurchaseOrderRow>
                data={poQuery.data?.data ?? []}
                columns={columns}
                keyExtractor={(r) => r.id}
                total={poQuery.data?.total ?? 0}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                isLoading={poPending}
                emptyMessage="No purchase orders on this page."
                emptyTitle="No purchase orders"
                countLabelSingular="purchase order"
                countLabelPlural="purchase orders"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PlatformOrgTenantVendorsPanel({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const enabled = Boolean(orgId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [orgId]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const vendorsQuery = useQuery({
    queryKey: ['platform', 'tenant-vendors', orgId, { page, pageSize }],
    queryFn: () => getPlatformOrganizationVendors(orgId, { page, pageSize }),
    enabled,
    staleTime: 45_000,
    retry: false,
  });

  const columns = useMemo<Column<PlatformTenantVendorRow>[]>(
    () => [
      { id: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name ?? '—'}</span> },
      { id: 'email', header: 'Email', cell: (r) => r.email ?? '—' },
      { id: 'status', header: 'Status', cell: (r) => r.status ?? '—' },
    ],
    []
  );

  if (!enabled) return null;

  const vendorsPending = vendorsQuery.isLoading;
  const vendorsUnavailable = vendorsQuery.data === null && !vendorsQuery.isError;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Vendors for <span className="font-medium text-foreground">{orgName}</span> when df-vendor exposes cross-tenant reads.
        </p>
      </div>

      {!vendorsPending && vendorsUnavailable ? (
        <Card className="rounded-2xl border-dashed border-border/80 bg-muted/15 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Listing API not configured</CardTitle>
            <CardDescription>
              Ask backend to implement{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                GET /platform/organizations/:orgId/vendors
              </code>{' '}
              for SUPERADMIN (supports pagination query params).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Vendors</CardTitle>
                <CardDescription>
                  {vendorsQuery.data
                    ? `${vendorsQuery.data.total} total · page ${vendorsQuery.data.page} of ${vendorsQuery.data.totalPages ?? 1}`
                    : 'Tenant vendor snapshot'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                  disabled={vendorsPending}
                >
                  <SelectTrigger className="h-9 w-[88px]" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {vendorsQuery.isError ? (
              <p className="py-6 text-sm text-destructive">{(vendorsQuery.error as Error).message}</p>
            ) : (
              <DataTable<PlatformTenantVendorRow>
                data={vendorsQuery.data?.data ?? []}
                columns={columns}
                keyExtractor={(r) => r.id}
                total={vendorsQuery.data?.total ?? 0}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                isLoading={vendorsPending}
                emptyMessage="No vendors on this page."
                emptyTitle="No vendors"
                countLabelSingular="vendor"
                countLabelPlural="vendors"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

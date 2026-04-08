import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  postNetSuiteFetchPurchaseOrdersForVendor,
  postNetSuiteFetchPurchaseLineDataForVendor,
  getVendorDetail,
  getOrgPOs,
  getOrgPODetail,
  getNetSuiteIntegration,
  getNetSuiteFieldConfig,
} from '../api/org.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { canReadNetSuiteFieldConfig } from '@/modules/common/constants/roles';
import { matchPortalPoFromRows } from '../utils/poMatch';
import { OrgPOSyncCard, ORG_PO_DETAIL_STUB, useOrgPOSync } from '../components/OrgPOSyncCard';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { extractNetSuiteListFromFetchResult } from '@/modules/common/utils/netsuiteFetch';
import { NetSuiteFetchBodyPanel } from '@/modules/common/components/NetSuiteFetchBodyPanel';
import { NetSuiteDynamicFieldTable } from '@/modules/common/components/NetSuiteDynamicFieldTable';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/modules/common/constants/routes';
import type { NetSuiteFetchResult } from '../types';
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

type NetSuitePORow = {
  po_id: number;
  po_num: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_category?: string;
  vendor_category_id?: number;
  status?: string;
  status_id?: string;
};

function parsePurchaseOrderRows(res: NetSuiteFetchResult): NetSuitePORow[] {
  const body = res.body as
    | { data?: unknown[]; meta?: unknown }
    | { status?: string; data?: unknown[]; meta?: unknown }
    | unknown[];
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)
      ? ((body as { data?: unknown[] }).data ?? [])
      : [];
  return rows.filter((r): r is NetSuitePORow => !!r && typeof r === 'object' && 'po_id' in (r as object)) as NetSuitePORow[];
}

function findRow(rows: NetSuitePORow[], netsuitePoId: string): NetSuitePORow | undefined {
  const id = netsuitePoId.trim();
  return rows.find((r) => String(r.po_id) === id || (r.po_num ?? '').trim() === id);
}

/**
 * NetSuite PO detail from `POST .../integrations/netsuite/fetch` with `type: purchaseorders`.
 */
export function OrgNetSuitePODetailPage() {
  const { vendorId, netsuitePoId } = useParams<{ vendorId: string; netsuitePoId: string }>();
  const decodedPoId = netsuitePoId ? decodeURIComponent(netsuitePoId) : '';
  const { user } = useAuth();
  const canReadLineFieldLabels =
    user?.userType === 'org' && canReadNetSuiteFieldConfig(user.role);

  const { data: nsIntegration } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
    enabled: canReadLineFieldLabels,
  });

  const { data: nsFieldConfig } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'field-config'],
    queryFn: () => getNetSuiteFieldConfig(),
    enabled: canReadLineFieldLabels && nsIntegration?.configured === true,
    retry: false,
  });

  const lineColumnLabels = nsFieldConfig?.purchase_order_line.item_field_labels ?? {};
  const lineColumnsOrder = nsFieldConfig?.purchase_order_line.item_fields ?? [];

  const { data: vendor } = useQuery({
    queryKey: ['org', 'vendor', vendorId],
    queryFn: () => getVendorDetail(vendorId!),
    enabled: !!vendorId,
  });

  const {
    data: fetchResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['org', 'netsuite-po', vendorId, decodedPoId],
    queryFn: () =>
      postNetSuiteFetchPurchaseOrdersForVendor({
        vendorId: vendorId!,
        transactionId: decodedPoId || undefined,
        page: 1,
        pageSize: 100,
      }),
    enabled: !!vendorId && !!decodedPoId,
  });

  const rows = fetchResult ? parsePurchaseOrderRows(fetchResult) : [];
  const matched = findRow(rows, decodedPoId);

  /** `purchaseLineData` needs NetSuite internal `trans_id` (digits). URL may be PO# until `matched` resolves. */
  const lineTransId = useMemo(() => {
    if (matched?.po_id != null && String(matched.po_id).trim() !== '') {
      return String(matched.po_id);
    }
    const d = decodedPoId.trim();
    if (/^\d+$/.test(d)) return d;
    return '';
  }, [matched, decodedPoId]);

  const {
    data: lineData,
    isLoading: lineLoading,
    isError: lineError,
    error: lineErr,
  } = useQuery({
    queryKey: ['org', 'netsuite-po', vendorId, lineTransId, 'purchaseLineData'],
    queryFn: async () => {
      const res = await postNetSuiteFetchPurchaseLineDataForVendor({
        vendorId: vendorId!,
        transId: lineTransId,
      });
      let rows = extractNetSuiteListFromFetchResult(res) as Record<string, unknown>[];
      if (rows.length === 0 && res.body && typeof res.body === 'object') {
        const b = res.body as { data?: unknown };
        if (b.data && typeof b.data === 'object' && !Array.isArray(b.data)) {
          rows = [b.data as Record<string, unknown>];
        }
      }
      return { rows, result: res };
    },
    enabled: !!vendorId && !!lineTransId,
  });

  const lineRows = lineData?.rows ?? [];

  const searchTerm = (matched?.po_num ?? decodedPoId).trim();

  const { data: portalList, isLoading: portalListLoading } = useQuery({
    queryKey: ['org', 'pos', 'resolve-ns', vendorId, searchTerm],
    queryFn: () =>
      getOrgPOs({
        vendorId: vendorId!,
        q: searchTerm || undefined,
        pageSize: 100,
        page: 1,
      }),
    enabled: !!vendorId && !!decodedPoId && !!searchTerm,
  });

  const portalMatch = useMemo(() => {
    const rows = portalList?.data;
    if (!rows?.length) return undefined;
    return matchPortalPoFromRows(rows, { transId: decodedPoId, poNum: matched?.po_num });
  }, [portalList, decodedPoId, matched?.po_num]);

  const { data: portalPoDetail, isLoading: portalPoLoading } = useQuery({
    queryKey: ['org', 'po', portalMatch?.id],
    queryFn: () => getOrgPODetail(portalMatch!.id),
    enabled: !!portalMatch?.id && isMongoObjectIdString(portalMatch.id),
  });

  const sync = useOrgPOSync(
    portalPoDetail?.id ?? '',
    portalPoDetail ?? ORG_PO_DETAIL_STUB,
    lineRows as Record<string, unknown>[]
  );

  if (!vendorId || !decodedPoId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid link.</p>
        <Button variant="outline" asChild>
          <Link to={ROUTES.ORG.VENDORS}>Back to vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={ROUTES.ORG.VENDOR_DETAIL(vendorId)}>
            <ArrowLeft className="h-4 w-4" />
            Back to vendor
          </Link>
        </Button>
        {matched ? (
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link
              to={ROUTES.ORG.PO_OPEN(vendorId, {
                q: matched.po_num,
                transId: String(matched.po_id),
              })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in portal
            </Link>
          </Button>
        ) : null}
      </div>

      <PageHeader
        title={matched?.po_num ?? `NetSuite PO ${decodedPoId}`}
        description={vendor ? `${vendor.name}${vendor.vendorCode ? ` · ${vendor.vendorCode}` : ''}` : undefined}
        actions={
          portalMatch ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="border-primary/40 bg-background shadow-sm"
              disabled={!sync.canSyncPO || sync.syncPOMutation.isPending}
              title={sync.canSyncPO ? 'Sync this PO' : portalPoLoading ? 'Loading…' : 'Add lines first'}
              onClick={() => sync.syncPOMutation.mutate()}
            >
              {sync.syncPOMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync PO
            </Button>
          ) : null
        }
      />

      {portalListLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!portalListLoading && !portalMatch && (
        <Card className="border-amber-200/70 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sync to portal</CardTitle>
            <CardDescription>
              No linked order found.{' '}
              <Link
                to={ROUTES.ORG.PO_OPEN(vendorId, { q: matched?.po_num ?? '', transId: decodedPoId })}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Try opening in portal
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {portalMatch ? (
        <OrgPOSyncCard
          po={portalPoDetail ?? ORG_PO_DETAIL_STUB}
          sync={sync}
          nsLinesLoading={lineLoading || portalPoLoading}
          intro={undefined}
        />
      ) : null}

      {matched ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PO fields</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {Object.entries(matched).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs font-medium text-muted-foreground">{key}</dt>
                  <dd className="font-mono text-xs break-all text-foreground">
                    {value === null || value === undefined ? '—' : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase line data</CardTitle>
          <p className="text-xs text-muted-foreground">
            From <code className="rounded bg-muted px-1">purchaseLineData</code> (
            <code className="rounded bg-muted px-1">trans_id</code> = {decodedPoId}). One row per line; all fields returned
            by NetSuite are shown as columns.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {(lineErr as Error)?.message ?? 'Could not load purchase line data.'}
            </p>
          )}
          <NetSuiteDynamicFieldTable
            rows={lineRows}
            isLoading={lineLoading}
            emptyMessage="No purchase line rows in this response. The RESTlet may return a single object or PO header only — see raw response below."
            columnLabels={lineColumnLabels}
            columnsOrder={lineColumnsOrder}
          />
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Full <code className="rounded bg-muted px-1">purchaseLineData</code> proxy response
            </p>
            <NetSuiteFetchBodyPanel
              result={lineData?.result ?? null}
              isLoading={lineLoading}
              title="Complete line fetch"
              showUrl
            />
          </div>
        </CardContent>
      </Card>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {(error as Error)?.message ?? 'Request failed.'}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Full <code className="rounded bg-muted px-1">purchaseorders</code> proxy response (
          <code className="rounded bg-muted px-1">POST /org/integrations/netsuite/fetch</code>)
        </p>
        <NetSuiteFetchBodyPanel
          result={fetchResult ?? null}
          isLoading={isLoading}
          title="Complete response"
          showUrl
        />
      </div>

      {!isLoading && fetchResult && !matched && rows.length > 0 && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          No row matched id <code className="rounded bg-muted px-1">{decodedPoId}</code> in this response. See raw JSON
          above — your RESTlet may require a different <code className="rounded bg-muted px-1">transactionId</code> filter.
        </p>
      )}
    </div>
  );
}

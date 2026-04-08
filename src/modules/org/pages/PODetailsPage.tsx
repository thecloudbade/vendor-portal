import { useParams, Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { downloadOrgFile, getAuditLog, getOrgPODetail } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { KeyValueFields } from '@/modules/common/components/KeyValueFields';
import { PoLineItemsSection } from '@/modules/common/components/PoLineItemsSection';
import { AlertTriangle, ArrowLeft, Download, FileText, ListOrdered, Loader2, PackageOpen, Paperclip } from 'lucide-react';
import { resolveBackTo } from '@/modules/common/utils/navigationState';
import { canViewAudit } from '@/modules/common/constants/roles';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { OrgPoUploadDetailPanel } from '../components/OrgPoUploadDetailPanel';
import { DeviationPercentBars } from '../components/DeviationPercentBars';
import {
  getLatestUpload,
  maxDeviationPct,
  mismatchRowsToBarPoints,
  tolerancePctForUploadType,
} from '../utils/poUploadDeviation';

function OrgPoBackLink() {
  const { state } = useLocation();
  const to = resolveBackTo(state, ROUTES.ORG.POS);
  return (
    <Button variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground hover:text-foreground" asChild>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        Back to purchase orders
      </Link>
    </Button>
  );
}

export function PODetailsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canLoadAuditFallback =
    user?.userType === 'org' && canViewAudit(user.role ?? '');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const { poId } = useParams<{ poId: string }>();
  const { data: po, isLoading, error } = useQuery({
    queryKey: ['org', 'po', poId],
    queryFn: () => getOrgPODetail(poId!),
    enabled: !!poId,
  });

  const selectedU = useMemo(
    () => (po?.uploads?.length ? po.uploads.find((x) => x.id === selectedUploadId) ?? null : null),
    [po?.uploads, selectedUploadId]
  );

  const needsAuditMismatchFallback =
    !!po &&
    !!selectedU?.hasQtyMismatch &&
    !(selectedU?.mismatches?.length) &&
    !!selectedUploadId;

  const { data: auditPoMismatch, isLoading: auditMismatchLoading } = useQuery({
    queryKey: ['org', 'audit', 'qty-mismatch', poId, needsAuditMismatchFallback, po?.id],
    queryFn: () =>
      getAuditLog({ eventType: 'QTY_MISMATCH', poId: po!.id, page: 1, pageSize: 30 }),
    enabled: !!poId && !!po?.id && needsAuditMismatchFallback && canLoadAuditFallback,
  });

  const auditFallbackRows = useMemo(() => {
    if (!needsAuditMismatchFallback || !auditPoMismatch?.data?.length) return null;
    for (const entry of auditPoMismatch.data) {
      const raw = entry.payload?.mismatches;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.filter(
          (x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x)
        );
      }
    }
    return null;
  }, [needsAuditMismatchFallback, auditPoMismatch?.data]);

  const panelMismatchRows = useMemo(() => {
    if (!selectedU) return null;
    if (selectedU.mismatches?.length) return selectedU.mismatches;
    if (needsAuditMismatchFallback && auditFallbackRows?.length) return auditFallbackRows;
    return null;
  }, [selectedU, needsAuditMismatchFallback, auditFallbackRows]);

  const latestUpload = useMemo(() => getLatestUpload(po?.uploads), [po?.uploads]);
  const latestDeviationPoints = useMemo(() => {
    if (!latestUpload?.mismatches?.length) return [];
    return mismatchRowsToBarPoints(latestUpload.mismatches);
  }, [latestUpload]);
  const latestTol = latestUpload ? tolerancePctForUploadType(latestUpload, po?.uploadRules) : undefined;
  const latestMaxDev = latestDeviationPoints.length ? maxDeviationPct(latestDeviationPoints) : 0;

  if (!poId) return null;
  if (error)
    return (
      <div className="space-y-4">
        <OrgPoBackLink />
        <EmptyState
          icon={FileText}
          title="Could not load this PO"
          description="Check your connection or try again. If the problem continues, contact support."
          className="border-destructive/20 bg-destructive/5"
        />
      </div>
    );
  if (isLoading) {
    return (
      <div className="space-y-4">
        <OrgPoBackLink />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (!po)
    return (
      <div className="space-y-4">
        <OrgPoBackLink />
        <EmptyState
          icon={PackageOpen}
          title="Purchase order not found"
          description="It may have been removed or the link is incorrect. Open the PO list and select an order from there."
          className="my-4"
        />
      </div>
    );

  const items = po.items ?? [];

  return (
    <div className="space-y-4">
      <OrgPoBackLink />
      <PageHeader
        eyebrow="Purchase order"
        title={po.poNumber}
        description={`Status: ${po.status} · Created ${formatDateTime(po.createdAt)}${
          po.updatedAt ? ` · Updated ${formatDateTime(po.updatedAt)}` : ''
        }`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Summary & quantity deviation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-4 text-sm">
            <p>
              <span className="text-muted-foreground">Vendor:</span>{' '}
              <Link to={ROUTES.ORG.VENDOR_DETAIL(po.vendorId)} className="font-medium hover:underline">
                {po.vendorName ?? po.vendorId}
              </Link>
            </p>
            {po.shipTo && (
              <p>
                <span className="text-muted-foreground">Ship to:</span> {po.shipTo}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Required documents:</span>{' '}
              {(po.requiredDocs ?? []).length ? (po.requiredDocs ?? []).join(', ') : '—'}
            </p>
            {po.summary && Object.keys(po.summary).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
                <KeyValueFields data={po.summary} dense />
              </div>
            )}
            {po.netsuiteFields && Object.keys(po.netsuiteFields).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  NetSuite — purchase order header
                </p>
                <KeyValueFields data={po.netsuiteFields} dense />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/15 p-4 lg:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest upload · deviation</p>
            {!latestUpload ? (
              <p className="mt-3 text-sm text-muted-foreground">No vendor uploads yet.</p>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {latestUpload.fileName ?? 'Document'}
                  {latestUpload.type ? (
                    <span className="ml-2 font-normal text-muted-foreground">({latestUpload.type})</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">{formatDateTime(latestUpload.uploadedAt)}</p>
                {latestDeviationPoints.length > 0 ? (
                  <>
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                      <p>
                        Lines with values: <strong className="text-foreground">{latestDeviationPoints.length}</strong>
                        {latestTol != null ? (
                          <>
                            {' '}
                            · Max |deviation|: <strong className="text-foreground">{latestMaxDev.toFixed(1)}%</strong>
                            {latestTol != null && latestMaxDev > latestTol ? (
                              <span className="text-amber-700 dark:text-amber-300"> (over ±{latestTol}% tolerance)</span>
                            ) : (
                              <span> (within ±{latestTol}%)</span>
                            )}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="mt-3">
                      <DeviationPercentBars
                        title="Absolute deviation % by line"
                        points={latestDeviationPoints}
                        tolerancePct={latestTol}
                      />
                    </div>
                  </>
                ) : latestUpload.hasQtyMismatch ? (
                  <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                    Latest upload is flagged for quantity mismatch, but line-level deviation rows are not on the PO payload.
                    Select the row below to open the detail panel, or check the audit log.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No deviation rows on the latest upload.</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-5 w-5" />
            Documents uploaded
          </CardTitle>
          {po.uploadRules && (
            <p className="text-sm text-muted-foreground">
              Buyer tolerance: packing list ±{po.uploadRules.packingListQtyTolerancePct}%, commercial invoice ±
              {po.uploadRules.commercialInvoiceQtyTolerancePct}%.
              {po.uploadRules.blockSubmitOnQtyToleranceExceeded
                ? ' Uploads that exceed tolerance are blocked until corrected.'
                : ' Uploads may proceed even when quantities exceed tolerance (logged as exceptions).'}
            </p>
          )}
          <CardDescription>
            Select a row to open a full detail panel on the right (same pattern as line items below).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!po.uploads?.length ? (
            <EmptyState
              icon={Paperclip}
              title="No uploads yet"
              description="Vendor uploads will appear here."
              className="border-0 bg-muted/20 py-10"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3">Document</th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                    <th className="whitespace-nowrap px-4 py-3">Uploaded</th>
                    <th className="whitespace-nowrap px-4 py-3">Qty</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {po.uploads.map((u) => {
                    const active = selectedUploadId === u.id;
                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          'cursor-pointer border-b border-border/50 transition-colors last:border-0',
                          active ? 'bg-primary/8' : 'hover:bg-muted/40'
                        )}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button,a')) return;
                          setSelectedUploadId((id) => (id === u.id ? null : u.id));
                        }}
                      >
                        <td className="max-w-[14rem] px-4 py-3 align-top">
                          <p className="truncate font-medium text-foreground" title={u.fileName}>
                            {u.fileName ?? '—'}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {u.type ? (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{u.type}</span>
                            ) : null}
                            {u.fileFormat ? (
                              <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[11px]">{u.fileFormat}</span>
                            ) : null}
                            {u.version != null ? (
                              <span className="text-[11px] text-muted-foreground">v{u.version}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {u.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-muted-foreground">
                          {formatDateTime(u.uploadedAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {(u.hasQtyMismatch || (u.mismatchCount ?? 0) > 0) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                              Mismatch
                              {u.mismatchCount != null && u.mismatchCount > 0 ? ` (${u.mismatchCount})` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                          {u.fileId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={downloadingId === u.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setDownloadingId(u.id);
                                try {
                                  await downloadOrgFile(u.fileId!, u.fileName);
                                } catch (err) {
                                  toast({
                                    title: 'Download failed',
                                    description: (err as Error).message,
                                    variant: 'destructive',
                                  });
                                } finally {
                                  setDownloadingId(null);
                                }
                              }}
                            >
                              {downloadingId === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Download className="h-3.5 w-3.5" aria-hidden />
                              )}
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No file</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <OrgPoUploadDetailPanel
        open={!!selectedUploadId && !!selectedU}
        upload={selectedU}
        po={po}
        mismatchRows={panelMismatchRows}
        auditLoading={auditMismatchLoading && !!needsAuditMismatchFallback}
        auditFallbackFromLog={
          !!(needsAuditMismatchFallback && panelMismatchRows?.length && !selectedU?.mismatches?.length)
        }
        downloading={!!selectedU && downloadingId === selectedU.id}
        onClose={() => setSelectedUploadId(null)}
        onDownload={async () => {
          if (!selectedU?.fileId) return;
          setDownloadingId(selectedU.id);
          try {
            await downloadOrgFile(selectedU.fileId, selectedU.fileName);
          } catch (e) {
            toast({ title: 'Download failed', description: (e as Error).message, variant: 'destructive' });
          } finally {
            setDownloadingId(null);
          }
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-5 w-5" />
            Line items
          </CardTitle>
          <p className="text-sm text-muted-foreground">Select a line item to view details.</p>
        </CardHeader>
        <CardContent>
          <PoLineItemsSection
            items={items}
            emptyDescription="No line items yet."
            fieldLabelMap={po.netsuiteLineFieldLabels}
          />
        </CardContent>
      </Card>
    </div>
  );
}

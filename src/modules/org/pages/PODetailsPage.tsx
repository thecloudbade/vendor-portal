import { useParams, Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { downloadOrgFile, getAuditLog, getNetSuiteIntegration, getOrgPODetail, postOrgPOResetPackingList } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { KeyValueFields } from '@/modules/common/components/KeyValueFields';
import { PoLineItemsSection } from '@/modules/common/components/PoLineItemsSection';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  ListOrdered,
  Loader2,
  PackageOpen,
  Paperclip,
  RotateCcw,
} from 'lucide-react';
import { resolveBackTo } from '@/modules/common/utils/navigationState';
import { canViewAudit, isOrgRole } from '@/modules/common/constants/roles';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { OrgPoUploadDetailPanel } from '../components/OrgPoUploadDetailPanel';
import { NetSuiteDocumentPushStatus } from '@/modules/common/components/NetSuiteDocumentPushStatus';
import { DeviationPercentBars } from '../components/DeviationPercentBars';
import {
  getLatestUpload,
  maxDeviationPct,
  mismatchRowsToBarPoints,
  tolerancePctForUploadType,
} from '../utils/poUploadDeviation';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOrgUser = user?.userType === 'org' && isOrgRole(user.role ?? '');
  const canLoadAuditFallback =
    user?.userType === 'org' && canViewAudit(user.role ?? '');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [resetPackingOpen, setResetPackingOpen] = useState(false);
  const { poId } = useParams<{ poId: string }>();
  const { data: po, isLoading, error } = useQuery({
    queryKey: ['org', 'po', poId],
    queryFn: () => getOrgPODetail(poId!),
    enabled: !!poId,
    refetchInterval: (q) => {
      const uploads = q.state.data?.uploads;
      const pending = uploads?.some((u) => u.netsuiteDocumentPush?.status === 'PENDING');
      return pending ? 5000 : false;
    },
  });

  const { data: nsIntegration } = useQuery({
    queryKey: ['org', 'netsuite', 'integration'],
    queryFn: () => getNetSuiteIntegration(),
    enabled: isOrgUser && !!poId,
  });

  const resetPackingPrereq = useMemo(() => {
    if (!po) return { ready: false as const };
    const tid = po.netsuiteTransId != null ? Number(po.netsuiteTransId) : NaN;
    const fid = nsIntegration?.documentUploadFolderId;
    const folderNum = fid != null && Number.isFinite(Number(fid)) ? Number(fid) : NaN;
    if (!Number.isFinite(tid) || !Number.isFinite(folderNum)) {
      return { ready: false as const };
    }
    return { ready: true as const, transactionId: Math.floor(tid), folderId: Math.floor(folderNum) };
  }, [po, nsIntegration?.documentUploadFolderId]);

  const canOfferResetPacking = isOrgUser && resetPackingPrereq.ready && (po?.uploads?.length ?? 0) > 0;

  const resetPackingMutation = useMutation({
    mutationFn: () => {
      if (!poId || !resetPackingPrereq.ready) {
        return Promise.reject(new Error('NetSuite purchase order or document folder is not configured.'));
      }
      return postOrgPOResetPackingList(poId, {
        type: 'resetpackinglist',
        transactionType: 'purchaseorder',
        transactionId: resetPackingPrereq.transactionId,
        folderId: resetPackingPrereq.folderId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'po', poId] });
      setResetPackingOpen(false);
      const ok = res?.status === 'success' || res?.status == null;
      toast({
        title: ok ? 'Packing and invoice quantities reset' : 'Reset completed',
        description:
          res?.custbody_vfs_total_packinglist_qty != null && res?.custbody_vfs_total_com_inv_qty != null
            ? `NetSuite totals cleared (packing list ${res.custbody_vfs_total_packinglist_qty}, commercial invoice ${res.custbody_vfs_total_com_inv_qty}). The vendor can upload again if your policy allows.`
            : 'Refresh the page if totals do not update. The vendor can upload again if your policy allows.',
      });
    },
    onError: (e: Error) => {
      toast({ title: 'Reset failed', description: e.message, variant: 'destructive' });
    },
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

      {canOfferResetPacking && (
        <Card className="border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/25">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Vendor locked out of reuploads?</p>
              <p className="text-xs text-muted-foreground">
                Reset packing list and commercial invoice quantities in NetSuite for this PO. The vendor can submit documents
                again according to your org rules (e.g. reuploads allowed).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 border-amber-800/20 bg-background dark:border-amber-700/30"
              onClick={() => setResetPackingOpen(true)}
              disabled={resetPackingMutation.isPending}
            >
              {resetPackingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden />
              )}
              Reset NetSuite packing / CI
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={resetPackingOpen} onOpenChange={setResetPackingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset packing list and commercial invoice quantities?</AlertDialogTitle>
            <AlertDialogDescription>
              This calls NetSuite to clear quantity lines for this purchase order. Portal submission history is unchanged, but
              the vendor is allowed to upload again when your settings permit. This cannot be undone from the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPackingMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => resetPackingMutation.mutate()}
              disabled={resetPackingMutation.isPending}
            >
              {resetPackingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                'Reset in NetSuite'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <th className="whitespace-nowrap px-4 py-3">NetSuite</th>
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
                        <td className="max-w-[12rem] px-4 py-3 align-top">
                          {u.netsuiteDocumentPush?.status ? (
                            <NetSuiteDocumentPushStatus push={u.netsuiteDocumentPush} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

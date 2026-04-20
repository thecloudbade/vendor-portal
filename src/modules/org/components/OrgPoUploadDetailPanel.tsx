import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { PODetail, POUploadEntry, QtyMismatchRow } from '../types';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { QtyMismatchRowsTable } from './QtyMismatchRowsTable';
import { DeviationPercentBars } from './DeviationPercentBars';
import { mismatchRowsToBarPoints, tolerancePctForUploadType } from '../utils/poUploadDeviation';
import { NetSuiteDocumentPushStatus } from '@/modules/common/components/NetSuiteDocumentPushStatus';
import { AlertTriangle, Download, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrgPoUploadDetailPanel({
  open,
  upload,
  po,
  mismatchRows,
  auditLoading,
  auditFallbackFromLog,
  downloading,
  onClose,
  onDownload,
}: {
  open: boolean;
  upload: POUploadEntry | null;
  po: PODetail;
  /** Resolved rows from upload.mismatches or audit log fallback */
  mismatchRows: QtyMismatchRow[] | null;
  auditLoading: boolean;
  /** True when we show audit-sourced rows */
  auditFallbackFromLog: boolean;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !upload || typeof document === 'undefined') return null;

  const barPoints = mismatchRows?.length ? mismatchRowsToBarPoints(mismatchRows) : [];
  const tol = tolerancePctForUploadType(upload, po.uploadRules);
  const showMismatch =
    (mismatchRows?.length ?? 0) > 0 ||
    auditLoading ||
    upload.hasQtyMismatch ||
    (upload.mismatchCount ?? 0) > 0;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close document details"
        className="fixed inset-0 z-[90] bg-slate-950/20 backdrop-blur-[1px] md:bg-slate-950/10"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-upload-panel-title"
        className={cn(
          'fixed inset-y-0 right-0 z-[100] flex w-[min(32rem,100vw)] flex-col',
          'border-l border-border bg-card shadow-2xl',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p id="org-upload-panel-title" className="text-sm font-semibold leading-snug text-foreground">
              {upload.fileName ?? 'Document'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {upload.type ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">{upload.type}</span>
              ) : null}
              {upload.version != null ? <span>v{upload.version}</span> : null}
              <span className="tabular-nums">{formatDateTime(upload.uploadedAt)}</span>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {upload.status}
            </span>
            {upload.fileFormat ? (
              <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium">{upload.fileFormat}</span>
            ) : null}
            {(upload.hasQtyMismatch || (upload.mismatchCount ?? 0) > 0) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                Qty mismatch
                {upload.mismatchCount != null && upload.mismatchCount > 0 ? ` (${upload.mismatchCount})` : ''}
              </span>
            )}
          </div>

          {po.uploadRules && (
            <p className="text-xs text-muted-foreground">
              Buyer tolerance for this doc type: ±{tol ?? '—'}% (packing list {po.uploadRules.packingListQtyTolerancePct}% ·
              invoice {po.uploadRules.commercialInvoiceQtyTolerancePct}%).
            </p>
          )}

          {upload.netsuiteDocumentPush?.status ? (
            <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">NetSuite sync</p>
              <NetSuiteDocumentPushStatus push={upload.netsuiteDocumentPush} />
            </div>
          ) : null}

          <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Deviation by line</p>
            {barPoints.length > 0 ? (
              <DeviationPercentBars points={barPoints} tolerancePct={tol} />
            ) : auditLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted/60" aria-hidden />
            ) : showMismatch && !(mismatchRows?.length) ? (
              <p className="text-sm text-muted-foreground">
                Flagged for quantity mismatch, but line-level % values were not returned. Use the table below or the audit
                log.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No per-line deviation % for this document.</p>
            )}
          </div>

          {upload.fileId ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full shrink-0"
              disabled={downloading}
              onClick={onDownload}
            >
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download file
            </Button>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Line-level details</p>
            {(mismatchRows?.length ?? 0) > 0 ? (
              <QtyMismatchRowsTable
                rows={mismatchRows!}
                title={auditFallbackFromLog ? 'From audit log (payload had no rows)' : undefined}
              />
            ) : auditLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-muted/60" aria-hidden />
            ) : upload.hasQtyMismatch ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No line rows on this submission.</p>
                <Link
                  to={`${ROUTES.ORG.AUDIT}?eventType=QTY_MISMATCH&poId=${encodeURIComponent(po.id)}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open audit log for this PO
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quantity mismatch rows for this document.</p>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

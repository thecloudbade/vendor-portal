import { useState } from 'react';
import type { NetsuiteDocumentPushSummary } from '@/modules/common/types/netsuiteDocumentPush';
import { cn } from '@/lib/utils';
import { downloadOrgFile } from '@/modules/org/api/org.api';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Sending to NetSuite…',
  SENT: 'Sent to NetSuite',
  FAILED: 'NetSuite sync failed',
  SKIPPED: 'Not sent to NetSuite',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-sky-500/15 text-sky-950 dark:text-sky-100',
  SENT: 'bg-emerald-500/15 text-emerald-950 dark:text-emerald-100',
  FAILED: 'bg-destructive/15 text-destructive',
  SKIPPED: 'bg-muted text-muted-foreground',
};

type Props = {
  push?: NetsuiteDocumentPushSummary;
  className?: string;
  /** When true, hide the block if status is missing */
  compact?: boolean;
};

export function NetSuiteDocumentPushStatus({ push, className, compact }: Props) {
  const [downloading, setDownloading] = useState(false);
  if (!push?.status) return compact ? null : <span className="text-xs text-muted-foreground">—</span>;
  const label = STATUS_LABEL[push.status] ?? push.status;
  const tone = STATUS_CLASS[push.status] ?? 'bg-muted text-muted-foreground';
  const pdfId = push.netSuitePdfFileId;
  const pdfName = push.sentFileName?.trim() || 'document.pdf';
  const pdfLabel =
    push.status === 'SENT'
      ? 'File sent to NetSuite'
      : push.status === 'FAILED'
        ? 'Download PDF copy'
        : push.status === 'PENDING'
          ? 'Download PDF'
          : 'File for NetSuite';
  return (
    <div className={cn('inline-flex max-w-[min(100%,20rem)] flex-col gap-0.5 rounded-md px-2 py-1 text-xs font-medium', tone, className)}>
      <span>{label}</span>
      {push.message ? (
        <span className="font-normal text-[11px] leading-snug opacity-90" title={push.message}>
          {push.message}
        </span>
      ) : null}
      {push.sentFileName ? (
        <span className="font-normal text-[11px] leading-snug opacity-90" title="Filename in vendorfilesupload payload">
          File: {push.sentFileName}
        </span>
      ) : null}
      {push.netSuiteExternalId ? (
        <span className="font-normal text-[10px] leading-snug opacity-75 font-mono" title="NetSuite request id">
          {push.netSuiteExternalId}
        </span>
      ) : null}
      {push.lineUpdateHttpStatus != null ? (
        <span
          className="font-normal text-[10px] leading-snug opacity-75"
          title={push.lineUpdateResponseSnippet ?? 'Line quantity POST response'}
        >
          Line update HTTP {push.lineUpdateHttpStatus}
        </span>
      ) : null}
      {pdfId && push.status !== 'SKIPPED' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-7 w-full justify-start gap-1.5 px-2 text-[11px] font-normal"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadOrgFile(pdfId, pdfName);
            } finally {
              setDownloading(false);
            }
          }}
        >
          {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
          {pdfLabel}
        </Button>
      ) : null}
    </div>
  );
}

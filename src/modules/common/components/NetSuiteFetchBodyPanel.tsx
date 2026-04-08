import type { NetSuiteFetchResult } from '@/modules/org/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type NetSuiteFetchBodyPanelProps = {
  result: NetSuiteFetchResult | null | undefined;
  isLoading?: boolean;
  title?: string;
  className?: string;
  /** When true, include urlRedacted (truncated) in the header */
  showUrl?: boolean;
};

function safeStringify(body: unknown): string {
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

/**
 * Shows the full NetSuite proxy response (HTTP status + complete RESTlet `body`), same shape as PO detail’s
 * `postNetSuiteFetchPurchaseLineDataForVendor` / `purchaseLineData` fetch.
 */
export function NetSuiteFetchBodyPanel({
  result,
  isLoading,
  title = 'NetSuite purchase order data',
  className,
  showUrl = false,
}: NetSuiteFetchBodyPanelProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/15 py-10',
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading NetSuite data…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground',
          className
        )}
      >
        Select a PO above to load the full NetSuite response for that transaction.
      </div>
    );
  }

  const { netsuiteHttpStatus, body, netsuiteErrorSnippet, urlRedacted } = result;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            netsuiteHttpStatus >= 200 && netsuiteHttpStatus < 300
              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          HTTP {netsuiteHttpStatus}
        </span>
        {netsuiteErrorSnippet ? (
          <span className="max-w-full truncate rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            {netsuiteErrorSnippet}
          </span>
        ) : null}
      </div>
      {showUrl && urlRedacted ? (
        <p className="break-all text-[11px] text-muted-foreground">{urlRedacted}</p>
      ) : null}
      <pre className="max-h-[min(480px,70vh)] overflow-auto rounded-xl border border-border/80 bg-muted/25 p-4 text-left text-xs leading-relaxed text-foreground shadow-inner dark:bg-muted/15">
        {safeStringify(body)}
      </pre>
    </div>
  );
}

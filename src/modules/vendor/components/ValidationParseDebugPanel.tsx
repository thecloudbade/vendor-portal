import type { VendorUploadValidationDebug } from '../types';

const DOC_LABEL: Record<'pl' | 'ci' | 'coo', string> = {
  pl: 'Packing list',
  ci: 'Commercial invoice',
  coo: 'COO',
};

/**
 * Shows `data.debug` from validate-only upload (`validationDebug=true`).
 * PL CSV includes `plCsvUpload`: grid preview, template rows, `detectedRows`.
 */
export function ValidationParseDebugPanel({
  debugByDoc,
}: {
  debugByDoc: Partial<Record<'pl' | 'ci' | 'coo', VendorUploadValidationDebug>>;
}) {
  const entries = (['pl', 'ci', 'coo'] as const).filter((k) => debugByDoc[k] != null);
  if (entries.length === 0) return null;

  return (
    <details className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs">
      <summary className="cursor-pointer select-none font-medium text-foreground">
        Parse debug (server)
      </summary>
      <p className="mt-2 text-[11px] text-muted-foreground">
        From <code className="rounded bg-muted px-1">validationDebug=true</code>. PL includes{' '}
        <code className="rounded bg-muted px-1">plCsvUpload</code> (grid preview, itemsStartRow, detected rows).
      </p>
      <div className="mt-3 space-y-3">
        {entries.map((doc) => (
          <div key={doc}>
            <p className="mb-1 font-medium text-foreground">{DOC_LABEL[doc]}</p>
            <pre className="max-h-[min(24rem,50vh)] overflow-auto rounded border border-border/60 bg-background p-2 font-mono text-[10px] leading-relaxed text-foreground">
              {JSON.stringify(debugByDoc[doc], null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}

import { useMemo } from 'react';

function formatFieldValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

type KeyValueFieldsProps = {
  data: Record<string, unknown> | null | undefined;
  className?: string;
  /** Smaller text for dense tables */
  dense?: boolean;
  /** Optional NetSuite field id → display label (falls back to raw key). */
  labelByKey?: Record<string, string>;
};

/**
 * Renders every key from a flat object (sorted) — for API payloads like `netsuiteFields` / `summary`.
 */
export function KeyValueFields({ data, className = '', dense = false, labelByKey }: KeyValueFieldsProps) {
  const entries = useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.keys(data)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((key) => ({ key, value: data[key] }));
  }, [data]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No fields</p>;
  }

  const textSize = dense ? 'text-xs' : 'text-sm';
  const labelClass = dense ? 'text-[11px] uppercase tracking-wide text-muted-foreground' : 'text-muted-foreground';

  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 ${className}`}>
      {entries.map(({ key, value }) => {
        const str = formatFieldValue(value);
        const isMultiline = str.includes('\n') || str.length > 120;
        /** PO details: show mapped label only; unmapped keys stay as the raw id. */
        const displayLabel = labelByKey?.[key]?.trim() || key;
        return (
          <div key={key} className="min-w-0 border-b border-border/40 pb-2 last:border-0 sm:border-0 sm:pb-0">
            <dt className={`font-medium ${labelClass}`}>{displayLabel}</dt>
            <dd className={`mt-0.5 min-w-0 break-words font-normal text-foreground ${textSize}`}>
              {isMultiline ? (
                <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
                  {str}
                </pre>
              ) : (
                str
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

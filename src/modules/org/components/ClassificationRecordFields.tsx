import type { ReactNode } from 'react';
import { asPlainObject } from '../utils/classificationRecords.model';

export function formatClassificationDetailValue(v: unknown): ReactNode {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  if (typeof v === 'object') {
    return (
      <pre className="mt-0 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 font-mono text-[11px]">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  return String(v);
}

export function ClassificationRecordDetail({ raw }: { raw: unknown }) {
  const obj = asPlainObject(raw);
  if (!obj) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
        {typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)}
      </pre>
    );
  }
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return (
    <div className="space-y-4">
      {keys.map((k) => (
        <div key={k}>
          <div className="font-mono text-[11px] font-medium text-muted-foreground">{k}</div>
          <div className="mt-1 text-sm">{formatClassificationDetailValue(obj[k])}</div>
        </div>
      ))}
    </div>
  );
}

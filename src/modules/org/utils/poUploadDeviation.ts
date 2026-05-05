import type { PODetail, POUploadEntry, QtyMismatchRow } from '../types';

export function tolerancePctForUploadType(
  upload: POUploadEntry,
  rules: PODetail['uploadRules']
): number | undefined {
  if (!rules) return undefined;
  const t = upload.type?.toUpperCase() ?? '';
  if (t === 'ASN') return undefined;
  if (t.includes('COMMERCIAL') || t === 'CI' || t.includes('INVOICE')) {
    return rules.commercialInvoiceQtyTolerancePct;
  }
  return rules.packingListQtyTolerancePct;
}

/** Prefer signed deviation when present (directional). */
export function deviationPctFromRow(row: QtyMismatchRow): number | null {
  const signed = row.signedDeviationPct;
  if (typeof signed === 'number' && Number.isFinite(signed)) return Math.abs(signed);
  if (typeof signed === 'string' && signed.trim() !== '') {
    const n = Number(signed);
    if (Number.isFinite(n)) return Math.abs(n);
  }
  const dev = row.deviationPct;
  if (typeof dev === 'number' && Number.isFinite(dev)) return Math.abs(dev);
  if (typeof dev === 'string' && dev.trim() !== '') {
    const n = Number(dev);
    if (Number.isFinite(n)) return Math.abs(n);
  }
  return null;
}

export function lineLabelFromRow(row: QtyMismatchRow, index: number): string {
  const ln = row.lineNo;
  if (typeof ln === 'number' && Number.isFinite(ln)) return `L${ln}`;
  if (typeof ln === 'string' && ln.trim() !== '') return `L${ln}`;
  const sku = row.sku;
  if (typeof sku === 'string' && sku.trim() !== '') return String(sku).slice(0, 12);
  return `#${index + 1}`;
}

export type DeviationBarPoint = { key: string; label: string; pct: number };

export function mismatchRowsToBarPoints(rows: QtyMismatchRow[]): DeviationBarPoint[] {
  return rows
    .map((row, i) => {
      const pct = deviationPctFromRow(row);
      if (pct == null) return null;
      return {
        key: `${lineLabelFromRow(row, i)}-${i}`,
        label: lineLabelFromRow(row, i),
        pct,
      };
    })
    .filter((x): x is DeviationBarPoint => x != null);
}

export function maxDeviationPct(points: DeviationBarPoint[]): number {
  if (!points.length) return 0;
  return Math.max(...points.map((p) => p.pct));
}

/** Chronologically latest submission (by uploadedAt). */
export function getLatestUpload(uploads: POUploadEntry[] | undefined): POUploadEntry | null {
  if (!uploads?.length) return null;
  return [...uploads].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0];
}

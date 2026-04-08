import type { CsvPackingListLayout, PackingListTotalKey } from '../types';
import { PACKING_LIST_TOTAL_KEYS } from '../types';
import { isLineSourcePath, isValidSourcePath } from './packingListLayout';

const CSV_RC_RE = /^R(\d+)C(\d+)$/i;
const COL_LETTERS_RE = /^[A-Z]+$/i;

const ALLOWED_TOTAL_KEYS = new Set<string>(PACKING_LIST_TOTAL_KEYS);

export function parseCsvRcRef(ref: string): { row: number; col: number } | null {
  const s = String(ref ?? '').trim().toUpperCase();
  const m = s.match(CSV_RC_RE);
  if (!m) return null;
  return { row: parseInt(m[1], 10), col: parseInt(m[2], 10) };
}

export function normalizeCsvPackingListLayoutFromApi(raw: unknown): CsvPackingListLayout | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const itemsStartRow = Number(o.itemsStartRow);
  if (!Number.isFinite(itemsStartRow) || itemsStartRow < 1) return null;
  return sanitizeCsvPackingListLayout({
    itemsStartRow,
    headerMap: o.headerMap,
    itemsColMap: o.itemsColMap,
    totalsMap: o.totalsMap,
    staticCells: o.staticCells,
  } as CsvPackingListLayout);
}

export function emptyCsvPackingListLayout(partial?: Partial<CsvPackingListLayout>): CsvPackingListLayout {
  return {
    itemsStartRow: partial?.itemsStartRow ?? 2,
    headerMap: { ...partial?.headerMap },
    itemsColMap: { ...partial?.itemsColMap },
    totalsMap: { ...partial?.totalsMap },
    staticCells: partial?.staticCells ? { ...partial.staticCells } : undefined,
  };
}

function normalizeStringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (String(k).trim() && val != null) out[k] = String(val).trim();
  }
  return out;
}

function normalizeTotalsMap(v: unknown): Partial<Record<PackingListTotalKey, string>> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Partial<Record<PackingListTotalKey, string>> = {};
  for (const k of PACKING_LIST_TOTAL_KEYS) {
    const val = (v as Record<string, unknown>)[k];
    if (val != null && String(val).trim() !== '') out[k] = String(val).trim().toUpperCase();
  }
  return out;
}

export function sanitizeCsvPackingListLayout(raw: CsvPackingListLayout): CsvPackingListLayout {
  const itemsStartRow = Math.max(1, Math.floor(Number(raw.itemsStartRow) || 2));
  const headerMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(normalizeStringMap(raw.headerMap))) {
    const ref = String(v).trim().toUpperCase();
    if (ref) headerMap[k] = ref;
  }
  const itemsColMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(normalizeStringMap(raw.itemsColMap))) {
    const col = String(v).trim().toUpperCase();
    if (col) itemsColMap[k] = col;
  }
  const totalsMap = normalizeTotalsMap(raw.totalsMap);
  let staticCells: Record<string, string> | undefined;
  if (raw.staticCells && typeof raw.staticCells === 'object' && !Array.isArray(raw.staticCells)) {
    const sc: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.staticCells)) {
      const ref = String(k).trim().toUpperCase();
      if (ref) sc[ref] = String(v ?? '');
    }
    staticCells = Object.keys(sc).length ? sc : undefined;
  }
  return {
    itemsStartRow,
    headerMap,
    itemsColMap,
    totalsMap,
    ...(staticCells ? { staticCells } : {}),
  };
}

/** Client-side validation aligned with df-vendor `csvPackingListLayout.validation.js`. */
export function validateCsvPackingListLayout(layout: CsvPackingListLayout): string | null {
  const { headerMap, itemsStartRow, itemsColMap, totalsMap, staticCells } = layout;
  if (itemsStartRow == null || !Number.isFinite(Number(itemsStartRow)) || Number(itemsStartRow) < 1) {
    return 'First line row must be a positive integer.';
  }
  if (!headerMap || typeof headerMap !== 'object') return 'Header map is required.';
  if (!itemsColMap || typeof itemsColMap !== 'object') return 'Line columns map is required.';
  if (!totalsMap || typeof totalsMap !== 'object') return 'Totals map is required.';

  for (const [pathStr, ref] of Object.entries(headerMap)) {
    if (!isValidSourcePath(pathStr) || isLineSourcePath(pathStr)) {
      return `Invalid header field path: ${pathStr}`;
    }
    if (!parseCsvRcRef(ref)) {
      return `Invalid header R/C ref for ${pathStr}: ${ref} (use R1C1, e.g. R3C5)`;
    }
  }
  for (const [pathStr, col] of Object.entries(itemsColMap)) {
    if (!isLineSourcePath(pathStr)) {
      return `Line columns must use line.* paths: ${pathStr}`;
    }
    if (!isValidSourcePath(pathStr)) {
      return `Invalid line path: ${pathStr}`;
    }
    const c = String(col ?? '').trim().toUpperCase();
    if (!COL_LETTERS_RE.test(c)) {
      return `Invalid column letter for ${pathStr}: ${col}`;
    }
  }
  for (const [key, ref] of Object.entries(totalsMap)) {
    if (!ALLOWED_TOTAL_KEYS.has(key)) {
      return `Unknown totals key: ${key}`;
    }
    if (ref && !parseCsvRcRef(ref)) {
      return `Invalid totals R/C ref for ${key}: ${ref}`;
    }
  }
  if (staticCells != null) {
    if (typeof staticCells !== 'object' || Array.isArray(staticCells)) {
      return 'Static cells must be an object.';
    }
    for (const ref of Object.keys(staticCells)) {
      if (!parseCsvRcRef(ref)) {
        return `Invalid static cell ref: ${ref} (use R1C1)`;
      }
    }
  }
  return null;
}

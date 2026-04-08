import { PACKING_LIST_TOTAL_KEYS, type PackingListLayout, type PackingListTotalKey } from '../types';

const CELL_REF_RE = /^([A-Z]+)(\d+)$/i;
const COL_LETTERS_RE = /^[A-Z]+$/i;

/** Must stay aligned with `df-vendor` `mappableFields.catalog.js` (`STATIC_PREFIXES`). */
export const MAPPABLE_STATIC_PREFIXES = [
  'organization.name',
  'organization.status',
  'organization.timezone',
  'organization.address',
  'purchaseOrder.poNumber',
  'purchaseOrder.poDate',
  'purchaseOrder.status',
  'purchaseOrder.summary',
  'purchaseOrder.externalId',
  'purchaseOrder.externalSource',
  'purchaseOrder.lastNetSuiteSyncAt',
  'purchaseOrder.createdAt',
  'purchaseOrder.updatedAt',
  'purchaseOrder.summary.itemCount',
  'purchaseOrder.summary.totalQty',
  'vendor.vendorName',
  'vendor.vendorCode',
  'vendor.category',
  'vendor.categoryId',
  'vendor.status',
  'vendor.externalId',
  'vendor.externalSource',
  'vendor.inactive',
  'line.lineNo',
  'line.sku',
  'line.description',
  'line.orderedQty',
  'line.uom',
] as const;

const STATIC_PREFIX_SET = new Set<string>(MAPPABLE_STATIC_PREFIXES);

/** `purchaseOrder.summary.<subKey>` — Mongo Mixed keys on PO summary. */
export const SUMMARY_SUBKEY_REGEX = /^purchaseOrder\.summary\.[a-zA-Z0-9_-]{1,128}$/;

/** NetSuite blob keys: `*.netsuiteFields.<key>` (RESTlet ids may use `._-`). */
export const NETSUITE_FIELDS_PATH_REGEX =
  /^(purchaseOrder|vendor|line)\.netsuiteFields\.[a-zA-Z0-9_.-]{1,128}$/;

export function isValidSourcePath(pathStr: string): boolean {
  const s = String(pathStr ?? '').trim();
  if (!s) return false;
  if (STATIC_PREFIX_SET.has(s)) return true;
  if (SUMMARY_SUBKEY_REGEX.test(s)) return true;
  if (NETSUITE_FIELDS_PATH_REGEX.test(s)) return true;
  return false;
}

export function isLineSourcePath(pathStr: string): boolean {
  return String(pathStr ?? '').trim().startsWith('line.');
}

export function parseCellRef(addr: string): { col: string; row: number } | null {
  const s = String(addr ?? '').trim().toUpperCase();
  const m = s.match(CELL_REF_RE);
  if (!m) return null;
  return { col: m[1], row: parseInt(m[2], 10) };
}

export function isValidColumnLetters(col: string): boolean {
  return COL_LETTERS_RE.test(String(col ?? '').trim().toUpperCase());
}

const TOTAL_LABELS: Record<PackingListTotalKey, string> = {
  total_qty: 'Total quantity',
  total_net: 'Total net',
  total_gross: 'Total gross',
  total_cbm: 'Total CBM',
  total_cartons: 'Total cartons',
  total_pallets: 'Total pallets',
};

export function packingListTotalLabel(key: PackingListTotalKey): string {
  return TOTAL_LABELS[key];
}

/** Empty maps; caller sets `itemsStartRow` and optional `sheetName`. */
export function emptyPackingListLayout(partial?: Partial<PackingListLayout>): PackingListLayout {
  return {
    itemsStartRow: partial?.itemsStartRow ?? 2,
    sheetName: partial?.sheetName,
    headerMap: { ...partial?.headerMap },
    itemsColMap: { ...partial?.itemsColMap },
    totalsMap: { ...partial?.totalsMap },
    staticCells: partial?.staticCells ? { ...partial.staticCells } : undefined,
  };
}

export function normalizePackingListLayout(raw: unknown): PackingListLayout | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const itemsStartRow = Number(o.itemsStartRow);
  if (!Number.isFinite(itemsStartRow) || itemsStartRow < 1) return null;
  const headerMap = normalizeStringMap(o.headerMap);
  const itemsColMap = normalizeStringMap(o.itemsColMap);
  const totalsMap = normalizeTotalsMap(o.totalsMap);
  const staticCells = o.staticCells != null ? normalizeStringMap(o.staticCells) : undefined;
  const sheetName = o.sheetName != null ? String(o.sheetName).trim() : undefined;
  return {
    sheetName: sheetName || undefined,
    itemsStartRow,
    headerMap,
    itemsColMap,
    totalsMap,
    ...(staticCells && Object.keys(staticCells).length > 0 ? { staticCells } : {}),
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
  for (const key of PACKING_LIST_TOTAL_KEYS) {
    const val = (v as Record<string, unknown>)[key];
    if (val != null && String(val).trim() !== '') {
      out[key] = String(val).trim();
    }
  }
  return out;
}

/** Strip empty strings and invalid keys before validate/save. */
export function sanitizePackingListLayout(layout: PackingListLayout): PackingListLayout {
  const headerMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(layout.headerMap ?? {})) {
    const pk = k.trim();
    const pv = String(v ?? '').trim();
    if (pk && pv) headerMap[pk] = pv.toUpperCase();
  }
  const itemsColMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(layout.itemsColMap ?? {})) {
    const pk = k.trim();
    const pv = String(v ?? '').trim().toUpperCase();
    if (pk && pv) itemsColMap[pk] = pv;
  }
  const totalsMap: Partial<Record<PackingListTotalKey, string>> = {};
  for (const key of PACKING_LIST_TOTAL_KEYS) {
    const pv = layout.totalsMap?.[key];
    if (pv != null && String(pv).trim() !== '') {
      totalsMap[key] = String(pv).trim().toUpperCase();
    }
  }
  let staticCells: Record<string, string> | undefined;
  if (layout.staticCells && typeof layout.staticCells === 'object') {
    const sc: Record<string, string> = {};
    for (const [k, v] of Object.entries(layout.staticCells)) {
      const rk = k.trim().toUpperCase();
      if (rk) sc[rk] = String(v ?? '');
    }
    if (Object.keys(sc).length > 0) staticCells = sc;
  }
  return {
    sheetName: layout.sheetName?.trim() || undefined,
    itemsStartRow: layout.itemsStartRow,
    headerMap,
    itemsColMap,
    totalsMap,
    ...(staticCells ? { staticCells } : {}),
  };
}

/** Returns `null` if valid, else an error message string. */
export function validatePackingListLayout(layout: PackingListLayout): string | null {
  if (layout == null || typeof layout !== 'object') {
    return 'Layout is required.';
  }
  const {
    sheetName,
    headerMap,
    itemsStartRow,
    itemsColMap,
    totalsMap,
    staticCells,
  } = sanitizePackingListLayout(layout);

  if (sheetName != null && typeof sheetName !== 'string') {
    return 'sheetName must be a string when set.';
  }
  if (itemsStartRow == null || !Number.isFinite(Number(itemsStartRow)) || Number(itemsStartRow) < 1) {
    return 'itemsStartRow must be a positive integer.';
  }
  if (!headerMap || typeof headerMap !== 'object' || Array.isArray(headerMap)) {
    return 'headerMap must be an object.';
  }
  if (!itemsColMap || typeof itemsColMap !== 'object' || Array.isArray(itemsColMap)) {
    return 'itemsColMap must be an object.';
  }
  if (!totalsMap || typeof totalsMap !== 'object' || Array.isArray(totalsMap)) {
    return 'totalsMap must be an object.';
  }

  for (const [pathStr, ref] of Object.entries(headerMap)) {
    if (!isValidSourcePath(pathStr) || isLineSourcePath(pathStr)) {
      return `Invalid headerMap path: ${pathStr}`;
    }
    if (!parseCellRef(ref)) {
      return `Invalid headerMap cell ref for ${pathStr}: ${ref}`;
    }
  }
  for (const [pathStr, col] of Object.entries(itemsColMap)) {
    if (!isLineSourcePath(pathStr)) {
      return `itemsColMap paths must start with line.: ${pathStr}`;
    }
    if (!isValidSourcePath(pathStr)) {
      return `Invalid itemsColMap path: ${pathStr}`;
    }
    if (!isValidColumnLetters(col)) {
      return `Invalid itemsColMap column for ${pathStr}: ${col}`;
    }
  }
  for (const [key, ref] of Object.entries(totalsMap)) {
    if (!PACKING_LIST_TOTAL_KEYS.includes(key as PackingListTotalKey)) {
      return `Unknown totalsMap key: ${key}`;
    }
    if (!parseCellRef(ref)) {
      return `Invalid totalsMap cell for ${key}: ${ref}`;
    }
  }
  if (staticCells != null) {
    if (typeof staticCells !== 'object' || Array.isArray(staticCells)) {
      return 'staticCells must be an object.';
    }
    for (const ref of Object.keys(staticCells)) {
      if (!parseCellRef(ref)) {
        return `Invalid staticCells ref: ${ref}`;
      }
    }
  }
  return null;
}

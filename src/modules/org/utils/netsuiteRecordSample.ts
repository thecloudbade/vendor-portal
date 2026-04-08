/**
 * Pull sample rows from cached NetSuite RESTlet payloads (same shapes as live fetch).
 * Kept in sync with extractNetSuiteFieldFetchList key paths (PO lines, nested data, etc.).
 */
export function getNetSuiteSampleRows(payload: unknown): Record<string, unknown>[] {
  const asRows = (raw: unknown): Record<string, unknown>[] => {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[];
    }
    if (typeof raw !== 'object') return [];
    const o = raw as Record<string, unknown>;
    if (o.body !== undefined) return asRows(o.body);
    if (typeof o.status === 'string' && o.status.toLowerCase() === 'error') return [];

    const success = typeof o.status === 'string' && o.status.toLowerCase() === 'success';

    if (success && Array.isArray(o.data)) return asRows(o.data);

    if (success && o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      const d = o.data as Record<string, unknown>;
      for (const k of ['lines', 'lineItems', 'items', 'records', 'rows', 'purchaseOrders', 'orders', 'results']) {
        if (Array.isArray(d[k])) return asRows(d[k]);
      }
    }

    if (Array.isArray(o.data)) return asRows(o.data);

    for (const k of [
      'lines',
      'lineItems',
      'items',
      'records',
      'rows',
      'purchaseOrders',
      'orders',
      'results',
      'data',
    ]) {
      if (Array.isArray(o[k])) return asRows(o[k]);
    }
    return [];
  };
  return asRows(payload);
}

/** Short line for dropdown: Active / Inactive / sample value. */
export function fieldKeySampleDetail(key: string, row: Record<string, unknown> | undefined): string | undefined {
  if (!row || !(key in row)) return undefined;
  const v = row[key];
  if (key === 'inactive' || key === 'isInactive') {
    return v === true || v === 'T' || v === 'true' ? 'Inactive' : 'Active';
  }
  if (key === 'status' && (typeof v === 'string' || typeof v === 'number')) {
    return String(v).slice(0, 48);
  }
  if (v === true || v === false) {
    return v ? 'Yes' : 'No';
  }
  if (v == null) return '—';
  const s = String(v).trim();
  if (!s) return undefined;
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

/** First matching sample value across payloads and rows (PO header vs line cache). */
export function fieldKeyDetailFromPayloads(key: string, payloads: unknown[]): string | undefined {
  for (const p of payloads) {
    const rows = getNetSuiteSampleRows(p);
    for (const row of rows) {
      if (key in row) {
        const d = fieldKeySampleDetail(key, row);
        if (d) return d;
      }
    }
  }
  // Catalog-style rows: id is a `recordtype` value (e.g. CUSTOMRECORD_*) — show human `name`.
  for (const p of payloads) {
    const rows = getNetSuiteSampleRows(p);
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const rt = r.recordtype ?? r.recordType;
      if (typeof rt === 'string' && rt.trim() === key) {
        const n = r.name ?? r.label;
        if (typeof n === 'string' && n.trim()) return n.trim();
      }
    }
  }
  return undefined;
}

/** When the DB returns keys, merge with presets so both appear; when empty, presets only. */
export function mergeDbKeysOrPresets(dbKeys: string[], presets: readonly string[]): string[] {
  if (dbKeys.length === 0) return [...presets];
  return [...new Set([...dbKeys, ...presets])].sort((a, b) => a.localeCompare(b));
}

/**
 * Normalizes PO line rows from GET /org/pos/:id and GET /vendor/pos/:id (Mongo / API may use mixed keys).
 */
export type PortalPOLineItem = {
  id: string;
  lineNo?: number;
  sku?: string;
  description?: string;
  expectedQty: number;
  unit?: string;
  rate?: number;
  amount?: number;
  /** Full NetSuite line snapshot from API (when present). */
  netsuiteFields?: Record<string, unknown>;
};

function pickLineNumber(r: Record<string, unknown>): number | undefined {
  const lineNoRaw = r.lineNo ?? r.line_no ?? r.lineNumber ?? r.sequence;
  if (lineNoRaw == null) return undefined;
  const n = typeof lineNoRaw === 'number' ? lineNoRaw : Number(lineNoRaw);
  return Number.isFinite(n) ? n : undefined;
}

function pickLineAmount(r: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function qtyFromRecord(rec: Record<string, unknown>): number | undefined {
  const qtyRaw =
    rec.expectedQty ??
    rec.expected_qty ??
    rec.quantity ??
    rec.qty ??
    rec.orderedQty ??
    rec.ordered_qty;
  if (typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)) return qtyRaw;
  if (typeof qtyRaw === 'string' && qtyRaw.trim() !== '') {
    const n = Number(qtyRaw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function mapPortalPoLineItem(raw: unknown, index: number): PortalPOLineItem {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id = String(r.id ?? r.lineId ?? r.line_id ?? `line-${index}`);
  const ns =
    r.netsuiteFields && typeof r.netsuiteFields === 'object' && !Array.isArray(r.netsuiteFields)
      ? (r.netsuiteFields as Record<string, unknown>)
      : null;

  let expectedQty = qtyFromRecord(r);
  if (expectedQty == null && ns) {
    expectedQty = qtyFromRecord(ns);
  }
  if (expectedQty == null) expectedQty = 0;

  const rate = pickLineAmount(r, 'rate', 'unitPrice', 'unit_price', 'price') ?? (ns ? pickLineAmount(ns, 'rate', 'price') : undefined);
  const amount = pickLineAmount(r, 'amount', 'lineTotal', 'line_total', 'total', 'extended');

  const skuTop = r.sku != null ? String(r.sku) : r.item != null ? String(r.item) : undefined;
  const skuNs = ns && ns.sku != null ? String(ns.sku) : ns && ns.item_id != null ? String(ns.item_id) : undefined;

  let netsuiteFieldsOut: Record<string, unknown> | undefined;
  if (ns) {
    netsuiteFieldsOut = { ...ns };
  } else if (r.netsuiteFields && typeof r.netsuiteFields === 'object' && !Array.isArray(r.netsuiteFields)) {
    netsuiteFieldsOut = { ...(r.netsuiteFields as Record<string, unknown>) };
  }

  return {
    id,
    lineNo: pickLineNumber(r) ?? (ns ? pickLineNumber(ns) : undefined),
    sku: skuTop ?? skuNs,
    description:
      r.description != null
        ? String(r.description)
        : r.memo != null
          ? String(r.memo)
          : r.item_display_name != null
            ? String(r.item_display_name)
            : ns?.entity != null
              ? String(ns.entity)
              : undefined,
    expectedQty,
    unit: r.unit != null ? String(r.unit) : r.uom != null ? String(r.uom) : undefined,
    rate,
    amount,
    netsuiteFields: netsuiteFieldsOut,
  };
}

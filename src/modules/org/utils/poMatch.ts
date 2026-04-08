import type { POListItem } from '../types';

export function normalizePoMatchKey(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/\s+/g, '').toLowerCase().replace(/^po[#\s-]*/, '');
}

/** Match a portal PO row by NetSuite trans id or PO number (no “single row” fallback). */
export function matchPortalPoFromRows(
  rows: POListItem[] | undefined,
  opts: { transId?: string; poNum?: string }
): POListItem | undefined {
  if (!rows?.length) return undefined;
  const trans = opts.transId?.trim();
  if (trans) {
    const byTrans = rows.find(
      (p) => (p.netsuiteTransId != null && p.netsuiteTransId === trans) || p.id === trans
    );
    if (byTrans) return byTrans;
  }
  const nsKey = normalizePoMatchKey(opts.poNum);
  if (nsKey) {
    const byNum = rows.find((p) => normalizePoMatchKey(p.poNumber) === nsKey);
    if (byNum) return byNum;
  }
  return undefined;
}

export type NetSuitePOMetaLike = { po_id: number; po_num: string };

export function findPortalPoIdForNetSuiteRow(
  portalRows: POListItem[] | undefined,
  ns: NetSuitePOMetaLike
): string | undefined {
  const m = matchPortalPoFromRows(portalRows, { transId: String(ns.po_id), poNum: ns.po_num });
  return m?.id;
}

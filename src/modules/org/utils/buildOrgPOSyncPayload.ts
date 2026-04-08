import { pickNetSuiteCell } from '@/modules/common/utils/netsuiteFetch';
import type { OrgPOUpdatePayload, PODetail } from '../types';

function parseQty(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function mapNetSuiteRowToOrgLine(row: Record<string, unknown>, index: number) {
  const lineNoRaw = row.line_id ?? row.line_no ?? row.linenumber ?? row.line;
  let lineNo: number;
  if (typeof lineNoRaw === 'number' && !Number.isNaN(lineNoRaw)) {
    lineNo = lineNoRaw;
  } else {
    const p = parseInt(String(lineNoRaw ?? ''), 10);
    lineNo = Number.isFinite(p) && p > 0 ? p : index + 1;
  }
  const skuRaw = pickNetSuiteCell(row, ['sku', 'item', 'item_name']);
  const sku = skuRaw === '—' ? `LINE-${lineNo}` : skuRaw;
  const descRaw = pickNetSuiteCell(row, ['description', 'memo', 'item_display_name', 'item_name']);
  const description = descRaw === '—' ? sku : descRaw;
  const orderedQty = parseQty(row.quantity ?? row.qty);
  const uomRaw = pickNetSuiteCell(row, ['uom', 'unit', 'units']);
  const uom = uomRaw === '—' ? 'EA' : uomRaw;
  return { lineNo, sku, description, orderedQty, uom };
}

/**
 * Builds PUT /org/pos/:id body from NetSuite line rows when present, otherwise from portal `po.items`.
 */
export function buildOrgPOSyncPayload(po: PODetail, nsLineRows: Record<string, unknown>[]): OrgPOUpdatePayload {
  const portalLines = po.items ?? [];
  const lines =
    nsLineRows.length > 0
      ? nsLineRows.map((row, i) => mapNetSuiteRowToOrgLine(row, i))
      : portalLines.map((item, i) => ({
          lineNo: i + 1,
          sku: (item.sku ?? item.description ?? 'ITEM').trim() || 'ITEM',
          description: (item.description ?? item.sku ?? 'Item').trim() || 'Item',
          orderedQty: item.expectedQty,
          uom: (item.unit ?? 'EA').trim() || 'EA',
        }));

  return {
    status: po.status,
    lines,
  };
}

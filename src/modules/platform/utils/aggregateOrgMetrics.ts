import type { PlatformOrgListItem } from '../types';

function metricNum(m: Record<string, unknown> | undefined, keys: string[]): number {
  if (!m) return 0;
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/** Sum KPI-style counters across multiple organizations (metrics blocks vary by API version). */
export function aggregateOrgDirectoryMetrics(orgs: PlatformOrgListItem[]) {
  let purchaseOrders = 0;
  let vendors = 0;
  let vendorUsers = 0;
  let submissions = 0;
  const poByStatus: Record<string, number> = {};

  for (const org of orgs) {
    const m = org.metrics as Record<string, unknown> | undefined;
    purchaseOrders += metricNum(m, [
      'purchaseOrderCount',
      'purchase_order_count',
      'poCount',
      'totalPurchaseOrders',
      'total_purchase_orders',
    ]);
    vendors += metricNum(m, ['vendorCount', 'vendor_count', 'vendorsCount']);
    vendorUsers += metricNum(m, ['vendorUserCount', 'vendor_user_count', 'vendorUsersCount']);
    submissions += metricNum(m, ['submissionCount', 'submission_count', 'submissionsCount']);

    const raw =
      m?.poByStatus ??
      m?.po_by_status ??
      m?.purchaseOrdersByStatus ??
      m?.purchase_orders_by_status;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) continue;
        poByStatus[k] = (poByStatus[k] ?? 0) + n;
      }
    }
  }

  return { purchaseOrders, vendors, vendorUsers, submissions, poByStatus };
}

/** Single KPI read for tables */
export function readNumericMetric(org: PlatformOrgListItem, keys: string[]): number {
  const m = org.metrics as Record<string, unknown> | undefined;
  return metricNum(m, keys);
}

/** Highest-volume tenants first — uses PO count heuristic when metrics missing */
export function sortOrgsByPurchaseOrderVolume(orgs: PlatformOrgListItem[]): PlatformOrgListItem[] {
  return [...orgs].sort((a, b) => {
    const ma = a.metrics as Record<string, unknown> | undefined;
    const mb = b.metrics as Record<string, unknown> | undefined;
    const pa = metricNum(ma, ['purchaseOrderCount', 'purchase_order_count', 'poCount', 'totalPurchaseOrders']);
    const pb = metricNum(mb, ['purchaseOrderCount', 'purchase_order_count', 'poCount', 'totalPurchaseOrders']);
    return pb - pa || (a.name ?? '').localeCompare(b.name ?? '');
  });
}

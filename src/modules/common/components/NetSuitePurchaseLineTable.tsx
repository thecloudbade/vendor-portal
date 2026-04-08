import { pickNetSuiteCell } from '@/modules/common/utils/netsuiteFetch';
import { cn } from '@/lib/utils';

type Row = Record<string, unknown>;

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/** First non-empty value among keys (NetSuite may use snake_case or camelCase). */
function pickNumericCell(row: Row, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== '') return String(v);
  }
  return '—';
}

function firstString(row: Row, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

export type NetSuitePurchaseLineTableProps = {
  rows: Row[];
  isLoading?: boolean;
  /** Show PO-level summary (tran id, date, vendor, ship-to) from the first row */
  showHeaderSummary?: boolean;
  className?: string;
};

const COL_COUNT = 10;

/**
 * Renders NetSuite `purchaseLineData` rows (e.g. tranid, line_id, sku, quantity, rem_pl_qty, …).
 */
export function NetSuitePurchaseLineTable({
  rows,
  isLoading,
  showHeaderSummary = true,
  className,
}: NetSuitePurchaseLineTableProps) {
  const first = rows[0];
  const summary = first && showHeaderSummary ? (
    <div className="mb-4 space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="text-muted-foreground">PO #</span>{' '}
          <span className="font-medium">{fmt(first.tranid ?? first.tran_id)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Date</span>{' '}
          <span className="font-medium">{fmt(first.trandate)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Vendor</span>{' '}
          <span className="font-medium">{fmt(first.entity)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Location</span>{' '}
          <span className="font-medium">{fmt(first.location)}</span>
        </span>
        {first.incoterm != null && String(first.incoterm).trim() !== '' && (
          <span>
            <span className="text-muted-foreground">Incoterm</span>{' '}
            <span className="font-medium">{fmt(first.incoterm)}</span>
          </span>
        )}
      </div>
      {firstString(first, ['shippingaddress']) && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ship to: </span>
          {firstString(first, ['shippingaddress'])}
        </p>
      )}
      {!firstString(first, ['shippingaddress']) &&
        (firstString(first, ['addr1', 'city']) || firstString(first, ['attention'])) && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Address: </span>
            {[
              firstString(first, ['attention']),
              firstString(first, ['addr1']),
              firstString(first, ['addr2']),
              [firstString(first, ['city']), firstString(first, ['state']), firstString(first, ['zip'])]
                .filter(Boolean)
                .join(', '),
              firstString(first, ['country']),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
    </div>
  ) : null;

  return (
    <div className={cn('space-y-3', className)}>
      {summary}
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <th className="whitespace-nowrap p-2.5">Line</th>
              <th className="whitespace-nowrap p-2.5">SKU</th>
              <th className="whitespace-nowrap p-2.5">Item ID</th>
              <th className="whitespace-nowrap p-2.5">Location</th>
              <th className="whitespace-nowrap p-2.5 text-right">Qty</th>
              <th className="whitespace-nowrap p-2.5 text-right">PL qty</th>
              <th className="whitespace-nowrap p-2.5 text-right">CI qty</th>
              <th className="whitespace-nowrap p-2.5 text-right">Rem PL</th>
              <th className="whitespace-nowrap p-2.5 text-right">Rem CI</th>
              <th className="whitespace-nowrap p-2.5">UPC</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={COL_COUNT} className="p-6 text-center text-muted-foreground">
                  Loading NetSuite line items…
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((row, idx) => (
                <tr key={`ns-pl-${idx}-${pickNetSuiteCell(row, ['line_id', 'line_no', 'sku'])}`} className="border-b last:border-0">
                  <td className="whitespace-nowrap p-2.5 font-mono text-xs">{fmt(row.line_id)}</td>
                  <td className="max-w-[200px] p-2.5 font-medium">{pickNetSuiteCell(row, ['sku', 'item', 'item_name'])}</td>
                  <td className="whitespace-nowrap p-2.5 font-mono text-xs">{fmt(row.item_id)}</td>
                  <td className="max-w-[140px] p-2.5 text-xs">{pickNetSuiteCell(row, ['location'])}</td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                    {pickNumericCell(row, ['quantity', 'qty'])}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums text-muted-foreground">
                    {pickNumericCell(row, ['pl_quantity', 'plQty'])}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums text-muted-foreground">
                    {pickNumericCell(row, ['ci_quantity', 'ciQty'])}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                    {pickNumericCell(row, ['rem_pl_qty', 'remPlQty', 'remaining_pl_qty'])}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                    {pickNumericCell(row, ['rem_ci_qty', 'remCiQty', 'remaining_ci_qty'])}
                  </td>
                  <td className="whitespace-nowrap p-2.5 font-mono text-xs">
                    {pickNetSuiteCell(row, ['upccode', 'upc', 'upc_code', 'itemupc'])}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { PortalPOLineItem } from '@/modules/common/utils/portalPoLineItem';
import { KeyValueFields } from '@/modules/common/components/KeyValueFields';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Button } from '@/components/ui/button';
import { ListOrdered, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatMoney(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
}

type PoLineItemsSectionProps = {
  items: PortalPOLineItem[];
  emptyDescription?: string;
  /** NetSuite line field id → display name (from org field-config / GET PO). */
  fieldLabelMap?: Record<string, string>;
};

/**
 * Line table with a full-height detail panel on the right; opens when a row is selected (click).
 */
export function PoLineItemsSection({ items, emptyDescription, fieldLabelMap }: PoLineItemsSectionProps) {
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const selectLine = useCallback((id: string) => {
    setActiveLineId((prev) => (prev === id ? null : id));
  }, []);

  const closePanel = useCallback(() => {
    setActiveLineId(null);
  }, []);

  useEffect(() => {
    if (!activeLineId) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeLineId, closePanel]);

  useEffect(() => {
    if (activeLineId && !items.some((i) => i.id === activeLineId)) {
      setActiveLineId(null);
    }
  }, [items, activeLineId]);

  const onRowKeyDown = useCallback(
    (e: ReactKeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectLine(id);
      }
    },
    [selectLine]
  );

  const activeLine = useMemo(
    () => (activeLineId ? items.find((i) => i.id === activeLineId) ?? null : null),
    [items, activeLineId]
  );

  const activeIdx = useMemo(
    () => (activeLineId ? items.findIndex((i) => i.id === activeLineId) : -1),
    [items, activeLineId]
  );

  const showPricing = useMemo(
    () => items.some((i) => i.rate != null || i.amount != null),
    [items]
  );

  const rowGridClass = useMemo(
    () =>
      cn(
        'grid min-w-[640px] items-center gap-x-3 border-border/60 px-3 py-2 text-sm',
        showPricing
          ? 'grid-cols-[2.5rem_minmax(100px,1fr)_minmax(120px,1.5fr)_4rem_4rem_4rem_4rem]'
          : 'grid-cols-[2.5rem_minmax(100px,1fr)_minmax(120px,1.5fr)_4rem_4rem]'
      ),
    [showPricing]
  );

  const panel =
    activeLine &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="po-line-panel-title"
        className={cn(
          'fixed inset-y-0 right-0 z-[100] flex w-[min(28rem,100vw)] flex-col',
          'border-l border-border bg-card shadow-2xl',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p id="po-line-panel-title" className="text-sm font-semibold text-foreground">
              Line {activeLine.lineNo ?? activeIdx + 1}
              {activeLine.sku ? ` · ${activeLine.sku}` : ''}
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">id: {activeLine.id}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close line details"
            onClick={closePanel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {activeLine.netsuiteFields && Object.keys(activeLine.netsuiteFields).length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">NetSuite line fields</p>
              <KeyValueFields data={activeLine.netsuiteFields} dense labelByKey={fieldLabelMap} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No nested NetSuite fields on this line.</p>
          )}
        </div>
      </div>,
      document.body
    );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="No line items"
        description={emptyDescription ?? 'No lines yet.'}
        className="border-0 bg-muted/20 py-10"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <div role="table" aria-label="Purchase order lines" className="min-w-0">
          <div role="rowgroup">
            <div role="row" className={cn(rowGridClass, 'border-b bg-muted/50 font-medium text-foreground')}>
              <div role="columnheader" className="text-left">
                #
              </div>
              <div role="columnheader" className="text-left">
                SKU
              </div>
              <div role="columnheader" className="text-left">
                Description
              </div>
              <div role="columnheader" className="text-right">
                Qty
              </div>
              <div role="columnheader" className="text-left">
                UOM
              </div>
              {showPricing && (
                <>
                  <div role="columnheader" className="text-right">
                    Rate
                  </div>
                  <div role="columnheader" className="text-right">
                    Amount
                  </div>
                </>
              )}
            </div>
          </div>
          <div role="rowgroup">
            {items.map((item, idx) => {
              const isActive = activeLineId === item.id;
              return (
                <div
                  key={item.id}
                  role="row"
                  tabIndex={0}
                  aria-selected={isActive}
                  aria-label={`Line ${item.lineNo ?? idx + 1}, select to view details`}
                  onClick={() => selectLine(item.id)}
                  onKeyDown={(e) => onRowKeyDown(e, item.id)}
                  className={cn(
                    rowGridClass,
                    'cursor-pointer border-b transition-colors last:border-b-0',
                    'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive && 'bg-muted/60'
                  )}
                >
                  <div role="cell" className="text-muted-foreground">
                    {item.lineNo ?? idx + 1}
                  </div>
                  <div role="cell" className="font-mono text-xs">
                    {item.sku ?? '—'}
                  </div>
                  <div role="cell" className="min-w-0 truncate" title={item.description ?? undefined}>
                    {item.description ?? '—'}
                  </div>
                  <div role="cell" className="text-right tabular-nums">
                    {item.expectedQty}
                  </div>
                  <div role="cell">{item.unit ?? '—'}</div>
                  {showPricing && (
                    <>
                      <div role="cell" className="text-right tabular-nums">
                        {formatMoney(item.rate)}
                      </div>
                      <div role="cell" className="text-right tabular-nums">
                        {formatMoney(item.amount)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {panel}
    </div>
  );
}

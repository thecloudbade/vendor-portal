import { type ReactNode } from 'react';
import {
  type LucideIcon,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  isLoading?: boolean;
  /** Short line shown under the title when the table has no rows */
  emptyMessage?: string;
  /** Heading for the empty state (default: “Nothing to show yet”) */
  emptyTitle?: string;
  /** Icon for the empty state (default: inbox) */
  emptyIcon?: LucideIcon;
  /** Rich styling: gradient header, row hover, softer shadows (e.g. vendor PO search). */
  variant?: 'default' | 'rich';
  /** Footer label when all rows fit on one page (default: purchase order / purchase orders). */
  countLabelSingular?: string;
  countLabelPlural?: string;
  className?: string;
  'data-testid'?: string;
  /** Whole-row click (ignored when the click target is a link, button, or form control). */
  onRowClick?: (row: T) => void;
}

const defaultPageSize = 10;

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  total = 0,
  page = 1,
  pageSize = defaultPageSize,
  onPageChange,
  onSort,
  sortKey,
  sortDir,
  isLoading = false,
  emptyMessage = 'No data',
  emptyTitle = 'Nothing to show yet',
  emptyIcon: EmptyIcon = Inbox,
  variant = 'default',
  countLabelSingular = 'purchase order',
  countLabelPlural = 'purchase orders',
  className,
  'data-testid': testId = 'data-table',
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rich = variant === 'rich';
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('w-full', rich ? 'space-y-2' : 'space-y-4', className)} data-testid={testId}>
      <div
        className={cn(
          'overflow-x-auto bg-card',
          rich
            ? 'rounded-xl border border-emerald-200/50 shadow-sm dark:border-emerald-900/40'
            : 'rounded-2xl border border-border/80 shadow-card'
        )}
      >
        <table
          className={cn(
            'w-full caption-bottom',
            rich ? 'text-xs leading-tight [&_td]:align-middle' : 'text-sm'
          )}
        >
          <thead>
            <tr
              className={cn(
                'border-b border-border/80',
                rich
                  ? 'bg-gradient-to-b from-emerald-50/95 via-emerald-50/40 to-transparent dark:from-emerald-950/35 dark:via-emerald-950/15 dark:to-transparent'
                  : 'bg-muted/40'
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'text-left align-middle uppercase tracking-wider',
                    rich
                      ? 'h-8 px-2.5 py-1.5 text-[10px] font-semibold text-foreground/80 first:pl-3 last:pr-3'
                      : 'h-12 px-4 text-xs font-medium text-muted-foreground',
                    col.sortKey && 'cursor-pointer select-none hover:text-foreground',
                    col.id === 'actions' && 'text-right',
                    col.className
                  )}
                  onClick={() => col.sortKey && onSort?.(col.sortKey)}
                >
                  <div className={cn('flex items-center', rich ? 'gap-1' : 'gap-1.5')}>
                    {col.header}
                    {col.sortKey && (
                      <span className="inline-flex shrink-0 text-muted-foreground/80" aria-hidden>
                        {sortKey === col.sortKey ? (
                          sortDir === 'asc' ? (
                            <ArrowUp
                              className={cn(
                                'text-emerald-700 dark:text-emerald-400',
                                rich ? 'h-3 w-3' : 'h-3.5 w-3.5'
                              )}
                            />
                          ) : (
                            <ArrowDown
                              className={cn(
                                'text-emerald-700 dark:text-emerald-400',
                                rich ? 'h-3 w-3' : 'h-3.5 w-3.5'
                              )}
                            />
                          )
                        ) : (
                          <ChevronsUpDown className={cn('opacity-50', rich ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        rich ? 'px-2.5 py-2 first:pl-3 last:pr-3' : 'p-4 first:pl-6 last:pr-6'
                      )}
                    >
                      <div className={cn('w-full animate-pulse rounded bg-muted/80', rich ? 'h-3.5' : 'h-5')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn(rich ? 'px-3 py-8' : 'px-4 py-16')}>
                  <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <span
                      className={cn(
                        'flex items-center justify-center rounded-2xl text-muted-foreground',
                        rich
                          ? 'mb-2 h-10 w-10 bg-emerald-500/10 dark:bg-emerald-500/15'
                          : 'mb-4 h-14 w-14 bg-muted/80'
                      )}
                    >
                      <EmptyIcon className={rich ? 'h-5 w-5' : 'h-7 w-7'} strokeWidth={1.5} aria-hidden />
                    </span>
                    <p className={cn('font-semibold text-foreground', rich ? 'text-xs' : 'text-sm')}>{emptyTitle}</p>
                    <p className={cn('text-muted-foreground', rich ? 'mt-1 text-[11px] leading-snug' : 'mt-2 text-sm leading-relaxed')}>
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'border-b border-border/50 transition-colors last:border-0',
                    rich
                      ? 'odd:bg-muted/[0.08] hover:bg-emerald-50/60 dark:odd:bg-muted/10 dark:hover:bg-emerald-950/20'
                      : 'hover:bg-muted/50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={(e) => {
                    if (!onRowClick) return;
                    const t = e.target as HTMLElement;
                    if (t.closest('a, button, input, select, textarea, [role="menuitem"]')) return;
                    onRowClick(row);
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'align-middle',
                        rich ? 'px-2.5 py-1.5 first:pl-3 last:pr-3' : 'p-4 first:pl-6 last:pr-6',
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between',
            rich ? 'gap-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2 dark:bg-muted/15' : 'gap-3',
            !rich && 'px-4 py-3'
          )}
        >
          <p className={cn('tabular-nums text-muted-foreground', rich ? 'text-[11px]' : 'text-sm')}>
            {total > pageSize ? (
              <>
                Showing <span className="font-medium text-foreground">{from}</span>–
                <span className="font-medium text-foreground">{to}</span> of{' '}
                <span className="font-medium text-foreground">{total}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{total}</span>{' '}
                {total === 1 ? countLabelSingular : countLabelPlural}
              </>
            )}
          </p>
          {total > pageSize && onPageChange && (
            <div className="flex items-center gap-1.5">
              <Button
                variant={rich ? 'secondary' : 'outline'}
                size={rich ? 'sm' : 'sm'}
                className={cn(
                  rich && 'h-7 rounded-md border-0 bg-background px-2 text-xs shadow-sm'
                )}
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className={rich ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                {!rich && 'Previous'}
              </Button>
              <span
                className={cn(
                  'text-muted-foreground',
                  rich ? 'inline text-[10px]' : 'hidden text-xs sm:inline'
                )}
              >
                {rich ? `${page}/${totalPages}` : `Page ${page} / ${totalPages}`}
              </span>
              <Button
                variant={rich ? 'secondary' : 'outline'}
                size="sm"
                className={cn(rich && 'h-7 rounded-md border-0 bg-background px-2 text-xs shadow-sm')}
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                {!rich && 'Next'}
                <ChevronRight className={rich ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

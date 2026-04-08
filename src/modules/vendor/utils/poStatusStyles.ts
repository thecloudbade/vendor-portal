import { cn } from '@/lib/utils';

const base =
  'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight ring-1 ring-inset';

/** Visual tone for PO / order status labels (NetSuite + portal). */
export function poStatusClassName(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('pending') || s.includes('partial') || s.includes('await'))
    return cn(base, 'bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/60');
  if (s.includes('closed') || s.includes('billed') || s.includes('fully'))
    return cn(base, 'bg-slate-100 text-slate-700 ring-slate-200/90 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-600/50');
  if (s.includes('open') || s.includes('approved') || s.includes('received'))
    return cn(base, 'bg-emerald-50 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/50');
  if (s.includes('reject') || s.includes('cancel'))
    return cn(base, 'bg-red-50 text-red-800 ring-red-200/80 dark:bg-red-950/35 dark:text-red-100 dark:ring-red-900/50');
  if (s.includes('valid') || s.includes('accept'))
    return cn(base, 'bg-teal-50 text-teal-900 ring-teal-200/80 dark:bg-teal-950/35 dark:text-teal-100 dark:ring-teal-800/50');
  return cn(base, 'bg-muted/80 text-muted-foreground ring-border/60');
}

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** Small label above the title (e.g. “Purchase order” on PO detail). */
  eyebrow?: string;
  /** Groups with `actions` on the right from `sm` up (status, dates, etc.). */
  titleAside?: ReactNode;
  /** Plain text or a custom block (e.g. document-style metadata under the title). */
  description?: ReactNode;
  actions?: ReactNode;
  /** Extra classes on the root (e.g. `pb-2 gap-2` for tighter layouts). */
  className?: string;
}

export function PageHeader({ title, eyebrow, titleAside, description, actions, className }: PageHeaderProps) {
  const hasRight = (titleAside != null && titleAside !== '') || !!actions;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        </div>
        {description != null && description !== '' && (
          typeof description === 'string' ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p>
          ) : (
            <div className="w-full max-w-none">{description}</div>
          )
        )}
      </div>
      {hasRight ? (
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:max-w-[min(100%,22rem)] sm:items-end">
          {titleAside != null && titleAside !== '' && (
            <div className="w-full text-left sm:w-auto sm:text-right">{titleAside}</div>
          )}
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

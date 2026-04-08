import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** Small label above the title (e.g. “Purchase order” on PO detail). */
  eyebrow?: string;
  /** Plain text or a custom block (e.g. document-style metadata under the title). */
  description?: ReactNode;
  actions?: ReactNode;
  /** Extra classes on the root (e.g. `pb-2 gap-2` for tighter layouts). */
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <div>
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight text-foreground md:text-3xl',
              eyebrow && 'mt-1'
            )}
          >
            {title}
          </h1>
        </div>
        {description != null && description !== '' && (
          typeof description === 'string' ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p>
          ) : (
            <div className="max-w-4xl">{description}</div>
          )
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

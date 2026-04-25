import { type ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/modules/common/constants/branding';
import { Workflow } from 'lucide-react';

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
  /** Sets `document.title` to `${pageTitle} · ${APP_NAME}`. */
  pageTitle?: string;
  /** Visual accent for the brand bar (platform console uses violet). */
  variant?: 'default' | 'platform';
  /**
   * Top app bar with product name. Auth flows usually leave this off so the page centers on the card + logo.
   * @default false
   */
  showBrandHeader?: boolean;
};

/**
 * Shared premium background for sign-in / OTP screens — optional brand bar, mesh, orbs, subtle grid.
 */
export function AuthPageShell({
  children,
  className,
  pageTitle,
  variant = 'default',
  showBrandHeader = false,
}: AuthPageShellProps) {
  const isPlatform = variant === 'platform';

  useEffect(() => {
    const t = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
    document.title = t;
    return () => {
      document.title = APP_NAME;
    };
  }, [pageTitle]);

  return (
    <div
      className={cn(
        'relative flex h-[100dvh] min-h-0 max-h-[100dvh] flex-col overflow-hidden bg-[hsl(214_32%_97%)] dark:bg-[hsl(222_47%_5%)]',
        className
      )}
    >
      {/* Base wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.03] dark:from-background dark:via-background dark:to-primary/[0.06]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[20%] top-[-10%] h-[min(70vh,560px)] w-[min(70vw,560px)] rounded-full bg-gradient-to-br from-primary/15 via-sky-400/10 to-transparent blur-3xl dark:from-primary/20 dark:via-sky-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[15%] bottom-[-5%] h-[min(55vh,480px)] w-[min(55vw,480px)] rounded-full bg-gradient-to-tl from-violet-500/10 via-primary/5 to-transparent blur-3xl dark:from-violet-500/15 dark:via-primary/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[100px] dark:bg-primary/[0.08]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 dark:to-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.11'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)] dark:bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.02)_50%,transparent_60%)]"
        aria-hidden
      />

      {showBrandHeader ? (
        <header className="relative z-10 w-full border-b border-border/40 bg-background/40 px-4 py-4 backdrop-blur-md dark:bg-background/25 sm:px-6 sm:py-5">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm sm:h-11 sm:w-11',
                  isPlatform
                    ? 'border-violet-500/25 bg-gradient-to-br from-violet-600/20 to-violet-500/5 dark:from-violet-500/25'
                    : 'border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5'
                )}
              >
                <Workflow
                  className={cn('h-5 w-5 sm:h-[22px] sm:w-[22px]', isPlatform ? 'text-violet-600 dark:text-violet-400' : 'text-primary')}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">{APP_NAME}</p>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{APP_TAGLINE}</p>
              </div>
            </div>
          </div>
        </header>
      ) : null}

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-2 sm:px-5 sm:py-3">
        {children}
      </div>
    </div>
  );
}

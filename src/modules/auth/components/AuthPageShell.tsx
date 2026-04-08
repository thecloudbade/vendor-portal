import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared premium background for sign-in / OTP screens — mesh, orbs, subtle grid.
 */
export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-[hsl(214_32%_97%)] dark:bg-[hsl(222_47%_5%)]',
        className
      )}
    >
      {/* Base wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.03] dark:from-background dark:via-background dark:to-primary/[0.06]"
        aria-hidden
      />
      {/* Soft mesh / color blobs */}
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

      {/* Bottom vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 dark:to-background"
        aria-hidden
      />

      {/* Fine grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.11'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* Subtle diagonal sheen */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)] dark:bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.02)_50%,transparent_60%)]"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}

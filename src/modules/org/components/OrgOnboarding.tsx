import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOnboardingChecklist } from '../api/org.api';
import type { OnboardingChecklistData } from '../types';
import { getOnboardingTaskRoute } from '../constants/onboardingTaskRoutes';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Check, CircleDot, Sparkles } from 'lucide-react';

const Ctx = createContext<{
  data: OnboardingChecklistData | null | undefined;
  isLoading: boolean;
  isError: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  pct: number;
  completed: number;
  total: number;
} | null>(null);

function useOrgOnboarding() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrgOnboarding must be used within OrgOnboardingProvider');
  return v;
}

function progressFromData(data: OnboardingChecklistData | null | undefined) {
  if (!data?.tasks?.length) {
    return { pct: 0, completed: 0, total: 0 };
  }
  const total = data.tasks.length;
  const completed = data.tasks.filter((t) => t.completed).length;
  const fromApi = data.completionPercentage;
  const pct =
    typeof fromApi === 'number' && Number.isFinite(fromApi)
      ? Math.min(100, Math.max(0, Math.round(fromApi)))
      : Math.round((completed / Math.max(1, total)) * 100);
  return { pct, completed, total };
}

function CircularProgressRing({
  pct,
  size = 40,
  stroke = 3.5,
  className,
  progressStrokeClassName = 'stroke-blue-600 dark:stroke-blue-400',
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
  progressStrokeClassName?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-muted-foreground/25"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={cn(
          'transition-[stroke-dashoffset] duration-500 ease-out',
          progressStrokeClassName
        )}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function OnboardingTriggerButton({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { data, isLoading, isError, pct, completed, total, setOpen } = useOrgOnboarding();

  if (isError) {
    return null;
  }
  if (data === null && !isLoading) {
    return null;
  }
  if (!isLoading && data && data.tasks.length === 0) {
    return null;
  }

  const label =
    total > 0 ? `Setup progress: ${completed} of ${total} complete (${pct}%)` : 'Organization setup';

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-2 py-1.5 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact && 'px-1.5 py-1',
        className
      )}
      aria-label={label}
    >
      <span className="relative inline-flex">
        {isLoading ? (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/80"
            aria-hidden
          >
            <span className="h-5 w-5 animate-pulse rounded-full bg-muted-foreground/30" />
          </span>
        ) : (
          <>
            <CircularProgressRing pct={pct} size={compact ? 36 : 40} />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-foreground">
              {pct}%
            </span>
          </>
        )}
      </span>
      {!compact && (
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="text-xs font-semibold leading-tight text-foreground">Setup</span>
          <span className="text-[11px] leading-tight text-muted-foreground">
            {total > 0 ? `${completed}/${total} done` : 'Loading…'}
          </span>
        </span>
      )}
    </button>
  );
}

function OnboardingSheet() {
  const { data, open, setOpen, pct, completed, total } = useOrgOnboarding();
  const tasks = data?.tasks ?? [];
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <CircularProgressRing
                pct={pct}
                size={64}
                stroke={4}
                progressStrokeClassName="stroke-emerald-400"
              />
              <span className="pointer-events-none absolute text-sm font-bold tabular-nums text-white">
                {pct}%
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
                <Sparkles className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                Organization setup
              </SheetTitle>
              <SheetDescription className="text-sm text-slate-300">
                {total > 0
                  ? `${completed} of ${total} steps complete. Use the steps below to finish onboarding.`
                  : 'Loading your checklist…'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
          <ol className="space-y-4">
            {sorted.map((task, i) => {
              const route = getOnboardingTaskRoute(task.id);
              return (
                <li key={task.id}>
                  <article
                    className={cn(
                      'rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow',
                      task.completed && 'border-emerald-500/25 bg-emerald-500/[0.04]'
                    )}
                  >
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                          task.completed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-muted text-muted-foreground ring-1 ring-border'
                        )}
                        aria-hidden
                      >
                        {task.completed ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
                            {task.title}
                          </h3>
                          {task.completed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                              <Check className="h-3 w-3" aria-hidden />
                              Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                              <CircleDot className="h-3 w-3" aria-hidden />
                              Open
                            </span>
                          )}
                        </div>
                        {task.description ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                        ) : null}
                        {route ? (
                          <Button
                            asChild
                            size="sm"
                            className="mt-1 rounded-lg font-medium"
                            variant={task.completed ? 'outline' : 'default'}
                          >
                            <Link to={route.to} onClick={() => setOpen(false)}>
                              {route.ctaLabel}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function OrgOnboardingProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['org', 'onboarding-checklist'],
    queryFn: getOnboardingChecklist,
    enabled,
    retry: false,
  });

  const { pct, completed, total } = useMemo(
    () => progressFromData(query.data ?? undefined),
    [query.data]
  );

  const value = useMemo(
    () => ({
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      open,
      setOpen,
      pct,
      completed,
      total,
    }),
    [query.data, query.isLoading, query.isError, open, pct, completed, total]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {enabled ? <OnboardingSheet /> : null}
    </Ctx.Provider>
  );
}

/** Fixed top-right setup control (compact ring + %); shell positions it to avoid overlapping mobile nav */
export function OrgOnboardingFloatingTrigger() {
  const { data, isLoading, isError } = useOrgOnboarding();
  if (isError) return null;
  if (data === null && !isLoading) return null;
  if (!isLoading && data && data.tasks.length === 0) return null;

  return (
    <OnboardingTriggerButton
      compact
      className="rounded-full border border-border/80 bg-card/95 px-2 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-shadow hover:shadow-xl dark:bg-card/90 dark:ring-white/10"
    />
  );
}

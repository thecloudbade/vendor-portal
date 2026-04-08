import { cn } from '@/lib/utils';
import type { DeviationBarPoint } from '../utils/poUploadDeviation';

const CAP_PCT = 100;

/**
 * Horizontal bar chart: each row is a line’s absolute deviation % (0–cap for scale).
 */
export function DeviationPercentBars({
  points,
  tolerancePct,
  title,
  className,
}: {
  points: DeviationBarPoint[];
  /** When set, draws a vertical marker line for allowed tolerance. */
  tolerancePct?: number;
  title?: string;
  className?: string;
}) {
  if (!points.length) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>No per-line deviation values to chart.</p>
    );
  }

  const maxVal = Math.max(maxDeviationPctLocal(points), tolerancePct ?? 0, 1);
  const scaleMax = Math.min(CAP_PCT, Math.ceil(maxVal / 5) * 5 + 5);

  return (
    <div className={cn('space-y-2', className)}>
      {title ? <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p> : null}
      <div className="space-y-2.5">
        {points.map((p) => {
          const widthPct = Math.min(100, (p.pct / scaleMax) * 100);
          const over =
            tolerancePct != null && Number.isFinite(tolerancePct) && p.pct > tolerancePct + 1e-6;
          return (
            <div key={p.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-foreground" title={p.label}>
                  {p.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{p.pct.toFixed(1)}%</span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-300',
                    over ? 'bg-amber-600 dark:bg-amber-500' : 'bg-primary/80'
                  )}
                  style={{ width: `${widthPct}%` }}
                />
                {tolerancePct != null && Number.isFinite(tolerancePct) ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 w-px bg-foreground/40"
                    style={{ left: `${Math.min(100, (tolerancePct / scaleMax) * 100)}%` }}
                    title={`Tolerance ±${tolerancePct}%`}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {tolerancePct != null && Number.isFinite(tolerancePct) ? (
        <p className="text-[11px] text-muted-foreground">
          Vertical marker: buyer tolerance ±{tolerancePct}%. Bars past the marker exceed tolerance.
        </p>
      ) : null}
    </div>
  );
}

function maxDeviationPctLocal(points: DeviationBarPoint[]): number {
  return Math.max(...points.map((p) => p.pct), 0);
}

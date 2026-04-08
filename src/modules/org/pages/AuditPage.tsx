import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '../api/org.api';
import type { AuditLogEntry } from '../types';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { Column } from '@/modules/common/components/DataTable';
import { formatDateTime } from '@/modules/common/utils/format';
import { ROUTES } from '@/modules/common/constants/routes';
import { QtyMismatchRowsTable } from '../components/QtyMismatchRowsTable';
import { formatAuditActorType, formatAuditEventType, shortId } from '../utils/auditDisplay';
import { ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { backToState } from '@/modules/common/utils/navigationState';
import { useMemo } from 'react';

function actorTypeStyles(actorType: string): string {
  const t = actorType.toUpperCase();
  if (t === 'ORG_USER' || t === 'ORG_ADMIN')
    return 'bg-blue-500/15 text-blue-800 dark:text-blue-200 ring-1 ring-blue-500/25';
  if (t === 'VENDOR_USER') return 'bg-teal-500/15 text-teal-900 dark:text-teal-100 ring-1 ring-teal-500/25';
  if (t === 'SYSTEM') return 'bg-muted text-muted-foreground ring-1 ring-border';
  return 'bg-muted/80 text-foreground ring-1 ring-border/60';
}

export function AuditPage() {
  const location = useLocation();
  const auditBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseListPageParam(searchParams.get('page'));
  const pageSize = 20;
  const eventTypeRaw = searchParams.get('eventType');
  const eventType =
    eventTypeRaw != null && String(eventTypeRaw).trim() !== '' ? String(eventTypeRaw).trim() : undefined;
  const poIdFilterRaw = searchParams.get('poId');
  const poIdFilter =
    poIdFilterRaw != null && String(poIdFilterRaw).trim() !== '' ? String(poIdFilterRaw).trim() : undefined;

  const setPage = (p: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (p <= 1) n.delete('page');
        else n.set('page', String(p));
        return n;
      },
      { replace: true }
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'audit', { page, pageSize, eventType, poId: poIdFilter }],
    queryFn: () =>
      getAuditLog({
        page,
        pageSize,
        ...(eventType ? { eventType } : {}),
        ...(poIdFilter ? { poId: poIdFilter } : {}),
      }),
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      id: 'createdAt',
      header: 'When',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <time dateTime={row.createdAt} className="text-sm tabular-nums text-foreground">
          {formatDateTime(row.createdAt)}
        </time>
      ),
    },
    {
      id: 'eventType',
      header: 'Event',
      cell: (row) => (
        <div className="max-w-[min(280px,36vw)]">
          <p className="font-medium leading-snug text-foreground">{formatAuditEventType(row.eventType)}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row.eventType}</p>
        </div>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: (row) => (
        <div className="space-y-1.5">
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
              actorTypeStyles(row.actorType)
            )}
          >
            {formatAuditActorType(row.actorType)}
          </span>
          <p className="font-mono text-xs text-muted-foreground" title={row.actorId ?? undefined}>
            {row.actorId ? shortId(row.actorId, 12) : '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Vendor / PO',
      cell: (row) => (
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Vendor: </span>
            {row.vendorId ? (
              <Link
                to={ROUTES.ORG.VENDOR_DETAIL(row.vendorId)}
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                title={row.vendorId}
              >
                {shortId(row.vendorId, 10)}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">PO: </span>
            {row.poId ? (
              <Link
                to={ROUTES.ORG.PO_DETAIL(row.poId)}
                state={auditBack}
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                title={row.poId}
              >
                {shortId(row.poId, 10)}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'payload',
      header: 'Details',
      cell: (row) => {
        const p = row.payload ?? {};
        const docType =
          typeof (p as { type?: unknown }).type === 'string'
            ? ((p as { type: string }).type as string)
            : undefined;
        if (
          row.eventType === 'QTY_MISMATCH' &&
          Array.isArray((p as { mismatches?: unknown }).mismatches) &&
          (p as { mismatches: unknown[] }).mismatches.length > 0
        ) {
          const raw = (p as { mismatches: unknown[] }).mismatches;
          const mmRows = raw.filter(
            (x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x)
          );
          if (mmRows.length > 0) {
            return (
              <div className="max-w-[min(560px,52vw)] space-y-2">
                {docType ? (
                  <p className="text-[11px] text-muted-foreground">
                    Document: <span className="font-medium text-foreground">{docType}</span>
                  </p>
                ) : null}
                <QtyMismatchRowsTable rows={mmRows} />
              </div>
            );
          }
        }
        const keys = Object.keys(p);
        const full = keys.length === 0 ? '' : JSON.stringify(p);
        const short = full.length <= 200 ? full : `${full.slice(0, 200)}…`;
        return (
          <pre
            className="max-h-32 max-w-[min(360px,42vw)] overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground"
            title={full.length > 200 ? full : undefined}
          >
            {keys.length === 0 ? '—' : short}
          </pre>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Activity and sign-in events."
      />

      {eventType || poIdFilter ? (
        <p className="text-sm text-muted-foreground">
          {eventType ? (
            <>
              Event:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{eventType}</code>
              {poIdFilter ? ' · ' : null}
            </>
          ) : null}
          {poIdFilter ? (
            <>
              PO:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{shortId(poIdFilter, 24)}</code>
            </>
          ) : null}
          .{' '}
          <Link to={ROUTES.ORG.AUDIT} replace className="font-medium text-primary underline-offset-4 hover:underline">
            Clear filters
          </Link>
        </p>
      ) : null}

      <DataTable<AuditLogEntry>
        data={data?.data ?? []}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyIcon={ScrollText}
        emptyTitle={eventType ? 'No matching events' : 'No audit activity yet'}
        emptyMessage={
          eventType
            ? 'Try clearing the event filter or pick another page.'
            : 'Events such as OTP requests, invitations, and vendor user list views will appear here when your backend records them.'
        }
        countLabelSingular="audit event"
        countLabelPlural="audit events"
      />
    </div>
  );
}

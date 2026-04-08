import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorPOs } from '../api/vendor.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { DataTable } from '@/modules/common/components/DataTable';
import type { POListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDate, formatDateTime } from '@/modules/common/utils/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { ArrowUpRight, FileText, FileUp, Filter, Search, UserX } from 'lucide-react';
import { poStatusClassName } from '../utils/poStatusStyles';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { VENDOR_PO_LIST_STATUS_OPTIONS } from '../constants/vendorPoStatusFilters';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { backToState } from '@/modules/common/utils/navigationState';

const ALL_STATUS = '__all__';

export function POSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const listBack = backToState(location.pathname, location.search);
  const { user } = useAuth();
  const vendorId = user?.vendorId;
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseListPageParam(searchParams.get('page'));
  const qFromUrl = searchParams.get('q') ?? '';
  const statusRaw = searchParams.get('status');
  const status =
    statusRaw && VENDOR_PO_LIST_STATUS_OPTIONS.some((o) => o.value === statusRaw) ? statusRaw : ALL_STATUS;

  const [searchInput, setSearchInput] = useState(qFromUrl);
  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  const debouncedSearch = useDebounce(searchInput, 300);
  const pageSize = 10;

  const prevDebouncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevDebouncedRef.current === null) {
      prevDebouncedRef.current = debouncedSearch;
      return;
    }
    if (prevDebouncedRef.current === debouncedSearch) return;
    prevDebouncedRef.current = debouncedSearch;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (debouncedSearch.trim()) n.set('q', debouncedSearch.trim());
        else n.delete('q');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  }, [debouncedSearch, setSearchParams]);

  const setStatusFilter = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === ALL_STATUS) n.delete('status');
        else n.set('status', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vendor', 'pos', 'db', vendorId, debouncedSearch, status, page, pageSize],
    queryFn: () =>
      getVendorPOs({
        query: debouncedSearch.trim() || undefined,
        status: status === ALL_STATUS ? undefined : status,
        page,
        pageSize,
      }),
    enabled: !!vendorId,
  });

  const pageRows = data?.data ?? [];
  const totalRows = data?.total ?? 0;

  const columns: Column<POListItem>[] = [
    {
      id: 'poNumber',
      header: 'PO number',
      className: 'min-w-[140px] max-w-[min(100%,280px)]',
      cell: (row) => (
        <Link
          to={ROUTES.VENDOR.PO_DETAIL(row.id)}
          state={listBack}
          className="group inline-flex max-w-full items-center gap-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/[0.12] text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25">
            <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="min-w-0 font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {row.poNumber}
          </span>
          <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      className: 'whitespace-nowrap',
      cell: (row) => <span className={poStatusClassName(row.status)}>{row.status}</span>,
    },
    {
      id: 'createdAt',
      header: 'Created',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Last modified',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDateTime(row.updatedAt ?? row.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[1%] text-right',
      cell: (row) =>
        isMongoObjectIdString(row.id) ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-emerald-200/70 bg-emerald-50/40 px-2.5 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
            asChild
          >
            <Link to={ROUTES.VENDOR.UPLOAD(row.id)} state={listBack} onClick={(e) => e.stopPropagation()}>
              <FileUp className="h-3 w-3" />
              Upload
            </Link>
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-0.5 text-right">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5 text-xs"
              asChild
            >
              <Link
                to={ROUTES.VENDOR.PO_DETAIL(row.id)}
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-3 w-3" />
                View PO
              </Link>
            </Button>
            <span className="max-w-[7rem] text-[10px] leading-tight text-muted-foreground" title="Upload not available for this row yet.">
              Pending
            </span>
          </div>
        ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="space-y-4">
        <PageHeader title="PO search" />
        <EmptyState
          icon={UserX}
          title="Vendor profile not linked"
          description="Contact your buyer to finish account setup."
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PageHeader className="gap-2 pb-2 sm:gap-3" title="PO search" />

      {isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {(error as Error)?.message ?? 'Failed to load purchase orders.'}
        </p>
      )}

      <div className="surface-card overflow-hidden border-emerald-200/40 shadow-sm dark:border-emerald-900/35">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-gradient-to-r from-emerald-50/80 to-transparent px-3 py-2 dark:from-emerald-950/25">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <Filter className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-foreground">Search &amp; filter</h2>
            <p className="text-[11px] leading-tight text-muted-foreground">By PO number or status.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-h-[36px] flex-1 min-w-[min(100%,200px)]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by PO number…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 rounded-lg border-border/80 bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:ring-emerald-500/30"
            />
          </div>
          <Select value={status} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full min-w-[160px] rounded-lg border-border/80 bg-background text-sm shadow-sm sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS}>All statuses</SelectItem>
              {VENDOR_PO_LIST_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable<POListItem>
        className="space-y-2"
        data={pageRows}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(ROUTES.VENDOR.PO_DETAIL(row.id), { state: listBack })}
        total={totalRows}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        variant="rich"
        emptyIcon={Search}
        emptyTitle={debouncedSearch.trim() ? 'No matching purchase orders' : 'No purchase orders to show'}
        emptyMessage={
          debouncedSearch.trim()
            ? 'Try a different PO number or clear the search box to see all orders for your vendor.'
            : 'When your buyer assigns POs to you, they will appear here for search and document upload.'
        }
      />
    </div>
  );
}

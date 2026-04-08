import { useLayoutEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrgPOs } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { matchPortalPoFromRows } from '../utils/poMatch';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { backToState } from '@/modules/common/utils/navigationState';

/**
 * One-shot resolver: runs a single GET /org/pos (with vendor + search), then redirects to PO detail.
 */
export function OrgPoOpenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const vendorId = searchParams.get('vendorId')?.trim() ?? '';
  const q = searchParams.get('q')?.trim() ?? '';
  const transId = searchParams.get('transId')?.trim() ?? '';

  const searchTerm = q || transId;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['org', 'pos', 'open', vendorId, searchTerm],
    queryFn: () =>
      getOrgPOs({
        vendorId: vendorId || undefined,
        q: searchTerm || undefined,
        pageSize: 100,
        page: 1,
      }),
    enabled: !!vendorId && !!searchTerm,
  });

  const resolvedMatch = useMemo(() => {
    const rows = data?.data;
    if (!rows?.length) return undefined;
    let m = matchPortalPoFromRows(rows, { transId: transId || undefined, poNum: q || undefined });
    if (!m && rows.length === 1) m = rows[0];
    return m;
  }, [data, transId, q]);

  useLayoutEffect(() => {
    if (!resolvedMatch) return;
    const openBack = backToState(location.pathname, location.search);
    navigate(ROUTES.ORG.PO_DETAIL(resolvedMatch.id), { replace: true, state: openBack });
  }, [resolvedMatch, navigate, location.pathname, location.search]);

  if (!vendorId || !searchTerm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={ROUTES.ORG.POS}>
            <ArrowLeft className="h-4 w-4" />
            Back to purchase orders
          </Link>
        </Button>
        <EmptyState
          icon={FileText}
          title="Invalid link"
          description="Use a link from the vendor or PO list."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Opening purchase order…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Could not open PO" description={(error as Error)?.message ?? 'Request failed.'} />
        <Button variant="outline" asChild>
          <Link to={ROUTES.ORG.POS_FOR_VENDOR(vendorId)}>Back to filtered PO list</Link>
        </Button>
      </div>
    );
  }

  const rows = data?.data ?? [];
  if (resolvedMatch) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Opening purchase order…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Purchase order not found" />
        <EmptyState
          icon={FileText}
          title="No matching PO in the portal"
          description="Try syncing from the vendor page, then search again."
          action={
            <Button asChild>
              <Link to={ROUTES.ORG.VENDOR_DETAIL(vendorId)}>Go to vendor</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Which purchase order?"
        description="Choose an order."
      />
      <ul className="space-y-2 rounded-xl border border-border/80 bg-card p-4">
        {rows.map((po) => (
          <li key={po.id}>
            <Link
              to={ROUTES.ORG.PO_DETAIL(po.id)}
              state={backToState(location.pathname, location.search)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 hover:border-border hover:bg-muted/40"
            >
              <span className="font-medium">{po.poNumber}</span>
              <span className="text-sm text-muted-foreground">{po.status}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.ORG.POS_FOR_VENDOR(vendorId)}>Back to PO list</Link>
      </Button>
    </div>
  );
}

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putOrgPO } from '../api/org.api';
import { buildOrgPOSyncPayload } from '../utils/buildOrgPOSyncPayload';
import type { PODetail } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';

/** Safe placeholder so `useOrgPOSync` can run before GET /org/pos/:id resolves. */
export const ORG_PO_DETAIL_STUB: PODetail = {
  id: '',
  poNumber: '',
  status: '',
  vendorId: '',
  items: [],
  requiredDocs: [],
  createdAt: '',
};

export function useOrgPOSync(portalPoId: string, po: PODetail, nsLineRows: Record<string, unknown>[]) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canSyncPO = useMemo(() => {
    if (!portalPoId || !isMongoObjectIdString(portalPoId)) return false;
    const { lines = [] } = buildOrgPOSyncPayload(po, nsLineRows);
    return lines.length > 0;
  }, [portalPoId, po, nsLineRows]);

  const syncPOMutation = useMutation({
    mutationFn: () => putOrgPO(portalPoId, buildOrgPOSyncPayload(po, nsLineRows)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'po', portalPoId] });
      /** Do not invalidate `['org', 'pos']` — it matches PO list, dashboard, NetSuite resolve, etc. and refetches GET /org/pos + related noise while viewing PO detail. List refreshes on next visit or manual refresh. */
      queryClient.invalidateQueries({ queryKey: ['org', 'netsuite-po'] });
      toast({ title: 'PO updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    },
  });

  return { canSyncPO, syncPOMutation };
}

export type OrgPOSyncState = ReturnType<typeof useOrgPOSync>;

type OrgPOSyncCardProps = {
  po: PODetail;
  sync: OrgPOSyncState;
  nsLinesLoading?: boolean;
  intro?: ReactNode;
  /** `embedded` nests inside another card (e.g. org PO detail Details). */
  variant?: 'card' | 'embedded';
};

export function OrgPOSyncCard({ po, sync, nsLinesLoading, intro, variant = 'card' }: OrgPOSyncCardProps) {
  const { canSyncPO, syncPOMutation } = sync;

  const introNode =
    intro ?? (
      <>
        Push this PO’s lines and status from the view below.{' '}
        <Link to={ROUTES.ORG.POS} className="font-medium text-primary underline-offset-4 hover:underline">
          Purchase orders
        </Link>
      </>
    );

  const statusLine = (
    <p className="text-sm text-muted-foreground">
      {canSyncPO
        ? 'Ready to sync.'
        : nsLinesLoading
          ? 'Loading lines…'
          : 'Add at least one line to sync.'}
    </p>
  );

  const actionBtn = (
    <Button
      type="button"
      disabled={!canSyncPO || syncPOMutation.isPending}
      onClick={() => syncPOMutation.mutate()}
      className="w-full shrink-0 sm:w-auto"
    >
      {syncPOMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      Sync PO
    </Button>
  );

  if (variant === 'embedded') {
    return (
      <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-4 dark:bg-primary/[0.08]">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RefreshCw className="h-4 w-4 text-primary" />
            Sync to portal
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{introNode}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {statusLine}
          {actionBtn}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.06]" aria-label={`Sync ${po.poNumber || 'purchase order'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-5 w-5 text-primary" />
          Sync to portal
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{introNode}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {statusLine}
        {actionBtn}
      </CardContent>
    </Card>
  );
}

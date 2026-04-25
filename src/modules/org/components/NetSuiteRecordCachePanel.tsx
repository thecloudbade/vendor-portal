import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNetSuiteIntegration, getNetSuiteRecordCache, postNetSuiteRecordCacheSync } from '../api/org.api';
import type { NetSuiteRecordCacheType } from '../types';
import { NetSuiteFieldConfigCard } from './NetSuiteFieldConfigCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { Database, Loader2, RefreshCw } from 'lucide-react';

const VENDOR_HINT =
  "Use the vendor's id from the Vendors list in this app (24-character id), not the NetSuite vendor number.";

function assertPortalVendorIdForQuery(vendorIdRaw: string, context: string): string {
  const vendorId = vendorIdRaw.trim();
  if (!vendorId) {
    throw new Error(`${context}: vendor id is required.`);
  }
  if (!isMongoObjectIdString(vendorId)) {
    throw new Error(`${context}: must be a portal vendor id (${VENDOR_HINT})`);
  }
  return vendorId;
}

const SYNC_OPTIONS: { value: NetSuiteRecordCacheType; label: string; hint: string }[] = [
  { value: 'VENDOR', label: 'Vendors', hint: 'Vendor directory from NetSuite.' },
  { value: 'PURCHASEORDER', label: 'Purchase orders', hint: 'Needs a portal vendor id.' },
  { value: 'PURCHASE_LINE_DATA', label: 'Purchase line data', hint: 'Optional vendor id and order number.' },
];

function friendlySyncStatus(cache: { fetchStatus?: string; errorSnippet?: string | null } | undefined): string {
  if (!cache) return '';
  if (cache.errorSnippet) return cache.errorSnippet;
  if (cache.fetchStatus === 'OK') return 'Last sync succeeded.';
  if (cache.fetchStatus === 'ERROR') return 'Last sync had a problem.';
  return '';
}

export function NetSuiteRecordCachePanel({
  isOrgAdmin,
  canFetchNetSuiteCatalog,
}: {
  isOrgAdmin: boolean;
  canFetchNetSuiteCatalog: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncTarget, setSyncTarget] = useState<NetSuiteRecordCacheType>('VENDOR');
  const [poVendorId, setPoVendorId] = useState('');
  const [lineVendorId, setLineVendorId] = useState('');
  const [lineTransId, setLineTransId] = useState('');

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
  });

  const configured = status?.configured === true;

  const {
    data: cache,
    isLoading: cacheLoading,
    error: cacheError,
  } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'record-cache', syncTarget],
    queryFn: () => getNetSuiteRecordCache(syncTarget),
    enabled: configured,
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      if (syncTarget === 'VENDOR') {
        return postNetSuiteRecordCacheSync({ recordType: 'VENDOR', query: {} });
      }
      if (syncTarget === 'PURCHASEORDER') {
        const vendorId = assertPortalVendorIdForQuery(poVendorId, 'Purchase order sync');
        return postNetSuiteRecordCacheSync({
          recordType: 'PURCHASEORDER',
          query: { vendor_id: vendorId },
        });
      }
      const q: Record<string, string> = {};
      if (lineVendorId.trim()) {
        q.vendor_id = assertPortalVendorIdForQuery(lineVendorId, 'Purchase line sync');
      }
      if (lineTransId.trim()) q.trans_id = lineTransId.trim();
      return postNetSuiteRecordCacheSync({ recordType: 'PURCHASE_LINE_DATA', query: q });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'record-cache'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'field-config'] });
      if (res.success && res.fetchStatus === 'OK') {
        toast({ title: 'Sync complete', description: 'Latest NetSuite data is saved to the portal cache.' });
      } else {
        toast({
          title: 'Sync finished with issues',
          description: res.errorSnippet ?? 'Check the status below.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    },
  });

  const syncDisabled =
    syncMutation.isPending ||
    (syncTarget === 'PURCHASEORDER' && (!poVendorId.trim() || !isMongoObjectIdString(poVendorId))) ||
    (syncTarget === 'PURCHASE_LINE_DATA' &&
      lineVendorId.trim() !== '' &&
      !isMongoObjectIdString(lineVendorId));

  const opt = SYNC_OPTIONS.find((o) => o.value === syncTarget);

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5" />
            NetSuite data
          </CardTitle>
          <CardDescription>Connect NetSuite in the NetSuite tab first.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">NetSuite is not connected yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Sync NetSuite data</CardTitle>
          <CardDescription>
            Refresh what the portal keeps in its cache. Use this before choosing PO line columns so field lists are up to date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label htmlFor="ns-sync-what" className="text-sm font-medium">
                What to refresh
              </Label>
              <Select
                value={syncTarget}
                onValueChange={(v) => setSyncTarget(v as NetSuiteRecordCacheType)}
              >
                <SelectTrigger id="ns-sync-what" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {opt && <p className="text-xs text-muted-foreground">{opt.hint}</p>}
            </div>

            {syncTarget === 'PURCHASEORDER' && (
              <div className="min-w-[min(100%,320px)] flex-1 space-y-2">
                <Label htmlFor="ns-sync-po-v" className="text-sm font-medium">
                  Portal vendor id
                </Label>
                <Input
                  id="ns-sync-po-v"
                  value={poVendorId}
                  onChange={(e) => setPoVendorId(e.target.value)}
                  placeholder="From the Vendors list in this app"
                  className="font-mono text-sm"
                  disabled={!isOrgAdmin}
                  autoComplete="off"
                  spellCheck={false}
                />
                {poVendorId.trim() !== '' && !isMongoObjectIdString(poVendorId) && (
                  <p className="text-xs text-destructive">Use the 24-character vendor id from this app.</p>
                )}
              </div>
            )}

            {syncTarget === 'PURCHASE_LINE_DATA' && (
              <>
                <div className="min-w-[min(100%,240px)] flex-1 space-y-2">
                  <Label htmlFor="ns-sync-line-v" className="text-sm font-medium">
                    Portal vendor id (optional)
                  </Label>
                  <Input
                    id="ns-sync-line-v"
                    value={lineVendorId}
                    onChange={(e) => setLineVendorId(e.target.value)}
                    placeholder="Optional"
                    className="font-mono text-sm"
                    disabled={!isOrgAdmin}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {lineVendorId.trim() !== '' && !isMongoObjectIdString(lineVendorId) && (
                    <p className="text-xs text-destructive">Invalid vendor id format.</p>
                  )}
                </div>
                <div className="min-w-[min(100%,200px)] flex-1 space-y-2">
                  <Label htmlFor="ns-sync-line-t" className="text-sm font-medium">
                    Order number (optional)
                  </Label>
                  <Input
                    id="ns-sync-line-t"
                    value={lineTransId}
                    onChange={(e) => setLineTransId(e.target.value)}
                    placeholder="PO #"
                    disabled={!isOrgAdmin}
                  />
                </div>
              </>
            )}

            {isOrgAdmin && (
              <Button
                type="button"
                className="shrink-0"
                onClick={() => syncMutation.mutate()}
                disabled={syncDisabled}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync from NetSuite
              </Button>
            )}
          </div>

          {!isOrgAdmin && (
            <p className="text-sm text-muted-foreground">Only an org admin can run a sync.</p>
          )}

          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            {cacheLoading && (
              <p className="text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Loading status…
              </p>
            )}
            {cacheError && (
              <p className="text-sm text-destructive">{(cacheError as Error).message ?? 'Could not load status.'}</p>
            )}
            {cache && !cacheLoading && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    cache.cached ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cache.cached ? 'Cached' : 'Not cached yet'}
                </span>
                {cache.fetchedAt && (
                  <span className="text-muted-foreground">
                    Updated {new Date(cache.fetchedAt).toLocaleString()}
                  </span>
                )}
                {friendlySyncStatus(cache) && (
                  <span className="text-muted-foreground">{friendlySyncStatus(cache)}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canFetchNetSuiteCatalog && (
        <NetSuiteFieldConfigCard
          canReadFieldConfig={canFetchNetSuiteCatalog}
          canManageFieldConfig={isOrgAdmin}
          canFetchCatalog={canFetchNetSuiteCatalog}
        />
      )}
    </div>
  );
}

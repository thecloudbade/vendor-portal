import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNetSuiteIntegration, getNetSuiteRecordCache, postNetSuiteRecordCacheSync } from '../api/org.api';
import type { NetSuiteRecordCacheType } from '../types';
import { NetSuiteFieldConfigCard } from './NetSuiteFieldConfigCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { Database, Loader2, RefreshCw } from 'lucide-react';

const PORTAL_VENDOR_ID_HINT =
  'Use the portal Vendor id (MongoDB ObjectId, 24 hex characters) from Vendors in this app — not the NetSuite internal vendor number.';

function assertPortalVendorIdForQuery(vendorIdRaw: string, context: string): string {
  const vendorId = vendorIdRaw.trim();
  if (!vendorId) {
    throw new Error(`${context}: vendor_id is required.`);
  }
  if (!isMongoObjectIdString(vendorId)) {
    throw new Error(
      `${context}: vendor_id must be a portal Vendor id (${PORTAL_VENDOR_ID_HINT})`
    );
  }
  return vendorId;
}

const RECORD_TABS: { value: NetSuiteRecordCacheType; label: string }[] = [
  { value: 'VENDOR', label: 'Vendors' },
  { value: 'PURCHASEORDER', label: 'Purchase orders' },
  { value: 'PURCHASE_LINE_DATA', label: 'Purchase line data' },
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
  /** ORG_ADMIN / ORG_USER — POST record-types/list + metadata/fetch (server-enforced). */
  canFetchNetSuiteCatalog: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<NetSuiteRecordCacheType>('VENDOR');
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
    queryKey: ['org', 'integrations', 'netsuite', 'record-cache', tab],
    queryFn: () => getNetSuiteRecordCache(tab),
    enabled: configured,
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      if (tab === 'VENDOR') {
        return postNetSuiteRecordCacheSync({ recordType: 'VENDOR', query: {} });
      }
      if (tab === 'PURCHASEORDER') {
        const vendorId = assertPortalVendorIdForQuery(poVendorId, 'Purchase order sync');
        return postNetSuiteRecordCacheSync({
          recordType: 'PURCHASEORDER',
          query: { vendor_id: vendorId },
        });
      }
      const q: Record<string, string> = {};
      if (lineVendorId.trim()) {
        q.vendor_id = assertPortalVendorIdForQuery(lineVendorId, 'Purchase line data sync');
      }
      if (lineTransId.trim()) q.trans_id = lineTransId.trim();
      return postNetSuiteRecordCacheSync({ recordType: 'PURCHASE_LINE_DATA', query: q });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'record-cache'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'field-config'] });
      if (res.success && res.fetchStatus === 'OK') {
        toast({ title: 'Updated', description: 'Latest NetSuite data is saved.' });
      } else {
        toast({
          title: 'Update finished',
          description: res.errorSnippet ?? 'There was a problem. Check the status below.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    },
  });

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
          <CardDescription>Connect NetSuite first.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">NetSuite is not connected yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5" />
            NetSuite data
          </CardTitle>
          <CardDescription>Refresh cached NetSuite data for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as NetSuiteRecordCacheType)} className="w-full">
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/60 p-1">
              {RECORD_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1 px-3 py-2 text-xs sm:text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {RECORD_TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-0 space-y-4 focus-visible:ring-0">
                {t.value === 'PURCHASEORDER' && (
                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
                    <Label htmlFor="ns-cache-po-vendor" className="text-sm">
                      Portal vendor ID
                    </Label>
                    <Input
                      id="ns-cache-po-vendor"
                      value={poVendorId}
                      onChange={(e) => setPoVendorId(e.target.value)}
                      placeholder="24-character hex id from Vendors list"
                      className="font-mono text-sm"
                      disabled={!isOrgAdmin}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {poVendorId.trim() !== '' && !isMongoObjectIdString(poVendorId) && (
                      <p className="text-xs text-destructive">Not a valid portal vendor id. {PORTAL_VENDOR_ID_HINT}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      The server looks up <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">Vendor</code> by
                      MongoDB <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">_id</code>.{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                        {`{ "recordType": "PURCHASEORDER", "query": { "vendor_id": "<portal id>" } }`}
                      </code>
                    </p>
                  </div>
                )}

                {t.value === 'PURCHASE_LINE_DATA' && (
                  <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ns-cache-line-vendor" className="text-sm">
                        Portal vendor ID
                      </Label>
                      <Input
                        id="ns-cache-line-vendor"
                        value={lineVendorId}
                        onChange={(e) => setLineVendorId(e.target.value)}
                        placeholder="24 hex chars (optional if omitted)"
                        className="font-mono text-sm"
                        disabled={!isOrgAdmin}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {lineVendorId.trim() !== '' && !isMongoObjectIdString(lineVendorId) && (
                        <p className="text-xs text-destructive">Not a valid portal vendor id. {PORTAL_VENDOR_ID_HINT}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ns-cache-line-trans" className="text-sm">
                        Order number
                      </Label>
                      <Input
                        id="ns-cache-line-trans"
                        value={lineTransId}
                        onChange={(e) => setLineTransId(e.target.value)}
                        placeholder="Purchase order number"
                        className="text-sm"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                  </div>
                )}

                {isOrgAdmin && (
                  <Button
                    type="button"
                    onClick={() => syncMutation.mutate()}
                    disabled={
                      syncMutation.isPending ||
                      (tab === 'PURCHASEORDER' &&
                        (!poVendorId.trim() || !isMongoObjectIdString(poVendorId))) ||
                      (tab === 'PURCHASE_LINE_DATA' &&
                        lineVendorId.trim() !== '' &&
                        !isMongoObjectIdString(lineVendorId))
                    }
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Update from NetSuite
                  </Button>
                )}

                {cacheLoading && (
                  <p className="text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading…
                  </p>
                )}

                {cacheError && (
                  <p className="text-sm text-destructive">{(cacheError as Error).message ?? 'Something went wrong.'}</p>
                )}

                {cache && !cacheLoading && t.value === tab && (
                  <div className="space-y-2 rounded-lg border border-border/80 bg-muted/15 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          cache.cached ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {cache.cached ? 'Saved' : 'Not saved yet'}
                      </span>
                      {cache.fetchedAt && (
                        <span className="text-muted-foreground">
                          Last updated {new Date(cache.fetchedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {friendlySyncStatus(cache) && (
                      <p className="text-sm text-muted-foreground">{friendlySyncStatus(cache)}</p>
                    )}
                    {!cache.cached && isOrgAdmin && (
                      <p className="text-sm text-muted-foreground">Select Update from NetSuite to save data for this category.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
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

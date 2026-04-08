import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNetSuiteIntegration,
  putNetSuiteIntegration,
  putNetSuiteSyncSchedule,
  postNetSuiteTest,
  postNetSuiteSyncVendors,
  postNetSuiteSyncPurchaseOrders,
  deleteNetSuiteIntegration,
} from '../api/org.api';
import type { NetSuiteIntegrationPutPayload } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plug, Loader2, Trash2, CalendarClock } from 'lucide-react';

function formatScheduleTs(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const putSchema = z.object({
  accountSubdomain: z.string().min(1),
  realm: z.string().min(1),
  scriptId: z.string().min(1),
  deployId: z.string().min(1),
  restletTypeVendors: z.string().min(1),
  restletTypePurchaseOrders: z.string().min(1),
  restletTypePurchaseLineData: z.string().min(1),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
  tokenId: z.string().optional(),
  tokenSecret: z.string().optional(),
});

type PutForm = z.infer<typeof putSchema>;

export function NetSuiteIntegrationCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
  });

  const [schedVendorEnabled, setSchedVendorEnabled] = useState(true);
  const [schedPoEnabled, setSchedPoEnabled] = useState(true);
  const [vendorIntervalH, setVendorIntervalH] = useState(24);
  const [poIntervalH, setPoIntervalH] = useState(12);

  useEffect(() => {
    if (!status?.configured) return;
    setSchedVendorEnabled(status.scheduledVendorSyncEnabled !== false);
    setSchedPoEnabled(status.scheduledPoSyncEnabled !== false);
    setVendorIntervalH(
      status.vendorSyncIntervalHours != null && Number.isFinite(Number(status.vendorSyncIntervalHours))
        ? Number(status.vendorSyncIntervalHours)
        : 24
    );
    setPoIntervalH(
      status.poSyncIntervalHours != null && Number.isFinite(Number(status.poSyncIntervalHours))
        ? Number(status.poSyncIntervalHours)
        : 12
    );
  }, [status]);

  const form = useForm<PutForm>({
    resolver: zodResolver(putSchema),
    defaultValues: {
      accountSubdomain: '',
      realm: '',
      scriptId: '',
      deployId: '1',
      restletTypeVendors: 'vendors',
      restletTypePurchaseOrders: 'purchaseorders',
      restletTypePurchaseLineData: 'purchaseLineData',
      consumerKey: '',
      consumerSecret: '',
      tokenId: '',
      tokenSecret: '',
    },
  });

  useEffect(() => {
    if (!status) return;
    form.reset({
      accountSubdomain: status.accountSubdomain ?? '',
      realm: status.realm ?? '',
      scriptId: status.scriptId ?? '',
      deployId: status.deployId ?? '1',
      restletTypeVendors: status.typeVendors ?? 'vendors',
      restletTypePurchaseOrders: status.typePurchaseOrders ?? 'purchaseorders',
      restletTypePurchaseLineData: status.typePurchaseLineData ?? 'purchaseLineData',
      consumerKey: '',
      consumerSecret: '',
      tokenId: '',
      tokenSecret: '',
    });
  }, [status, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: PutForm) => {
      const body: NetSuiteIntegrationPutPayload = {
        accountSubdomain: payload.accountSubdomain.trim(),
        realm: payload.realm.trim(),
        scriptId: payload.scriptId.trim(),
        deployId: payload.deployId.trim(),
        restletTypeVendors: payload.restletTypeVendors.trim(),
        restletTypePurchaseOrders: payload.restletTypePurchaseOrders.trim(),
        restletTypePurchaseLineData: payload.restletTypePurchaseLineData.trim(),
      };
      if (payload.consumerKey?.trim()) body.consumerKey = payload.consumerKey.trim();
      if (payload.consumerSecret?.trim()) body.consumerSecret = payload.consumerSecret.trim();
      if (payload.tokenId?.trim()) body.tokenId = payload.tokenId.trim();
      if (payload.tokenSecret?.trim()) body.tokenSecret = payload.tokenSecret.trim();
      const firstTime = !status?.configured;
      if (firstTime) {
        if (!body.consumerKey || !body.consumerSecret || !body.tokenId || !body.tokenSecret) {
          return Promise.reject(new Error('All credential fields required on first save'));
        }
      }
      return putNetSuiteIntegration(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite'] });
      toast({ title: 'NetSuite settings saved' });
      form.setValue('consumerKey', '');
      form.setValue('consumerSecret', '');
      form.setValue('tokenId', '');
      form.setValue('tokenSecret', '');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const testMutation = useMutation({
    mutationFn: () => postNetSuiteTest({ type: 'vendors' }),
    onSuccess: (data) => {
      toast({
        title: 'RESTlet test',
        description: data?.message ?? `HTTP ${data?.status ?? 'OK'} (${data?.type ?? 'vendors'})`,
      });
    },
    onError: (e: Error) => toast({ title: 'Test failed', description: e.message, variant: 'destructive' }),
  });

  const syncVendorsMutation = useMutation({
    mutationFn: () => postNetSuiteSyncVendors(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      toast({
        title: 'Vendors synced from NetSuite',
        description: `Total from NetSuite: ${data.totalFromNetSuite ?? 0} · created: ${data.created ?? 0} · updated: ${data.updated ?? 0}`,
      });
    },
    onError: (e: Error) => toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });

  const syncPoMutation = useMutation({
    mutationFn: () => postNetSuiteSyncPurchaseOrders(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'pos'] });
      toast({
        title: 'Purchase orders synced from NetSuite',
        description: `POs from NetSuite: ${data.purchaseOrdersFromNetSuite ?? 0} · lines written: ${data.lineItemsWritten ?? 0}`,
      });
    },
    onError: (e: Error) => toast({ title: 'PO sync failed', description: e.message, variant: 'destructive' }),
  });

  const saveScheduleMutation = useMutation({
    mutationFn: () => {
      const vh = Math.min(168, Math.max(1, Math.round(Number(vendorIntervalH)) || 24));
      const ph = Math.min(168, Math.max(1, Math.round(Number(poIntervalH)) || 12));
      return putNetSuiteSyncSchedule({
        scheduledVendorSyncEnabled: schedVendorEnabled,
        scheduledPoSyncEnabled: schedPoEnabled,
        vendorSyncIntervalHours: vh,
        poSyncIntervalHours: ph,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite'] });
      toast({ title: 'Sync schedule saved' });
    },
    onError: (e: Error) => toast({ title: 'Could not save schedule', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteNetSuiteIntegration(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite'] });
      toast({ title: 'NetSuite integration removed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading NetSuite…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          NetSuite integration
        </CardTitle>
        <CardDescription>Connect NetSuite and sync vendors and POs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status?.configured && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Consumer key:</span>{' '}
              {status.consumerKeyMasked ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Token ID:</span> {status.tokenIdMasked ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Last integration sync (any):</span>{' '}
              {formatScheduleTs(status.lastSyncAt)} ({status.lastSyncStatus ?? '—'})
            </p>
            <p>
              <span className="text-muted-foreground">Last scheduled vendor sync:</span>{' '}
              {formatScheduleTs(status.lastScheduledVendorSyncAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Last scheduled PO sync:</span>{' '}
              {formatScheduleTs(status.lastScheduledPoSyncAt)}
            </p>
          </div>
        )}
        {status?.configured && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex items-start gap-2">
              <CalendarClock className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">Scheduled sync</p>
                <p className="text-xs text-muted-foreground">
                  Server scheduler:{' '}
                  <span className="font-medium text-foreground">
                    {status.schedulerProcessEnabled ? 'on' : 'off'}
                  </span>
                  .
                  {!status.schedulerProcessEnabled && (
                    <span className="block mt-1">Your server must enable scheduled sync for these times to run.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={schedVendorEnabled}
                  onChange={(e) => setSchedVendorEnabled(e.target.checked)}
                />
                Scheduled vendor sync
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={schedPoEnabled}
                  onChange={(e) => setSchedPoEnabled(e.target.checked)}
                />
                Scheduled PO sync
              </label>
              <div>
                <Label htmlFor="ns-v-int">Vendor sync interval (hours)</Label>
                <Input
                  id="ns-v-int"
                  type="number"
                  min={1}
                  max={168}
                  className="mt-1"
                  value={vendorIntervalH}
                  onChange={(e) => setVendorIntervalH(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="ns-po-int">PO sync interval (hours)</Label>
                <Input
                  id="ns-po-int"
                  type="number"
                  min={1}
                  max={168}
                  className="mt-1"
                  value={poIntervalH}
                  onChange={(e) => setPoIntervalH(Number(e.target.value))}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={saveScheduleMutation.isPending}
              onClick={() => saveScheduleMutation.mutate()}
            >
              {saveScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save schedule
            </Button>
          </div>
        )}
        <form
          onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4 max-w-2xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ns-sub">Account subdomain</Label>
              <Input id="ns-sub" {...form.register('accountSubdomain')} className="mt-1" placeholder="5387653-sb2" />
            </div>
            <div>
              <Label htmlFor="ns-realm">Realm</Label>
              <Input id="ns-realm" {...form.register('realm')} className="mt-1" placeholder="5387653_SB2" />
            </div>
            <div>
              <Label htmlFor="ns-script">Script ID</Label>
              <Input id="ns-script" {...form.register('scriptId')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-deploy">Deploy ID</Label>
              <Input id="ns-deploy" {...form.register('deployId')} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">RESTlet type parameters (SuiteScript)</p>
            <div>
              <Label htmlFor="ns-type-v">Vendors sync</Label>
              <Input id="ns-type-v" {...form.register('restletTypeVendors')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-type-po">Purchase orders (for later PO sync)</Label>
              <Input id="ns-type-po" {...form.register('restletTypePurchaseOrders')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-type-lines">Purchase line data (for later)</Label>
              <Input id="ns-type-lines" {...form.register('restletTypePurchaseLineData')} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {status?.configured
                ? 'Leave OAuth fields empty to keep existing encrypted secrets.'
                : 'First save requires all OAuth token fields below.'}
            </p>
            <div>
              <Label htmlFor="ns-ck">Consumer key</Label>
              <Input id="ns-ck" type="password" autoComplete="off" {...form.register('consumerKey')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-cs">Consumer secret</Label>
              <Input id="ns-cs" type="password" autoComplete="off" {...form.register('consumerSecret')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-ti">Token ID</Label>
              <Input id="ns-ti" type="password" autoComplete="off" {...form.register('tokenId')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ns-ts">Token secret</Label>
              <Input id="ns-ts" type="password" autoComplete="off" {...form.register('tokenSecret')} className="mt-1" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save integration
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!status?.configured || syncVendorsMutation.isPending}
              onClick={() => syncVendorsMutation.mutate()}
            >
              {syncVendorsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pull vendors from NetSuite
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!status?.configured || syncPoMutation.isPending}
              onClick={() => syncPoMutation.mutate()}
            >
              {syncPoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sync purchase orders
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!status?.configured || testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              Test vendors RESTlet
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={!status?.configured || deleteMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove NetSuite integration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deletes stored credentials. You can reconfigure later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
      </CardContent>
    </Card>
  );
}

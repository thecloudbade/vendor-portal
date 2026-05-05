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
  deleteNetSuiteIntegration,
  postNetSuiteFoldersList,
  postNetSuiteFoldersCreate,
} from '../api/org.api';
import type { NetSuiteIntegrationPutPayload } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plug, FolderPlus, Loader2, Trash2, CalendarClock } from 'lucide-react';

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
  restletTypeClassification: z.string().optional(),
  classificationScriptId: z.string().optional(),
  classificationDeployId: z.string().optional(),
  documentUploadFolderId: z.string().optional(),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
  tokenId: z.string().optional(),
  tokenSecret: z.string().optional(),
});

type PutForm = z.infer<typeof putSchema>;

function parseFolderRows(body: unknown): { id: number; name: string }[] {
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  const data = o.data;
  if (!Array.isArray(data)) return [];
  const out: { id: number; name: string }[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.id);
    const name = r.name != null ? String(r.name) : '';
    if (!Number.isFinite(id) || !name) continue;
    out.push({ id, name });
  }
  return out;
}

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

  const [folderRows, setFolderRows] = useState<{ id: number; name: string }[]>([]);
  const [createParentId, setCreateParentId] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);

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
      restletTypeClassification: '',
      classificationScriptId: '',
      classificationDeployId: '',
      documentUploadFolderId: '',
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
      restletTypeClassification: status.typeClassification ?? '',
      classificationScriptId: status.classificationScriptId ?? '',
      classificationDeployId: status.classificationDeployId ?? '',
      documentUploadFolderId:
        status.documentUploadFolderId != null && Number.isFinite(Number(status.documentUploadFolderId))
          ? String(status.documentUploadFolderId)
          : '',
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
      };
      const folderStr = (payload.documentUploadFolderId ?? '').trim();
      if (folderStr === '') {
        body.documentUploadFolderId = null;
      } else {
        const n = Number(folderStr);
        if (!Number.isFinite(n)) {
          return Promise.reject(new Error('File cabinet folder ID must be a number (NetSuite internal id)'));
        }
        body.documentUploadFolderId = n;
      }
      if (payload.consumerKey?.trim()) body.consumerKey = payload.consumerKey.trim();
      if (payload.consumerSecret?.trim()) body.consumerSecret = payload.consumerSecret.trim();
      if (payload.tokenId?.trim()) body.tokenId = payload.tokenId.trim();
      if (payload.tokenSecret?.trim()) body.tokenSecret = payload.tokenSecret.trim();
      const cls = (payload.restletTypeClassification ?? '').trim();
      if (cls) body.restletTypeClassification = cls;
      else if (status?.configured) body.restletTypeClassification = null;
      const cs = (payload.classificationScriptId ?? '').trim();
      if (cs) body.classificationScriptId = cs;
      else if (status?.configured) body.classificationScriptId = null;
      const cd = (payload.classificationDeployId ?? '').trim();
      if (cd) body.classificationDeployId = cd;
      else if (status?.configured) body.classificationDeployId = null;
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

  const listFoldersMutation = useMutation({
    mutationFn: () => postNetSuiteFoldersList({ page: 1, limit: 100 }),
    onSuccess: (data) => {
      const rows = parseFolderRows(data.body);
      setFolderRows(rows);
      if (rows.length === 0) {
        toast({
          title: 'No folders parsed',
          description: data.netsuiteErrorSnippet ?? 'Check RESTlet response shape or HTTP error.',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Folders loaded', description: `${rows.length} folder(s).` });
    },
    onError: (e: Error) => toast({ title: 'Folder list failed', description: e.message, variant: 'destructive' }),
  });

  const createFolderMutation = useMutation({
    mutationFn: () => {
      const pid = Number(createParentId);
      if (!Number.isFinite(pid) || pid < 1) {
        return Promise.reject(new Error('Parent folder ID must be a positive number'));
      }
      if (!createName.trim()) return Promise.reject(new Error('Folder name is required'));
      return postNetSuiteFoldersCreate({
        parentfolderId: pid,
        folderName: createName.trim(),
        description: createDesc.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      if (data.netsuiteHttpStatus >= 200 && data.netsuiteHttpStatus < 300) {
        toast({ title: 'Folder created', description: 'Refresh the folder list to pick the new folder.' });
        setCreateParentId('');
        setCreateName('');
        setCreateDesc('');
        setCreateFolderDialogOpen(false);
      } else {
        toast({
          title: 'Create folder failed',
          description: data.netsuiteErrorSnippet ?? `HTTP ${data.netsuiteHttpStatus}`,
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
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

  const savedFolderId =
    status?.documentUploadFolderId != null && Number.isFinite(Number(status.documentUploadFolderId))
      ? Number(status.documentUploadFolderId)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          NetSuite integration
        </CardTitle>
        <CardDescription>Connect NetSuite; file cabinet folder for vendor PL/CI uploads.</CardDescription>
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
            <div className="sm:col-span-2">
              <Label htmlFor="ns-classification-type">Classification lists — RESTlet type=</Label>
              <Input
                id="ns-classification-type"
                {...form.register('restletTypeClassification')}
                className="mt-1 font-mono text-sm"
                placeholder="e.g. classifications"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                SuiteScript branch for GETs with <code className="rounded bg-muted px-0.5">recordType</code>,{' '}
                <code className="rounded bg-muted px-0.5">page</code>, <code className="rounded bg-muted px-0.5">limit</code>.
                Defaults to server <span className="font-mono">classifications</span> when unset.
              </p>
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ns-class-script">Classification RESTlet script ID (optional)</Label>
                <Input
                  id="ns-class-script"
                  {...form.register('classificationScriptId')}
                  className="mt-1 font-mono text-sm"
                  placeholder="e.g. 7037 — when list sync uses another script than above"
                />
              </div>
              <div>
                <Label htmlFor="ns-class-deploy">Classification deploy ID (optional)</Label>
                <Input
                  id="ns-class-deploy"
                  {...form.register('classificationDeployId')}
                  className="mt-1 font-mono text-sm"
                  placeholder="Default: same as Deploy ID"
                />
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Record-type catalog (<span className="font-mono">type=recordtypes</span>) still uses Script ID / Deploy above.
                Classification sync uses these fields when set, so URLs match e.g.{` `}
                <span className="font-mono whitespace-pre-wrap">
                  …/restlet.nl?script=7037&amp;deploy=1&amp;type=classifications&amp;recordType=…
                </span>
              </p>
            </div>
          </div>

          {status?.configured && (
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-sm font-medium">File cabinet folder (PL/CI uploads)</p>
              {savedFolderId != null ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Saved folder internal ID:</span>{' '}
                  <span className="font-mono font-medium">{savedFolderId}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No folder selected yet.</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={listFoldersMutation.isPending}
                  onClick={() => listFoldersMutation.mutate()}
                >
                  {listFoldersMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Load folders from NetSuite
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateFolderDialogOpen(true)}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create new folder
                </Button>
              </div>
              <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create folder in NetSuite</DialogTitle>
                    <DialogDescription>
                      New folder is created in the file cabinet. Reload the list afterward to select it.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div>
                      <Label htmlFor="ns-new-parent">Parent folder internal ID</Label>
                      <Input
                        id="ns-new-parent"
                        inputMode="numeric"
                        value={createParentId}
                        onChange={(e) => setCreateParentId(e.target.value)}
                        className="mt-1"
                        placeholder="e.g. 248381"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor="ns-new-name">New folder name</Label>
                      <Input
                        id="ns-new-name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ns-new-desc">Description (optional)</Label>
                      <Input
                        id="ns-new-desc"
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateFolderDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={createFolderMutation.isPending}
                      onClick={() => createFolderMutation.mutate()}
                    >
                      {createFolderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create in NetSuite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {folderRows.length > 0 ? (
                <div className="space-y-2 max-w-md">
                  <Label>Pick folder</Label>
                  <Select
                    value={(() => {
                      const v = (form.watch('documentUploadFolderId') ?? '').trim();
                      return v && folderRows.some((f) => String(f.id) === v) ? v : undefined;
                    })()}
                    onValueChange={(v) => {
                      form.setValue('documentUploadFolderId', v, { shouldDirty: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a folder…" />
                    </SelectTrigger>
                    <SelectContent>
                      {folderRows.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name} ({f.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div>
                <Label htmlFor="ns-doc-folder">Folder internal ID (saved with integration)</Label>
                <Input
                  id="ns-doc-folder"
                  type="text"
                  inputMode="numeric"
                  {...form.register('documentUploadFolderId')}
                  className="mt-1 max-w-xs"
                  placeholder="e.g. 248994"
                />
              </div>
            </div>
          )}

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

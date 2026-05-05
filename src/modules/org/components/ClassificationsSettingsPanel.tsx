import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteNetSuiteClassification,
  getNetSuiteClassifications,
  getNetSuiteIntegration,
  postNetSuiteClassification,
  postNetSuiteClassificationSync,
  postNetSuiteRecordTypesList,
} from '../api/org.api';
import type { NetSuiteClassificationListItem, NetSuiteRecordTypeOption } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { ApiBusinessError } from '@/services/http/client';
import { Loader2, Plus, RefreshCw, Trash2, Eye } from 'lucide-react';
import { ROUTES } from '@/modules/common/constants/routes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatCatalogOptionLabel(rt: NetSuiteRecordTypeOption): string {
  const nm = rt.name?.trim();
  if (nm && rt.internalId) return `${nm} · ${rt.id} · NS#${rt.internalId}`;
  if (nm) return `${nm} · ${rt.id}`;
  if (rt.internalId) return `${rt.id} · NS#${rt.internalId}`;
  return rt.id;
}

/** Common NetSuite `classification=` keys; SuiteScript may expose more via record-types. */
export const NETSUITE_CLASSIFICATION_PRESETS: { key: string; description: string }[] = [
  { key: 'incoterm', description: 'Incoterms list' },
  { key: 'currency', description: 'Currency list' },
  { key: 'country', description: 'Country data' },
  { key: 'subsidiary', description: 'Subsidiary list' },
  { key: 'term', description: 'Payment terms' },
  { key: 'location', description: 'Locations' },
  { key: 'department', description: 'Departments' },
  { key: 'classification', description: 'Classes' },
  { key: 'customrecord_vfs_supplier_factories', description: 'Supplier Factories (custom record)' },
];

export function ClassificationsSettingsPanel({
  isOrgAdmin,
}: {
  isOrgAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [catalogSelectId, setCatalogSelectId] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const { data: nsStatus } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
  });
  const configured = nsStatus?.configured === true;

  const listQuery = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'classifications'],
    queryFn: () => getNetSuiteClassifications(),
    enabled: configured,
    retry: false,
  });

  const recordCatalogQuery = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'record-types', 'classifications-add'],
    queryFn: () => postNetSuiteRecordTypesList({}),
    enabled: configured && isOrgAdmin && sheetOpen,
    retry: false,
  });

  const catalogSorted = useMemo(
    () =>
      [...(recordCatalogQuery.data ?? [])].sort((a, b) =>
        (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: 'base' })
      ),
    [recordCatalogQuery.data]
  );

  const classificationRows = listQuery.data ?? [];
  const catalogSelectable = useMemo(
    () =>
      catalogSorted.filter((rt) => !classificationRows.some((r) => r.classificationKey === rt.id)),
    [catalogSorted, classificationRows]
  );

  useEffect(() => {
    if (catalogSelectId && !catalogSelectable.some((rt) => rt.id === catalogSelectId)) {
      setCatalogSelectId('');
    }
  }, [catalogSelectable, catalogSelectId]);

  useEffect(() => {
    if (!sheetOpen) setCatalogSelectId('');
  }, [sheetOpen]);

  const createMutation = useMutation({
    mutationFn: (p: { classificationKey: string; label?: string }) => postNetSuiteClassification(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'classifications'] });
      toast({ title: 'Classification added', description: 'Run sync to pull data from NetSuite.' });
      setSheetOpen(false);
      setCatalogSelectId('');
      setCustomKey('');
      setCustomLabel('');
    },
    onError: (e: Error) => {
      toast({ title: 'Could not add', description: e.message, variant: 'destructive' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (key: string) => postNetSuiteClassificationSync(key),
    onSuccess: (res, key) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'classifications'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'classifications', key] });
      if (res.success) {
        const parts: string[] = [];
        if (res.recordCount != null) parts.push(`${res.recordCount} from NetSuite`);
        if (res.storedRowCount != null) parts.push(`${res.storedRowCount} saved for this org`);
        toast({
          title: 'Synced',
          description: parts.length ? parts.join(' · ') : 'Data stored from NetSuite.',
        });
      } else {
        toast({
          title: 'Sync completed with errors',
          description: res.errorSnippet ?? 'Check NetSuite response.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      if (e instanceof ApiBusinessError && e.code === 'NETSUITE_CLASSIFICATION_TYPE_NOT_CONFIGURED') {
        toast({
          title: 'Classification RESTlet type not configured',
          description:
            'Open Org Settings → NetSuite and set "Classification lists — RESTlet type=" to the exact branch your SuiteScript handles (often classification). Or set NETSUITE_RESTLET_TYPE_CLASSIFICATION on the API.',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteNetSuiteClassification(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'classifications'] });
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  function addPreset(key: string, description: string) {
    createMutation.mutate({ classificationKey: key, label: description });
  }

  function addCustom() {
    const k = customKey.trim();
    if (!k) {
      toast({ title: 'Enter a classification key', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      classificationKey: k,
      label: customLabel.trim() || undefined,
    });
  }

  function addFromCatalog() {
    const rt = catalogSelectable.find((r) => r.id === catalogSelectId);
    if (!rt) {
      toast({ title: 'Select a catalog entry', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      classificationKey: rt.id,
      label: rt.name?.trim() ? rt.name.trim() : rt.internalId ? `${rt.id} (NS #${rt.internalId})` : rt.id,
    });
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classifications</CardTitle>
          <CardDescription>Configure NetSuite integration first, then add classification lists to sync.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = classificationRows;
  const classificationRestletTypeUnset =
    configured && String(nsStatus?.typeClassification ?? '').trim() === '';

  const showInvalidTypeHint = useMemo(
    () =>
      rows.some(
        (r) =>
          r.fetchStatus === 'ERROR' &&
          typeof r.errorSnippet === 'string' &&
          /invalid type/i.test(r.errorSnippet)
      ),
    [rows]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Classifications</CardTitle>
          {classificationRestletTypeUnset && isOrgAdmin ? (
            <p className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
              No effective RESTlet <span className="font-mono">type</span> is set for classification sync (no org value
              and no server default). In <strong>Org Settings → NetSuite</strong>, set &quot;Classification lists — RESTlet
              type=&quot; to match your classifications RESTlet script, or set{' '}
              <span className="font-mono">NETSUITE_RESTLET_TYPE_CLASSIFICATION</span> on the API.
            </p>
          ) : null}
          {showInvalidTypeHint ? (
            <p className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
              NetSuite returned <span className="font-mono">Invalid type</span>. The <span className="font-mono">type</span> string must match the <strong>same</strong>{' '}
              script deployment you use for list sync (e.g. if catalog is script <span className="font-mono">6893</span> but lists need script{' '}
              <span className="font-mono">7037</span>, set Script ID accordingly). Adjust &quot;Classification lists — RESTlet type&quot; on the NetSuite card or platform overrides.
            </p>
          ) : null}
        </div>
        {isOrgAdmin ? (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add classification
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Choose record / classification type</SheetTitle>
                <SheetDescription>
                  Prefer <strong>NetSuite catalog</strong> (same as your working{' '}
                  <span className="font-mono text-xs">type=recordtypes</span> call) — we store{' '}
                  <span className="font-mono text-xs">recordtype</span> as the classification key for sync{' '}
                  <span className="font-mono text-xs">recordType=…</span>. Presets/custom keys remain available.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/25 p-3">
                <Label className="text-xs font-medium text-foreground">NetSuite record-type catalog</Label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Catalog GET uses main script{' '}
                  <span className="font-mono">{nsStatus?.scriptId ?? '—'}</span> /{' '}
                  <span className="font-mono">{nsStatus?.deployId ?? '—'}</span> ·{' '}
                  <span className="font-mono">POST …/record-types/list</span> → NetSuite{' '}
                  <span className="font-mono">type=recordtypes</span>. Classification list sync uses{' '}
                  <span className="font-mono">
                    {nsStatus?.effectiveClassificationScriptId ?? nsStatus?.scriptId ?? '—'}
                  </span>{' '}
                  /{' '}
                  <span className="font-mono">
                    {nsStatus?.effectiveClassificationDeployId ?? nsStatus?.deployId ?? '—'}
                  </span>{' '}
                  (<span className="font-mono">type={nsStatus?.typeClassification ?? 'classifications'}</span>,{' '}
                  <span className="font-mono">recordType=…</span>) unless you set overrides in NetSuite integration.
                  Each catalog row&apos;s <span className="font-mono">recordtype</span> + internal id maps to a
                  classification row.
                </p>
                {recordCatalogQuery.isLoading ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading catalog…
                  </p>
                ) : recordCatalogQuery.isError ? (
                  <p className="text-xs text-destructive">
                    {(recordCatalogQuery.error as Error).message ?? 'Could not load record-type list.'}
                  </p>
                ) : catalogSorted.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Empty catalog from NetSuite. Check RESTlet permissions or response shape (<span className="font-mono">data[]</span> with{' '}
                    <span className="font-mono">recordtype</span>, <span className="font-mono">internalid</span>,{' '}
                    <span className="font-mono">name</span>).
                  </p>
                ) : catalogSelectable.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All {catalogSorted.length} catalog type{catalogSorted.length === 1 ? '' : 's'} from NetSuite are already added. Remove a row to pick again,
                    or add a preset / custom key below.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label htmlFor="ns-class-catalog" className="text-xs">
                        Pick list ({catalogSelectable.length} available · {catalogSorted.length} from NetSuite)
                      </Label>
                      <Select value={catalogSelectId || undefined} onValueChange={setCatalogSelectId}>
                        <SelectTrigger id="ns-class-catalog" className="w-full font-mono text-xs">
                          <SelectValue placeholder="Select record type…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {catalogSelectable.map((rt) => (
                            <SelectItem key={rt.id} value={rt.id} className="font-mono text-xs">
                              {formatCatalogOptionLabel(rt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={createMutation.isPending || !catalogSelectId}
                      onClick={addFromCatalog}
                    >
                      Add selection
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Presets</Label>
                <div className="grid max-h-[50vh] gap-2 overflow-y-auto pr-1">
                  {NETSUITE_CLASSIFICATION_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      disabled={createMutation.isPending || rows.some((r) => r.classificationKey === p.key)}
                      className="flex flex-col rounded-lg border border-border/80 bg-card px-3 py-2 text-left text-sm transition hover:bg-muted/40 disabled:opacity-50"
                      onClick={() => addPreset(p.key, p.description)}
                    >
                      <span className="font-mono text-xs text-foreground">{p.key}</span>
                      <span className="text-muted-foreground">{p.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label htmlFor="custom-class-key">Custom classification key</Label>
                <Input
                  id="custom-class-key"
                  placeholder="e.g. customrecord_my_list"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <Label htmlFor="custom-class-label">Label (optional)</Label>
                <Input
                  id="custom-class-label"
                  placeholder="Display name in the portal"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={createMutation.isPending || !customKey.trim()}
                  onClick={addCustom}
                >
                  Add custom key
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="pt-4">
        {listQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No classifications yet.{isOrgAdmin ? ' Use Add classification to select a NetSuite list type.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last sync</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <ClassificationRow
                    key={r.id}
                    row={r}
                    isOrgAdmin={isOrgAdmin}
                    recordsHref={ROUTES.ORG.CLASSIFICATION_DETAIL(r.classificationKey)}
                    onSync={() => syncMutation.mutate(r.classificationKey)}
                    onDelete={() => deleteMutation.mutate(r.classificationKey)}
                    syncPending={syncMutation.isPending && syncMutation.variables === r.classificationKey}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassificationRow({
  row,
  isOrgAdmin,
  recordsHref,
  onSync,
  onDelete,
  syncPending,
}: {
  row: NetSuiteClassificationListItem;
  isOrgAdmin: boolean;
  recordsHref: string;
  onSync: () => void;
  onDelete: () => void;
  syncPending: boolean;
}) {
  const status =
    row.fetchStatus === 'OK' ? 'OK' : row.fetchStatus === 'ERROR' ? 'Error' : row.fetchStatus ?? '—';
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20">
      <td className="px-3 py-2 font-mono text-xs">{row.classificationKey}</td>
      <td className="px-3 py-2 text-muted-foreground">{row.label || '—'}</td>
      <td className="px-3 py-2">
        <span
          className={
            row.fetchStatus === 'OK'
              ? 'text-emerald-700 dark:text-emerald-400'
              : row.fetchStatus === 'ERROR'
                ? 'text-destructive'
                : ''
          }
        >
          {status}
        </span>
        {row.errorSnippet ? (
          <span className="mt-0.5 block max-w-[200px] truncate text-xs text-destructive" title={row.errorSnippet}>
            {row.errorSnippet}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {row.fetchedAt ? new Date(row.fetchedAt).toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild title="View records">
            <Link to={recordsHref}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {isOrgAdmin ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={syncPending}
                onClick={onSync}
                title="Sync from NetSuite"
              >
                {syncPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={onDelete}
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  getNetSuiteIntegration,
  getNetSuiteFieldConfig,
  putNetSuiteFieldConfig,
  postNetSuiteRecordTypesList,
  postNetSuiteMetadataFetch,
  recordTypeForMetadataRequest,
  normalizeMetadataRecordTypeForQuery,
} from '../api/org.api';
import {
  buildBodyFieldOptions,
  buildItemFieldLabelsFromOptions,
  buildMetaFieldOptions,
  buildSublistFieldOptions,
  mergeFieldOptionsDedupe,
  normalizeFieldTokenFromParts,
} from '../utils/netsuiteMetadataFieldConfig';
import { mergeDbKeysOrPresets } from '../utils/netsuiteRecordSample';
import { NetSuiteFieldSearchCombobox, type NetSuiteFieldOption } from './NetSuiteFieldSearchCombobox';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/services/http/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ListTree, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
const FIELD_TOKEN = z
  .string()
  .regex(/^[a-zA-Z0-9_]{1,128}$/, 'Use letters, numbers, or underscores only (1–128 chars).');

const MAX_FIELDS = 50;

function normalizeFields(arr: string[]): string[] {
  return arr.map((s) => s.trim()).filter(Boolean);
}

function validateFieldList(rows: string[]): string | null {
  const n = normalizeFields(rows);
  if (n.length > MAX_FIELDS) return `At most ${MAX_FIELDS} fields.`;
  for (const f of n) {
    const r = FIELD_TOKEN.safeParse(f);
    if (!r.success) return r.error.errors[0]?.message ?? 'Invalid field token.';
  }
  return null;
}

type ToastFn = ReturnType<typeof useToast>['toast'];

function tryAddFieldToken(
  selected: string[],
  onChange: (next: string[]) => void,
  toast: ToastFn,
  raw: string
): void {
  const v = raw.trim();
  if (!v) return;
  const r = FIELD_TOKEN.safeParse(v);
  if (!r.success) {
    toast({ title: 'Invalid field', description: r.error.errors[0]?.message, variant: 'destructive' });
    return;
  }
  if (selected.includes(v)) {
    toast({ title: 'Already added', description: 'That column is already in the list.', variant: 'destructive' });
    return;
  }
  if (selected.length >= MAX_FIELDS) {
    toast({ title: 'Limit reached', description: `At most ${MAX_FIELDS} fields.`, variant: 'destructive' });
    return;
  }
  onChange([...selected, v]);
}

function labelForToken(
  token: string,
  fieldOptions: NetSuiteFieldOption[],
  savedLineLabels: Record<string, string> | undefined
): { title: string; id: string } {
  const opt = fieldOptions.find((o) => o.value === token);
  const fromSaved = savedLineLabels?.[token];
  const title = opt?.label ?? fromSaved ?? token;
  return { title, id: token };
}

export type NetSuiteFieldConfigCardProps = {
  canReadFieldConfig?: boolean;
  canManageFieldConfig?: boolean;
  canFetchCatalog?: boolean;
};

export function NetSuiteFieldConfigCard({
  canReadFieldConfig = true,
  canManageFieldConfig = true,
  canFetchCatalog = true,
}: NetSuiteFieldConfigCardProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
  });

  const configured = status?.configured === true;

  const {
    data: fieldData,
    isLoading: fieldsLoading,
    isError: fieldsError,
    error: fieldsErr,
    refetch,
  } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'field-config'],
    queryFn: () => getNetSuiteFieldConfig(),
    enabled: configured && canReadFieldConfig,
    retry: false,
  });

  const { data: recordTypes = [], isLoading: recordTypesLoading } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'record-types', 'list'],
    queryFn: () => postNetSuiteRecordTypesList(),
    enabled: configured && canFetchCatalog,
    retry: false,
  });

  const [selectedRecordTypeId, setSelectedRecordTypeId] = useState<string>('');
  /** Which line sublist the user is adding columns from (UI only; full metadata is loaded). */
  const [selectedSublistId, setSelectedSublistId] = useState<string>('');
  const [lineFields, setLineFields] = useState<string[]>([]);
  const [customIdDraft, setCustomIdDraft] = useState('');
  const [headerFields, setHeaderFields] = useState<string[]>([]);
  const [customHeaderDraft, setCustomHeaderDraft] = useState('');

  const addLineFieldToken = (token: string) => tryAddFieldToken(lineFields, setLineFields, toast, token);

  const addCustomIdDraft = () => {
    tryAddFieldToken(lineFields, setLineFields, toast, customIdDraft);
    setCustomIdDraft('');
  };

  const addHeaderFieldToken = (token: string) => tryAddFieldToken(headerFields, setHeaderFields, toast, token);

  const addCustomHeaderDraft = () => {
    tryAddFieldToken(headerFields, setHeaderFields, toast, customHeaderDraft);
    setCustomHeaderDraft('');
  };

  const metadataRecordType = useMemo(() => {
    const rt = recordTypes.find((r) => r.id === selectedRecordTypeId);
    if (rt) return recordTypeForMetadataRequest(rt);
    return normalizeMetadataRecordTypeForQuery(selectedRecordTypeId);
  }, [recordTypes, selectedRecordTypeId]);

  const recordTypesSorted = useMemo(
    () =>
      [...recordTypes].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: 'base' })),
    [recordTypes]
  );

  const recordTypesForLineConfig = useMemo(
    () => recordTypesSorted.filter((rt) => recordTypeForMetadataRequest(rt) !== 'VENDOR'),
    [recordTypesSorted]
  );

  useEffect(() => {
    if (!canReadFieldConfig) {
      setLineFields([]);
      setHeaderFields([]);
      return;
    }
    if (!fieldData) return;
    setLineFields([...fieldData.purchase_order_line.item_fields]);
    setHeaderFields([...(fieldData.purchase_order?.header_fields ?? [])]);
  }, [fieldData, canReadFieldConfig]);

  useEffect(() => {
    setSelectedSublistId('');
  }, [selectedRecordTypeId]);

  useEffect(() => {
    if (!selectedRecordTypeId && recordTypesForLineConfig.length > 0) {
      setSelectedRecordTypeId(recordTypesForLineConfig[0].id);
    }
  }, [recordTypesForLineConfig, selectedRecordTypeId]);

  useEffect(() => {
    if (!selectedRecordTypeId || recordTypesForLineConfig.length === 0) return;
    const ok = recordTypesForLineConfig.some((rt) => rt.id === selectedRecordTypeId);
    if (!ok) setSelectedRecordTypeId(recordTypesForLineConfig[0]?.id ?? '');
  }, [recordTypesForLineConfig, selectedRecordTypeId]);

  const {
    data: metadata,
    isLoading: metadataLoading,
    isError: metadataError,
    error: metadataErr,
    refetch: refetchMetadata,
  } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'metadata', metadataRecordType],
    queryFn: () =>
      postNetSuiteMetadataFetch({
        recordType: metadataRecordType,
        query: undefined,
      }),
    enabled: configured && canFetchCatalog && !!String(metadataRecordType).trim(),
    retry: false,
  });

  const sublistsSorted = useMemo(
    () =>
      metadata
        ? [...metadata.sublists].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: 'base' }))
        : [],
    [metadata]
  );

  const activeSublist = useMemo(() => {
    if (!metadata || !selectedSublistId) return null;
    return sublistsSorted.find((s) => s.id === selectedSublistId) ?? null;
  }, [metadata, selectedSublistId, sublistsSorted]);

  const sublistOptions = useMemo((): NetSuiteFieldOption[] => {
    if (!activeSublist) return [];
    const sorted = [...activeSublist.fields].sort((a, b) =>
      (a.label ?? a.name ?? a.id).localeCompare(b.label ?? b.name ?? b.id, undefined, { sensitivity: 'base' })
    );
    const out: NetSuiteFieldOption[] = [];
    for (const f of sorted) {
      const value = normalizeFieldTokenFromParts(activeSublist.id, f.id);
      if (!value) continue;
      out.push({ value, label: f.label ?? f.name ?? f.id, detail: f.id });
    }
    return out;
  }, [activeSublist]);

  const sublistFieldOptions = useMemo(() => buildSublistFieldOptions(metadata), [metadata]);

  const headerPickerOptions = useMemo(
    () => mergeFieldOptionsDedupe(buildBodyFieldOptions(metadata), buildMetaFieldOptions(metadata)),
    [metadata]
  );

  const lineCatalogMerged = useMemo(
    () => mergeFieldOptionsDedupe(buildMetaFieldOptions(metadata), sublistFieldOptions),
    [metadata, sublistFieldOptions]
  );

  const lineSearchOptions = useMemo(
    () => mergeFieldOptionsDedupe(buildMetaFieldOptions(metadata), sublistOptions),
    [metadata, sublistOptions]
  );

  const metadataLabelMap = useMemo(() => {
    const m = new Map<string, NetSuiteFieldOption>();
    for (const o of lineCatalogMerged) m.set(o.value, o);
    return m;
  }, [lineCatalogMerged]);

  const keyListForOptions = useMemo(() => {
    const fromMeta = lineCatalogMerged.map((o) => o.value);
    const merged = mergeDbKeysOrPresets([...new Set(fromMeta)], [] as readonly string[]);
    const line = canReadFieldConfig ? lineFields : [];
    return [...new Set([...merged, ...line])].sort((a, b) => a.localeCompare(b));
  }, [lineCatalogMerged, lineFields, canReadFieldConfig]);

  const savedLineLabels = fieldData?.purchase_order_line.item_field_labels;
  const savedHeaderLabels = fieldData?.purchase_order?.header_field_labels;

  const fieldOptions = useMemo((): NetSuiteFieldOption[] => {
    return keyListForOptions.map((value) => {
      const m = metadataLabelMap.get(value);
      if (m) return m;
      const sl = savedLineLabels?.[value];
      if (sl) return { value, label: sl, detail: 'Saved' };
      return { value, label: value, detail: 'Custom' };
    });
  }, [keyListForOptions, metadataLabelMap, savedLineLabels]);

  const headerKeyListForOptions = useMemo(() => {
    const fromMeta = headerPickerOptions.map((o) => o.value);
    const merged = mergeDbKeysOrPresets([...new Set(fromMeta)], [] as readonly string[]);
    const hf = canReadFieldConfig ? headerFields : [];
    return [...new Set([...merged, ...hf])].sort((a, b) => a.localeCompare(b));
  }, [headerPickerOptions, headerFields, canReadFieldConfig]);

  const headerDisplayOptions = useMemo((): NetSuiteFieldOption[] => {
    const map = new Map(headerPickerOptions.map((o) => [o.value, o]));
    return headerKeyListForOptions.map((value) => {
      const m = map.get(value);
      if (m) return m;
      const sl = savedHeaderLabels?.[value];
      if (sl) return { value, label: sl, detail: 'Saved' };
      return { value, label: value, detail: 'Custom' };
    });
  }, [headerKeyListForOptions, headerPickerOptions, savedHeaderLabels]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const lineErr = validateFieldList(lineFields);
      if (lineErr) throw new Error(lineErr);
      const headerErr = validateFieldList(headerFields);
      if (headerErr) throw new Error(headerErr);
      const lineIds = normalizeFields(lineFields);
      const headerIds = normalizeFields(headerFields);
      const item_field_labels = buildItemFieldLabelsFromOptions(lineIds, fieldOptions);
      const header_field_labels = buildItemFieldLabelsFromOptions(headerIds, headerDisplayOptions);
      return putNetSuiteFieldConfig({
        item_fields: lineIds,
        ...(Object.keys(item_field_labels).length ? { item_field_labels } : {}),
        purchase_order: {
          header_fields: headerIds,
          ...(Object.keys(header_field_labels).length ? { header_field_labels } : {}),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'field-config'] });
      toast({ title: 'Saved', description: 'Purchase order header and line fields are updated.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
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
            <ListTree className="h-5 w-5" />
            PO line columns
          </CardTitle>
          <CardDescription>Connect NetSuite first.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">NetSuite is not connected yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canFetchCatalog) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PO line columns</CardTitle>
          <CardDescription>Your role cannot load the field catalog.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const loadError =
    fieldsError && fieldsErr instanceof ApiError
      ? fieldsErr.status === 404
        ? 'Field settings are not available yet.'
        : fieldsErr.message
      : fieldsError
        ? (fieldsErr as Error).message
        : null;

  const metaErrMsg =
    metadataError && metadataErr instanceof Error ? metadataErr.message : metadataError ? String(metadataErr) : null;

  const showMainPanel = canFetchCatalog && (canReadFieldConfig ? !fieldsLoading && !fieldsError && fieldData != null : true);

  const atLimit = lineFields.length >= MAX_FIELDS;
  const saveDisabled = saveMutation.isPending;
  const addControlsDisabled = saveDisabled || atLimit;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Purchase order fields</CardTitle>
        <CardDescription>
          Choose a NetSuite record type, then map header fields (body + meta from the catalog) and line columns (sublist +
          meta). Only these lists are saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-visible">
        {canReadFieldConfig && fieldsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved columns…
          </div>
        )}

        {canReadFieldConfig && loadError && !fieldsLoading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <p className="text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {showMainPanel && (
          <>
            {!canManageFieldConfig && (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                <strong className="font-medium">View only.</strong> An org admin can change columns.
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">1. Record type</h3>
                  <p className="text-xs text-muted-foreground">Usually Purchase Order for header and line fields.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!metadataRecordType || metadataLoading}
                  onClick={() => void refetchMetadata()}
                >
                  {metadataLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Reload fields
                </Button>
              </div>
              <div className="max-w-md">
                <Label className="text-xs text-muted-foreground">NetSuite record type</Label>
                <Select value={selectedRecordTypeId || undefined} onValueChange={setSelectedRecordTypeId} disabled={recordTypesLoading}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={recordTypesLoading ? 'Loading…' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {recordTypesForLineConfig.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name ?? rt.id}
                        {rt.scriptId ? ` · ${rt.scriptId}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {recordTypesForLineConfig.length === 0 && !recordTypesLoading && (
                <p className="text-xs text-amber-800 dark:text-amber-200">No record types from NetSuite. Check the integration.</p>
              )}
            </div>

            {metadataLoading && (
              <p className="text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Loading field list from NetSuite…
              </p>
            )}

            {metaErrMsg && !metadataLoading && <p className="text-sm text-destructive">{metaErrMsg}</p>}

            {metadata && !metadataLoading && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                <h3 className="text-sm font-semibold text-foreground">2. Purchase order header</h3>
                <p className="text-xs text-muted-foreground">
                  Body fields and record-level meta fields from metadata. Add custom ids in the same token format (for example{' '}
                  <span className="font-mono">custbody_myfield</span>).
                </p>
                {metadata.metaFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    When the integration returns meta columns, they are listed here and in line search.
                  </p>
                ) : null}
                {canManageFieldConfig ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                    <div className="min-w-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Search body & meta fields</Label>
                        <NetSuiteFieldSearchCombobox
                          options={headerPickerOptions}
                          selected={headerFields}
                          onSelect={addHeaderFieldToken}
                          loading={metadataLoading}
                          disabled={saveDisabled || headerFields.length >= MAX_FIELDS}
                          triggerPlaceholder="Search header fields to add…"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground" htmlFor="ns-custom-po-header-field">
                          Custom header field id
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            id="ns-custom-po-header-field"
                            value={customHeaderDraft}
                            onChange={(e) => setCustomHeaderDraft(e.target.value)}
                            placeholder="e.g. custbody_reference"
                            className="min-w-0 flex-1 font-mono text-sm"
                            disabled={saveDisabled || headerFields.length >= MAX_FIELDS}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomHeaderDraft();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="shrink-0"
                            disabled={saveDisabled || headerFields.length >= MAX_FIELDS || !customHeaderDraft.trim()}
                            onClick={addCustomHeaderDraft}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </div>
                      {headerFields.length >= MAX_FIELDS && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">Maximum {MAX_FIELDS} header fields.</p>
                      )}
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Selected header fields</h4>
                        <p className="mt-1 text-xs text-muted-foreground">Order is preserved.</p>
                      </div>
                      {headerFields.length > 0 ? (
                        <ul className="max-h-[min(40vh,20rem)] space-y-2 overflow-y-auto pr-1">
                          {headerFields.map((field, index) => {
                            const { title, id } = labelForToken(field, headerDisplayOptions, savedHeaderLabels);
                            return (
                              <li
                                key={`${field}-${index}`}
                                className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium leading-snug text-foreground">{title}</span>
                                    <p
                                      className="mt-0.5 break-all font-mono text-[10px] leading-tight text-muted-foreground"
                                      title="Internal id"
                                    >
                                      {id}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                    disabled={saveDisabled}
                                    onClick={() => setHeaderFields((prev) => prev.filter((_, i) => i !== index))}
                                    aria-label={`Remove ${title}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No header fields yet.</p>
                      )}
                    </div>
                  </div>
                ) : headerFields.length > 0 ? (
                  <div className="space-y-2 rounded-lg border border-border/70 bg-muted/15 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Saved header fields (read-only)</p>
                    <ul className="flex flex-col gap-2">
                      {headerFields.map((id) => {
                        const { title } = labelForToken(id, headerDisplayOptions, savedHeaderLabels);
                        return (
                          <li
                            key={id}
                            className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/80 px-3 py-2"
                          >
                            <span className="text-sm font-medium text-foreground">{title}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{id}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No saved header fields.</p>
                )}
              </div>
            )}

            {metadata && !metadataLoading && sublistsSorted.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                <h3 className="text-sm font-semibold text-foreground">3. Line sublist</h3>
                <p className="text-xs text-muted-foreground">Which table on the record holds the line columns (for example “item”).</p>
                <div className="max-w-md">
                  <Label className="text-xs text-muted-foreground">Sublist</Label>
                  <Select
                    value={selectedSublistId || undefined}
                    onValueChange={setSelectedSublistId}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choose a sublist" />
                    </SelectTrigger>
                    <SelectContent>
                      {sublistsSorted.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          <span className="font-medium">{sub.name || sub.id}</span>
                          <span className="ml-1 font-mono text-xs text-muted-foreground">({sub.id})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {metadata && !metadataLoading && sublistsSorted.length === 0 && (
              <p className="text-sm text-muted-foreground">No sublists in this response. Try another record type.</p>
            )}

            {activeSublist && !canManageFieldConfig && (
              <p className="text-sm text-muted-foreground">Select a sublist to preview columns. Only admins can add them.</p>
            )}

            {canManageFieldConfig && (
              <div className="space-y-4 overflow-visible rounded-xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                  <div className="min-w-0 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">4. Add line columns (sublist + meta)</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Search meta fields for this record plus the active sublist. Custom ids use the same token format (for example{' '}
                        <span className="font-mono">item__quantity</span> or <span className="font-mono">meta_customcol</span>).
                      </p>
                    </div>
                    {activeSublist ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Search meta & active sublist columns</Label>
                        <NetSuiteFieldSearchCombobox
                          options={lineSearchOptions}
                          selected={lineFields}
                          onSelect={addLineFieldToken}
                          loading={metadataLoading}
                          disabled={addControlsDisabled}
                          triggerPlaceholder="Search columns to add…"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Choose a line sublist in step 3. Then you can search columns for that sublist here.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground" htmlFor="ns-custom-po-line-field">
                        Custom column id
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          id="ns-custom-po-line-field"
                          value={customIdDraft}
                          onChange={(e) => setCustomIdDraft(e.target.value)}
                          placeholder="e.g. item__quantity"
                          className="min-w-0 flex-1 font-mono text-sm"
                          disabled={addControlsDisabled}
                          autoComplete="off"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomIdDraft();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          disabled={addControlsDisabled || !customIdDraft.trim()}
                          onClick={addCustomIdDraft}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                    {atLimit && <p className="text-xs text-amber-700 dark:text-amber-400">Maximum {MAX_FIELDS} columns.</p>}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Selected columns</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Order is preserved. The internal id (token) is shown below each name.
                      </p>
                    </div>
                    {lineFields.length > 0 ? (
                      <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1">
                        {lineFields.map((field, index) => {
                          const { title, id } = labelForToken(field, fieldOptions, savedLineLabels);
                          return (
                            <li
                              key={`${field}-${index}`}
                              className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-sm font-medium leading-snug text-foreground">{title}</span>
                                  <p
                                    className="mt-0.5 break-all font-mono text-[10px] leading-tight text-muted-foreground"
                                    title="Internal id"
                                  >
                                    {id}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                  disabled={saveDisabled}
                                  onClick={() => setLineFields((prev) => prev.filter((_, i) => i !== index))}
                                  aria-label={`Remove ${title}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No columns yet. Add from the sublist or enter a custom id.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveDisabled}
                  >
                    {saveDisabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                  <span
                    className={cn(
                      'text-xs text-muted-foreground',
                      lineFields.length >= MAX_FIELDS && 'text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {lineFields.length} / {MAX_FIELDS} columns
                  </span>
                </div>
              </div>
            )}

            {canReadFieldConfig && !canManageFieldConfig && lineFields.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border/80 p-4">
                <h3 className="text-sm font-semibold">Saved columns (read-only)</h3>
                <ul className="flex flex-col gap-2">
                  {lineFields.map((id) => {
                    const { title } = labelForToken(id, fieldOptions, savedLineLabels);
                    return (
                      <li
                        key={id}
                        className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/15 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-foreground">{title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{id}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

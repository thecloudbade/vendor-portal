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
import { buildItemFieldLabelsFromOptions, buildSublistFieldOptions, normalizeFieldTokenFromParts } from '../utils/netsuiteMetadataFieldConfig';
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
import { ListTree, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NetSuiteMetadataFetchResult } from '../types';

/** Matches df-vendor `validateAndNormalizeItemFields`: letters, digits, underscore, max 128 chars. */
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
    toast({ title: 'Already added', description: `${v} is already in the list.`, variant: 'destructive' });
    return;
  }
  if (selected.length >= MAX_FIELDS) {
    toast({ title: 'Limit reached', description: `At most ${MAX_FIELDS} fields.`, variant: 'destructive' });
    return;
  }
  onChange([...selected, v]);
}

type MetadataSelectOption = { value: string; label: string; disabled?: boolean };

/** Inset dropdown to pick one field at a time; read-only shows a scrollable list panel (no chips). */
function MetadataFieldPickSelect({
  options,
  placeholder,
  onPick,
  disabled,
  readOnly,
  compact,
}: {
  options: MetadataSelectOption[];
  placeholder: string;
  onPick: (token: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** Tighter trigger + list (e.g. dense sublist grid). */
  compact?: boolean;
}) {
  const [resetKey, setResetKey] = useState(0);

  if (readOnly) {
    return (
      <div className="rounded-md border border-input bg-muted/20 shadow-inner">
        <div className={cn('overflow-y-auto p-1.5', compact ? 'max-h-28' : 'max-h-52')}>
          {options.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No fields</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {options.map((o) => (
                <li key={o.value} className={cn('flex flex-col gap-0.5 first:pt-0', compact ? 'py-1.5' : 'py-2.5 first:pt-1 last:pb-1')}>
                  <span className={cn('text-foreground', compact ? 'text-xs' : 'text-sm')}>{o.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{o.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <Select
      key={resetKey}
      onValueChange={(v) => {
        onPick(v);
        setResetKey((k) => k + 1);
      }}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger
        className={cn(
          'w-full max-w-full border-input bg-background font-normal shadow-sm',
          compact ? 'h-8 text-xs' : 'h-10'
        )}
      >
        <SelectValue placeholder={options.length === 0 ? 'No fields' : placeholder} />
      </SelectTrigger>
      <SelectContent className={cn('max-h-[min(24rem,60vh)]', compact && 'text-xs')}>
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className={cn(
              'cursor-pointer flex flex-col items-start gap-0.5 pl-2 pr-8 [&>span]:w-full',
              compact ? 'py-1.5' : 'py-2.5'
            )}
          >
            <span className="text-left font-medium leading-snug text-foreground">{o.label}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{o.value}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MetadataGroupedPickers({
  metadata,
  lineFields,
  onAddToken,
  disabled,
  readOnly,
  focusedSublistId,
  onFocusSublist,
  onClearFocus,
  metadataLoading,
}: {
  metadata: NetSuiteMetadataFetchResult;
  lineFields: string[];
  onAddToken: (token: string) => void;
  disabled?: boolean;
  /** Browse-only (e.g. ORG_USER): no add / sublist refetch. */
  readOnly?: boolean;
  focusedSublistId?: string | null;
  onFocusSublist?: (sublistId: string) => void;
  onClearFocus?: () => void;
  metadataLoading?: boolean;
}) {
  const sublistsSorted = useMemo(
    () =>
      [...metadata.sublists].sort((a, b) =>
        (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: 'base' })
      ),
    [metadata.sublists]
  );

  const selectedSet = useMemo(() => new Set(lineFields), [lineFields]);
  const atLimit = lineFields.length >= MAX_FIELDS;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Sublists</h3>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {sublistsSorted.length}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              From <code className="rounded bg-muted px-0.5">sublistFields</code> — line/sublist column ids for this record (e.g. PO{' '}
              <code className="rounded bg-muted px-0.5">item</code> for purchaseorderlines). Other record types use their own sublist
              keys.
            </p>
          </div>
          {focusedSublistId && onClearFocus && !readOnly && (
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
              <span className="max-w-[12rem] truncate text-[10px] text-amber-900 dark:text-amber-200" title={focusedSublistId}>
                Focus: <span className="font-mono">{focusedSublistId}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={metadataLoading}
                onClick={onClearFocus}
              >
                Clear focus
              </Button>
            </div>
          )}
        </div>
        {sublistsSorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sublists in this metadata response.</p>
        ) : (
          <div
            className={cn(
              'rounded-lg border border-border/50 bg-muted/5 p-1.5',
              sublistsSorted.length > 6 && 'max-h-[min(28rem,52vh)] overflow-y-auto overscroll-contain'
            )}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sublistsSorted.map((sub) => {
                const fieldsSorted = [...sub.fields].sort((a, b) =>
                  (a.label ?? a.name ?? a.id).localeCompare(b.label ?? b.name ?? b.id, undefined, { sensitivity: 'base' })
                );
                const isFocused = focusedSublistId === sub.id;
                const nCols = fieldsSorted.length;
                return (
                  <div
                    key={sub.id}
                    className={cn(
                      'flex min-w-0 flex-col gap-1 rounded-md border bg-background p-2 shadow-sm',
                      isFocused ? 'border-primary/60 ring-1 ring-primary/25' : 'border-border/70'
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium leading-tight text-foreground" title={sub.name ?? sub.id}>
                          {sub.name ?? sub.id}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
                          <span className="truncate font-mono text-[10px] text-muted-foreground">{sub.id}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">· {nCols} cols</span>
                        </div>
                      </div>
                      {onFocusSublist && !readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          disabled={disabled || metadataLoading}
                          title="Fetch metadata for this sublist"
                          onClick={() => onFocusSublist(sub.id)}
                        >
                          {metadataLoading && isFocused ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Label className="sr-only">Add column from sublist {sub.id}</Label>
                      <MetadataFieldPickSelect
                        options={fieldsSorted.flatMap((f) => {
                          const token = normalizeFieldTokenFromParts(sub.id, f.id);
                          if (!token) return [];
                          const label = f.label ?? f.name ?? f.id;
                          return [
                            {
                              value: token,
                              label,
                              disabled: selectedSet.has(token) || atLimit,
                            } satisfies MetadataSelectOption,
                          ];
                        })}
                        placeholder={`${sub.id}…`}
                        onPick={onAddToken}
                        disabled={disabled || atLimit}
                        readOnly={readOnly}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldSelectorSection({
  label,
  description,
  fieldOptions,
  fetchLoading,
  selected,
  onChange,
  onSave,
  isSaving,
  disabled,
}: {
  label: string;
  description: string;
  fieldOptions: NetSuiteFieldOption[];
  fetchLoading: boolean;
  selected: string[];
  onChange: (next: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [customDraft, setCustomDraft] = useState('');

  const addField = (raw: string) => tryAddFieldToken(selected, onChange, toast, raw);

  const removeAt = (index: number) => {
    onChange(selected.filter((_, i) => i !== index));
  };

  const addCustom = () => {
    addField(customDraft);
    setCustomDraft('');
  };

  return (
    <div className="space-y-3 overflow-visible rounded-lg border border-border/80 bg-muted/15 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((field, index) => (
            <li
              key={`${field}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground shadow-sm"
            >
              <span className="break-all">{field}</span>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                disabled={disabled}
                onClick={() => removeAt(index)}
                aria-label={`Remove ${field}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No PO line columns saved yet. Choose a record type, load metadata, then add tokens below — these values apply only to
          purchase order line outbound calls.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[min(100%,280px)] flex-1 space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Add field</span>
          <NetSuiteFieldSearchCombobox
            options={fieldOptions}
            selected={selected}
            onSelect={(v) => addField(v)}
            loading={fetchLoading}
            disabled={disabled}
            triggerPlaceholder="Search fields from metadata…"
          />
        </div>

        <div className="min-w-[min(100%,280px)] flex-1 space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Custom token</span>
          <div className="flex gap-2">
            <Input
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              placeholder="e.g. quantity or line_quantity"
              className="font-mono text-sm"
              disabled={disabled}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button type="button" variant="secondary" size="default" onClick={addCustom} disabled={disabled || !customDraft.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <Button type="button" size="sm" onClick={onSave} disabled={disabled || isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save PO line fields
        </Button>
        <span className={cn('text-xs text-muted-foreground', selected.length >= MAX_FIELDS && 'text-amber-700 dark:text-amber-400')}>
          {selected.length}/{MAX_FIELDS} fields
        </span>
      </div>
    </div>
  );
}

export type NetSuiteFieldConfigCardProps = {
  /**
   * GET …/field-config — org roles with read access (server-enforced).
   * When false, saved `item_fields` are not loaded.
   */
  canReadFieldConfig?: boolean;
  /**
   * PUT …/field-config — org admin only (server-enforced).
   * When false, saved fields cannot be saved.
   */
  canManageFieldConfig?: boolean;
  /**
   * POST …/record-types/list and …/metadata/fetch — ORG_ADMIN or ORG_USER (server-enforced).
   */
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
  /**
   * Optional: merged into metadata POST query as `sublist` so the RESTlet can return focused column metadata.
   * Cleared when the record type changes or when loading full-record metadata.
   */
  const [metadataSublistFocus, setMetadataSublistFocus] = useState<string | null>(null);
  const [lineFields, setLineFields] = useState<string[]>([]);

  const addLineFieldToken = (token: string) => tryAddFieldToken(lineFields, setLineFields, toast, token);

  const metadataRecordType = useMemo(() => {
    const rt = recordTypes.find((r) => r.id === selectedRecordTypeId);
    if (rt) return recordTypeForMetadataRequest(rt);
    return normalizeMetadataRecordTypeForQuery(selectedRecordTypeId);
  }, [recordTypes, selectedRecordTypeId]);

  const metadataQueryPayload = useMemo(() => {
    if (!metadataSublistFocus) return undefined;
    return { sublist: metadataSublistFocus };
  }, [metadataSublistFocus]);

  const recordTypesSorted = useMemo(
    () =>
      [...recordTypes].sort((a, b) =>
        (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: 'base' })
      ),
    [recordTypes]
  );

  /** Vendor record type is not used for PO line `item_fields` — hide from this UI. */
  const recordTypesForLineConfig = useMemo(
    () => recordTypesSorted.filter((rt) => recordTypeForMetadataRequest(rt) !== 'VENDOR'),
    [recordTypesSorted]
  );

  useEffect(() => {
    if (!canReadFieldConfig) {
      setLineFields([]);
      return;
    }
    if (!fieldData) return;
    setLineFields([...fieldData.purchase_order_line.item_fields]);
  }, [fieldData, canReadFieldConfig]);

  useEffect(() => {
    setMetadataSublistFocus(null);
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
    queryKey: ['org', 'integrations', 'netsuite', 'metadata', metadataRecordType, metadataQueryPayload],
    queryFn: () =>
      postNetSuiteMetadataFetch({
        recordType: metadataRecordType,
        query: metadataQueryPayload,
      }),
    enabled: configured && canFetchCatalog && !!metadataRecordType.trim(),
    retry: false,
  });

  const sublistFieldOptions = useMemo(() => buildSublistFieldOptions(metadata), [metadata]);

  /** Labels for sublist-derived tokens (PO lines only — no vendor or PO header fields in this UI). */
  const metadataLabelMap = useMemo(() => {
    const m = new Map<string, NetSuiteFieldOption>();
    for (const o of sublistFieldOptions) {
      m.set(o.value, o);
    }
    return m;
  }, [sublistFieldOptions]);

  /** Full catalog for labels + save: sublist tokens from metadata only (no PO header / vendor key lists). */
  const keyListForOptions = useMemo(() => {
    const fromMeta = sublistFieldOptions.map((o) => o.value);
    const merged = mergeDbKeysOrPresets(
      [...new Set(fromMeta)],
      [] as readonly string[]
    );
    const line = canReadFieldConfig ? lineFields : [];
    return [...new Set([...merged, ...line])].sort((a, b) => a.localeCompare(b));
  }, [sublistFieldOptions, lineFields, canReadFieldConfig]);

  const savedLineLabels = fieldData?.purchase_order_line.item_field_labels;

  const fieldOptions = useMemo((): NetSuiteFieldOption[] => {
    return keyListForOptions.map((value) => {
      const m = metadataLabelMap.get(value);
      if (m) return m;
      const sl = savedLineLabels?.[value];
      if (sl) return { value, label: sl, detail: 'Saved or custom' };
      return { value, label: value, detail: 'Saved or custom' };
    });
  }, [keyListForOptions, metadataLabelMap, savedLineLabels]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const err = validateFieldList(lineFields);
      if (err) throw new Error(err);
      const ids = normalizeFields(lineFields);
      const item_field_labels = buildItemFieldLabelsFromOptions(ids, fieldOptions);
      return putNetSuiteFieldConfig({
        item_fields: ids,
        ...(Object.keys(item_field_labels).length ? { item_field_labels } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'field-config'] });
      toast({ title: 'Saved', description: 'PO line item_fields updated (outbound purchase line calls).' });
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
            NetSuite fields & metadata
          </CardTitle>
          <CardDescription>Connect NetSuite in Settings first.</CardDescription>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTree className="h-5 w-5" />
            NetSuite fields & metadata
          </CardTitle>
          <CardDescription>Requires buyer or admin access.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your role does not include access to this catalog.</p>
        </CardContent>
      </Card>
    );
  }

  const loadError =
    fieldsError && fieldsErr instanceof ApiError
      ? fieldsErr.status === 404
        ? 'Field settings are not available yet. Try again in a moment.'
        : fieldsErr.message
      : fieldsError
        ? (fieldsErr as Error).message
        : null;

  const metaErrMsg =
    metadataError && metadataErr instanceof Error ? metadataErr.message : metadataError ? String(metadataErr) : null;

  const showMainPanel =
    canFetchCatalog &&
    (canReadFieldConfig ? !fieldsLoading && !fieldsError && fieldData != null : true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTree className="h-5 w-5" />
          NetSuite fields & metadata
        </CardTitle>
        <CardDescription>Pick PO line columns to include on synced orders. Header-only fields are not set here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-visible">
        {canReadFieldConfig && fieldsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved config…
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                <strong className="font-medium">View only.</strong> Admins can edit saved line columns.
              </div>
            )}
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-4">
              <p className="text-sm font-medium text-foreground">1. NetSuite record type</p>
              <p className="text-xs text-muted-foreground">
                POST …/record-types/list (vendor types are hidden — this screen is for PO line columns only). Pick a type such as
                Purchase Order to load line sublist metadata.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Record type</span>
                  <Select
                    value={selectedRecordTypeId || undefined}
                    onValueChange={(v) => setSelectedRecordTypeId(v)}
                    disabled={recordTypesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={recordTypesLoading ? 'Loading types…' : 'Select a record type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {recordTypesForLineConfig.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name ?? rt.id}
                          {rt.scriptId ? ` (${rt.scriptId})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  disabled={!selectedRecordTypeId || metadataLoading}
                  onClick={() => {
                    setMetadataSublistFocus(null);
                    void refetchMetadata();
                  }}
                >
                  {metadataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Refresh metadata
                </Button>
              </div>
              {recordTypesForLineConfig.length === 0 && !recordTypesLoading && (
                <p className="text-xs text-amber-800 dark:text-amber-200">No record types returned. Check the RESTlet response.</p>
              )}
            </div>

            {selectedRecordTypeId && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-4">
                <p className="text-sm font-medium text-foreground">2. Line sublist metadata (POST …/metadata/fetch)</p>
                <p className="text-xs text-muted-foreground">
                  Body: <code className="rounded bg-muted px-1">recordType</code> + optional{' '}
                  <code className="rounded bg-muted px-1">query.sublist</code> when you focus a sublist. Effective type:{' '}
                  <code className="rounded bg-muted px-1">{metadataRecordType || '—'}</code>. Only{' '}
                  <strong className="font-medium text-foreground">sublist column tokens</strong> can be added to saved{' '}
                  <code className="rounded bg-muted px-1">item_fields</code> — not vendor or PO header fields.
                </p>
                {metadataLoading && (
                  <p className="text-xs text-muted-foreground">
                    <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                    Loading sublist fields…
                  </p>
                )}
                {metaErrMsg && !metadataLoading && (
                  <p className="text-xs text-destructive">{metaErrMsg}</p>
                )}
                {metadata && !metadataLoading && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        Sublists: <strong className="text-foreground">{metadata.sublists.length}</strong> (
                        {metadata.sublists.reduce((n, s) => n + s.fields.length, 0)} column token(s))
                      </span>
                    </div>
                    <MetadataGroupedPickers
                      metadata={metadata}
                      lineFields={lineFields}
                      onAddToken={addLineFieldToken}
                      disabled={saveMutation.isPending}
                      readOnly={!canManageFieldConfig}
                      focusedSublistId={metadataSublistFocus}
                      onFocusSublist={(id) => setMetadataSublistFocus(id)}
                      onClearFocus={() => setMetadataSublistFocus(null)}
                      metadataLoading={metadataLoading}
                    />
                  </div>
                )}
              </div>
            )}

            {canManageFieldConfig && (
              <FieldSelectorSection
                label="Saved PO line columns (item_fields)"
                description="Line columns only. Letters, numbers, underscore. Max 50."
                fieldOptions={fieldOptions}
                fetchLoading={metadataLoading}
                selected={lineFields}
                onChange={setLineFields}
                onSave={() => saveMutation.mutate()}
                isSaving={saveMutation.isPending}
                disabled={saveMutation.isPending}
              />
            )}

            {canReadFieldConfig && !canManageFieldConfig && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-4">
                <p className="text-sm font-medium text-foreground">Saved PO line columns (read-only)</p>
                <p className="text-xs text-muted-foreground">Configured by an admin.</p>
                {lineFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fields saved yet.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {lineFields.map((id) => (
                      <li
                        key={id}
                        className="inline-flex max-w-full flex-col gap-0.5 rounded-md border border-border bg-background px-2 py-1.5 shadow-sm"
                      >
                        <span className="text-xs font-medium text-foreground">{savedLineLabels?.[id] ?? id}</span>
                        <span className="break-all font-mono text-[10px] text-muted-foreground">{id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

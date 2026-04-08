import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateDocumentTemplate,
  archiveDocumentTemplate,
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplate,
  getDocumentTemplateExcelStructure,
  getDocumentTemplateMappableFields,
  listDocumentTemplates,
  previewDocumentTemplate,
  putDocumentTemplateMapping,
  uploadDocumentTemplateMaster,
} from '../api/documentTemplates.api';
import { getOrgPOs } from '../api/org.api';
import type {
  CsvPackingListLayout,
  DetectedTemplateField,
  DocumentTemplateKind,
  MappableFieldsCatalog,
  PackingListLayout,
  PackingListTotalKey,
} from '../types';
import { PACKING_LIST_TOTAL_KEYS } from '../types';
import {
  emptyCsvPackingListLayout,
  sanitizeCsvPackingListLayout,
  validateCsvPackingListLayout,
} from '../utils/csvPackingListLayout';
import {
  emptyPackingListLayout,
  MAPPABLE_STATIC_PREFIXES,
  packingListTotalLabel,
  sanitizePackingListLayout,
  validatePackingListLayout,
} from '../utils/packingListLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  Pencil,
  Search,
  LayoutGrid,
  Play,
  Archive,
  Link2,
} from 'lucide-react';

const KIND_LABEL: Record<DocumentTemplateKind, string> = {
  PACKING_LIST: 'Packing list',
  COMMERCIAL_INVOICE: 'Commercial invoice',
};

const CATALOG_GROUPS: { key: keyof MappableFieldsCatalog; label: string }[] = [
  { key: 'organization', label: 'Organization' },
  { key: 'purchaseOrder', label: 'Purchase order' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'line', label: 'Line' },
];

function catalogPathOptions(catalog: MappableFieldsCatalog | undefined): { path: string; label: string; group: string }[] {
  if (!catalog) return [];
  const out: { path: string; label: string; group: string }[] = [];
  for (const g of CATALOG_GROUPS) {
    for (const e of catalog[g.key]) {
      out.push({ path: e.path, label: e.label || e.path, group: g.label });
    }
  }
  return out;
}

function cloneLayout(layout: PackingListLayout): PackingListLayout {
  return JSON.parse(JSON.stringify(layout)) as PackingListLayout;
}

function defaultLayoutForSheet(sheetName?: string): PackingListLayout {
  return emptyPackingListLayout({
    itemsStartRow: 2,
    sheetName: sheetName || undefined,
    headerMap: {},
    itemsColMap: {},
    totalsMap: {},
  });
}

function detectedCellRef(d: DetectedTemplateField): string | null {
  if (d.target?.kind === 'cell' && d.target.ref?.trim()) return d.target.ref.trim();
  if (d.ref?.trim()) return d.ref.trim();
  return null;
}

/** Non-line static paths — aligned with server catalog; used for “Add row” presets. */
const HEADER_PRESETS = MAPPABLE_STATIC_PREFIXES.filter((p) => !p.startsWith('line.'));
const LINE_PRESETS = MAPPABLE_STATIC_PREFIXES.filter((p) => p.startsWith('line.'));

function nextHeaderPath(map: Record<string, string>): string | null {
  for (const c of HEADER_PRESETS) {
    if (!Object.prototype.hasOwnProperty.call(map, c)) return c;
  }
  return null;
}

function nextLinePath(map: Record<string, string>): string | null {
  for (const c of LINE_PRESETS) {
    if (!Object.prototype.hasOwnProperty.call(map, c)) return c;
  }
  return null;
}

function nextStaticRef(map: Record<string, string>): string {
  for (let r = 1; r <= 200; r++) {
    const ref = `A${r}`;
    if (!Object.prototype.hasOwnProperty.call(map, ref)) return ref;
  }
  return 'A200';
}

/** Static cell keys for CSV layouts use R1C1 (matches server). */
function nextStaticR1C1Ref(map: Record<string, string>): string {
  for (let r = 1; r <= 200; r++) {
    const ref = `R${r}C1`;
    if (!Object.prototype.hasOwnProperty.call(map, ref)) return ref;
  }
  return 'R200C1';
}

export function DocumentTemplatesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DocumentTemplateKind>('PACKING_LIST');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<PackingListLayout | null>(null);
  const [previewPoId, setPreviewPoId] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'structure' | 'layout' | 'preview'>('structure');
  const [detectedFilter, setDetectedFilter] = useState('');
  const [refFocus, setRefFocus] = useState<'header' | 'static' | 'totals' | null>(null);
  const [refFocusIndex, setRefFocusIndex] = useState<number | null>(null);
  const [totalsKeyFocus, setTotalsKeyFocus] = useState<PackingListTotalKey | null>(null);

  useEffect(() => {
    setEditorTab('structure');
    setDetectedFilter('');
  }, [selectedId]);

  const { data: catalog } = useQuery({
    queryKey: ['org', 'document-templates', 'mappable-fields'],
    queryFn: getDocumentTemplateMappableFields,
  });

  const { data: templates = [], isLoading: listLoading } = useQuery({
    queryKey: ['org', 'document-templates'],
    queryFn: listDocumentTemplates,
  });

  const byKind = useMemo(
    () => templates.filter((t) => t.kind === kind).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [templates, kind]
  );

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['org', 'document-templates', selectedId],
    queryFn: () => getDocumentTemplate(selectedId!),
    enabled: !!selectedId,
  });

  const { data: excelStructure } = useQuery({
    queryKey: ['org', 'document-templates', selectedId, 'excel-structure'],
    queryFn: () => getDocumentTemplateExcelStructure(selectedId!),
    enabled: !!selectedId && !!detail?.masterFileId,
  });

  const structure = excelStructure ?? detail?.excelStructureSnapshot ?? null;
  const isCsv = detail?.masterFormat === 'CSV' || structure?.format === 'CSV';

  const { data: poList } = useQuery({
    queryKey: ['org', 'pos', 'picker'],
    queryFn: () => getOrgPOs({ pageSize: 200 }),
  });

  const poOptions = poList?.data ?? [];

  const sheetNames = structure?.sheets.map((s) => s.name).filter(Boolean) ?? [];

  useEffect(() => {
    if (!selectedId) {
      setLayoutDraft(null);
      return;
    }
    if (detail && detail.id === selectedId) {
      if (detail.masterFormat === 'CSV') {
        if (detail.csvPackingListLayout) {
          setLayoutDraft(cloneLayout(detail.csvPackingListLayout as unknown as PackingListLayout));
        } else {
          setLayoutDraft(emptyCsvPackingListLayout() as unknown as PackingListLayout);
        }
      } else {
        const firstSheet = structure?.sheets[0]?.name?.trim();
        if (detail.packingListLayout) {
          setLayoutDraft(cloneLayout(detail.packingListLayout));
        } else {
          setLayoutDraft(defaultLayoutForSheet(firstSheet));
        }
      }
    }
  }, [
    selectedId,
    detail,
    detail?.id,
    detail?.updatedAt,
    detail?.masterFormat,
    detail?.packingListLayout,
    detail?.csvPackingListLayout,
    structure?.sheets,
  ]);

  useEffect(() => {
    if (selectedId && byKind.length && !byKind.some((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [kind, byKind, selectedId]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['org', 'document-templates'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createDocumentTemplate({ kind }),
    onSuccess: (t) => {
      invalidateAll();
      setSelectedId(t.id);
      toast({ title: 'Draft created', description: `Edit ${KIND_LABEL[t.kind]} template.` });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentTemplate(id),
    onSuccess: (_, deletedId) => {
      invalidateAll();
      setDeleteId(null);
      setSelectedId((prev) => (prev === deletedId ? null : prev));
      toast({ title: 'Template deleted' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadDocumentTemplateMaster(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'document-templates'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'document-templates', id] });
      queryClient.invalidateQueries({ queryKey: ['org', 'document-templates', id, 'excel-structure'] });
      toast({ title: 'File uploaded', description: 'Configure the layout on the Layout tab.' });
    },
    onError: (e: Error) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const saveLayoutMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !layoutDraft) throw new Error('No template');
      if (detail?.masterFormat === 'CSV') {
        const cleaned = sanitizeCsvPackingListLayout(layoutDraft as unknown as CsvPackingListLayout);
        const err = validateCsvPackingListLayout(cleaned);
        if (err) throw new Error(err);
        return putDocumentTemplateMapping(selectedId, { csvPackingListLayout: cleaned });
      }
      const cleaned = sanitizePackingListLayout(layoutDraft);
      const err = validatePackingListLayout(cleaned);
      if (err) throw new Error(err);
      return putDocumentTemplateMapping(selectedId, { packingListLayout: cleaned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'document-templates'] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['org', 'document-templates', selectedId] });
      toast({ title: 'Layout saved' });
    },
    onError: (e: Error) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No template');
      const po = previewPoId.trim();
      if (!po) throw new Error('Choose or enter a PO id.');
      return previewDocumentTemplate(selectedId, po);
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        filename ??
        (detail?.masterFormat === 'CSV' || structure?.format === 'CSV'
          ? 'template-preview.csv'
          : 'template-preview.xlsx');
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Preview downloaded' });
    },
    onError: (e: Error) => toast({ title: 'Preview failed', description: e.message, variant: 'destructive' }),
  });

  const activateMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('No template');
      return activateDocumentTemplate(selectedId);
    },
    onSuccess: () => {
      setActivateOpen(false);
      invalidateAll();
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['org', 'document-templates', selectedId] });
      toast({ title: 'Template activated', description: 'Vendors will receive this file for downloads.' });
    },
    onError: (e: Error) => toast({ title: 'Activation failed', description: e.message, variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveDocumentTemplate(id),
    onSuccess: (_, archivedId) => {
      setArchiveId(null);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['org', 'document-templates', archivedId] });
      toast({ title: 'Template deactivated', description: 'Archived. No vendor file for this kind until you activate another template.' });
    },
    onError: (e: Error) => toast({ title: 'Could not deactivate', description: e.message, variant: 'destructive' }),
  });

  const canUpload = detail?.status !== 'ACTIVE';
  const hasFile = !!detail?.masterFileId;
  const selectedRow = detail && selectedId === detail.id ? detail : null;

  const layoutDirty = useMemo(() => {
    if (!detail || !layoutDraft) return false;
    if (detail.masterFormat === 'CSV') {
      const saved = detail.csvPackingListLayout;
      if (!saved) return true;
      return JSON.stringify(layoutDraft) !== JSON.stringify(saved);
    }
    const saved = detail.packingListLayout;
    if (!saved) return true;
    return JSON.stringify(layoutDraft) !== JSON.stringify(saved);
  }, [detail, layoutDraft]);

  const hasSavedLayoutOnServer =
    detail?.masterFormat === 'CSV' ? !!detail.csvPackingListLayout : !!detail?.packingListLayout;
  const canPreview = hasFile && hasSavedLayoutOnServer && !layoutDirty;
  const canActivate = hasFile && hasSavedLayoutOnServer && !layoutDirty && selectedRow?.status !== 'ACTIVE';

  const headerRows = useMemo(() => Object.entries(layoutDraft?.headerMap ?? {}), [layoutDraft]);
  const lineRows = useMemo(() => Object.entries(layoutDraft?.itemsColMap ?? {}), [layoutDraft]);
  const staticEntries = useMemo(() => Object.entries(layoutDraft?.staticCells ?? {}), [layoutDraft]);

  const detectionMeta = structure?.detectionMeta;
  const detectedFields = useMemo(
    () => structure?.detectedTemplateFields ?? [],
    [structure?.detectedTemplateFields]
  );

  const filteredDetectedFields = useMemo(() => {
    const q = detectedFilter.trim().toLowerCase();
    if (!q) return detectedFields;
    return detectedFields.filter((d) => {
      const loc = d.target
        ? d.target.kind === 'namedRange'
          ? d.target.name
          : d.target.kind === 'lineColumn'
            ? `${d.target.sheet} ${d.target.startRow} ${d.target.column}`
            : `${d.target.sheet} ${d.target.ref}`
        : `${d.sheet ?? ''} ${d.ref ?? ''}`;
      const hay = `${d.kind} ${loc} ${d.previewValue ?? ''} ${d.fieldId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [detectedFields, detectedFilter]);

  const applyDetectedRef = useCallback(
    (ref: string) => {
      const r = ref.trim().toUpperCase();
      if (!r || !layoutDraft) return;
      if (isCsv && !/^R\d+C\d+$/i.test(r)) {
        toast({
          title: 'Invalid ref',
          description: 'CSV templates use R1C1 addresses (e.g. R2C3). Pick a detected cell from the list.',
          variant: 'destructive',
        });
        return;
      }
      if (refFocus === 'header' && refFocusIndex != null) {
        const paths = Object.keys(layoutDraft.headerMap);
        const p = paths[refFocusIndex];
        if (!p) return;
        setLayoutDraft({
          ...layoutDraft,
          headerMap: { ...layoutDraft.headerMap, [p]: r },
        });
        toast({ title: isCsv ? 'R/C ref applied' : 'Cell ref applied', description: r });
        return;
      }
      if (refFocus === 'totals' && totalsKeyFocus) {
        setLayoutDraft({
          ...layoutDraft,
          totalsMap: { ...layoutDraft.totalsMap, [totalsKeyFocus]: r },
        });
        toast({ title: isCsv ? 'R/C ref applied' : 'Cell ref applied', description: r });
        return;
      }
      if (refFocus === 'static' && refFocusIndex != null) {
        const entries = Object.entries(layoutDraft.staticCells ?? {});
        const entry = entries[refFocusIndex];
        if (!entry) return;
        const [oldRef, val] = entry;
        const next = { ...(layoutDraft.staticCells ?? {}) };
        delete next[oldRef];
        next[r] = val;
        setLayoutDraft({ ...layoutDraft, staticCells: next });
        toast({ title: isCsv ? 'R/C ref applied' : 'Cell ref applied', description: r });
      }
    },
    [layoutDraft, refFocus, refFocusIndex, totalsKeyFocus, toast, isCsv]
  );

  const updateLayout = useCallback((patch: Partial<PackingListLayout>) => {
    setLayoutDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <div className="space-y-6">
      <Tabs
        value={kind}
        onValueChange={(v) => {
          setKind(v as DocumentTemplateKind);
          setSelectedId(null);
        }}
        className="w-full"
      >
        <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1.5 sm:inline-flex sm:w-auto">
          <TabsTrigger value="PACKING_LIST" className="gap-2 px-4 py-2">
            Packing list
          </TabsTrigger>
          <TabsTrigger value="COMMERCIAL_INVOICE" className="gap-2 px-4 py-2">
            Commercial invoice
          </TabsTrigger>
        </TabsList>

        <TabsContent value={kind} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-5 w-5" />
                    {KIND_LABEL[kind]} templates
                  </CardTitle>
                  <CardDescription>Upload a master file, map columns, then activate. One active template per type.</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  New draft
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {listLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading templates…
                </div>
              ) : byKind.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet. Create a draft to start.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {byKind.map((t) => (
                    <li
                      key={t.id}
                      className={cn(
                        'flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between',
                        selectedId === t.id && 'bg-muted/40'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{t.id}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              t.status === 'ACTIVE' && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
                              t.status === 'DRAFT' && 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
                              t.status === 'ARCHIVED' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs text-muted-foreground">Updated {new Date(t.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={selectedId === t.id ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedId(t.id)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          {selectedId === t.id ? 'Editing' : 'Edit'}
                        </Button>
                        {t.status === 'ACTIVE' && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setArchiveId(t.id)}>
                            <Archive className="mr-1 h-3.5 w-3.5" />
                            Deactivate
                          </Button>
                        )}
                        {t.status !== 'ACTIVE' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {selectedId && layoutDraft && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edit template</CardTitle>
                <CardDescription>Upload a file, set the layout, preview, then activate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {detailLoading && !selectedRow ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : selectedRow ? (
                  <Tabs
                    value={editorTab}
                    onValueChange={(v) => setEditorTab(v as 'structure' | 'layout' | 'preview')}
                    className="w-full"
                  >
                    <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1.5">
                      <TabsTrigger value="structure" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                        <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">File</span>
                      </TabsTrigger>
                      <TabsTrigger value="layout" className="gap-1.5 py-2.5 text-xs sm:text-sm" disabled={!hasFile}>
                        <Link2 className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">Layout</span>
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1.5 py-2.5 text-xs sm:text-sm" disabled={!hasFile}>
                        <Play className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">Preview</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="structure" className="mt-0 space-y-4 focus-visible:ring-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-muted/40',
                            (!canUpload || uploadMutation.isPending) && 'pointer-events-none opacity-50'
                          )}
                        >
                          <Upload className="h-4 w-4" />
                          <span>Choose .xlsx or .csv</span>
                          <input
                            type="file"
                            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                            className="hidden"
                            disabled={!canUpload || uploadMutation.isPending}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (f && selectedId) uploadMutation.mutate({ id: selectedId, file: f });
                            }}
                          />
                        </label>
                        {selectedRow.status === 'ACTIVE' && (
                          <span className="text-xs text-muted-foreground">Active templates cannot be replaced. Create a new draft.</span>
                        )}
                        {hasFile && (
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            File uploaded
                          </span>
                        )}
                      </div>
                      {structure && structure.sheets.length > 0 && !isCsv && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workbook</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {structure.sheets.map((s) => (
                              <div
                                key={s.name}
                                className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 to-muted/10 px-3 py-2.5 text-sm shadow-sm"
                              >
                                <p className="font-medium text-foreground">{s.name}</p>
                                {s.rowCount != null && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {s.rowCount} × {s.columnCount ?? '?'} cells
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          {structure.definedNames.length > 0 && (
                            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                              <p className="text-xs font-medium text-foreground">Defined names</p>
                              <div className="mt-2 max-h-36 overflow-y-auto overscroll-contain text-xs text-muted-foreground">
                                <ul className="space-y-1">
                                  {structure.definedNames.map((d) => (
                                    <li key={d.name} className="flex justify-between gap-2 border-b border-border/30 py-1 last:border-0">
                                      <span className="font-mono text-foreground">{d.name}</span>
                                      <span className="shrink-0 text-[11px]">{d.address ?? '?'}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {structure && structure.sheets.length > 0 && isCsv && (
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                          <p className="font-medium text-foreground">CSV grid</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {structure.sheets[0]?.rowCount ?? '?'} rows × {structure.sheets[0]?.columnCount ?? '?'} columns (max). Map header
                            and totals using <strong>R1C1</strong> (row and column are 1-based).
                          </p>
                        </div>
                      )}
                      {hasFile && (
                        <>
                          {detectionMeta && (
                            <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                              {typeof detectionMeta.totalFields === 'number' && (
                                <span className="rounded-md bg-background/80 px-2 py-1 font-medium shadow-sm">
                                  {detectionMeta.totalFields} cells
                                </span>
                              )}
                              {typeof detectionMeta.namedRangeCount === 'number' && (
                                <span className="rounded-md bg-background/80 px-2 py-1 font-medium shadow-sm">
                                  {detectionMeta.namedRangeCount} names
                                </span>
                              )}
                              {detectionMeta.truncated && (
                                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-900 dark:text-amber-200">
                                  Truncated — not all cells listed
                                </span>
                              )}
                            </div>
                          )}
                          {detectedFields.length > 0 ? (
                            <>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  value={detectedFilter}
                                  onChange={(e) => setDetectedFilter(e.target.value)}
                                  placeholder="Filter detected cells…"
                                  className="h-10 border-border/80 bg-background pl-9 shadow-sm"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                On the Layout tab, focus a cell ref field (or a totals row), then click <strong>Use ref</strong> to
                                fill it from detection.
                              </p>
                              <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-inner">
                                <div className="max-h-[min(420px,50vh)] overflow-auto overscroll-contain">
                                  <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                                    <thead className="sticky top-0 z-[1] border-b border-border/80 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/75">
                                      <tr className="text-[11px] font-medium text-muted-foreground">
                                        <th className="whitespace-nowrap px-3 py-2.5 text-left">Kind</th>
                                        <th className="min-w-[120px] px-3 py-2.5 text-left">Location</th>
                                        <th className="min-w-[100px] px-3 py-2.5 text-left">Sample</th>
                                        <th className="whitespace-nowrap px-3 py-2.5 text-right"> </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                      {filteredDetectedFields.map((d) => {
                                        const ref = detectedCellRef(d);
                                        return (
                                          <tr key={d.fieldId} className="hover:bg-muted/30">
                                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">{d.kind}</td>
                                            <td className="max-w-[min(240px,40vw)] truncate px-3 py-2 font-mono text-[11px] text-muted-foreground">
                                              {d.target
                                                ? d.target.kind === 'namedRange'
                                                  ? `name:${d.target.name}`
                                                  : d.target.kind === 'lineColumn'
                                                    ? `${d.target.sheet}!R${d.target.startRow}C${d.target.column}`
                                                    : `${d.target.sheet}!${d.target.ref}`
                                                : [d.sheet, d.ref].filter(Boolean).join('!') || '—'}
                                            </td>
                                            <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground">{d.previewValue ?? '—'}</td>
                                            <td className="whitespace-nowrap px-2 py-1.5 text-right">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-[11px]"
                                                disabled={!ref}
                                                onClick={() => ref && applyDetectedRef(ref)}
                                              >
                                                Use ref
                                              </Button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                              No auto-detected fields in the upload response.
                            </p>
                          )}
                          <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => setEditorTab('layout')}>
                            Continue to layout
                            <Link2 className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="layout" className="mt-0 space-y-8 focus-visible:ring-0">
                      {isCsv && (
                        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          <strong className="text-foreground">CSV mapping:</strong> use <code className="text-[11px]">R1C1</code> for header and
                          totals (row and column are 1-based). Line columns still use letters (<code className="text-[11px]">A</code>,{' '}
                          <code className="text-[11px]">B</code>, …).
                        </p>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {!isCsv && (
                          <div className="space-y-2">
                            <Label>Worksheet</Label>
                            <Select
                              value={layoutDraft.sheetName && sheetNames.includes(layoutDraft.sheetName) ? layoutDraft.sheetName : '__first__'}
                              onValueChange={(v) =>
                                updateLayout({ sheetName: v === '__first__' ? undefined : v })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="First sheet" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__first__">First sheet (default)</SelectItem>
                                {sheetNames.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Single-sheet templates work best; the engine uses one worksheet.</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="items-start-row">First line row (1-based)</Label>
                          <Input
                            id="items-start-row"
                            type="number"
                            min={1}
                            value={layoutDraft.itemsStartRow}
                            onChange={(e) =>
                              updateLayout({ itemsStartRow: Math.max(1, Number(e.target.value) || 1) })
                            }
                          />
                          <p className="text-xs text-muted-foreground">Row where the first PO line is written; row styles are copied from here.</p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-medium">Header fields</h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextPath = nextHeaderPath(layoutDraft.headerMap);
                              if (!nextPath) {
                                toast({
                                  title: 'No preset fields left',
                                  description: 'Edit an existing row’s path or remove one, then add again.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              updateLayout({ headerMap: { ...layoutDraft.headerMap, [nextPath]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add row
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Map <strong>organization.*</strong>, <strong>purchaseOrder.*</strong>, and <strong>vendor.*</strong> only (not{' '}
                          <code className="text-[11px]">line.*</code>). The dropdown reflects{' '}
                          <code className="text-[11px]">GET …/mappable-fields</code> — including NetSuite keys from synced data, record cache,
                          and field-config. Custom paths:{' '}
                          <code className="text-[11px]">purchaseOrder.netsuiteFields.&lt;key&gt;</code>,{' '}
                          <code className="text-[11px]">vendor.netsuiteFields.&lt;key&gt;</code>,{' '}
                          <code className="text-[11px]">purchaseOrder.summary.&lt;subKey&gt;</code> (key segment: letters, digits,{' '}
                          <code className="text-[11px]">_</code>, <code className="text-[11px]">.</code>, <code className="text-[11px]">-</code>).
                        </p>
                        <div className="space-y-2">
                          {headerRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No header rows. Add a row or save an empty layout.</p>
                          ) : (
                            headerRows.map(([path, cellRef], index) => (
                              <div
                                key={`${path}-${index}`}
                                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-end"
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Label className="text-xs">Portal field</Label>
                                  <CatalogPathSelect
                                    catalog={catalog}
                                    value={path}
                                    lineOnly={false}
                                    onPick={(p) => {
                                      const next = { ...layoutDraft.headerMap };
                                      delete next[path];
                                      next[p] = cellRef;
                                      updateLayout({ headerMap: next });
                                    }}
                                  />
                                  <Input
                                    className="font-mono text-xs"
                                    value={path}
                                    onChange={(e) => {
                                      const next = { ...layoutDraft.headerMap };
                                      delete next[path];
                                      next[e.target.value] = cellRef;
                                      updateLayout({ headerMap: next });
                                    }}
                                    placeholder="organization.name"
                                  />
                                </div>
                                <div className="w-full space-y-1 sm:w-36">
                                  <Label className="text-xs">{isCsv ? 'R/C ref' : 'Cell ref'}</Label>
                                  <Input
                                    className="font-mono text-sm"
                                    value={cellRef}
                                    onFocus={() => {
                                      setRefFocus('header');
                                      setRefFocusIndex(index);
                                    }}
                                    onChange={(e) => {
                                      const next = { ...layoutDraft.headerMap };
                                      next[path] = e.target.value.toUpperCase();
                                      updateLayout({ headerMap: next });
                                    }}
                                    placeholder={isCsv ? 'R2C3' : 'B2'}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-destructive"
                                  onClick={() => {
                                    const next = { ...layoutDraft.headerMap };
                                    delete next[path];
                                    updateLayout({ headerMap: next });
                                  }}
                                  aria-label="Remove row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-medium">Line columns</h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextPath = nextLinePath(layoutDraft.itemsColMap);
                              if (!nextPath) {
                                toast({
                                  title: 'No preset line fields left',
                                  description: 'Remove a row or edit another column path.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              updateLayout({ itemsColMap: { ...layoutDraft.itemsColMap, [nextPath]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add row
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Only <strong>line.*</strong> paths (catalog + <code className="text-[11px]">line.netsuiteFields.&lt;key&gt;</code>). Each
                          field maps to a column letter (A, B, …). Use the same first line row above for all columns.
                        </p>
                        <div className="space-y-2">
                          {lineRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No line columns yet.</p>
                          ) : (
                            lineRows.map(([path, col], index) => (
                              <div
                                key={`${path}-${index}`}
                                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-end"
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Label className="text-xs">Line field</Label>
                                  <CatalogPathSelect
                                    catalog={catalog}
                                    value={path}
                                    lineOnly
                                    onPick={(p) => {
                                      const next = { ...layoutDraft.itemsColMap };
                                      delete next[path];
                                      next[p] = col;
                                      updateLayout({ itemsColMap: next });
                                    }}
                                  />
                                  <Input
                                    className="font-mono text-xs"
                                    value={path}
                                    onChange={(e) => {
                                      const next = { ...layoutDraft.itemsColMap };
                                      delete next[path];
                                      next[e.target.value] = col;
                                      updateLayout({ itemsColMap: next });
                                    }}
                                    placeholder="line.sku"
                                  />
                                </div>
                                <div className="w-full space-y-1 sm:w-28">
                                  <Label className="text-xs">Column</Label>
                                  <Input
                                    className="font-mono text-sm"
                                    value={col}
                                    onChange={(e) => {
                                      const next = { ...layoutDraft.itemsColMap };
                                      next[path] = e.target.value.toUpperCase();
                                      updateLayout({ itemsColMap: next });
                                    }}
                                    placeholder="A"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-destructive"
                                  onClick={() => {
                                    const next = { ...layoutDraft.itemsColMap };
                                    delete next[path];
                                    updateLayout({ itemsColMap: next });
                                  }}
                                  aria-label="Remove row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <h4 className="text-sm font-medium">Totals</h4>
                        <p className="text-xs text-muted-foreground">Optional. Computed totals from line items are written to these cells.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {PACKING_LIST_TOTAL_KEYS.map((key) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs">{packingListTotalLabel(key)}</Label>
                              <Input
                                className="font-mono text-sm"
                                value={layoutDraft.totalsMap[key] ?? ''}
                                onFocus={() => {
                                  setRefFocus('totals');
                                  setTotalsKeyFocus(key);
                                  setRefFocusIndex(null);
                                }}
                                onChange={(e) => {
                                  const v = e.target.value.trim().toUpperCase();
                                  const next = { ...layoutDraft.totalsMap };
                                  if (!v) delete next[key];
                                  else next[key] = v;
                                  updateLayout({ totalsMap: next });
                                }}
                                placeholder={isCsv ? 'R15C2' : 'e.g. B50'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-medium">Static cells</h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextRef = isCsv
                                ? nextStaticR1C1Ref(layoutDraft.staticCells ?? {})
                                : nextStaticRef(layoutDraft.staticCells ?? {});
                              updateLayout({ staticCells: { ...(layoutDraft.staticCells ?? {}), [nextRef]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add row
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Fixed text written to the cell after headers (e.g. labels).</p>
                        <div className="space-y-2">
                          {staticEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground">None.</p>
                          ) : (
                            staticEntries.map(([ref, val], index) => (
                              <div key={`${ref}-${index}`} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-end">
                                <div className="space-y-1 sm:w-36">
                                  <Label className="text-xs">{isCsv ? 'R/C ref' : 'Cell ref'}</Label>
                                  <Input
                                    className="font-mono text-sm"
                                    value={ref}
                                    onFocus={() => {
                                      setRefFocus('static');
                                      setRefFocusIndex(index);
                                    }}
                                    onChange={(e) => {
                                      const next = { ...(layoutDraft.staticCells ?? {}) };
                                      delete next[ref];
                                      next[e.target.value.toUpperCase()] = val;
                                      updateLayout({ staticCells: next });
                                    }}
                                    placeholder={isCsv ? 'R1C1' : 'A1'}
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <Input
                                    value={val}
                                    onChange={(e) => {
                                      const next = { ...(layoutDraft.staticCells ?? {}) };
                                      next[ref] = e.target.value;
                                      updateLayout({ staticCells: next });
                                    }}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-destructive"
                                  onClick={() => {
                                    const next = { ...(layoutDraft.staticCells ?? {}) };
                                    delete next[ref];
                                    updateLayout({ staticCells: Object.keys(next).length ? next : undefined });
                                  }}
                                  aria-label="Remove row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                        <Button
                          type="button"
                          onClick={() => saveLayoutMutation.mutate()}
                          disabled={saveLayoutMutation.isPending || !hasFile}
                        >
                          {saveLayoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save layout
                        </Button>
                        {layoutDirty && (
                          <span className="self-center text-xs text-amber-800 dark:text-amber-200">Unsaved changes</span>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-0 space-y-6 focus-visible:ring-0">
                      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                        <h4 className="text-sm font-medium">Preview</h4>
                        <p className="text-xs text-muted-foreground">
                          Filled {isCsv ? 'CSV' : 'workbook'} for a real PO. The server uses the <strong>last saved</strong> layout.
                        </p>
                        {layoutDirty && (
                          <p className="text-xs text-amber-800 dark:text-amber-200">Save the layout tab before preview.</p>
                        )}
                        {!hasSavedLayoutOnServer && (
                          <p className="text-xs text-muted-foreground">Save a layout first.</p>
                        )}
                        <div className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="preview-po">Purchase order</Label>
                            <Select
                              value={previewPoId && poOptions.some((p) => p.id === previewPoId) ? previewPoId : undefined}
                              onValueChange={(v) => setPreviewPoId(v)}
                            >
                              <SelectTrigger id="preview-po">
                                <SelectValue placeholder="Select a PO…" />
                              </SelectTrigger>
                              <SelectContent>
                                {poOptions.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.poNumber} ({p.id.slice(0, 8)}…)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="preview-po-id">Or paste PO id</Label>
                            <Input
                              id="preview-po-id"
                              value={previewPoId}
                              onChange={(e) => setPreviewPoId(e.target.value)}
                              placeholder="24-char hex id"
                              className="font-mono text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!hasFile || !previewPoId.trim() || previewMutation.isPending || !canPreview}
                            onClick={() => previewMutation.mutate()}
                          >
                            {previewMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Download preview
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <h4 className="text-sm font-medium">Activate</h4>
                        <p className="text-xs text-muted-foreground">
                          Replaces the current active {KIND_LABEL[kind]} for all vendors. Requires file and a saved layout.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            onClick={() => setActivateOpen(true)}
                            disabled={!canActivate || activateMutation.isPending}
                          >
                            Activate template
                          </Button>
                          {selectedRow.status === 'ACTIVE' && (
                            <>
                              <span className="text-xs text-emerald-700 dark:text-emerald-400">This template is active.</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={archiveMutation.isPending}
                                onClick={() => setArchiveId(selectedRow.id)}
                              >
                                <Archive className="mr-1 h-3.5 w-3.5" />
                                Deactivate
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEditorTab('layout')}>
                        ← Back to layout
                      </Button>
                    </TabsContent>
                  </Tabs>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the template record. Drafts and archived templates can be deleted; use Deactivate first if the template
              is still active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this template?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be archived. Vendors will not get a generated file for this kind until you activate another template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && archiveMutation.mutate(archiveId)}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This becomes the {KIND_LABEL[kind]} file vendors download for this organization. Any previous active template of this kind
              is archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => activateMutation.mutate()}>Activate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogPathSelect({
  catalog,
  value,
  onPick,
  disabled,
  lineOnly,
}: {
  catalog: MappableFieldsCatalog | undefined;
  value: string;
  onPick: (path: string) => void;
  disabled?: boolean;
  lineOnly?: boolean;
}) {
  const options = useMemo(() => {
    const all = catalogPathOptions(catalog);
    if (lineOnly) return all.filter((o) => o.path.startsWith('line.'));
    return all.filter((o) => !o.path.startsWith('line.'));
  }, [catalog, lineOnly]);
  const pathSet = useMemo(() => new Set(options.map((o) => o.path)), [options]);
  const selectValue = pathSet.has(value) ? value : '__custom__';

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === '__custom__') return;
        onPick(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 font-mono text-xs">
        <SelectValue placeholder="Pick from catalog…" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(24rem,60vh)]">
        {CATALOG_GROUPS.map((g) => {
          const items = options.filter((o) => o.group === g.label);
          if (items.length === 0) return null;
          return (
            <SelectGroup key={g.key}>
              <SelectLabel>{g.label}</SelectLabel>
              {items.map((o) => (
                <SelectItem key={o.path} value={o.path} className="font-mono text-xs">
                  {o.path} — {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
        <SelectItem value="__custom__">Custom path (edit below)</SelectItem>
      </SelectContent>
    </Select>
  );
}

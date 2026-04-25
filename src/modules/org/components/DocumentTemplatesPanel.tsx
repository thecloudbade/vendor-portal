import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  PackingListLayout,
  PackingListTotalKey,
  POListItem,
} from '../types';
import { PACKING_LIST_TOTAL_KEYS } from '../types';
import {
  emptyCsvPackingListLayout,
  sanitizeCsvPackingListLayout,
  validateCsvPackingListLayout,
} from '../utils/csvPackingListLayout';
import {
  catalogPathOptions,
  mergeCatalogWithStaticPresets,
  nextUnmappedCatalogPath,
} from '../utils/documentTemplateMappableFields';
import {
  emptyPackingListLayout,
  packingListTotalLabel,
  sanitizePackingListLayout,
  validatePackingListLayout,
} from '../utils/packingListLayout';
import { MappablePathCombobox } from './MappablePathCombobox';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { ROUTES } from '@/modules/common/constants/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  ChevronsUpDown,
  Pencil,
  Search,
  LayoutGrid,
  Play,
  Archive,
  Link2,
  RotateCw,
} from 'lucide-react';

const KIND_LABEL: Record<DocumentTemplateKind, string> = {
  PACKING_LIST: 'Packing list',
  COMMERCIAL_INVOICE: 'Commercial invoice',
};

function triggerDownloadFile(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function TemplatePreviewPoPicker({
  pos,
  value,
  onChange,
  search,
  onSearchChange,
  loading,
  refreshing,
  onRefresh,
}: {
  pos: POListItem[];
  value: string;
  onChange: (id: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [localQ, setLocalQ] = useState('');
  const selected = useMemo(() => pos.find((p) => p.id === value), [pos, value]);
  const filtered = useMemo(() => {
    const q = localQ.trim().toLowerCase();
    if (!q) return pos;
    return pos.filter(
      (p) =>
        p.poNumber.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(q))
    );
  }, [pos, localQ]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="template-preview-po-search">Search purchase orders</Label>
          <div className="flex gap-2">
            <Input
              id="template-preview-po-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="PO #, vendor name, or id…"
              className="font-mono text-sm"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Refresh list"
              onClick={() => onRefresh()}
              disabled={loading || refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Choose PO for preview</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-9 w-full justify-between py-1.5 text-left font-normal"
            >
              <span className="min-w-0 flex-1">
                {selected ? (
                  <span className="block truncate">
                    <span className="font-medium text-foreground">{selected.poNumber}</span>
                    {selected.vendorName ? (
                      <span className="text-muted-foreground"> — {selected.vendorName}</span>
                    ) : null}
                  </span>
                ) : value.trim() ? (
                  <span className="block truncate font-mono text-xs text-foreground" title={value}>
                    {value.slice(0, 8)}…{value.length > 12 ? ` (${value.length} chars)` : ''} (use list or paste id below)
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a PO from the list…</span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(100vw-1.5rem,28rem)] max-w-[95vw] border-border p-0 shadow-lg"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="border-b border-border p-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Filter this list…"
                  className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto overscroll-contain p-1" role="listbox">
              {loading && pos.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="mb-2 inline h-4 w-4 animate-spin" />
                  <br />
                  Loading purchase orders…
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No purchase orders in this list. Try another search, refresh, or paste a PO id below.{' '}
                  <Link to={ROUTES.ORG.POS} className="text-primary underline" onClick={() => setOpen(false)}>
                    Open PO list
                  </Link>
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    className={cn(
                      'flex w-full flex-col items-start gap-0 rounded-md px-2 py-1.5 text-left text-sm',
                      'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      p.id === value && 'bg-muted/70'
                    )}
                    onClick={() => {
                      onChange(p.id);
                      setLocalQ('');
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{p.poNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.vendorName ?? p.vendorId}
                      {p.id ? <span className="font-mono"> · {p.id.slice(0, 10)}…</span> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
            <p className="border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">
              {filtered.length} of {pos.length} shown
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
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

/** Compact key → value table for template field mapping (layout only; no state). */
function MappingFieldTable({
  keyLabel,
  valueLabel,
  children,
  showActionColumn = true,
}: {
  keyLabel: string;
  valueLabel: string;
  children: ReactNode;
  showActionColumn?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/5">
      <table className="w-full min-w-[min(100%,32rem)] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/50">
            <th className="min-w-0 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {keyLabel}
            </th>
            <th
              className={cn(
                'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                showActionColumn ? 'w-[7.25rem] min-w-[6.5rem] sm:w-32' : 'w-36 min-w-[7rem] sm:w-40'
              )}
            >
              {valueLabel}
            </th>
            {showActionColumn && <th className="w-9 p-0" scope="col" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/45">{children}</tbody>
      </table>
    </div>
  );
}

export function DocumentTemplatesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DocumentTemplateKind>('PACKING_LIST');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<PackingListLayout | null>(null);
  const [previewPoId, setPreviewPoId] = useState('');
  const [previewPoSearch, setPreviewPoSearch] = useState('');
  const debouncedPreviewPoQ = useDebounce(previewPoSearch.trim(), 300);
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
    setPreviewPoId('');
    setPreviewPoSearch('');
  }, [selectedId]);

  const { data: catalog } = useQuery({
    queryKey: ['org', 'document-templates', 'mappable-fields'],
    queryFn: getDocumentTemplateMappableFields,
  });

  const catalogMerged = useMemo(() => mergeCatalogWithStaticPresets(catalog), [catalog]);
  const headerMappableOptions = useMemo(
    () => catalogPathOptions(catalogMerged).filter((o) => !o.path.startsWith('line.')),
    [catalogMerged]
  );
  const lineMappableOptions = useMemo(
    () => catalogPathOptions(catalogMerged).filter((o) => o.path.startsWith('line.')),
    [catalogMerged]
  );

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

  const {
    data: poList,
    isLoading: poListLoading,
    isFetching: poListFetching,
    refetch: refetchPoList,
  } = useQuery({
    queryKey: ['org', 'pos', 'template-preview-picker', debouncedPreviewPoQ],
    queryFn: () => getOrgPOs({ pageSize: 500, q: debouncedPreviewPoQ || undefined }),
    enabled: !!selectedId,
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

  const downloadPreviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No template');
      if (!layoutDraft) throw new Error('No layout');
      const po = previewPoId.trim();
      if (!po) throw new Error('Choose or enter a purchase order.');
      if (layoutDirty) {
        await saveLayoutMutation.mutateAsync();
        await queryClient.refetchQueries({ queryKey: ['org', 'document-templates', selectedId] });
      }
      return previewDocumentTemplate(selectedId, po);
    },
    onSuccess: ({ blob, filename }) => {
      const name =
        filename ??
        (detail?.masterFormat === 'CSV' || structure?.format === 'CSV'
          ? 'template-preview.csv'
          : 'template-preview.xlsx');
      triggerDownloadFile(blob, name);
      toast({ title: 'File downloaded', description: 'Template preview for the selected purchase order.' });
    },
    onError: (e: Error) => toast({ title: 'Preview download failed', description: e.message, variant: 'destructive' }),
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
  const canActivate = hasFile && hasSavedLayoutOnServer && !layoutDirty && selectedRow?.status !== 'ACTIVE';
  const canDownloadPreview =
    hasFile && !!layoutDraft && !!previewPoId.trim() && !downloadPreviewMutation.isPending && !saveLayoutMutation.isPending;

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

                    <TabsContent value="layout" className="mt-0 space-y-5 focus-visible:ring-0">
                      {isCsv && (
                        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          <strong className="text-foreground">CSV mapping:</strong> use <code className="text-[11px]">R1C1</code> for header and
                          totals (row and column are 1-based). Line columns still use letters (<code className="text-[11px]">A</code>,{' '}
                          <code className="text-[11px]">B</code>, …).
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
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

                      <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium leading-tight">Header &amp; static body</h4>
                            <p className="text-[11px] text-muted-foreground">
                              Organization, purchase order, vendor — maps to single cells (not repeating line fields). All catalog fields listed
                              below.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              const nextPath = nextUnmappedCatalogPath(layoutDraft.headerMap, catalog, false);
                              if (!nextPath) {
                                toast({
                                  title: 'No fields left to add',
                                  description:
                                    'Every field from the catalog is already mapped, or the list is empty. Remove a row or use a custom path below.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              updateLayout({ headerMap: { ...layoutDraft.headerMap, [nextPath]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                        <details className="rounded-md border border-border/40 bg-muted/15 text-xs text-muted-foreground open:bg-muted/25">
                          <summary className="cursor-pointer list-none px-2 py-1.5 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                            Path rules: organization / purchase order / vendor (not line.*)
                          </summary>
                          <div className="space-y-1.5 border-t border-border/40 px-2 py-2 leading-relaxed">
                            <p>
                              The catalog comes from <code className="text-[11px]">GET …/mappable-fields</code> (NetSuite keys, record cache, field
                              config). Custom path examples: <code className="text-[11px]">purchaseOrder.netsuiteFields.&lt;key&gt;</code>,{' '}
                              <code className="text-[11px]">vendor.netsuiteFields.&lt;key&gt;</code>,{' '}
                              <code className="text-[11px]">purchaseOrder.summary.&lt;subKey&gt;</code> (segments: letters, digits,{' '}
                              <code className="text-[11px]">_</code>, <code className="text-[11px]">.</code>, <code className="text-[11px]">-</code>
                              ).
                            </p>
                          </div>
                        </details>
                        {headerRows.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">No mappings yet. Add a row to map portal fields to template cells.</p>
                        ) : (
                          <MappingFieldTable
                            keyLabel="Portal data path"
                            valueLabel={isCsv ? 'R/C' : 'Cell'}
                          >
                            {headerRows.map(([path, cellRef], index) => (
                              <tr key={`${path}-${index}`} className="align-top">
                                <td className="min-w-0 px-2 py-1.5">
                                  <div className="space-y-1">
                                    <MappablePathCombobox
                                      options={headerMappableOptions}
                                      value={path}
                                      onPick={(p) => {
                                        const next = { ...layoutDraft.headerMap };
                                        delete next[path];
                                        next[p] = cellRef;
                                        updateLayout({ headerMap: next });
                                      }}
                                      placeholder="Search org / PO / vendor fields…"
                                    />
                                    <Input
                                      className="h-8 font-mono text-xs"
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
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    className="h-8 font-mono text-sm"
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
                                </td>
                                <td className="px-1 py-1 align-top">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      const next = { ...layoutDraft.headerMap };
                                      delete next[path];
                                      updateLayout({ headerMap: next });
                                    }}
                                    aria-label="Remove row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </MappingFieldTable>
                        )}
                      </div>

                      <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium leading-tight">Line item columns</h4>
                            <p className="text-[11px] text-muted-foreground">
                              Repeating row fields (<code className="text-[11px]">line.*</code>) → one column each. All line catalog fields are listed
                              when you search.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              const nextPath = nextUnmappedCatalogPath(layoutDraft.itemsColMap, catalog, true);
                              if (!nextPath) {
                                toast({
                                  title: 'No line fields left to add',
                                  description:
                                    'Every line field from the catalog is already mapped, or the list is empty. Remove a row or use a custom path below.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              updateLayout({ itemsColMap: { ...layoutDraft.itemsColMap, [nextPath]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                        <details className="rounded-md border border-border/40 bg-muted/15 text-xs text-muted-foreground open:bg-muted/25">
                          <summary className="cursor-pointer list-none px-2 py-1.5 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                            Line paths: line.* and line.netsuiteFields.&lt;key&gt;
                          </summary>
                          <p className="border-t border-border/40 px-2 py-2 leading-relaxed">
                            Each line field maps to a column letter ({' '}
                            <code className="text-[11px]">A</code>, <code className="text-[11px]">B</code>, …) on the first line row set above.
                          </p>
                        </details>
                        {lineRows.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">No line columns yet.</p>
                        ) : (
                          <MappingFieldTable keyLabel="Line data path" valueLabel="Col">
                            {lineRows.map(([path, col], index) => (
                              <tr key={`${path}-${index}`} className="align-top">
                                <td className="min-w-0 px-2 py-1.5">
                                  <div className="space-y-1">
                                    <MappablePathCombobox
                                      options={lineMappableOptions}
                                      value={path}
                                      onPick={(p) => {
                                        const next = { ...layoutDraft.itemsColMap };
                                        delete next[path];
                                        next[p] = col;
                                        updateLayout({ itemsColMap: next });
                                      }}
                                      placeholder="Search line fields…"
                                    />
                                    <Input
                                      className="h-8 font-mono text-xs"
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
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    className="h-8 font-mono text-sm"
                                    value={col}
                                    onChange={(e) => {
                                      const next = { ...layoutDraft.itemsColMap };
                                      next[path] = e.target.value.toUpperCase();
                                      updateLayout({ itemsColMap: next });
                                    }}
                                    placeholder="A"
                                  />
                                </td>
                                <td className="px-1 py-1 align-top">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      const next = { ...layoutDraft.itemsColMap };
                                      delete next[path];
                                      updateLayout({ itemsColMap: next });
                                    }}
                                    aria-label="Remove row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </MappingFieldTable>
                        )}
                      </div>

                      <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <div>
                          <h4 className="text-sm font-medium leading-tight">Totals (footer / summary row)</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Optional. System totals (from line items) — map each to a cell, often the sheet footer. All available totals are
                            listed.
                          </p>
                        </div>
                        <MappingFieldTable
                          keyLabel="Total"
                          valueLabel={isCsv ? 'R/C' : 'Cell'}
                          showActionColumn={false}
                        >
                          {PACKING_LIST_TOTAL_KEYS.map((key) => (
                            <tr key={key} className="align-top">
                              <td className="px-2.5 py-1.5 text-sm text-foreground">{packingListTotalLabel(key)}</td>
                              <td className="px-2.5 py-1.5">
                                <Input
                                  className="h-8 font-mono text-sm"
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
                              </td>
                            </tr>
                          ))}
                        </MappingFieldTable>
                      </div>

                      <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium leading-tight">Static text (headers, footers, labels)</h4>
                            <p className="text-[11px] text-muted-foreground">Fixed text in any cell — not portal data. Use for column titles, footers, notes.</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              const nextRef = isCsv
                                ? nextStaticR1C1Ref(layoutDraft.staticCells ?? {})
                                : nextStaticRef(layoutDraft.staticCells ?? {});
                              updateLayout({ staticCells: { ...(layoutDraft.staticCells ?? {}), [nextRef]: '' } });
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                        {staticEntries.length === 0 ? (
                          <p className="py-1 text-sm text-muted-foreground">None — add a row for labels or other fixed text.</p>
                        ) : (
                          <MappingFieldTable
                            keyLabel={isCsv ? 'R/C' : 'Cell'}
                            valueLabel="Text"
                          >
                            {staticEntries.map(([ref, val], index) => (
                              <tr key={`${ref}-${index}`} className="align-top">
                                <td className="min-w-0 px-2 py-1.5">
                                  <Input
                                    className="h-8 font-mono text-sm"
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
                                </td>
                                <td className="min-w-0 px-2 py-1.5">
                                  <Input
                                    className="h-8 text-sm"
                                    value={val}
                                    onChange={(e) => {
                                      const next = { ...(layoutDraft.staticCells ?? {}) };
                                      next[ref] = e.target.value;
                                      updateLayout({ staticCells: next });
                                    }}
                                  />
                                </td>
                                <td className="px-1 py-1 align-top">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      const next = { ...(layoutDraft.staticCells ?? {}) };
                                      delete next[ref];
                                      updateLayout({ staticCells: Object.keys(next).length ? next : undefined });
                                    }}
                                    aria-label="Remove row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </MappingFieldTable>
                        )}
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
                        <h4 className="text-sm font-medium">Preview with a real purchase order</h4>
                        <p className="text-xs text-muted-foreground">
                          Search and select a PO (or paste its id). The server builds a filled {isCsv ? 'CSV' : 'workbook'} using this template. If
                          the layout has unsaved changes, it is saved first, then the file is generated and downloaded.
                        </p>
                        {layoutDirty && (
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            You have unsaved layout changes — clicking download will save them, then create the preview.
                          </p>
                        )}
                        <div className="max-w-2xl space-y-4">
                          <TemplatePreviewPoPicker
                            pos={poOptions}
                            value={previewPoId}
                            onChange={setPreviewPoId}
                            search={previewPoSearch}
                            onSearchChange={setPreviewPoSearch}
                            loading={poListLoading}
                            refreshing={poListFetching}
                            onRefresh={() => void refetchPoList()}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="preview-po-id">Or paste purchase order id</Label>
                            <Input
                              id="preview-po-id"
                              value={previewPoId}
                              onChange={(e) => setPreviewPoId(e.target.value)}
                              placeholder="24-character PO id (same as in the URL on PO detail)"
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              disabled={!canDownloadPreview}
                              onClick={() => downloadPreviewMutation.mutate()}
                            >
                              {downloadPreviewMutation.isPending || saveLayoutMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Download filled file
                            </Button>
                            {poListFetching && !poListLoading && (
                              <span className="text-xs text-muted-foreground">Updating list…</span>
                            )}
                          </div>
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


import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileUp, Loader2, ShieldQuestion } from 'lucide-react';
import {
  downloadOrgPOTemplate,
  uploadOrgPODocuments,
  validateOrgPODocuments,
} from '../api/orgPoDocuments.api';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  poLabel?: string;
  onUploaded: () => void;
};

/** Single-line-ish file picker for CSV / PDF row. */
function MiniFileSlot({
  id,
  label,
  accept,
  file,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <label
        className={cn(
          'flex min-h-[40px] cursor-pointer items-center truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50',
          disabled && 'pointer-events-none opacity-50',
          file && 'border-primary/40 bg-primary/5 text-foreground'
        )}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <span className="truncate">{file ? file.name : 'Choose file…'}</span>
      </label>
    </div>
  );
}

export function OrgPoUploadSheet({ open, onOpenChange, poId, poLabel, onUploaded }: Props) {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pl, setPl] = useState<File | null>(null);
  const [ci, setCi] = useState<File | null>(null);
  const [coo, setCoo] = useState<File | null>(null);

  const [dlPl, setDlPl] = useState(false);
  const [dlCi, setDlCi] = useState(false);

  const fileList = useMemo(() => {
    const rows: { file: File; type: 'pl' | 'ci' | 'coo' }[] = [];
    if (pl) rows.push({ file: pl, type: 'pl' });
    if (ci) rows.push({ file: ci, type: 'ci' });
    if (coo) rows.push({ file: coo, type: 'coo' });
    return rows;
  }, [pl, ci, coo]);

  const validateMut = useMutation({
    mutationFn: () => {
      const list =
        [{ f: pl, t: 'pl' as const }, { f: ci, t: 'ci' as const }, { f: coo, t: 'coo' as const }]
          .filter((x): x is { f: File; t: 'pl' | 'ci' | 'coo' } => !!x.f)
          .map((x) => ({ file: x.f, type: x.t }));
      if (!list.length) throw new Error('Choose at least one file');
      return validateOrgPODocuments(poId, list);
    },
    onSuccess: (r) => {
      if (r.success) {
        toast({ title: 'Validation OK', description: 'You can submit when ready.' });
      } else {
        toast({
          title: 'Validation issues',
          description: r.errors?.join(' · ') ?? 'Adjust files and retry.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => toast({ title: 'Validate failed', description: e.message, variant: 'destructive' }),
  });

  const uploadMut = useMutation({
    mutationFn: () => uploadOrgPODocuments(poId, fileList),
    onSuccess: (r) => {
      const ns = r.netsuiteDocumentPush?.status;
      if (r.success) {
        toast({
          title: 'Uploaded',
          description:
            ns === 'PENDING'
              ? 'NetSuite sync is running.'
              : ns === 'SENT'
                ? 'Delivered to NetSuite.'
                : 'Documents submitted for this PO.',
        });
        setPl(null);
        setCi(null);
        setCoo(null);
        onUploaded();
        onOpenChange(false);
      } else {
        toast({
          title: 'Upload not completed',
          description: r.errors?.join(', ') ?? 'Review files and tolerance rules.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const handleValidate = () => {
    if (fileList.length === 0) {
      toast({ title: 'Choose files first', variant: 'destructive' });
      return;
    }
    validateMut.mutate();
  };

  const handleUpload = () => {
    if (fileList.length === 0) {
      toast({ title: 'Choose files first', variant: 'destructive' });
      return;
    }
    uploadMut.mutate();
  };

  const busy = validateMut.isPending || uploadMut.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border/60 px-6 pb-4 pt-6 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0 space-y-1">
                <SheetTitle>Upload packing list & invoice</SheetTitle>
                <SheetDescription>
                  Packing list (PL) and commercial invoice (CI) as CSV templates; certificate of origin (COO) as PDF.
                  {poLabel ? (
                    <>
                      {' '}
                      <span className="font-medium text-foreground">PO {poLabel}</span>
                    </>
                  ) : null}
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-lg"
                onClick={() => setHelpOpen(true)}
                aria-label="API routes"
              >
                <ShieldQuestion className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Templates</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={dlPl || busy}
                  onClick={() => {
                    void (async () => {
                      setDlPl(true);
                      try {
                        await downloadOrgPOTemplate(poId, 'pl');
                      } catch (e) {
                        toast({
                          title: 'Download failed',
                          description: (e as Error).message ?? 'Ensure GET /org/pos/:id/templates/pl.csv is enabled.',
                          variant: 'destructive',
                        });
                      } finally {
                        setDlPl(false);
                      }
                    })();
                  }}
                >
                  {dlPl ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                  PL CSV
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={dlCi || busy}
                  onClick={() => {
                    void (async () => {
                      setDlCi(true);
                      try {
                        await downloadOrgPOTemplate(poId, 'ci');
                      } catch (e) {
                        toast({
                          title: 'Download failed',
                          description: (e as Error).message ?? 'Ensure GET /org/pos/:id/templates/ci.csv is enabled.',
                          variant: 'destructive',
                        });
                      } finally {
                        setDlCi(false);
                      }
                    })();
                  }}
                >
                  {dlCi ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                  CI CSV
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files to upload</p>
              <div className="grid gap-4 sm:grid-cols-1">
                <MiniFileSlot id={`org-sheet-upload-pl-${poId}`} label="Packing list (PL)" accept=".csv,text/csv" file={pl} onChange={setPl} disabled={busy} />
                <MiniFileSlot
                  id={`org-sheet-upload-ci-${poId}`}
                  label="Commercial invoice (CI)"
                  accept=".csv,text/csv"
                  file={ci}
                  onChange={setCi}
                  disabled={busy}
                />
                <MiniFileSlot id={`org-sheet-upload-coo-${poId}`} label="Certificate of origin (COO)" accept="application/pdf" file={coo} onChange={setCoo} disabled={busy} />
              </div>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" disabled={busy} onClick={handleValidate}>
                {validateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Validate
              </Button>
              <Button type="button" disabled={busy} onClick={handleUpload}>
                {uploadMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="mr-2 h-4 w-4" aria-hidden />}
                Submit uploads
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Org uploads for this PO</DialogTitle>
            <DialogDescription>
              The frontend calls the same endpoints as vendors, prefixed with{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/org/pos/</code>:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <code className="text-xs">GET …/templates/pl.csv</code> and <code className="text-xs">ci.csv</code>
            </li>
            <li>
              <code className="text-xs">POST …/uploads?type=PL|CI|COO</code>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">Authorize org admins in df-vendor; behavior matches POST /vendor/pos/:id/uploads.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

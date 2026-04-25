import { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVendorPODetail,
  uploadDocuments,
  validateUploadDocuments,
  downloadPLTemplate,
  downloadCITemplate,
} from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { UploadDropzone, type UploadFileType } from '../components/UploadDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/modules/common/constants/routes';
import { VendorPoBackLink } from '../components/VendorPoBackLink';
import { useToast } from '@/components/ui/use-toast';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { getVendorDocumentUploadAccess } from '@/modules/common/utils/vendorPoDocumentUploadAccess';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { Download, FileText, Loader2, Upload, ArrowRight } from 'lucide-react';
import { backToState } from '@/modules/common/utils/navigationState';
import { ApiError } from '@/services/http/client';
import type { UploadValidationResult } from '../types';

type FileState = { pl: File | null; ci: File | null; coo: File | null };

function parseMismatchDetailsFromError(e: unknown): { mismatches?: unknown } | undefined {
  if (!(e instanceof ApiError) || !e.body) return undefined;
  try {
    const j = JSON.parse(e.body) as { error?: { details?: { mismatches?: unknown } } };
    return j?.error?.details;
  } catch {
    return undefined;
  }
}

export function UploadPage() {
  const { poId } = useParams<{ poId: string }>();
  const location = useLocation();
  const listBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileState>({ pl: null, ci: null, coo: null });
  const [uploadProgress, setUploadProgress] = useState(false);
  const [validateProgress, setValidateProgress] = useState(false);
  const [templateLoading, setTemplateLoading] = useState<'pl' | 'ci' | null>(null);
  const [validationResult, setValidationResult] = useState<UploadValidationResult | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<UploadValidationResult | null>(null);

  const pathIsPortalPoId = !!(poId && isMongoObjectIdString(poId));

  const { data: po, isLoading: poLoading } = useQuery({
    queryKey: ['vendor', 'po', poId],
    queryFn: () => getVendorPODetail(poId!),
    enabled: !!poId && pathIsPortalPoId,
  });

  const docAccess = useMemo(() => {
    if (po == null) {
      return { allowed: true as const, reason: undefined as string | undefined };
    }
    return getVendorDocumentUploadAccess(po);
  }, [po]);

  const blockSubmit = po?.uploadRules?.blockSubmitOnQtyToleranceExceeded !== false;

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setSubmitErrorDetails(null);
  }, []);

  const setFile = useCallback(
    (type: keyof FileState, file: File | null) => {
      setFiles((prev) => ({ ...prev, [type]: file }));
      resetValidation();
    },
    [resetValidation]
  );

  const validateMutation = useMutation({
    mutationFn: async () => {
      const list: { file: File; type: 'pl' | 'ci' | 'coo' }[] = [];
      if (files.pl) list.push({ file: files.pl, type: 'pl' });
      if (files.ci) list.push({ file: files.ci, type: 'ci' });
      if (files.coo) list.push({ file: files.coo, type: 'coo' });
      if (list.length === 0) throw new Error('Select at least one file');
      return validateUploadDocuments(poId!, list);
    },
    onMutate: () => setValidateProgress(true),
    onSettled: () => setValidateProgress(false),
    onSuccess: (result) => {
      setValidationResult(result);
      setSubmitErrorDetails(null);
    },
    onError: (e: Error) => {
      toast({ title: 'Validation failed', description: e.message, variant: 'destructive' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const list: { file: File; type: 'pl' | 'ci' | 'coo' }[] = [];
      if (files.pl) list.push({ file: files.pl, type: 'pl' });
      if (files.ci) list.push({ file: files.ci, type: 'ci' });
      if (files.coo) list.push({ file: files.coo, type: 'coo' });
      if (list.length === 0) return Promise.reject(new Error('Select at least one file'));
      return uploadDocuments(poId!, list);
    },
    onMutate: () => setUploadProgress(true),
    onSettled: () => setUploadProgress(false),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'uploads'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'po', poId] });
      if (result.success) {
        const ns = result.netsuiteDocumentPush;
        let description = result.uploadId ? 'Documents received.' : undefined;
        if (ns?.status === 'PENDING') {
          description = [description, 'Sending vendor file(s) to NetSuite in the background…']
            .filter(Boolean)
            .join(' ');
        } else if (ns?.status === 'SENT') {
          description = [description, 'Vendor file(s) synced to NetSuite.'].filter(Boolean).join(' ');
        } else if (ns?.status === 'FAILED' && ns.message) {
          description = [description, `NetSuite: ${ns.message}`].filter(Boolean).join(' ');
        } else if (ns?.status === 'SKIPPED' && ns.message) {
          description = [description, ns.message].filter(Boolean).join(' ');
        }
        toast({ title: 'Upload successful', description });
        setFiles({ pl: null, ci: null, coo: null });
        setValidationResult(null);
        setSubmitErrorDetails(null);
      } else {
        toast({
          title: 'Validation issues',
          description: result.errors?.join(', '),
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      const details = parseMismatchDetailsFromError(e);
      if (details?.mismatches) {
        setSubmitErrorDetails({
          success: false,
          mismatches: details.mismatches as UploadValidationResult['mismatches'],
          errors: [e.message],
        });
      }
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    },
  });

  const hasAny = files.pl || files.ci || files.coo;

  const canSubmit = useMemo(() => {
    if (!validationResult) return false;
    if (validationResult.success) return true;
    const errs = validationResult.errors ?? [];
    const ms = validationResult.mismatches ?? [];
    if (errs.length > 0 && ms.length === 0) return false;
    if (!blockSubmit && ms.length > 0) return true;
    return false;
  }, [validationResult, blockSubmit]);

  const handleContinue = () => validateMutation.mutate();
  const handleSubmit = () => uploadMutation.mutate();

  if (!poId) return null;

  if (!pathIsPortalPoId) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <EmptyState
          icon={FileText}
          title="This link is not valid for upload"
          description="Open the order from PO search, then upload from there."
          action={
            <Button asChild>
              <Link to={ROUTES.VENDOR.PO_SEARCH}>Open PO search</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (poLoading) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <div className="flex min-h-[160px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <EmptyState
          icon={FileText}
          title="Purchase order not found"
          description="This PO may not exist or you may not have access."
        />
      </div>
    );
  }

  if (!docAccess.allowed) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <PageHeader
          title="Upload documents"
          description={po ? `PO: ${po.poNumber}` : undefined}
          actions={
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={ROUTES.VENDOR.PO_DETAIL(poId!)} state={listBack}>
                <FileText className="h-4 w-4" />
                View PO
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={FileText}
          title="Uploads are not available for this order"
          description={
            docAccess.reason ?? 'Your buyer has restricted further submissions for this purchase order.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VendorPoBackLink />
      <PageHeader
        title={`Upload documents`}
        description={po ? `PO: ${po.poNumber}` : undefined}
        actions={
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to={ROUTES.VENDOR.PO_DETAIL(poId)} state={listBack}>
              <FileText className="h-4 w-4" />
              View PO
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Packing list and commercial invoice templates.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            disabled={!!templateLoading}
            onClick={async () => {
              setTemplateLoading('pl');
              try {
                await downloadPLTemplate(poId);
              } catch {
                toast({ title: 'Download failed', variant: 'destructive' });
              } finally {
                setTemplateLoading(null);
              }
            }}
          >
            {templateLoading === 'pl' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Packing list
          </Button>
          <Button
            variant="outline"
            disabled={!!templateLoading}
            onClick={async () => {
              setTemplateLoading('ci');
              try {
                await downloadCITemplate(poId);
              } catch {
                toast({ title: 'Download failed', variant: 'destructive' });
              } finally {
                setTemplateLoading(null);
              }
            }}
          >
            {templateLoading === 'ci' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Commercial invoice
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload documents</CardTitle>
          <CardDescription>
            Add files, then <strong>Continue</strong> to validate. <strong>Submit</strong> to send.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['pl', 'ci', 'coo'] as const).map((type) => (
            <UploadDropzone
              key={type}
              type={type as UploadFileType}
              value={files[type]}
              onChange={(file) => setFile(type, file)}
              disabled={uploadProgress || validateProgress}
            />
          ))}

          {po.uploadRules && (
            <p className="text-xs text-muted-foreground">
              Buyer tolerance: packing list ±{po.uploadRules.packingListQtyTolerancePct}%, commercial invoice ±
              {po.uploadRules.commercialInvoiceQtyTolerancePct}%.
              {blockSubmit
                ? ' Quantities outside this range must be corrected before submit.'
                : ' You may still submit after Continue when warnings appear.'}
            </p>
          )}

          {(validationResult || submitErrorDetails) && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              {validationResult?.success && (
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Quantity checks passed for the selected files. You can submit when ready.
                </p>
              )}
              {validationResult && !validationResult.success && (
                <div
                  className={
                    validationResult.errors?.length || validationResult.mismatches?.length
                      ? 'text-destructive'
                      : 'text-foreground'
                  }
                >
                  <p className="font-medium">Validation results</p>
                  {validationResult.errors?.map((e) => (
                    <p key={e} className="mt-1 text-xs">
                      {e}
                    </p>
                  ))}
                  {validationResult.warnings?.map((w) => (
                    <p key={w} className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      {w}
                    </p>
                  ))}
                </div>
              )}
              {(validationResult?.mismatches?.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <p className="mb-2 font-medium text-foreground">Quantity mismatches (line vs PO)</p>
                  <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 pr-2 font-medium">Doc</th>
                        <th className="py-1 pr-2 font-medium">Line</th>
                        <th className="py-1 pr-2 font-medium">SKU</th>
                        <th className="py-1 pr-2 font-medium">Ordered</th>
                        <th className="py-1 pr-2 font-medium">Reported</th>
                        <th className="py-1 pr-2 font-medium">Deviation %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult!.mismatches!.map((m, i) => (
                        <tr key={`${m.lineNo}-${i}`} className="border-b border-border/60">
                          <td className="py-1 pr-2 font-mono text-[10px] text-muted-foreground">
                            {m.docType === 'ci' ? 'CI' : m.docType === 'pl' ? 'PL' : '—'}
                          </td>
                          <td className="py-1 pr-2">{m.lineNo}</td>
                          <td className="py-1 pr-2">{m.sku ?? '—'}</td>
                          <td className="py-1 pr-2">{m.orderedQty}</td>
                          <td className="py-1 pr-2">{m.packedQty ?? m.shippedQty ?? '—'}</td>
                          <td className="py-1 pr-2">{m.deviationPct != null ? `${m.deviationPct}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(submitErrorDetails?.mismatches?.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <p className="mb-2 font-medium text-destructive">Server blocked submit (quantity tolerance)</p>
                  <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 pr-2 font-medium">Line</th>
                        <th className="py-1 pr-2 font-medium">Ordered</th>
                        <th className="py-1 pr-2 font-medium">Reported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submitErrorDetails!.mismatches!.map((m, i) => (
                        <tr key={`srv-${i}`} className="border-b border-border/60">
                          <td className="py-1 pr-2">{m.lineNo}</td>
                          <td className="py-1 pr-2">{m.orderedQty}</td>
                          <td className="py-1 pr-2">{m.packedQty ?? m.shippedQty ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Adjust the files and run Continue again before Submit.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleContinue}
              disabled={!hasAny || uploadProgress || validateProgress}
            >
              {validateProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasAny || !canSubmit || uploadProgress || validateProgress}
            >
              {uploadProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Submit stays disabled until you run Continue. If your buyer blocks over-tolerance quantities, fix CSV
            quantities and Continue again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

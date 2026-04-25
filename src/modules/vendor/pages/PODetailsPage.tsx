import { useParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVendorPODetail, downloadPLTemplate, downloadCITemplate } from '../api/vendor.api';
import { downloadOrgFile } from '@/modules/org/api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { EmptyState } from '@/modules/common/components/EmptyState';
import { KeyValueFields } from '@/modules/common/components/KeyValueFields';
import { PoLineItemsSection } from '@/modules/common/components/PoLineItemsSection';
import { NetSuiteDocumentPushStatus } from '@/modules/common/components/NetSuiteDocumentPushStatus';
import { Download, FileText, ListOrdered, Loader2, PackageOpen, Paperclip, Upload } from 'lucide-react';
import { VendorPoBackLink } from '../components/VendorPoBackLink';
import { isMongoObjectIdString } from '@/modules/common/utils/mongoId';
import { useToast } from '@/components/ui/use-toast';
import { getVendorDocumentUploadAccess } from '@/modules/common/utils/vendorPoDocumentUploadAccess';
import { cn } from '@/lib/utils';

export function PODetailsPage() {
  const { toast } = useToast();
  const { poId } = useParams<{ poId: string }>();
  const [templateLoading, setTemplateLoading] = useState<'pl' | 'ci' | null>(null);

  const validPortalId = !!(poId && isMongoObjectIdString(poId));

  const { data: po, isLoading, isError, error } = useQuery({
    queryKey: ['vendor', 'po', poId],
    queryFn: () => getVendorPODetail(poId!),
    enabled: !!poId && validPortalId,
    retry: false,
    refetchInterval: (q) => {
      const uploads = q.state.data?.uploads;
      const pending = uploads?.some((u) => u.netsuiteDocumentPush?.status === 'PENDING');
      return pending ? 5000 : false;
    },
  });

  if (!poId) return null;

  if (!validPortalId) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <EmptyState
          icon={PackageOpen}
          title="Invalid purchase order link"
          description="Open this order from PO search."
          className="my-4"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="space-y-4">
        <VendorPoBackLink />
        <EmptyState
          icon={FileText}
          title="Could not load this PO"
          description={(error as Error)?.message ?? 'Use PO search to open an order.'}
          className="border-destructive/20 bg-destructive/5"
        />
      </div>
    );
  }

  const items = po.items ?? [];
  const uploads = po.uploads ?? [];
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const docAccess = useMemo(() => getVendorDocumentUploadAccess(po), [po]);

  const poHeaderMeta = (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm md:p-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{formatDateTime(po.createdAt)}</dd>
        </div>
        {po.updatedAt && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Updated</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{formatDateTime(po.updatedAt)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{po.status}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{po.vendorName ?? po.vendorId}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ship to</dt>
          <dd className="mt-1 text-sm font-medium leading-relaxed text-foreground">
            {po.shipTo && po.shipTo.trim() !== '' ? po.shipTo : '—'}
          </dd>
        </div>
        {po.requiredDocs?.length ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required documents</dt>
            <dd className="mt-1 text-sm text-foreground">{po.requiredDocs.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
      {po.summary && Object.keys(po.summary).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
          <KeyValueFields data={po.summary} dense />
        </div>
      )}
      {po.netsuiteFields && Object.keys(po.netsuiteFields).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            NetSuite — purchase order header
          </p>
          <KeyValueFields data={po.netsuiteFields} dense />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <VendorPoBackLink />
      <PageHeader
        eyebrow="Purchase order"
        title={po.poNumber}
        description={poHeaderMeta}
        actions={
          docAccess.allowed ? (
            <Button asChild>
              <Link to={ROUTES.VENDOR.UPLOAD(po.id)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload documents
              </Link>
            </Button>
          ) : (
            <p
              className={cn(
                'max-w-md text-right text-sm text-muted-foreground',
                'border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-left dark:border-amber-900/50 dark:bg-amber-950/30'
              )}
              title={docAccess.reason}
            >
              {docAccess.reason}
            </p>
          )
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Download templates</CardTitle>
          <CardDescription>Download packing list and commercial invoice templates for this order (CSV or Excel).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!templateLoading}
            onClick={async () => {
              setTemplateLoading('pl');
              try {
                await downloadPLTemplate(po.id);
              } catch {
                toast({ title: 'Download failed', description: 'Could not download packing list template.', variant: 'destructive' });
              } finally {
                setTemplateLoading(null);
              }
            }}
          >
            {templateLoading === 'pl' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Packing list
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!templateLoading}
            onClick={async () => {
              setTemplateLoading('ci');
              try {
                await downloadCITemplate(po.id);
              } catch {
                toast({
                  title: 'Download failed',
                  description: 'Could not download commercial invoice template.',
                  variant: 'destructive',
                });
              } finally {
                setTemplateLoading(null);
              }
            }}
          >
            {templateLoading === 'ci' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Commercial invoice
          </Button>
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-5 w-5" />
              Your uploads
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Submission status and NetSuite vendor file upload (when your buyer connects NetSuite).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3">Document</th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                    <th className="whitespace-nowrap px-4 py-3">NetSuite</th>
                    <th className="whitespace-nowrap px-4 py-3">Uploaded</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 last:border-0">
                      <td className="max-w-[14rem] px-4 py-3 align-top">
                        <p className="truncate font-medium text-foreground" title={u.fileName}>
                          {u.fileName ?? '—'}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {u.type ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{u.type}</span>
                          ) : null}
                          {u.fileFormat ? (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[11px]">{u.fileFormat}</span>
                          ) : null}
                          {u.version != null ? (
                            <span className="text-[11px] text-muted-foreground">v{u.version}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {u.status}
                        </span>
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 align-top">
                        {u.netsuiteDocumentPush?.status ? (
                          <NetSuiteDocumentPushStatus push={u.netsuiteDocumentPush} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-muted-foreground">
                        {formatDateTime(u.uploadedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                        {u.fileId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={downloadingId === u.id}
                            onClick={async () => {
                              setDownloadingId(u.id);
                              try {
                                await downloadOrgFile(u.fileId!, u.fileName);
                              } catch (err) {
                                toast({
                                  title: 'Download failed',
                                  description: (err as Error).message,
                                  variant: 'destructive',
                                });
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                          >
                            {downloadingId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Download className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListOrdered className="h-5 w-5" />
            Line items
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Select a line item to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PoLineItemsSection
            items={items}
            emptyDescription="No line items yet."
            fieldLabelMap={po.netsuiteLineFieldLabels}
          />
        </CardContent>
      </Card>
    </div>
  );
}

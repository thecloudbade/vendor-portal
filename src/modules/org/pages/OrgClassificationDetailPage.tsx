import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNetSuiteClassification,
  getNetSuiteIntegration,
  postNetSuiteClassificationSync,
} from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { ROUTES } from '@/modules/common/constants/routes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { canManageSettings } from '@/modules/common/constants/roles';
import {
  buildClassificationDisplayRows,
  type ClassificationDisplayRow,
} from '../utils/classificationRecords.model';
import { ClassificationRecordDetail } from '../components/ClassificationRecordFields';

const SETTINGS_CLASSIFICATIONS_HREF = `${ROUTES.ORG.SETTINGS}?tab=classifications`;

export function OrgClassificationDetailPage() {
  const { classificationKey: classificationKeyParam } = useParams<{ classificationKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOrgAdmin = user?.userType === 'org' && canManageSettings(user.role);

  const classificationKey = classificationKeyParam ? decodeURIComponent(classificationKeyParam) : '';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ClassificationDisplayRow | null>(null);

  const { data: nsStatus, isLoading: nsIntegrationLoading } = useQuery({
    queryKey: ['org', 'integrations', 'netsuite'],
    queryFn: () => getNetSuiteIntegration(),
  });
  const configured = nsStatus?.configured === true;

  const detailQuery = useQuery({
    queryKey: ['org', 'integrations', 'netsuite', 'classifications', classificationKey],
    queryFn: () => getNetSuiteClassification(classificationKey),
    enabled: Boolean(classificationKey && configured),
    retry: false,
  });

  const displayRows = useMemo(
    () => (detailQuery.data ? buildClassificationDisplayRows(detailQuery.data) : []),
    [detailQuery.data]
  );

  const syncMutation = useMutation({
    mutationFn: () => postNetSuiteClassificationSync(classificationKey),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['org', 'integrations', 'netsuite', 'classifications', classificationKey],
      });
      queryClient.invalidateQueries({ queryKey: ['org', 'integrations', 'netsuite', 'classifications'] });
      if (res.success) {
        toast({
          title: 'Synced',
          description:
            res.recordCount != null && res.storedRowCount != null
              ? `${res.recordCount} from NetSuite · ${res.storedRowCount} saved`
              : 'Updated from NetSuite.',
        });
      } else {
        toast({
          title: 'Sync completed with errors',
          description: res.errorSnippet ?? 'Check NetSuite response.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });

  function openRow(row: ClassificationDisplayRow) {
    setSelectedRow(row);
    setSheetOpen(true);
  }

  function onSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setSelectedRow(null);
  }

  if (!classificationKey.trim()) {
    navigate(SETTINGS_CLASSIFICATIONS_HREF, { replace: true });
    return null;
  }

  if (nsIntegrationLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Classification list"
          title={classificationKey}
          description="Configure NetSuite integration first, then sync classifications from Settings."
        />
        <Button variant="outline" asChild>
          <Link to={SETTINGS_CLASSIFICATIONS_HREF}>Back to settings</Link>
        </Button>
      </div>
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-2 text-muted-foreground" asChild>
          <Link to={SETTINGS_CLASSIFICATIONS_HREF}>
            <ArrowLeft className="h-4 w-4" />
            Classifications
          </Link>
        </Button>
        {isOrgAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            disabled={syncMutation.isPending || detailQuery.isLoading}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync from NetSuite
          </Button>
        ) : null}
      </div>

      <PageHeader
        eyebrow="Classification list"
        title={classificationKey}
        className="[&_h1]:break-all [&_h1]:font-mono [&_h1]:text-xl [&_h1]:md:text-2xl"
        description={
          detail?.label ? (
            detail.label
          ) : (
            <span className="text-muted-foreground">Synced reference data from NetSuite</span>
          )
        }
      />

      {detail?.storedRecordCount != null && detail.storedRecordCount > 0 ? (
        <p className="-mt-2 text-sm tabular-nums text-muted-foreground">
          {detail.storedRecordCount} row(s) stored for this organization
        </p>
      ) : null}

      {detailQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : detailQuery.isError ? (
        <p className="text-sm text-destructive">{(detailQuery.error as Error).message}</p>
      ) : detail ? (
        <>
          {detail.fetchStatus === 'ERROR' ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {detail.errorSnippet ?? 'Last sync failed; list below may be empty or stale.'}
            </p>
          ) : null}

          <div className="rounded-xl border border-border/80 bg-card">
            <div className="border-b border-border/80 bg-muted/40 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Records</h2>
              <p className="text-xs text-muted-foreground">{displayRows.length} row(s). Select a row to view fields.</p>
            </div>
            <div className="overflow-x-auto">
              {displayRows.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No rows yet. Run sync from this page or Settings, or inspect raw payload below.
                </p>
              ) : (
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border/80 bg-muted/25">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="w-12 px-4 py-3 font-medium">#</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">NetSuite ID</th>
                      <th className="px-4 py-3 font-medium">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, idx) => (
                      <tr
                        key={row.rowKey}
                        role="button"
                        tabIndex={0}
                        onClick={() => openRow(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openRow(row);
                          }
                        }}
                        className={cn(
                          'cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40',
                          sheetOpen && selectedRow?.rowKey === row.rowKey && 'bg-muted/60'
                        )}
                      >
                        <td className="px-4 py-3 align-top tabular-nums text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 align-top font-mono text-xs">{row.netsuiteRecordId}</td>
                        <td className="max-w-xl px-4 py-3 align-top">{row.preview}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <details className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-muted-foreground">Raw payload JSON</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
              {detail.payload != null ? JSON.stringify(detail.payload, null, 2) : '—'}
            </pre>
          </details>
        </>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl"
        >
          <SheetHeader className="shrink-0 border-b border-border/80 px-6 py-5 text-left">
            <SheetTitle className="font-mono text-base leading-snug">
              {selectedRow ? `Record · ${selectedRow.netsuiteRecordId}` : 'Record'}
            </SheetTitle>
            <SheetDescription className="break-all font-mono text-xs">{classificationKey}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {selectedRow ? <ClassificationRecordDetail raw={selectedRow.raw} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

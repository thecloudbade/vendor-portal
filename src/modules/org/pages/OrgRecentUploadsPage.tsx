import { Link, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrgRecentUploads } from '../api/org.api';
import type { OrgRecentUploadItem } from '../types';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { Column } from '@/modules/common/components/DataTable';
import { formatDateTime } from '@/modules/common/utils/format';
import { ROUTES } from '@/modules/common/constants/routes';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload } from 'lucide-react';

const PAGE_SIZE = 20;

export function OrgRecentUploadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseListPageParam(searchParams.get('page'));

  const setPage = (p: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (p <= 1) n.delete('page');
        else n.set('page', String(p));
        return n;
      },
      { replace: true }
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'uploads-recent', { page, pageSize: PAGE_SIZE }],
    queryFn: () => getOrgRecentUploads({ page, pageSize: PAGE_SIZE }),
  });

  const columns = useMemo(
    (): Column<OrgRecentUploadItem>[] => [
      {
        id: 'uploadedAt',
        header: 'Uploaded',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <time dateTime={row.uploadedAt} className="text-sm tabular-nums text-foreground">
            {formatDateTime(row.uploadedAt)}
          </time>
        ),
      },
      {
        id: 'po',
        header: 'PO',
        cell: (row) => (
          <Link
            to={ROUTES.ORG.PO_DETAIL(row.poId)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.poNumber?.trim() || row.poId}
          </Link>
        ),
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: (row) => (
          <span className="max-w-[min(240px,40vw)] truncate" title={row.vendorName ?? row.vendorId}>
            {row.vendorName ?? row.vendorId}
          </span>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        cell: (row) => <span className="text-sm capitalize">{row.type}</span>,
      },
      {
        id: 'fileName',
        header: 'File',
        cell: (row) => (
          <span className="max-w-[min(280px,45vw)] truncate font-mono text-xs" title={row.fileName}>
            {row.fileName}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <span className="text-sm capitalize text-muted-foreground">{row.status}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recent uploads"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.ORG.DASHBOARD} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <DataTable<OrgRecentUploadItem>
        data={data?.items ?? []}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? PAGE_SIZE}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyIcon={Upload}
        emptyTitle="No uploads yet"
        emptyMessage="No uploads yet."
        countLabelSingular="upload"
        countLabelPlural="uploads"
      />
    </div>
  );
}

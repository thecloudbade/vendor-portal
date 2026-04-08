import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorUploads } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { UploadRecord } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Button } from '@/components/ui/button';
import { Package, Upload } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';
import { backToState } from '@/modules/common/utils/navigationState';
import { useMemo } from 'react';

const ALL_PO = '__all__';
const ALL_STATUS = '__all__';

export function UploadHistoryPage() {
  const location = useLocation();
  const listBack = useMemo(() => backToState(location.pathname, location.search), [location.pathname, location.search]);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseListPageParam(searchParams.get('page'));
  const poId = searchParams.get('po') ?? ALL_PO;
  const status = searchParams.get('st') ?? ALL_STATUS;
  const pageSize = 10;

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

  const setPoId = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === ALL_PO) n.delete('po');
        else n.set('po', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const setStatus = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === ALL_STATUS) n.delete('st');
        else n.set('st', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      'vendor',
      'uploads',
      { poId: poId === ALL_PO ? undefined : poId, status: status === ALL_STATUS ? undefined : status, page, pageSize },
    ],
    queryFn: () =>
      getVendorUploads({
        poId: poId === ALL_PO ? undefined : poId,
        page,
        pageSize,
        status: status === ALL_STATUS ? undefined : status,
      }),
  });

  const columns: Column<UploadRecord>[] = [
    {
      id: 'poNumber',
      header: 'PO',
      cell: (row) => (
        <Link to={ROUTES.VENDOR.PO_DETAIL(row.poId)} state={listBack} className="font-medium hover:underline">
          {row.poNumber ?? row.poId}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{row.status}</span>
      ),
    },
    {
      id: 'uploadedAt',
      header: 'Uploaded',
      cell: (row) => formatDateTime(row.uploadedAt),
    },
    {
      id: 'uploadedBy',
      header: 'By',
      cell: (row) => row.uploadedBy ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.VENDOR.UPLOAD(row.poId)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Re-upload
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Upload history" />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={poId} onValueChange={setPoId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All POs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PO}>All POs</SelectItem>
            {/* In real app, options would come from API */}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>All statuses</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<UploadRecord>
        data={data?.data ?? []}
        columns={columns}
        keyExtractor={(row) => (row.id ? row.id : `${row.poId}-${row.uploadedAt}`)}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyIcon={Package}
        emptyTitle="No uploads in your history"
        emptyMessage="After you submit packing lists, invoices, or COO documents, they will be listed here with validation status."
      />
    </div>
  );
}

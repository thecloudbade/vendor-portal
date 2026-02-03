import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorUploads } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { UploadRecord } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UploadHistoryPage() {
  const [poId, setPoId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'uploads', { poId: poId || undefined, status: status || undefined, page, pageSize }],
    queryFn: () =>
      getVendorUploads({
        poId: poId || undefined,
        page,
        pageSize,
      }),
  });

  const columns: Column<UploadRecord>[] = [
    {
      id: 'poNumber',
      header: 'PO',
      cell: (row) => (
        <Link to={ROUTES.VENDOR.PO_DETAIL(row.poId)} className="font-medium hover:underline">
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
          <Link to={ROUTES.VENDOR.UPLOAD(row.poId)}>Re-upload</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload history"
        description="Past uploads with status: received, validated, accepted, rejected"
      />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={poId} onValueChange={setPoId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All POs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All POs</SelectItem>
            {/* In real app, options would come from API */}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
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
        keyExtractor={(row) => row.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No uploads yet"
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorPOs } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { POListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { Search } from 'lucide-react';

export function POSearchPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'pos', { q: debouncedSearch, status, page, pageSize }],
    queryFn: () =>
      getVendorPOs({
        q: debouncedSearch || undefined,
        status: status || undefined,
        page,
        pageSize,
      }),
  });

  const columns: Column<POListItem>[] = [
    {
      id: 'poNumber',
      header: 'PO Number',
      sortKey: 'poNumber',
      cell: (row) => (
        <Link to={ROUTES.VENDOR.PO_DETAIL(row.id)} className="font-medium hover:underline">
          {row.poNumber}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.status}</span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.VENDOR.UPLOAD(row.id)}>Upload</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="PO Search" description="Search by PO number, date range, status" />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<POListItem>
        data={data?.data ?? []}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No POs found"
      />
    </div>
  );
}

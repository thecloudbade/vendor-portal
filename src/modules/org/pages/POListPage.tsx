import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrgPOs, getVendors } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { POListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { Search } from 'lucide-react';

export function POListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 10;

  const { data: posData, isLoading } = useQuery({
    queryKey: ['org', 'pos', { q: debouncedSearch, status, vendorId, page, pageSize }],
    queryFn: () =>
      getOrgPOs({
        q: debouncedSearch || undefined,
        status: status || undefined,
        vendorId: vendorId || undefined,
        page,
        pageSize,
      }),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['org', 'vendors'],
    queryFn: () => getVendors(),
  });

  const vendors = vendorsData?.data ?? [];
  const pos = posData?.data ?? [];

  const columns: Column<POListItem>[] = [
    {
      id: 'poNumber',
      header: 'PO Number',
      cell: (row) => (
        <Link to={ROUTES.ORG.PO_DETAIL(row.id)} className="font-medium hover:underline">
          {row.poNumber}
        </Link>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      cell: (row) => (
        <Link to={ROUTES.ORG.VENDOR_DETAIL(row.vendorId)} className="text-muted-foreground hover:underline">
          {row.vendorName ?? row.vendorId}
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
    { id: 'createdAt', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="POs" description="Purchase orders from ERP integration" />

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
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        data={pos}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={posData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No POs found"
      />
    </div>
  );
}

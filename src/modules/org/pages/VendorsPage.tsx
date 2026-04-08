import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendors } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import { VendorInviteDialog } from '../components/VendorInviteDialog';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { canInviteVendorUsers, canManageVendors } from '@/modules/common/constants/roles';
import type { VendorListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { useDebounce } from '@/modules/common/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Search, UserPlus } from 'lucide-react';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const page = parseListPageParam(searchParams.get('page'));
  const psParam = searchParams.get('ps');
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(psParam)) ? Number(psParam) : 10;
  const category = searchParams.get('cat') ?? '';
  const inactiveRaw = searchParams.get('inactive');
  const inactiveFilter: 'all' | 'active' | 'inactive' =
    inactiveRaw === 'active' || inactiveRaw === 'inactive' ? inactiveRaw : 'all';
  const qFromUrl = searchParams.get('q') ?? '';

  const [searchText, setSearchText] = useState(qFromUrl);
  useEffect(() => {
    setSearchText(qFromUrl);
  }, [qFromUrl]);

  const debouncedQ = useDebounce(searchText.trim(), 300);

  const prevDebouncedQ = useRef<string | null>(null);
  useEffect(() => {
    if (prevDebouncedQ.current === null) {
      prevDebouncedQ.current = debouncedQ;
      return;
    }
    if (prevDebouncedQ.current === debouncedQ) return;
    prevDebouncedQ.current = debouncedQ;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (debouncedQ) n.set('q', debouncedQ);
        else n.delete('q');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  }, [debouncedQ, setSearchParams]);

  const setCategoryParam = (v: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v.trim()) n.set('cat', v.trim());
        else n.delete('cat');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const setInactiveParam = (v: 'all' | 'active' | 'inactive') => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (v === 'all') n.delete('inactive');
        else n.set('inactive', v);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  const setPageSizeParam = (n: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (n === 10) next.delete('ps');
        else next.set('ps', String(n));
        next.set('page', '1');
        return next;
      },
      { replace: true }
    );
  };

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
    queryKey: ['org', 'vendors', { q: debouncedQ, category: category || undefined, inactive: inactiveFilter }],
    queryFn: () =>
      getVendors({
        q: debouncedQ || undefined,
        category: category.trim() || undefined,
        inactive: inactiveFilter === 'all' ? undefined : inactiveFilter === 'inactive',
      }),
  });

  const allVendors = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageStart = (page - 1) * pageSize;
  const paginatedVendors = allVendors.slice(pageStart, pageStart + pageSize);

  const columns: Column<VendorListItem>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => (
        <Link to={ROUTES.ORG.VENDOR_DETAIL(row.id)} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { id: 'vendorCode', header: 'Code', cell: (row) => row.vendorCode ?? '—' },
    { id: 'category', header: 'Category', cell: (row) => row.category ?? '—' },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {row.inactive ? 'Inactive' : row.status || 'Active'}
        </span>
      ),
    },
    { id: 'createdAt', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <PermissionGate permission={canInviteVendorUsers}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedVendorId(row.id);
              setInviteOpen(true);
            }}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite user
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors"
        actions={
          <PermissionGate permission={canManageVendors}>
            <Button onClick={() => { setSelectedVendorId(null); setInviteOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create vendor
            </Button>
          </PermissionGate>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or code…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategoryParam(e.target.value)}
          className="w-[180px]"
        />
        <Select
          value={inactiveFilter}
          onValueChange={(v) => setInactiveParam(v as 'all' | 'active' | 'inactive')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => setPageSizeParam(Number(v))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<VendorListItem>
        data={paginatedVendors}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyIcon={Building2}
        emptyTitle={debouncedQ || category || inactiveFilter !== 'all' ? 'No vendors match your filters' : 'No vendors in your directory'}
        emptyMessage={
          debouncedQ || category || inactiveFilter !== 'all'
            ? 'Try clearing search, category, or status filters to see more results.'
            : 'Create your first vendor to start inviting users and syncing purchase orders.'
        }
      />

      <VendorInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        vendorId={selectedVendorId}
        mode={selectedVendorId ? 'invite' : 'create'}
        onSuccess={() => {
          setInviteOpen(false);
          setSelectedVendorId(null);
        }}
      />
    </div>
  );
}

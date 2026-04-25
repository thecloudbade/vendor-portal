import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogPathOption } from '../utils/documentTemplateMappableFields';
import { MAPPABLE_CATALOG_GROUPS } from '../utils/documentTemplateMappableFields';

type MappablePathComboboxProps = {
  options: CatalogPathOption[];
  value: string;
  onPick: (path: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const GROUP_ORDER = MAPPABLE_CATALOG_GROUPS.map((g) => g.label);

export function MappablePathCombobox({
  options,
  value,
  onPick,
  disabled = false,
  placeholder = 'Search fields…',
}: MappablePathComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const pathSet = useMemo(() => new Set(options.map((o) => o.path)), [options]);
  const selectedOpt = useMemo(() => options.find((o) => o.path === value), [options, value]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return options.filter(
      (o) =>
        !qn ||
        o.path.toLowerCase().includes(qn) ||
        o.label.toLowerCase().includes(qn) ||
        o.group.toLowerCase().includes(qn)
    );
  }, [options, q]);

  const triggerLabel = () => {
    if (selectedOpt) {
      return (
        <span className="flex min-w-0 flex-col items-start gap-0 text-left">
          <span className="w-full truncate font-mono text-xs text-foreground">{selectedOpt.path}</span>
          {selectedOpt.label !== selectedOpt.path && (
            <span className="w-full truncate text-[11px] font-normal text-muted-foreground">{selectedOpt.label}</span>
          )}
        </span>
      );
    }
    if (value.trim()) {
      return <span className="truncate font-mono text-xs text-foreground">{value}</span>;
    }
    return <span className="truncate text-muted-foreground">{placeholder}</span>;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-auto min-h-8 w-full justify-between gap-2 py-1.5 font-normal disabled:opacity-50"
        >
          <div className="min-w-0 flex-1 text-left">{triggerLabel()}</div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-1.5rem,32rem)] max-w-[95vw] border-border bg-popover p-0 shadow-lg"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by path, label, or group…"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              autoComplete="off"
            />
          </div>
          <div className="max-h-[min(22rem,48vh)] overflow-y-auto overscroll-contain p-1" role="listbox">
            {options.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No fields in catalog yet.</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              GROUP_ORDER.map((groupLabel) => {
                const items = filtered.filter((o) => o.group === groupLabel);
                if (items.length === 0) return null;
                return (
                  <div key={groupLabel} className="mb-1">
                    <p className="sticky top-0 z-[1] bg-popover px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {groupLabel}
                    </p>
                    {items.map((o) => (
                      <button
                        key={o.path}
                        type="button"
                        role="option"
                        className={cn(
                          'flex w-full flex-col rounded-md px-2 py-1.5 text-left text-foreground',
                          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          o.path === value && 'bg-muted/60'
                        )}
                        onClick={() => {
                          onPick(o.path);
                          setQ('');
                          setOpen(false);
                        }}
                      >
                        <span className="font-mono text-xs">{o.path}</span>
                        <span className="text-[11px] text-muted-foreground">{o.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
          <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            {filtered.length} field{filtered.length === 1 ? '' : 's'}
            {pathSet.has(value) ? ' · pick a path, or type a custom path below' : ' · custom path below'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

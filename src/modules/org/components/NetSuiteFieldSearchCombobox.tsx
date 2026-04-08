import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NetSuiteFieldOption = {
  value: string;
  label: string;
  detail?: string;
};

type NetSuiteFieldSearchComboboxProps = {
  options: NetSuiteFieldOption[];
  selected: string[];
  onSelect: (field: string) => void;
  disabled?: boolean;
  loading?: boolean;
  triggerPlaceholder?: string;
};

export function NetSuiteFieldSearchCombobox({
  options,
  selected,
  onSelect,
  disabled,
  loading,
  triggerPlaceholder = 'Search and add a field…',
}: NetSuiteFieldSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return options
      .filter((f) => !selectedSet.has(f.value))
      .filter(
        (f) =>
          !qn ||
          f.value.toLowerCase().includes(qn) ||
          f.label.toLowerCase().includes(qn) ||
          (f.detail && f.detail.toLowerCase().includes(qn))
      );
  }, [options, q, selectedSet]);

  const handlePick = (field: string) => {
    onSelect(field);
    setQ('');
    setOpen(false);
  };

  const totalAvailable = options.filter((x) => !selectedSet.has(x.value)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="h-10 w-full min-w-0 justify-between gap-2 font-mono text-sm font-normal"
        >
          <span className="truncate text-muted-foreground">{loading ? 'Loading fields…' : triggerPlaceholder}</span>
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-70" /> : <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-1.5rem,42rem)] max-w-[95vw] border-border bg-popover p-0 shadow-lg"
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
              placeholder="Filter…"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              autoComplete="off"
            />
          </div>
          <div className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain p-1" role="listbox">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? 'No fields available yet. Update NetSuite data above, then try again.'
                  : q.trim()
                    ? 'No matches.'
                    : 'All listed fields are already added.'}
              </p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="option"
                  className={cn(
                    'flex w-full flex-col rounded-md px-3 py-2 text-left font-mono text-sm text-foreground',
                    'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                  onClick={() => handlePick(f.value)}
                >
                  <span>{f.label}</span>
                  {f.detail && (
                    <span className="text-[11px] font-normal text-muted-foreground">{f.detail}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            {filtered.length} of {totalAvailable} shown
            {q.trim() ? ' · filtered' : ''}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

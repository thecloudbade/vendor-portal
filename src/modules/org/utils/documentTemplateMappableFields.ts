import type { MappableFieldEntry, MappableFieldsCatalog } from '../types';
import { MAPPABLE_STATIC_PREFIXES } from './packingListLayout';

/** Group labels — same order as catalog keys. */
export const MAPPABLE_CATALOG_GROUPS: { key: keyof MappableFieldsCatalog; label: string }[] = [
  { key: 'organization', label: 'Organization' },
  { key: 'purchaseOrder', label: 'Purchase order' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'line', label: 'Line' },
];

function bucketForStaticPath(path: string): keyof MappableFieldsCatalog | null {
  if (path.startsWith('organization.')) return 'organization';
  if (path.startsWith('purchaseOrder.')) return 'purchaseOrder';
  if (path.startsWith('vendor.')) return 'vendor';
  if (path.startsWith('line.')) return 'line';
  return null;
}

/**
 * Ensures every `MAPPABLE_STATIC_PREFIXES` path appears in the catalog so pickers always list
 * all known static fields, even if the API omits them.
 */
export function mergeCatalogWithStaticPresets(
  catalog: MappableFieldsCatalog | undefined
): MappableFieldsCatalog {
  const out: MappableFieldsCatalog = {
    organization: [...(catalog?.organization ?? [])],
    purchaseOrder: [...(catalog?.purchaseOrder ?? [])],
    vendor: [...(catalog?.vendor ?? [])],
    line: [...(catalog?.line ?? [])],
  };

  const has = (bucket: keyof MappableFieldsCatalog, path: string) =>
    out[bucket].some((e) => e.path === path);

  for (const p of MAPPABLE_STATIC_PREFIXES) {
    const bucket = bucketForStaticPath(p);
    if (!bucket || has(bucket, p)) continue;
    const entry: MappableFieldEntry = { path: p, label: p, type: 'string' };
    out[bucket].push(entry);
  }

  const sort = (a: MappableFieldEntry, b: MappableFieldEntry) => a.path.localeCompare(b.path);
  out.organization.sort(sort);
  out.purchaseOrder.sort(sort);
  out.vendor.sort(sort);
  out.line.sort(sort);
  return out;
}

export type CatalogPathOption = { path: string; label: string; group: string };

export function catalogPathOptions(catalog: MappableFieldsCatalog | undefined): CatalogPathOption[] {
  if (!catalog) return [];
  const out: CatalogPathOption[] = [];
  for (const g of MAPPABLE_CATALOG_GROUPS) {
    for (const e of catalog[g.key]) {
      out.push({ path: e.path, label: e.label || e.path, group: g.label });
    }
  }
  return out;
}

/** Next catalog path not yet present in the map (full merged catalog, not preset-only). */
export function nextUnmappedCatalogPath(
  map: Record<string, string>,
  catalog: MappableFieldsCatalog | undefined,
  lineOnly: boolean
): string | null {
  const merged = mergeCatalogWithStaticPresets(catalog);
  const all = catalogPathOptions(merged);
  const filtered = lineOnly
    ? all.filter((o) => o.path.startsWith('line.'))
    : all.filter((o) => !o.path.startsWith('line.'));
  const sorted = [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  for (const o of sorted) {
    if (!Object.prototype.hasOwnProperty.call(map, o.path)) return o.path;
  }
  return null;
}

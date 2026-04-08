import type { NetSuiteMetadataFetchResult } from '../types';

/** Matches [`NetSuiteFieldSearchCombobox`](src/modules/org/components/NetSuiteFieldSearchCombobox.tsx) option shape. */
export type NetSuiteFieldOption = { value: string; label: string; detail?: string };

/** Matches df-vendor `validateAndNormalizeItemFields`: letters, digits, underscore, max 128 chars. */
export function normalizeFieldTokenFromParts(...parts: string[]): string {
  return parts
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 128);
}

/** Body/header fields from POST …/metadata/fetch (normalized). */
export function buildBodyFieldOptions(metadata: NetSuiteMetadataFetchResult | undefined): NetSuiteFieldOption[] {
  if (!metadata) return [];
  const out: NetSuiteFieldOption[] = [];
  for (const f of metadata.bodyFields) {
    const value = normalizeFieldTokenFromParts(f.id);
    if (!value) continue;
    out.push({
      value,
      label: f.label ?? f.name ?? f.id,
      detail: f.type ? `Body · ${f.type}` : 'Body field',
    });
  }
  return out;
}

/** Sublist / line column candidates — primary source for `item_fields` (PO line fetches). */
export function buildSublistFieldOptions(metadata: NetSuiteMetadataFetchResult | undefined): NetSuiteFieldOption[] {
  if (!metadata) return [];
  const out: NetSuiteFieldOption[] = [];
  for (const sub of metadata.sublists) {
    for (const f of sub.fields) {
      const value = normalizeFieldTokenFromParts(sub.id, f.id);
      if (!value) continue;
      out.push({
        value,
        label: `${sub.name ?? sub.id} · ${f.label ?? f.name ?? f.id}`,
        detail: `Sublist ${sub.id}`,
      });
    }
  }
  return out;
}

/**
 * Normalized split for field-config UI: header vs line candidates.
 * Mirrors [`normalizeMetadataFetch`](src/modules/org/api/org.api.ts) body vs sublists.
 */
export function splitMetadataForFieldConfig(metadata: NetSuiteMetadataFetchResult | undefined): {
  headerFields: NetSuiteFieldOption[];
  lineFieldCandidates: NetSuiteFieldOption[];
} {
  return {
    headerFields: buildBodyFieldOptions(metadata),
    lineFieldCandidates: buildSublistFieldOptions(metadata),
  };
}

/** Build persisted `item_field_labels` for PUT field-config from line ids and picker labels. */
export function buildItemFieldLabelsFromOptions(
  lineFieldIds: string[],
  options: NetSuiteFieldOption[]
): Record<string, string> {
  const m = new Map(options.map((o) => [o.value, o.label]));
  const out: Record<string, string> = {};
  for (const id of lineFieldIds) {
    const label = m.get(id);
    if (label && String(label).trim() !== '') out[id] = label;
  }
  return out;
}

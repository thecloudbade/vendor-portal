import type { NetSuiteClassificationDetail } from '../types';

export type ClassificationDisplayRow = {
  rowKey: string;
  netsuiteRecordId: string;
  preview: string;
  raw: unknown;
};

export function asPlainObject(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  return row as Record<string, unknown>;
}

function netsuiteIdFromRowFields(obj: Record<string, unknown>): string {
  const keys = ['internalid', 'internalId', 'id', 'recordId', 'value'];
  for (const k of keys) {
    const v = obj[k];
    if (v != null && typeof v !== 'object') return String(v);
  }
  return '';
}

function previewFromRowObject(obj: Record<string, unknown>): string {
  const preferred = ['name', 'fullname', 'title', 'symbol', 'recordtype', 'abbreviation', 'city', 'country'];
  for (const k of preferred) {
    const v = obj[k];
    if (v != null && typeof v !== 'object') {
      const s = String(v).trim();
      if (s) return s.slice(0, 200);
    }
  }
  for (const [, v] of Object.entries(obj)) {
    if (v != null && typeof v !== 'object' && typeof v !== 'function') {
      const s = String(v).trim();
      if (s) return s.slice(0, 200);
    }
  }
  try {
    return JSON.stringify(obj).slice(0, 200);
  } catch {
    return '(object)';
  }
}

function extractDisplayRowsFromPayload(payload: unknown): ClassificationDisplayRow[] {
  const rowFromObj = (obj: Record<string, unknown>, idx: number): ClassificationDisplayRow => {
    const ns = netsuiteIdFromRowFields(obj);
    return {
      rowKey: `p-${idx}-${ns || idx}`,
      netsuiteRecordId: ns || String(idx + 1),
      preview: previewFromRowObject(obj),
      raw: obj,
    };
  };

  if (payload == null) return [];

  if (Array.isArray(payload)) {
    return payload.map((item, i) => {
      const obj = asPlainObject(item);
      if (obj) return rowFromObj(obj, i);
      return {
        rowKey: `p-${i}`,
        netsuiteRecordId: String(i + 1),
        preview:
          typeof item === 'string'
            ? item.slice(0, 200)
            : (() => {
                try {
                  return JSON.stringify(item).slice(0, 200);
                } catch {
                  return String(item).slice(0, 200);
                }
              })(),
        raw: item,
      };
    });
  }

  if (typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    const nested = o.data ?? o.records ?? o.rows ?? o.results;
    if (Array.isArray(nested)) {
      return nested.map((item, i) => {
        const obj = asPlainObject(item);
        if (obj) return rowFromObj(obj, i);
        return {
          rowKey: `p-${i}`,
          netsuiteRecordId: String(i + 1),
          preview: JSON.stringify(item).slice(0, 200),
          raw: item,
        };
      });
    }
    return [rowFromObj(o, 0)];
  }

  return [
    {
      rowKey: 'p-scalar',
      netsuiteRecordId: '—',
      preview: String(payload).slice(0, 200),
      raw: payload,
    },
  ];
}

export function buildClassificationDisplayRows(detail: NetSuiteClassificationDetail): ClassificationDisplayRow[] {
  const stored = detail.records;
  if (stored && stored.length > 0) {
    return stored.map((r, i) => {
      const obj = asPlainObject(r.row);
      const nsPersisted = String(r.netsuiteRecordId ?? '').trim();
      if (obj) {
        const ns = nsPersisted || netsuiteIdFromRowFields(obj) || String(i + 1);
        return {
          rowKey: r.id || `s-${i}-${ns}`,
          netsuiteRecordId: ns,
          preview: previewFromRowObject(obj),
          raw: r.row,
        };
      }
      return {
        rowKey: r.id || `s-${i}`,
        netsuiteRecordId: nsPersisted || String(i + 1),
        preview:
          typeof r.row === 'string'
            ? r.row.slice(0, 200)
            : (() => {
                try {
                  return JSON.stringify(r.row ?? null).slice(0, 200);
                } catch {
                  return '(value)';
                }
              })(),
        raw: r.row,
      };
    });
  }
  return extractDisplayRowsFromPayload(detail.payload);
}

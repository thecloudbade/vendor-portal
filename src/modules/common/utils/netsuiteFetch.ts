/**
 * Normalize list payloads from POST .../integrations/netsuite/fetch responses
 * (after API `{ success, data }` unwrap).
 */
export function extractNetSuiteListFromFetchResult(result: unknown): Record<string, unknown>[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as { body?: unknown };
  const body = r.body;

  if (Array.isArray(body)) {
    return body.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
  }

  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
    }
  }

  return [];
}

export function pickNetSuiteCell(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '—';
}

/** Total / page from NetSuite `body.meta` on fetch proxy responses. */
export function extractNetSuiteMetaFromFetchResult(result: unknown): {
  total?: number;
  page?: number;
  pageSize?: number;
} {
  if (!result || typeof result !== 'object') return {};
  const body = (result as { body?: { meta?: { total?: number; page?: number; pageSize?: number } } }).body;
  return body?.meta ?? {};
}

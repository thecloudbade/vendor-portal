/** Parse `page` query param for paginated lists (1-based). */
export function parseListPageParam(raw: string | null | undefined): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

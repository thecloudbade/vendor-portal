/** React Router location.state key for “return to this list URL (path + query)”. */
export const APP_BACK_TO = 'backTo' as const;

export type AppLocationState = { [APP_BACK_TO]?: string };

/** Safe internal path+search for Link `to` — rejects protocol-relative and obvious junk. */
export function resolveBackTo(state: unknown, fallback: string): string {
  const s = (state as AppLocationState | null)?.[APP_BACK_TO];
  if (typeof s !== 'string' || s.length === 0 || s.length > 4096) return fallback;
  if (!s.startsWith('/') || s.startsWith('//')) return fallback;
  return s;
}

export function backToState(pathname: string, search: string): AppLocationState {
  return { [APP_BACK_TO]: `${pathname}${search}` };
}

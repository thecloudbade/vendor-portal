/**
 * In production, OTP is never shown in the UI (users get it from email). Local dev
 * and optional staging can surface the value when the API returns it.
 *
 * Staging: set VITE_SHOW_OTP_IN_UI=true in the build env. Do not use in public production.
 */
export function shouldShowOtpInClientUi(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_SHOW_OTP_IN_UI === 'true';
}

export function takeOtpFromResponseForClientUi<T extends { otp?: string }>(res: T): string | undefined {
  if (!shouldShowOtpInClientUi()) return undefined;
  const o = res.otp;
  if (o == null || String(o).trim() === '') return undefined;
  return String(o).trim();
}

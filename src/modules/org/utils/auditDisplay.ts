/**
 * Human-readable labels for audit eventType values from the API.
 */
const EVENT_LABELS: Record<string, string> = {
  VENDOR_USERS_LIST_VIEWED: 'Vendor users list viewed',
  INVITATION_SENT: 'Invitation sent',
  OTP_VERIFIED: 'OTP verified',
  OTP_REQUESTED: 'OTP requested',
  QTY_MISMATCH: 'Quantity mismatch (upload validation)',
};

/** Title-case from SNAKE_CASE, e.g. PO_UPLOADED → Po Uploaded */
export function formatAuditEventType(eventType: string): string {
  if (!eventType) return '—';
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  return eventType
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatAuditActorType(actorType: string): string {
  switch (actorType) {
    case 'ORG_USER':
      return 'Org user';
    case 'ORG_ADMIN':
      return 'Org admin';
    case 'VENDOR_USER':
      return 'Vendor user';
    case 'SYSTEM':
      return 'System';
    default:
      return actorType || '—';
  }
}

export function shortId(id: string | null | undefined, visible = 10): string {
  if (!id) return '—';
  if (id.length <= visible) return id;
  return `…${id.slice(-visible)}`;
}

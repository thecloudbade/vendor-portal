import { ROUTES } from '@/modules/common/constants/routes';

export interface OnboardingTaskRoute {
  to: string;
  ctaLabel: string;
}

const MAP: Record<string, OnboardingTaskRoute> = {
  org_profile: {
    to: `${ROUTES.ORG.SETTINGS}?tab=general`,
    ctaLabel: 'Edit organization profile',
  },
  netsuite_connection: {
    to: `${ROUTES.ORG.SETTINGS}?tab=netsuite`,
    ctaLabel: 'Configure NetSuite',
  },
  sync_vendors: {
    to: ROUTES.ORG.VENDORS,
    ctaLabel: 'Open vendors',
  },
  po_line_fields: {
    to: `${ROUTES.ORG.SETTINGS}?tab=netsuite-data`,
    ctaLabel: 'Configure PO line fields',
  },
  document_template: {
    to: `${ROUTES.ORG.SETTINGS}?tab=templates`,
    ctaLabel: 'Set up templates',
  },
  vendor_users: {
    to: ROUTES.ORG.VENDORS,
    ctaLabel: 'Invite vendor users',
  },
  purchase_orders_data: {
    to: ROUTES.ORG.POS,
    ctaLabel: 'View purchase orders',
  },
};

export function getOnboardingTaskRoute(taskId: string): OnboardingTaskRoute | null {
  return MAP[taskId] ?? null;
}

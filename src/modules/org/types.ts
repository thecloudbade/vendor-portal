export interface VendorListItem {
  id: string;
  name: string;
  email?: string;
  status: string;
  createdAt: string;
}

export interface VendorDetail {
  id: string;
  name: string;
  email?: string;
  status: string;
  users?: { id: string; email: string; role: string; status: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface POListItem {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  createdAt: string;
}

export interface PODetail {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  shipTo?: string;
  items: { id: string; sku?: string; description?: string; expectedQty: number; unit?: string }[];
  requiredDocs: string[];
  uploads?: { id: string; status: string; uploadedAt: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrgSettings {
  uploadRules?: {
    requiredDocs?: string[];
    allowedFormats?: string[];
    maxSizeMb?: number;
  };
  emailRules?: { mismatchAlertsTo?: string[] };
  pendingPOFilter?: Record<string, unknown>;
  reUploadBehavior?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  createdAt: string;
}

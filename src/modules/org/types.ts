import type { NetsuiteDocumentPushSummary } from '@/modules/common/types/netsuiteDocumentPush';
import type { PortalPOLineItem } from '@/modules/common/utils/portalPoLineItem';

export interface VendorListItem {
  id: string;
  name: string;
  vendorName?: string;
  vendorCode?: string;
  email?: string;
  status: string;
  category?: string;
  categoryId?: string;
  inactive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorDetail {
  id: string;
  name: string;
  vendorName?: string;
  vendorCode?: string;
  email?: string;
  authorizedEmails?: string[];
  status: string;
  /** When true from API; otherwise infer from status in UI */
  approved?: boolean;
  inactive?: boolean;
  category?: string;
  /** Legacy: may still be present on GET /vendors/:id; prefer GET /vendors/:id/users for lists */
  users?: { id: string; email: string; role: string; status: string }[];
  createdAt: string;
  updatedAt?: string;
}

/** GET /vendors/:vendorId/users — active portal users for this vendor */
export interface VendorPortalUser {
  id: string;
  email: string;
  name: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /vendors/:vendorId/users — pending (non-expired) invitations */
export interface PendingVendorInvitation {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface VendorUsersPayload {
  vendorId: string;
  users: VendorPortalUser[];
  pendingInvitations: PendingVendorInvitation[];
}

/** POST /vendors/:vendorId/invite — public invitation fields */
export interface InviteVendorUserResult {
  invitationId: string;
  email: string;
  status: string;
  expiresAt: string;
}

export interface POListItem {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  createdAt: string;
  updatedAt?: string;
  /** NetSuite internal PO id when returned by GET /org/pos — used to match NetSuite meta rows to portal POs */
  netsuiteTransId?: string;
}

/** Line items on GET /org/pos/:id — may include ERP pricing when synced from NetSuite. */
export type PODetailLineItem = PortalPOLineItem;

/** Same shape as vendor GET PO `uploadRules` (BuyerPreference rules). */
export interface OrgPOUploadRules {
  packingListQtyTolerancePct: number;
  commercialInvoiceQtyTolerancePct: number;
  blockSubmitOnQtyToleranceExceeded: boolean;
  /** When false, no further submissions after existing uploads (until org reset). Default true when omitted. */
  allowReupload?: boolean;
  /** Max submissions per PO when reuploads are allowed. Default 3 when omitted. */
  maxReuploadAttempts?: number;
}

/** One line from upload validation (PL/CI qty tolerance, ordered vs packed/shipped, etc.). */
export type QtyMismatchRow = Record<string, unknown>;

export interface POUploadEntry {
  id: string;
  status: string;
  uploadedAt: string;
  type?: string;
  fileName?: string;
  /** Stored file id for authenticated GET `/files/:fileId` download. */
  fileId?: string;
  version?: number;
  fileFormat?: string;
  hasQtyMismatch?: boolean;
  mismatchCount?: number;
  /** Present when the API stored validation mismatch rows for this submission. */
  mismatches?: QtyMismatchRow[];
  /** Async NetSuite RESTlet push for PL/CI (after upload). */
  netsuiteDocumentPush?: NetsuiteDocumentPushSummary;
}

export interface PODetail {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  shipTo?: string;
  /** Portal / API summary block (e.g. itemCount, totalQty). */
  summary?: Record<string, unknown>;
  /** NetSuite PO header snapshot from sync. */
  netsuiteFields?: Record<string, unknown>;
  /** Org-configured display names for PO line field ids (from GET PO; for vendor + org UIs). */
  netsuiteLineFieldLabels?: Record<string, string>;
  items: PODetailLineItem[];
  requiredDocs: string[];
  uploads?: POUploadEntry[];
  /** Buyer qty tolerance rules (GET /org/pos/:id). */
  uploadRules?: OrgPOUploadRules;
  createdAt: string;
  updatedAt?: string;
  /** NetSuite internal PO id for `purchaseLineData` fetch (`trans_id`); falls back to `id` when omitted */
  netsuiteTransId?: string;
  /**
   * When false, vendor cannot upload until an org admin runs “reset packing” (NetSuite + portal).
   * When true/omitted, `getVendorDocumentUploadAccess` derives from `uploadRules` and `uploads`.
   */
  documentUploadsAllowed?: boolean;
}

/** POST /org/pos/:poId/reset-packing — forwards to NetSuite; org roles (ORG_ADMIN / ORG_USER; server-enforced). */
export type OrgPOResetPackingListPayload = {
  type: 'resetpackinglist';
  transactionType: 'purchaseorder';
  transactionId: number;
  folderId: number;
};

export type OrgPOResetPackingListResult = {
  status?: string;
  custbody_vfs_total_packinglist_qty?: string;
  custbody_vfs_total_com_inv_qty?: string;
};

/** PUT /org/pos/:id — sync portal PO from NetSuite / org admin */
export interface OrgPOUpdatePayload {
  status?: string;
  netsuiteFields?: Record<string, unknown>;
  lines?: Array<{
    lineNo: number;
    sku: string;
    description: string;
    orderedQty: number;
    uom: string;
  }>;
}

/** PUT /org/preferences body (API doc) */
export interface OrgPreferencesPayload {
  poSource?: { mode: string; apiTokens?: string[] };
  rules?: {
    requireCOO?: boolean;
    allowReupload?: boolean;
    maxReuploadAttempts?: number;
    /** Max allowed absolute % deviation: PO ordered qty vs packing list line qty (per line). */
    packingListQtyTolerancePct?: number;
    /** Max allowed absolute % deviation: PO ordered qty vs commercial invoice line qty (per line). */
    commercialInvoiceQtyTolerancePct?: number;
    /** When true (default), vendor cannot submit uploads that exceed qty tolerance. */
    blockSubmitOnQtyToleranceExceeded?: boolean;
  };
  notifications?: {
    mismatchRecipients?: string[];
    reuploadRecipients?: string[];
  };
}

export interface OrgMe {
  id: string;
  name: string;
  status: string;
  timezone: string;
  preferences: OrgPreferencesPayload;
  createdAt: string;
  updatedAt: string;
  /** Present when API returns address on GET /org/me */
  address?: OrgAddress;
}

/** Optional org address (API may include on profile GET). */
export interface OrgAddress {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

/** PUT /org/profile — ORG_ADMIN */
export interface OrgProfilePutPayload {
  name?: string;
  timezone?: string;
  address?: OrgAddress;
}

/** Known onboarding task ids from GET /org/onboarding-checklist */
export type OnboardingTaskId =
  | 'org_profile'
  | 'netsuite_connection'
  | 'sync_vendors'
  | 'po_line_fields'
  | 'document_template'
  | 'vendor_users'
  | 'purchase_orders_data'
  | string;

export interface OnboardingTask {
  id: OnboardingTaskId;
  title: string;
  description: string;
  completed: boolean;
  sortOrder: number;
}

export interface OnboardingChecklistData {
  tasks: OnboardingTask[];
  /** 0–100 when API provides it */
  completionPercentage?: number;
}

/** Legacy settings shape used by Preferences UI (mapped from OrgMe.preferences) */
export interface OrgSettingsFormShape {
  requireCOO: boolean;
  allowReupload: boolean;
  maxReuploadAttempts: number;
  packingListQtyTolerancePct: number;
  commercialInvoiceQtyTolerancePct: number;
  blockSubmitOnQtyToleranceExceeded: boolean;
  mismatchRecipients: string;
  reuploadRecipients: string;
}

/** GET /org/integrations/netsuite → data */
export interface NetSuiteIntegrationStatus {
  configured: boolean;
  accountSubdomain?: string;
  realm?: string;
  scriptId?: string;
  deployId?: string;
  typeVendors?: string;
  typePurchaseOrders?: string;
  typePurchaseLineData?: string;
  /** RESTlet `type` query for POST `vendorfilesupload` (`files[]` with PDF base64). */
  restletTypeDocumentUpload?: string;
  /** RESTlet `type` query for POST `packinglistupdate` (`packingLines` / `commercialLines`). Empty → API default `packinglistupdate`. */
  restletTypeLineUpdate?: string;
  /** When true, RESTlet branch names are edited under Platform → organization, not here. */
  restletTypesManagedByPlatform?: boolean;
  /** True when the platform operator set at least one override for this tenant. */
  platformRestletOverridesActive?: boolean;
  /** NetSuite file cabinet folder internal id for vendor PL/CI PDF uploads. */
  documentUploadFolderId?: number | null;
  documentUploadQueryPage?: string;
  documentUploadQueryLimit?: string;
  consumerKeyMasked?: string;
  tokenIdMasked?: string;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  /** When true, this API process runs the NetSuite sync scheduler (`ENABLE_NETSUITE_SCHEDULER`). */
  schedulerProcessEnabled?: boolean;
  scheduledVendorSyncEnabled?: boolean | null;
  scheduledPoSyncEnabled?: boolean | null;
  vendorSyncIntervalHours?: number | null;
  poSyncIntervalHours?: number | null;
  lastScheduledVendorSyncAt?: string | null;
  lastScheduledPoSyncAt?: string | null;
}

/** PUT /org/integrations/netsuite/sync-schedule — at least one field required server-side */
export interface NetSuiteSyncSchedulePutPayload {
  scheduledVendorSyncEnabled?: boolean;
  scheduledPoSyncEnabled?: boolean;
  vendorSyncIntervalHours?: number;
  poSyncIntervalHours?: number;
}

export interface NetSuiteIntegrationPutPayload {
  accountSubdomain: string;
  realm: string;
  scriptId: string;
  deployId: string;
  /** NetSuite file cabinet folder internal id; send `null` to clear. */
  documentUploadFolderId?: number | null;
  consumerKey?: string;
  consumerSecret?: string;
  tokenId?: string;
  tokenSecret?: string;
}

/** GET/PUT /org/integrations/netsuite/field-config — persisted line field ids for purchase order lines */
export interface NetSuiteFieldConfigRecord {
  item_fields: string[];
  /** Display names for line column ids (portal UI); not sent to NetSuite RESTlet. */
  item_field_labels?: Record<string, string>;
}

/** Purchase order header (transaction body) fields persisted alongside line columns */
export interface NetSuitePurchaseOrderHeaderFieldConfigRecord {
  header_fields: string[];
  header_field_labels?: Record<string, string>;
}

export interface NetSuiteFieldConfigData {
  purchase_order_line: NetSuiteFieldConfigRecord;
  /** Header-level fields when returned by GET field-config */
  purchase_order?: NetSuitePurchaseOrderHeaderFieldConfigRecord;
}

/** df-vendor: `{ item_fields }` required; optional nested `purchase_order` for header tokens */
export interface NetSuiteFieldConfigPutPayload {
  item_fields: string[];
  item_field_labels?: Record<string, string>;
  purchase_order?: NetSuitePurchaseOrderHeaderFieldConfigRecord;
}

/** POST /integrations/netsuite/record-types/list */
export interface NetSuiteRecordTypeOption {
  id: string;
  name?: string;
  /** NetSuite script / type id when API provides it */
  scriptId?: string;
}

/** One field from POST .../metadata/fetch (body or sublist column) */
export interface NetSuiteMetadataFieldRow {
  id: string;
  name?: string;
  label?: string;
  type?: string;
}

/**
 * Normalized POST …/metadata/fetch (`data.body`).
 * Supports SuiteScript `{ header, sublistFields: { item: [...], ... } }` and legacy `{ fields, sublists }`.
 */
export interface NetSuiteMetadataFetchResult {
  /** Often from `header` — not merged into `item_fields` for PO lines on the server. */
  bodyFields: NetSuiteMetadataFieldRow[];
  sublists: { id: string; name?: string; fields: NetSuiteMetadataFieldRow[] }[];
  /** Meta / extension columns returned for the selected record (merged into PO line & header pickers in the portal). */
  metaFields: NetSuiteMetadataFieldRow[];
}

export interface NetSuiteTestResult {
  success: boolean;
  status: number;
  type: string;
  message: string;
}

export interface NetSuiteVendorSyncResult {
  success: boolean;
  totalFromNetSuite: number;
  created: number;
  updated: number;
}

export interface NetSuiteFetchResult {
  netsuiteHttpStatus: number;
  urlRedacted: string;
  body: unknown;
  netsuiteErrorSnippet: string | null;
}

/** GET /org/integrations/netsuite/record-cache — OrgNetSuiteRecordCache snapshot (no live NetSuite call). */
export type NetSuiteRecordCacheType = 'VENDOR' | 'PURCHASEORDER' | 'PURCHASE_LINE_DATA';

export interface NetSuiteRecordCacheView {
  cached: boolean;
  recordType?: NetSuiteRecordCacheType;
  payload: unknown;
  netsuiteHttpStatus?: number;
  fetchStatus?: 'OK' | 'ERROR';
  errorSnippet?: string | null;
  fetchedAt?: string | null;
  lastQuery?: Record<string, string> | null;
}

/** POST /org/integrations/netsuite/record-cache/sync — ORG_ADMIN */
export interface NetSuiteRecordCacheSyncResult {
  success: boolean;
  payload?: unknown;
  netsuiteHttpStatus?: number;
  fetchStatus?: 'OK' | 'ERROR';
  fetchedAt?: string | null;
  urlRedacted?: string;
  errorSnippet?: string | null;
}

export interface NetSuitePOSyncResult {
  success: boolean;
  purchaseOrdersFromNetSuite: number;
  purchaseOrdersUpserted: number;
  purchaseOrdersSkippedNoVendor: number;
  lineRowsReceived: number;
  lineItemsWritten: number;
  lineSyncHttpStatus: number;
}

/** Document templates: packing list & commercial invoice (org admin). */
export type DocumentTemplateKind = 'PACKING_LIST' | 'COMMERCIAL_INVOICE';

export type DocumentTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface MappableFieldEntry {
  path: string;
  label: string;
  type: string;
}

export interface MappableFieldsCatalog {
  organization: MappableFieldEntry[];
  purchaseOrder: MappableFieldEntry[];
  vendor: MappableFieldEntry[];
  line: MappableFieldEntry[];
}

/** Detection / Excel targets (upload response). */
export type MappingTarget =
  | { kind: 'cell'; sheet: string; ref: string }
  | { kind: 'namedRange'; name: string }
  | { kind: 'lineColumn'; sheet: string; startRow: number; column: number };

/** Keys allowed in `packingListLayout.totalsMap` (matches server `ALLOWED_TOTAL_KEYS`). */
export const PACKING_LIST_TOTAL_KEYS = [
  'total_qty',
  'total_net',
  'total_gross',
  'total_cbm',
  'total_cartons',
  'total_pallets',
] as const;

export type PackingListTotalKey = (typeof PACKING_LIST_TOTAL_KEYS)[number];

/**
 * Excel packing-list engine layout (`PUT /org/document-templates/:id/mapping`).
 * Used for both PACKING_LIST and COMMERCIAL_INVOICE kinds.
 */
export interface PackingListLayout {
  /** Optional; when omitted the engine uses the first worksheet. */
  sheetName?: string;
  /** 1-based row index of the first line-item row. */
  itemsStartRow: number;
  /** Non-line portal paths → A1-style cell refs (e.g. B2). */
  headerMap: Record<string, string>;
  /** `line.*` paths → column letters (e.g. A, AA). */
  itemsColMap: Record<string, string>;
  /** Computed totals → cell refs. */
  totalsMap: Partial<Record<PackingListTotalKey, string>>;
  /** Literal values written to cells (optional). */
  staticCells?: Record<string, string>;
}

/**
 * CSV master layout (`PUT /org/document-templates/:id/mapping` with `csvPackingListLayout`).
 * Header / totals / static use R1C1 refs; line columns use column letters (same as Excel).
 */
export interface CsvPackingListLayout {
  itemsStartRow: number;
  headerMap: Record<string, string>;
  itemsColMap: Record<string, string>;
  totalsMap: Partial<Record<PackingListTotalKey, string>>;
  staticCells?: Record<string, string>;
}

export type DocumentTemplateMasterFormat = 'XLSX' | 'CSV';

/** Server-reported Excel detection summary (upload / excel-structure). */
export interface DetectionMeta {
  truncated?: boolean;
  totalFields?: number;
  namedRangeCount?: number;
}

/** One auto-detected slot in the workbook (cells, named ranges, etc.). */
export interface DetectedTemplateField {
  fieldId: string;
  kind: string;
  defaultBinding?: string;
  target?: MappingTarget | null;
  sheet?: string;
  ref?: string;
  previewValue?: string;
  sampleType?: string;
}

export interface ExcelSheetInfo {
  name: string;
  rowCount?: number;
  columnCount?: number;
}

export interface DefinedNameInfo {
  name: string;
  sheetName?: string;
  address?: string;
}

export interface ExcelStructureSnapshot {
  sheets: ExcelSheetInfo[];
  definedNames: DefinedNameInfo[];
  detectedTemplateFields?: DetectedTemplateField[];
  detectionMeta?: DetectionMeta;
  /** Present when API includes format from excel-structure (CSV vs XLSX). */
  format?: DocumentTemplateMasterFormat;
}

export interface OrgDocumentTemplate {
  id: string;
  orgId?: string;
  kind: DocumentTemplateKind;
  status: DocumentTemplateStatus;
  /** From API after master upload; drives packingListLayout vs csvPackingListLayout. */
  masterFormat?: DocumentTemplateMasterFormat;
  masterFileId: string | null;
  excelStructureSnapshot: ExcelStructureSnapshot | null;
  packingListLayout: PackingListLayout | null;
  csvPackingListLayout: CsvPackingListLayout | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /org/uploads — recent vendor submissions across the org. */
export interface OrgRecentUploadItem {
  id: string;
  poId: string;
  poNumber: string | null;
  vendorId: string;
  vendorName: string | null;
  type: string;
  status: string;
  fileName: string;
  fileFormat?: string;
  uploadedAt: string;
}

/** GET /org/audit — normalized audit log row (API returns `items` + pagination). */
export interface AuditLogEntry {
  id: string;
  orgId: string;
  vendorId: string | null;
  poId: string | null;
  actorType: string;
  actorId: string | null;
  vendorUserId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}


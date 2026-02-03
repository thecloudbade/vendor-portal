export interface POListItem {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  createdAt: string;
  requiredDocs?: string[];
}

export interface PODetail {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  shipTo?: string;
  items: POItem[];
  requiredDocs: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface POItem {
  id: string;
  sku?: string;
  description?: string;
  expectedQty: number;
  unit?: string;
}

export interface UploadRecord {
  id: string;
  poId: string;
  poNumber?: string;
  status: 'received' | 'validated' | 'accepted' | 'rejected';
  uploadedAt: string;
  uploadedBy?: string;
  files?: { name: string; type: string; status?: string }[];
  validationErrors?: string[];
}

export interface UploadValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  uploadId?: string;
}

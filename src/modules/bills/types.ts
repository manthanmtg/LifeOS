export interface BillAttachment {
  id: string;
  filename: string;
  content_type: string;
  data?: string; // base64-encoded file content, omitted from compact lists
  size: number; // bytes
  uploaded_at: string; // ISO datetime
}

export interface BillPayload {
  name: string;
  bill_date: string; // ISO datetime
  amount?: number;
  currency: string;
  description?: string;
  notes?: string;
  folder_id?: string;
  attachments: BillAttachment[];
  tags?: string[];
}

export interface Bill {
  _id: string;
  module_type: "bill";
  is_public: boolean;
  payload: BillPayload;
  created_at: string;
  updated_at: string;
}

interface BillFolderPayload {
  name: string;
  parent_id?: string;
  color?: string;
}

export interface BillFolder {
  _id: string;
  module_type: "bill_folder";
  is_public: boolean;
  payload: BillFolderPayload;
  created_at: string;
  updated_at: string;
}

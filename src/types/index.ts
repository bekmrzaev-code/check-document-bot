export type DriverStatus = 'pending' | 'approved' | 'rejected';
export type UploadStatus = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  telegram_user_id: number;
  name: string;              // original name from Telegram (shown small)
  admin_name?: string | null; // admin's clarifying label (shown large)
  status: DriverStatus;
  company_id: string | null;
  truck_number?: string | null;
  blocked?: number | boolean | null;        // admin "never get request" flag
  fully_approved?: number | boolean | null; // approved with no checklist issues
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Upload {
  id: string;
  driver_id: string;
  group_name: string;
  group_id?: number | null;
  status: UploadStatus;
  image_count: number;
  file_ids?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedImage {
  id: string;
  upload_id: string;
  message_id: number;
  file_id?: string | null;
  created_at: string;
}

export interface AdminSession {
  password: string;
  timestamp: number;
}

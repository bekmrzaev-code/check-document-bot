export type DriverStatus = 'pending' | 'approved' | 'rejected';
export type UploadStatus = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  telegram_user_id: number;
  name: string;
  status: DriverStatus;
  company_id: string | null;
  truck_number?: string | null;
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

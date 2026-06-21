export type Status = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  telegram_user_id: number;
  name: string;
  admin_name?: string | null;
  status: Status;
  company_id: string | null;
  truck_number?: string | null;
  created_at: string;
  updated_at: string;
  images?: ApprovedImage[];
}

export interface ApprovedImage {
  id: string;
  upload_id: string;
  message_id: number;
  file_id?: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupDriverCounts {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export interface TelegramGroup {
  group_id: number;
  group_name: string;
  admin_name?: string | null;
  company_id?: string | null;
  group_type: string;
  member_count: number;
  is_active: boolean;
  added_at: string;
  last_seen: string;
  driver_counts?: GroupDriverCounts;
}

export interface PendingUpload {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_admin_name?: string | null;
  group_name: string;
  group_id?: number | null;
  image_count: number;
  file_ids?: string | null;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  text: string;
  time_of_day: string;
  target: 'all' | number[];
  is_active: boolean;
  last_run_date: string | null;
  created_at: string;
}

export type ViewMode = 'list' | 'grid';

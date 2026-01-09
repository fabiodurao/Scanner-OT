export interface Customer {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: string;
  customer_id: string;
  name: string | null;
  description: string | null;
  uploaded_by: string | null;
  total_files: number;
  total_size_bytes: number;
  status: 'in_progress' | 'completed' | 'processing' | 'error';
  created_at: string;
  completed_at: string | null;
  customer?: Customer;
  pcap_files?: PcapFile[];
}

export interface PcapFile {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  size_bytes: number;
  s3_key: string;
  s3_bucket: string;
  content_type: string;
  upload_status: 'pending' | 'uploading' | 'completed' | 'error';
  error_message: string | null;
  uploaded_at: string;
  completed_at: string | null;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  pcapFileId?: string;
  xhr?: XMLHttpRequest; // Para poder cancelar o upload
}
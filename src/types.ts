export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // 'image' | 'video' | 'file'
  mimeType: string;
  url: string;
  filename: string;
  uploadedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface WebDavConfig {
  url: string;
  username: string;
  password?: string;
  path: string;
  isConfigured: boolean;
  customPassword?: string;
}

export interface AppConfig {
  siteName: string;
  webdavUrl: string;
  hasWebDavEnv: boolean;
  defaultPath: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  webdavUrl?: string;
}

export type ViewMode = 'edit' | 'split' | 'preview';

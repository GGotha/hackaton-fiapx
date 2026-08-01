import type { VideoStatus } from './video-status.js';

export interface VideoDto {
  id: string;
  originalName: string;
  status: VideoStatus;
  frameCount: number | null;
  error: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UploadAcceptedDto {
  id: string;
  status: VideoStatus;
}

export interface DownloadUrlDto {
  url: string;
  expiresInSeconds: number;
}

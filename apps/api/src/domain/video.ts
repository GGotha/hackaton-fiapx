import type { VideoDto, VideoStatus } from '@fiapx/contracts';

export interface Video {
  id: string;
  userId: string;
  userEmail: string;
  originalName: string;
  status: VideoStatus;
  storageKey: string;
  zipKey: string | null;
  frameCount: number | null;
  error: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toVideoDto(video: Video): VideoDto {
  return {
    id: video.id,
    originalName: video.originalName,
    status: video.status,
    frameCount: video.frameCount,
    error: video.error,
    sizeBytes: video.sizeBytes,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };
}

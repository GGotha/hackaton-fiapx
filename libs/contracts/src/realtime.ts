import type { VideoStatus } from './video-status.js';

export const VIDEO_STATUS_CHANNEL = 'fiapx:video-status';

export interface VideoStatusChanged {
  videoId: string;
  userId: string;
  status: VideoStatus;
  frameCount: number | null;
  error: string | null;
  updatedAt: string;
}

export const WsEvent = {
  StatusChanged: 'video:status',
} as const;

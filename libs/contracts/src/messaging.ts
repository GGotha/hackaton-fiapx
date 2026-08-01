export const VIDEOS_EXCHANGE = 'fiapx.videos';
export const VIDEOS_DLX = 'fiapx.videos.dlx';

export const RoutingKey = {
  Process: 'video.process',
  Completed: 'video.completed',
  Failed: 'video.failed',
} as const;

export type RoutingKey = (typeof RoutingKey)[keyof typeof RoutingKey];

export const Queue = {
  Process: 'video.process',
  ProcessDlq: 'video.process.dlq',
  Notifications: 'video.notifications',
} as const;

export type Queue = (typeof Queue)[keyof typeof Queue];

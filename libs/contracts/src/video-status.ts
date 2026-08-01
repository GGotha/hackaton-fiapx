export const VideoStatus = {
  Pending: 'PENDING',
  Processing: 'PROCESSING',
  Completed: 'COMPLETED',
  Failed: 'FAILED',
} as const;

export type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

export const TERMINAL_STATUSES: readonly VideoStatus[] = [
  VideoStatus.Completed,
  VideoStatus.Failed,
];

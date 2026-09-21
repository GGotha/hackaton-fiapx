export const VideoStatus = {
  Pending: 'PENDING',
  Processing: 'PROCESSING',
  Completed: 'COMPLETED',
  Failed: 'FAILED',
} as const;

export type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

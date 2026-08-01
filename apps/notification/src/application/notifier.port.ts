import type { VideoCompletedEvent, VideoFailedEvent } from '@fiapx/contracts';

export interface Notifier {
  notifyFailure(event: VideoFailedEvent): Promise<void>;
  notifyCompletion(event: VideoCompletedEvent): Promise<void>;
}

export const NOTIFIER = Symbol('NOTIFIER');

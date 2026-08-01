export interface WorkerVideoRepository {
  /** Transitions the video into PROCESSING. Returns false if it is already
   *  COMPLETED (a redelivered message), so the caller can skip reprocessing. */
  markProcessing(id: string): Promise<boolean>;
  markCompleted(id: string, zipKey: string, frameCount: number): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
}

export const WORKER_VIDEO_REPOSITORY = Symbol('WORKER_VIDEO_REPOSITORY');

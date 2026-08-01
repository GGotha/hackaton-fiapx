export interface VideoProcessRequested {
  videoId: string;
  userId: string;
  userEmail: string;
  storageKey: string;
  originalName: string;
}

export interface VideoCompletedEvent {
  videoId: string;
  userId: string;
  userEmail: string;
  originalName: string;
  zipKey: string;
  frameCount: number;
}

export interface VideoFailedEvent {
  videoId: string;
  userId: string;
  userEmail: string;
  originalName: string;
  reason: string;
}

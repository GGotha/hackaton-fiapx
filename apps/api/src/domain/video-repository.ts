import type { Video } from './video';

export interface NewVideo {
  id: string;
  userId: string;
  userEmail: string;
  originalName: string;
  storageKey: string;
  sizeBytes: number | null;
}

export interface VideoPage {
  items: Video[];
  total: number;
}

export interface VideoRepository {
  create(input: NewVideo): Promise<Video>;
  findByIdForUser(id: string, userId: string): Promise<Video | null>;
  listByUser(userId: string, page: number, pageSize: number): Promise<VideoPage>;
  markFailed(id: string, reason: string): Promise<void>;
}

export const VIDEO_REPOSITORY = Symbol('VIDEO_REPOSITORY');

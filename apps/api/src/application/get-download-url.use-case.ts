import { type DownloadUrlDto, VideoStatus } from '@fiapx/contracts';
import { StorageService } from '@fiapx/storage';
import { Inject, Injectable } from '@nestjs/common';
import { VideoNotFoundError, VideoNotReadyError } from '../domain/errors';
import { VIDEO_REPOSITORY, type VideoRepository } from '../domain/video-repository';

const DOWNLOAD_URL_TTL_SECONDS = 900;

@Injectable()
export class GetDownloadUrlUseCase {
  constructor(
    @Inject(VIDEO_REPOSITORY) private readonly repository: VideoRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(id: string, userId: string): Promise<DownloadUrlDto> {
    const video = await this.repository.findByIdForUser(id, userId);
    if (!video) {
      throw new VideoNotFoundError(id);
    }
    if (video.status !== VideoStatus.Completed || !video.zipKey) {
      throw new VideoNotReadyError(id);
    }

    const url = await this.storage.presignGet(video.zipKey, DOWNLOAD_URL_TTL_SECONDS);
    return { url, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS };
  }
}

import type { VideoDto } from '@fiapx/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { VideoNotFoundError } from '../domain/errors';
import { toVideoDto } from '../domain/video';
import { VIDEO_REPOSITORY, type VideoRepository } from '../domain/video-repository';

@Injectable()
export class GetVideoUseCase {
  constructor(@Inject(VIDEO_REPOSITORY) private readonly repository: VideoRepository) {}

  async execute(id: string, userId: string): Promise<VideoDto> {
    const video = await this.repository.findByIdForUser(id, userId);
    if (!video) {
      throw new VideoNotFoundError(id);
    }
    return toVideoDto(video);
  }
}

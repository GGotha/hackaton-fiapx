import type { PaginatedResult, VideoDto } from '@fiapx/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { toVideoDto } from '../domain/video';
import { VIDEO_REPOSITORY, type VideoRepository } from '../domain/video-repository';

@Injectable()
export class ListVideosUseCase {
  constructor(@Inject(VIDEO_REPOSITORY) private readonly repository: VideoRepository) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<VideoDto>> {
    const { items, total } = await this.repository.listByUser(userId, page, pageSize);
    return {
      items: items.map(toVideoDto),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

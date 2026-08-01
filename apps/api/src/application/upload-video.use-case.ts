import { randomUUID } from 'node:crypto';
import { RoutingKey, type UploadAcceptedDto, type VideoProcessRequested } from '@fiapx/contracts';
import { RabbitPublisher } from '@fiapx/messaging';
import { StorageService } from '@fiapx/storage';
import { Inject, Injectable } from '@nestjs/common';
import { VIDEO_REPOSITORY, type VideoRepository } from '../domain/video-repository';
import type { AuthenticatedUser } from './authenticated-user';

export interface UploadedVideoFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadVideoUseCase {
  constructor(
    @Inject(VIDEO_REPOSITORY) private readonly repository: VideoRepository,
    private readonly storage: StorageService,
    private readonly publisher: RabbitPublisher,
  ) {}

  async execute(user: AuthenticatedUser, file: UploadedVideoFile): Promise<UploadAcceptedDto> {
    const id = randomUUID();
    const storageKey = `raw/${id}/${file.originalname}`;

    await this.storage.put(storageKey, file.buffer, file.mimetype);

    const video = await this.repository.create({
      id,
      userId: user.id,
      userEmail: user.email,
      originalName: file.originalname,
      storageKey,
      sizeBytes: file.size,
    });

    const event: VideoProcessRequested = {
      videoId: id,
      userId: user.id,
      userEmail: user.email,
      storageKey,
      originalName: file.originalname,
    };
    try {
      await this.publisher.publish(RoutingKey.Process, event);
    } catch (error) {
      // Compensate so the video is not stranded in PENDING with no worker to pick it up.
      await this.repository.markFailed(video.id, 'failed to enqueue for processing');
      throw error;
    }

    return { id: video.id, status: video.status };
  }
}

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import {
  RoutingKey,
  type VideoCompletedEvent,
  type VideoFailedEvent,
  type VideoProcessRequested,
  VideoStatus,
  type VideoStatusChanged,
} from '@fiapx/contracts';
import { RabbitPublisher } from '@fiapx/messaging';
import { StorageService } from '@fiapx/storage';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import {
  WORKER_VIDEO_REPOSITORY,
  type WorkerVideoRepository,
} from '../domain/worker-video-repository';
import { WorkerMetrics } from '../infrastructure/worker-metrics';
import {
  ARCHIVER,
  type Archiver,
  FRAME_EXTRACTOR,
  type FrameExtractor,
  STATUS_PUBLISHER,
  type StatusPublisher,
} from './ports';

@Injectable()
export class ProcessVideoUseCase {
  private readonly logger = new Logger(ProcessVideoUseCase.name);

  constructor(
    @Inject(WORKER_VIDEO_REPOSITORY) private readonly repository: WorkerVideoRepository,
    @Inject(FRAME_EXTRACTOR) private readonly extractor: FrameExtractor,
    @Inject(ARCHIVER) private readonly archiver: Archiver,
    @Inject(STATUS_PUBLISHER) private readonly status: StatusPublisher,
    @Inject(WORKER_CONFIG) private readonly config: WorkerConfig,
    private readonly storage: StorageService,
    private readonly publisher: RabbitPublisher,
    private readonly metrics: WorkerMetrics,
  ) {}

  async execute(event: VideoProcessRequested): Promise<void> {
    const startedAt = Date.now();

    if (!(await this.repository.markProcessing(event.videoId))) {
      this.logger.warn(`skipping already-completed video ${event.videoId}`);
      return;
    }

    const workdir = await mkdtemp(join(tmpdir(), 'fiapx-'));
    try {
      await this.emitStatus(event, VideoStatus.Processing, null, null);

      const inputPath = join(workdir, 'input');
      const framesDir = join(workdir, 'frames');
      await mkdir(framesDir);

      const raw = await this.storage.getBuffer(event.storageKey);
      await writeFile(inputPath, raw);

      const frameCount = await this.extractor.extract(inputPath, framesDir, this.config.frameRate);
      if (frameCount === 0) {
        throw new Error('no frames could be extracted from the video');
      }

      const zip = await this.archiver.zipDirectory(framesDir);
      const zipKey = `zips/${event.videoId}/${basename(event.originalName, extname(event.originalName))}.zip`;
      await this.storage.put(zipKey, zip, 'application/zip');

      // The job is durably done once markCompleted commits; the status and event
      // publishes below are best-effort and must never flip it back to FAILED.
      await this.repository.markCompleted(event.videoId, zipKey, frameCount);
      this.metrics.recordProcessed('completed', (Date.now() - startedAt) / 1000);
      this.logger.log(`processed ${event.videoId} (${frameCount} frames)`);

      await this.emitStatus(event, VideoStatus.Completed, frameCount, null);
      await this.publish(RoutingKey.Completed, {
        videoId: event.videoId,
        userId: event.userId,
        userEmail: event.userEmail,
        originalName: event.originalName,
        zipKey,
        frameCount,
      } satisfies VideoCompletedEvent);
    } catch (error) {
      const reason = (error as Error).message;
      await this.repository.markFailed(event.videoId, reason);
      this.metrics.recordProcessed('failed', (Date.now() - startedAt) / 1000);
      this.logger.error(`failed ${event.videoId}: ${reason}`);

      await this.emitStatus(event, VideoStatus.Failed, null, reason);
      await this.publish(RoutingKey.Failed, {
        videoId: event.videoId,
        userId: event.userId,
        userEmail: event.userEmail,
        originalName: event.originalName,
        reason,
      } satisfies VideoFailedEvent);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  }

  private async emitStatus(
    event: VideoProcessRequested,
    status: VideoStatus,
    frameCount: number | null,
    error: string | null,
  ): Promise<void> {
    const payload: VideoStatusChanged = {
      videoId: event.videoId,
      userId: event.userId,
      status,
      frameCount,
      error,
      updatedAt: new Date().toISOString(),
    };
    try {
      await this.status.publish(payload);
    } catch (err) {
      this.logger.warn(`status publish failed for ${event.videoId}: ${(err as Error).message}`);
    }
  }

  private async publish(
    routingKey: RoutingKey,
    message: VideoCompletedEvent | VideoFailedEvent,
  ): Promise<void> {
    try {
      await this.publisher.publish(routingKey, message);
    } catch (err) {
      this.logger.warn(`event ${routingKey} publish failed: ${(err as Error).message}`);
    }
  }
}

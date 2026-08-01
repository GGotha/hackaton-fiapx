import { RoutingKey, VideoStatus } from '@fiapx/contracts';
import type { RabbitPublisher } from '@fiapx/messaging';
import type { StorageService } from '@fiapx/storage';
import type { WorkerConfig } from '../config/config.module';
import type { WorkerVideoRepository } from '../domain/worker-video-repository';
import type { WorkerMetrics } from '../infrastructure/worker-metrics';
import type { Archiver, FrameExtractor, StatusPublisher } from './ports';
import { ProcessVideoUseCase } from './process-video.use-case';

const event = {
  videoId: 'v1',
  userId: 'u1',
  userEmail: 'user@example.com',
  storageKey: 'raw/v1/clip.mp4',
  originalName: 'clip.mp4',
};

function setup(extractorFrames: number | Error = 3) {
  const repository: jest.Mocked<WorkerVideoRepository> = {
    markProcessing: jest.fn().mockResolvedValue(true),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  };
  const extractor: jest.Mocked<FrameExtractor> = {
    extract:
      extractorFrames instanceof Error
        ? jest.fn().mockRejectedValue(extractorFrames)
        : jest.fn().mockResolvedValue(extractorFrames),
  };
  const archiver: jest.Mocked<Archiver> = {
    zipDirectory: jest.fn().mockResolvedValue(Buffer.from('zip-bytes')),
  };
  const status: jest.Mocked<StatusPublisher> = { publish: jest.fn().mockResolvedValue(undefined) };
  const storage = {
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('raw-video')),
    put: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;
  const publisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RabbitPublisher>;
  const metrics = { recordProcessed: jest.fn() } as unknown as jest.Mocked<WorkerMetrics>;
  const config = { frameRate: 1 } as WorkerConfig;

  const useCase = new ProcessVideoUseCase(
    repository,
    extractor,
    archiver,
    status,
    config,
    storage,
    publisher,
    metrics,
  );
  return { useCase, repository, extractor, archiver, status, storage, publisher, metrics };
}

describe('ProcessVideoUseCase', () => {
  it('processes a video into a zip and marks it completed', async () => {
    const ctx = setup(3);
    await ctx.useCase.execute(event);

    expect(ctx.repository.markProcessing).toHaveBeenCalledWith('v1');
    expect(ctx.storage.getBuffer).toHaveBeenCalledWith('raw/v1/clip.mp4');
    expect(ctx.extractor.extract).toHaveBeenCalled();
    expect(ctx.archiver.zipDirectory).toHaveBeenCalled();
    expect(ctx.storage.put).toHaveBeenCalledWith(
      'zips/v1/clip.zip',
      expect.any(Buffer),
      'application/zip',
    );
    expect(ctx.repository.markCompleted).toHaveBeenCalledWith('v1', 'zips/v1/clip.zip', 3);
    expect(ctx.repository.markFailed).not.toHaveBeenCalled();
    expect(ctx.publisher.publish).toHaveBeenCalledWith(
      RoutingKey.Completed,
      expect.objectContaining({ videoId: 'v1', zipKey: 'zips/v1/clip.zip', frameCount: 3 }),
    );
    expect(ctx.status.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: VideoStatus.Processing }),
    );
    expect(ctx.status.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: VideoStatus.Completed, frameCount: 3 }),
    );
    expect(ctx.metrics.recordProcessed).toHaveBeenCalledWith('completed', expect.any(Number));
  });

  it('marks the video failed and notifies when no frames are produced', async () => {
    const ctx = setup(0);
    await ctx.useCase.execute(event);

    expect(ctx.repository.markCompleted).not.toHaveBeenCalled();
    expect(ctx.repository.markFailed).toHaveBeenCalledWith('v1', expect.stringContaining('frames'));
    expect(ctx.publisher.publish).toHaveBeenCalledWith(
      RoutingKey.Failed,
      expect.objectContaining({ videoId: 'v1' }),
    );
    expect(ctx.status.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: VideoStatus.Failed }),
    );
    expect(ctx.metrics.recordProcessed).toHaveBeenCalledWith('failed', expect.any(Number));
  });

  it('marks the video failed when frame extraction throws', async () => {
    const ctx = setup(new Error('ffmpeg exploded'));
    await ctx.useCase.execute(event);

    expect(ctx.repository.markFailed).toHaveBeenCalledWith('v1', 'ffmpeg exploded');
    expect(ctx.publisher.publish).toHaveBeenCalledWith(
      RoutingKey.Failed,
      expect.objectContaining({ reason: 'ffmpeg exploded' }),
    );
  });

  it('skips a redelivered message whose video is already completed', async () => {
    const ctx = setup(3);
    ctx.repository.markProcessing.mockResolvedValue(false);

    await ctx.useCase.execute(event);

    expect(ctx.extractor.extract).not.toHaveBeenCalled();
    expect(ctx.repository.markCompleted).not.toHaveBeenCalled();
    expect(ctx.publisher.publish).not.toHaveBeenCalled();
  });
});

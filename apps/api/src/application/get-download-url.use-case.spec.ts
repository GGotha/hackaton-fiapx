import { VideoStatus } from '@fiapx/contracts';
import type { StorageService } from '@fiapx/storage';
import { VideoNotFoundError, VideoNotReadyError } from '../domain/errors';
import type { Video } from '../domain/video';
import type { VideoRepository } from '../domain/video-repository';
import { GetDownloadUrlUseCase } from './get-download-url.use-case';

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'v1',
    userId: 'u1',
    userEmail: 'user@example.com',
    originalName: 'clip.mp4',
    status: VideoStatus.Completed,
    storageKey: 'raw/v1/clip.mp4',
    zipKey: 'zips/v1/clip.zip',
    frameCount: 3,
    error: null,
    sizeBytes: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(video: Video | null) {
  const repository = {
    findByIdForUser: jest.fn().mockResolvedValue(video),
  } as unknown as jest.Mocked<VideoRepository>;
  const storage = {
    presignGet: jest.fn().mockResolvedValue('https://minio/presigned'),
  } as unknown as jest.Mocked<StorageService>;
  return { useCase: new GetDownloadUrlUseCase(repository, storage), repository, storage };
}

describe('GetDownloadUrlUseCase', () => {
  it('returns a presigned url for a completed video', async () => {
    const { useCase, storage } = setup(makeVideo());
    const result = await useCase.execute('v1', 'u1');

    expect(storage.presignGet).toHaveBeenCalledWith('zips/v1/clip.zip', 900);
    expect(result).toEqual({ url: 'https://minio/presigned', expiresInSeconds: 900 });
  });

  it('throws when the video does not exist', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute('v1', 'u1')).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('throws when the video is not finished processing', async () => {
    const { useCase } = setup(makeVideo({ status: VideoStatus.Processing, zipKey: null }));
    await expect(useCase.execute('v1', 'u1')).rejects.toBeInstanceOf(VideoNotReadyError);
  });
});

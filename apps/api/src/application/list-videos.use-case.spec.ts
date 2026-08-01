import { VideoStatus } from '@fiapx/contracts';
import type { Video } from '../domain/video';
import type { VideoRepository } from '../domain/video-repository';
import { ListVideosUseCase } from './list-videos.use-case';

function makeVideo(id: string): Video {
  return {
    id,
    userId: 'u1',
    userEmail: 'user@example.com',
    originalName: `${id}.mp4`,
    status: VideoStatus.Completed,
    storageKey: `raw/${id}`,
    zipKey: `zips/${id}`,
    frameCount: 5,
    error: null,
    sizeBytes: 100,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('ListVideosUseCase', () => {
  it('maps rows to dtos and computes pagination', async () => {
    const repository = {
      listByUser: jest
        .fn()
        .mockResolvedValue({ items: [makeVideo('a'), makeVideo('b')], total: 12 }),
    } as unknown as jest.Mocked<VideoRepository>;
    const useCase = new ListVideosUseCase(repository);

    const result = await useCase.execute('u1', 1, 10);

    expect(repository.listByUser).toHaveBeenCalledWith('u1', 1, 10);
    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 'a', status: VideoStatus.Completed, frameCount: 5 }),
    );
    // dtos expose ISO strings, not Date objects
    expect(typeof result.items[0].createdAt).toBe('string');
  });

  it('always reports at least one page', async () => {
    const repository = {
      listByUser: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as jest.Mocked<VideoRepository>;
    const result = await new ListVideosUseCase(repository).execute('u1', 1, 10);
    expect(result.totalPages).toBe(1);
  });
});

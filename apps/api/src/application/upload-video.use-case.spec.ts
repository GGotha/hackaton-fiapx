import { RoutingKey, VideoStatus } from '@fiapx/contracts';
import type { RabbitPublisher } from '@fiapx/messaging';
import type { StorageService } from '@fiapx/storage';
import type { Video } from '../domain/video';
import type { NewVideo, VideoRepository } from '../domain/video-repository';
import { type UploadedVideoFile, UploadVideoUseCase } from './upload-video.use-case';

const user = { id: 'u1', email: 'user@example.com' };
const file: UploadedVideoFile = {
  originalname: 'clip.mp4',
  buffer: Buffer.from('raw-video'),
  size: 9,
  mimetype: 'video/mp4',
};

function setup() {
  const repository = {
    create: jest.fn(
      (input: NewVideo): Promise<Video> =>
        Promise.resolve({
          id: input.id,
          userId: input.userId,
          userEmail: input.userEmail,
          originalName: input.originalName,
          status: VideoStatus.Pending,
          storageKey: input.storageKey,
          zipKey: null,
          frameCount: null,
          error: null,
          sizeBytes: input.sizeBytes,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    ),
  } as unknown as jest.Mocked<VideoRepository>;
  const storage = {
    put: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;
  const publisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RabbitPublisher>;
  return {
    useCase: new UploadVideoUseCase(repository, storage, publisher),
    repository,
    storage,
    publisher,
  };
}

describe('UploadVideoUseCase', () => {
  it('stores the raw video, persists metadata and enqueues processing', async () => {
    const { useCase, repository, storage, publisher } = setup();

    const result = await useCase.execute(user, file);

    expect(result.status).toBe(VideoStatus.Pending);
    const created = (repository.create as jest.Mock).mock.calls[0][0] as NewVideo;
    expect(created.originalName).toBe('clip.mp4');
    expect(created.userId).toBe('u1');
    expect(created.storageKey).toBe(`raw/${created.id}/clip.mp4`);

    expect(storage.put).toHaveBeenCalledWith(created.storageKey, file.buffer, 'video/mp4');
    expect(publisher.publish).toHaveBeenCalledWith(
      RoutingKey.Process,
      expect.objectContaining({
        videoId: created.id,
        storageKey: created.storageKey,
        userId: 'u1',
      }),
    );
  });

  it('stores the video before publishing the job', async () => {
    const { useCase, storage, publisher } = setup();
    const order: string[] = [];
    (storage.put as jest.Mock).mockImplementation(() => {
      order.push('store');
      return Promise.resolve();
    });
    (publisher.publish as jest.Mock).mockImplementation(() => {
      order.push('publish');
      return Promise.resolve();
    });

    await useCase.execute(user, file);

    expect(order).toEqual(['store', 'publish']);
  });
});

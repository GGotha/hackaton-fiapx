import { VIDEO_STATUS_CHANNEL, type VideoStatusChanged } from '@fiapx/contracts';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { StatusPublisher } from '../application/ports';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';

@Injectable()
export class RedisStatusPublisher implements StatusPublisher, OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(WORKER_CONFIG) config: WorkerConfig) {
    this.client = new Redis(config.redisUrl);
  }

  async publish(event: VideoStatusChanged): Promise<void> {
    await this.client.publish(VIDEO_STATUS_CHANNEL, JSON.stringify(event));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}

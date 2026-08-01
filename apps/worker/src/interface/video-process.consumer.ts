import { Queue, type VideoProcessRequested } from '@fiapx/contracts';
import { RabbitConsumer } from '@fiapx/messaging';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ProcessVideoUseCase } from '../application/process-video.use-case';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';

@Injectable()
export class VideoProcessConsumer implements OnModuleInit {
  constructor(
    private readonly consumer: RabbitConsumer,
    private readonly useCase: ProcessVideoUseCase,
    @Inject(WORKER_CONFIG) private readonly config: WorkerConfig,
  ) {}

  onModuleInit(): void {
    this.consumer.consume<VideoProcessRequested>(
      Queue.Process,
      (payload) => this.useCase.execute(payload),
      { prefetch: this.config.prefetch },
    );
  }
}

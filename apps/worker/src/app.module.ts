import { DatabaseModule } from '@fiapx/database';
import { MessagingModule } from '@fiapx/messaging';
import { ObservabilityModule } from '@fiapx/observability';
import { StorageModule } from '@fiapx/storage';
import { Module } from '@nestjs/common';
import { ARCHIVER, FRAME_EXTRACTOR, STATUS_PUBLISHER } from './application/ports';
import { ProcessVideoUseCase } from './application/process-video.use-case';
import { loadConfig, WorkerConfigModule } from './config/config.module';
import { WORKER_VIDEO_REPOSITORY } from './domain/worker-video-repository';
import { FfmpegFrameExtractor } from './infrastructure/ffmpeg-frame-extractor';
import { PgWorkerVideoRepository } from './infrastructure/pg-worker-video.repository';
import { RedisStatusPublisher } from './infrastructure/redis-status-publisher';
import { WorkerMetrics } from './infrastructure/worker-metrics';
import { ZipArchiver } from './infrastructure/zip-archiver';
import { VideoProcessConsumer } from './interface/video-process.consumer';

const config = loadConfig();

@Module({
  imports: [
    WorkerConfigModule.forRoot(config),
    DatabaseModule.forRoot(config.databaseUrl),
    StorageModule.forRoot(config.storage),
    MessagingModule.forRoot(config.rabbitmqUrl),
    ObservabilityModule.forRoot('worker'),
  ],
  providers: [
    ProcessVideoUseCase,
    WorkerMetrics,
    VideoProcessConsumer,
    { provide: WORKER_VIDEO_REPOSITORY, useClass: PgWorkerVideoRepository },
    { provide: FRAME_EXTRACTOR, useClass: FfmpegFrameExtractor },
    { provide: ARCHIVER, useClass: ZipArchiver },
    { provide: STATUS_PUBLISHER, useClass: RedisStatusPublisher },
  ],
})
export class AppModule {}

import { StorageService } from '@fiapx/storage';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WORKER_CONFIG, type WorkerConfig } from './config/config.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get<WorkerConfig>(WORKER_CONFIG);
  await app.get(StorageService).ensureBucket();
  await app.listen(config.metricsPort);

  Logger.log(`Worker running, metrics on http://localhost:${config.metricsPort}`, 'Bootstrap');
}

void bootstrap();

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NOTIFICATION_CONFIG, type NotificationConfig } from './config/config.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get<NotificationConfig>(NOTIFICATION_CONFIG);
  await app.listen(config.metricsPort);

  Logger.log(
    `Notification running, metrics on http://localhost:${config.metricsPort}`,
    'Bootstrap',
  );
}

void bootstrap();

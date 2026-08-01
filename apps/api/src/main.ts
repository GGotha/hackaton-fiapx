import { StorageService } from '@fiapx/storage';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG, type ApiConfig } from './config/config.module';
import { DomainExceptionFilter } from './interface/http/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get<ApiConfig>(APP_CONFIG);

  app.setGlobalPrefix('api', { exclude: ['metrics', 'health'] });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new DomainExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FIAP X API')
    .setDescription('Video processing API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.get(StorageService).ensureBucket();
  await app.listen(config.port);
  Logger.log(`API listening on http://localhost:${config.port}`, 'Bootstrap');
}

void bootstrap();

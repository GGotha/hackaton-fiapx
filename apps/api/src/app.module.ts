import { DatabaseModule } from '@fiapx/database';
import { MessagingModule } from '@fiapx/messaging';
import { ObservabilityModule } from '@fiapx/observability';
import { StorageModule } from '@fiapx/storage';
import { Module } from '@nestjs/common';
import { ConfigModule, loadConfig } from './config/config.module';
import { VideosModule } from './videos.module';

const config = loadConfig();

@Module({
  imports: [
    ConfigModule.forRoot(config),
    DatabaseModule.forRoot(config.databaseUrl),
    StorageModule.forRoot(config.storage),
    MessagingModule.forRoot(config.rabbitmqUrl),
    ObservabilityModule.forRoot('api'),
    VideosModule,
  ],
})
export class AppModule {}

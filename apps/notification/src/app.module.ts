import { MessagingModule } from '@fiapx/messaging';
import { ObservabilityModule } from '@fiapx/observability';
import { Module } from '@nestjs/common';
import { NOTIFIER } from './application/notifier.port';
import { loadConfig, NotificationConfigModule } from './config/config.module';
import { ResendNotifier } from './infrastructure/resend-notifier';
import { NotificationConsumer } from './interface/notification.consumer';

const config = loadConfig();

@Module({
  imports: [
    NotificationConfigModule.forRoot(config),
    MessagingModule.forRoot(config.rabbitmqUrl),
    ObservabilityModule.forRoot('notification'),
  ],
  providers: [NotificationConsumer, { provide: NOTIFIER, useClass: ResendNotifier }],
})
export class AppModule {}

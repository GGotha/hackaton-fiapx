import {
  Queue,
  RoutingKey,
  type VideoCompletedEvent,
  type VideoFailedEvent,
} from '@fiapx/contracts';
import { RabbitConsumer } from '@fiapx/messaging';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { NOTIFIER, type Notifier } from '../application/notifier.port';
import { NOTIFICATION_CONFIG, type NotificationConfig } from '../config/config.module';

type NotificationEvent = VideoFailedEvent | VideoCompletedEvent;

@Injectable()
export class NotificationConsumer implements OnModuleInit {
  constructor(
    private readonly consumer: RabbitConsumer,
    @Inject(NOTIFIER) private readonly notifier: Notifier,
    @Inject(NOTIFICATION_CONFIG) private readonly config: NotificationConfig,
  ) {}

  onModuleInit(): void {
    this.consumer.consume<NotificationEvent>(
      Queue.Notifications,
      (payload, raw) => {
        switch (raw.fields.routingKey) {
          case RoutingKey.Failed:
            return this.notifier.notifyFailure(payload as VideoFailedEvent);
          case RoutingKey.Completed:
            return this.notifier.notifyCompletion(payload as VideoCompletedEvent);
          default:
            return Promise.resolve();
        }
      },
      { prefetch: this.config.prefetch },
    );
  }
}

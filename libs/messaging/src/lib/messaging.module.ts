import { type DynamicModule, Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { AmqpConnectionManager } from 'amqp-connection-manager';
import amqp from 'amqp-connection-manager';
import { RabbitConsumer } from './rabbit-consumer';
import { RabbitPublisher } from './rabbit-publisher';
import { AMQP_CONNECTION } from './tokens';

@Global()
@Module({})
export class MessagingModule implements OnApplicationShutdown {
  private static connection: AmqpConnectionManager | undefined;

  static forRoot(url: string): DynamicModule {
    const connection = amqp.connect([url]);
    MessagingModule.connection = connection;

    return {
      module: MessagingModule,
      providers: [
        { provide: AMQP_CONNECTION, useValue: connection },
        RabbitPublisher,
        RabbitConsumer,
      ],
      exports: [RabbitPublisher, RabbitConsumer, AMQP_CONNECTION],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await MessagingModule.connection?.close();
    MessagingModule.connection = undefined;
  }
}

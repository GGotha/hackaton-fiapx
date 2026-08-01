import type { RoutingKey } from '@fiapx/contracts';
import { VIDEOS_EXCHANGE } from '@fiapx/contracts';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import { AMQP_CONNECTION } from './tokens';
import { assertTopology } from './topology';

@Injectable()
export class RabbitPublisher implements OnModuleInit {
  private readonly logger = new Logger(RabbitPublisher.name);
  private channel!: ChannelWrapper;

  constructor(@Inject(AMQP_CONNECTION) private readonly connection: AmqpConnectionManager) {}

  onModuleInit(): void {
    this.channel = this.connection.createChannel({
      json: true,
      setup: (channel: ConfirmChannel) => assertTopology(channel),
    });
  }

  async publish(routingKey: RoutingKey, message: unknown): Promise<void> {
    await this.channel.publish(VIDEOS_EXCHANGE, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
    });
    this.logger.debug(`published ${routingKey}`);
  }
}

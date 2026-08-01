import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { AMQP_CONNECTION } from './tokens';
import { assertTopology } from './topology';

export interface ConsumeOptions {
  prefetch: number;
}

export type MessageHandler<T> = (payload: T, raw: ConsumeMessage) => Promise<void>;

@Injectable()
export class RabbitConsumer {
  private readonly logger = new Logger(RabbitConsumer.name);

  constructor(@Inject(AMQP_CONNECTION) private readonly connection: AmqpConnectionManager) {}

  consume<T>(queue: string, handler: MessageHandler<T>, options: ConsumeOptions): ChannelWrapper {
    return this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await assertTopology(channel);
        await channel.prefetch(options.prefetch);
        await channel.consume(queue, async (raw) => {
          if (!raw) {
            return;
          }
          try {
            const payload = JSON.parse(raw.content.toString()) as T;
            await handler(payload, raw);
            this.settle(() => channel.ack(raw), queue);
          } catch (error) {
            // Unexpected failure: reject without requeue so the message
            // dead-letters to the DLQ instead of hot-looping.
            this.logger.error(`handler failed on ${queue}: ${(error as Error).message}`);
            this.settle(() => channel.nack(raw, false, false), queue);
          }
        });
        this.logger.log(`consuming ${queue} (prefetch=${options.prefetch})`);
      },
    });
  }

  private settle(action: () => void, queue: string): void {
    try {
      action();
    } catch (error) {
      // The channel may have reconnected mid-handler; the broker redelivers
      // anything still unacked, so a failed ack/nack is safe to swallow.
      this.logger.warn(`ack/nack on ${queue} failed: ${(error as Error).message}`);
    }
  }
}

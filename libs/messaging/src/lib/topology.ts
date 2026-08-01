import { Queue, RoutingKey, VIDEOS_DLX, VIDEOS_EXCHANGE } from '@fiapx/contracts';
import type { ConfirmChannel } from 'amqplib';

// Durable topology: the process queue dead-letters failed messages so a spike
// or a crashing consumer never drops a request — it lands in the DLQ instead.
export async function assertTopology(channel: ConfirmChannel): Promise<void> {
  await channel.assertExchange(VIDEOS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(VIDEOS_DLX, 'topic', { durable: true });

  await channel.assertQueue(Queue.Process, {
    durable: true,
    deadLetterExchange: VIDEOS_DLX,
    deadLetterRoutingKey: RoutingKey.Process,
  });
  await channel.bindQueue(Queue.Process, VIDEOS_EXCHANGE, RoutingKey.Process);

  await channel.assertQueue(Queue.ProcessDlq, { durable: true });
  await channel.bindQueue(Queue.ProcessDlq, VIDEOS_DLX, RoutingKey.Process);

  await channel.assertQueue(Queue.Notifications, { durable: true });
  await channel.bindQueue(Queue.Notifications, VIDEOS_EXCHANGE, RoutingKey.Failed);
  await channel.bindQueue(Queue.Notifications, VIDEOS_EXCHANGE, RoutingKey.Completed);
}

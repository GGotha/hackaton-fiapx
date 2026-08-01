import { VIDEO_STATUS_CHANNEL, type VideoStatusChanged, WsEvent } from '@fiapx/contracts';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { APP_CONFIG, type ApiConfig } from '../../config/config.module';
import { JwtVerifier } from '../auth/jwt-verifier';

@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class VideoStatusGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoStatusGateway.name);
  private subscriber!: Redis;

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly verifier: JwtVerifier,
  ) {}

  onModuleInit(): void {
    this.subscriber = new Redis(this.config.redisUrl);
    this.subscriber.subscribe(VIDEO_STATUS_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const payload = JSON.parse(message) as VideoStatusChanged;
        this.server.to(payload.userId).emit(WsEvent.StatusChanged, payload);
      } catch (err) {
        this.logger.warn(`dropping malformed status message: ${(err as Error).message}`);
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = await this.verifier.verify(token);
      await client.join(user.id);
    } catch {
      this.logger.warn('rejected ws connection with invalid token');
      client.disconnect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }
}

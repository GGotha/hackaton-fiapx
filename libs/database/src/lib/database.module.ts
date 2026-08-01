import {
  type DynamicModule,
  Global,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  private static pool: Pool | undefined;
  private static readonly logger = new Logger(DatabaseModule.name);

  static forRoot(connectionString: string): DynamicModule {
    const pool = new Pool({ connectionString, max: 10 });
    // Without this listener an idle-client socket error would surface as an
    // unhandled 'error' event and take the whole process down.
    pool.on('error', (err) => {
      DatabaseModule.logger.error(`idle client error: ${err.message}`);
    });
    DatabaseModule.pool = pool;

    return {
      module: DatabaseModule,
      providers: [{ provide: PG_POOL, useValue: pool }],
      exports: [PG_POOL],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await DatabaseModule.pool?.end();
    DatabaseModule.pool = undefined;
  }
}

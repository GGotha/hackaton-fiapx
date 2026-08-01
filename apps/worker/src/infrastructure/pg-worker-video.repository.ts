import { PG_POOL, type Pool } from '@fiapx/database';
import { Inject, Injectable } from '@nestjs/common';
import type { WorkerVideoRepository } from '../domain/worker-video-repository';

@Injectable()
export class PgWorkerVideoRepository implements WorkerVideoRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async markProcessing(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `update videos set status = 'PROCESSING' where id = $1 and status <> 'COMPLETED'`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, zipKey: string, frameCount: number): Promise<void> {
    await this.pool.query(
      `update videos set status = 'COMPLETED', zip_key = $2, frame_count = $3, error = null where id = $1`,
      [id, zipKey, frameCount],
    );
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.pool.query(
      `update videos set status = 'FAILED', error = $2 where id = $1 and status <> 'COMPLETED'`,
      [id, reason],
    );
  }
}

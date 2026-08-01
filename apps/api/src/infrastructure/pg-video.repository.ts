import type { VideoStatus } from '@fiapx/contracts';
import { PG_POOL, type Pool } from '@fiapx/database';
import { Inject, Injectable } from '@nestjs/common';
import type { Video } from '../domain/video';
import type { NewVideo, VideoPage, VideoRepository } from '../domain/video-repository';

interface VideoRow {
  id: string;
  user_id: string;
  user_email: string;
  original_name: string;
  status: string;
  storage_key: string;
  zip_key: string | null;
  frame_count: number | null;
  error: string | null;
  size_bytes: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: VideoRow): Video {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    originalName: row.original_name,
    status: row.status as VideoStatus,
    storageKey: row.storage_key,
    zipKey: row.zip_key,
    frameCount: row.frame_count,
    error: row.error,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class PgVideoRepository implements VideoRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: NewVideo): Promise<Video> {
    const { rows } = await this.pool.query(
      `insert into videos (id, user_id, user_email, original_name, storage_key, size_bytes, status)
       values ($1, $2, $3, $4, $5, $6, 'PENDING')
       returning *`,
      [
        input.id,
        input.userId,
        input.userEmail,
        input.originalName,
        input.storageKey,
        input.sizeBytes,
      ],
    );
    return mapRow(rows[0] as VideoRow);
  }

  async findByIdForUser(id: string, userId: string): Promise<Video | null> {
    const { rows } = await this.pool.query(`select * from videos where id = $1 and user_id = $2`, [
      id,
      userId,
    ]);
    return rows[0] ? mapRow(rows[0] as VideoRow) : null;
  }

  async listByUser(userId: string, page: number, pageSize: number): Promise<VideoPage> {
    const offset = (page - 1) * pageSize;
    const { rows } = await this.pool.query(
      `select * from videos where user_id = $1 order by created_at desc limit $2 offset $3`,
      [userId, pageSize, offset],
    );
    const { rows: countRows } = await this.pool.query(
      `select count(*)::int as count from videos where user_id = $1`,
      [userId],
    );
    return {
      items: (rows as VideoRow[]).map(mapRow),
      total: (countRows[0] as { count: number }).count,
    };
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.pool.query(
      `update videos set status = 'FAILED', error = $2 where id = $1 and status = 'PENDING'`,
      [id, reason],
    );
  }
}

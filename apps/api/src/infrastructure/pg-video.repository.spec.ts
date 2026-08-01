import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VideoStatus } from '@fiapx/contracts';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { PgVideoRepository } from './pg-video.repository';

describe('PgVideoRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PgVideoRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('fiapx')
      .withUsername('fiapx')
      .withPassword('fiapx')
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    const schema = readFileSync(join(__dirname, '../../../../infra/db/init.sql'), 'utf8');
    await pool.query(schema);
    repository = new PgVideoRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  function newVideo(userId: string, name: string) {
    return {
      id: randomUUID(),
      userId,
      userEmail: `${userId}@example.com`,
      originalName: name,
      storageKey: `raw/${name}`,
      sizeBytes: 1024,
    };
  }

  it('creates a video as PENDING and reads it back for its owner', async () => {
    const created = await repository.create(newVideo('owner-a', 'a.mp4'));
    expect(created.status).toBe(VideoStatus.Pending);
    expect(created.sizeBytes).toBe(1024);

    const found = await repository.findByIdForUser(created.id, 'owner-a');
    expect(found?.id).toBe(created.id);

    const foreign = await repository.findByIdForUser(created.id, 'someone-else');
    expect(foreign).toBeNull();
  });

  it('lists a user videos newest-first with pagination', async () => {
    for (const name of ['1.mp4', '2.mp4', '3.mp4']) {
      await repository.create(newVideo('owner-b', name));
    }

    const firstPage = await repository.listByUser('owner-b', 1, 2);
    expect(firstPage.total).toBe(3);
    expect(firstPage.items).toHaveLength(2);

    const secondPage = await repository.listByUser('owner-b', 2, 2);
    expect(secondPage.items).toHaveLength(1);
  });
});

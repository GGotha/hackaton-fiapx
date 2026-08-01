import type { StorageOptions } from '@fiapx/storage';
import { type DynamicModule, Global, Module } from '@nestjs/common';

export const WORKER_CONFIG = Symbol('WORKER_CONFIG');

export interface WorkerConfig {
  metricsPort: number;
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  prefetch: number;
  frameRate: number;
  storage: StorageOptions;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function loadConfig(): WorkerConfig {
  return {
    metricsPort: Number(process.env.WORKER_METRICS_PORT ?? 3002),
    databaseUrl: required('DATABASE_URL'),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    rabbitmqUrl: required('RABBITMQ_URL'),
    prefetch: Number(process.env.RABBITMQ_PREFETCH ?? 4),
    frameRate: Number(process.env.FRAME_RATE ?? 1),
    storage: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      accessKeyId: required('S3_ACCESS_KEY'),
      secretAccessKey: required('S3_SECRET_KEY'),
      bucket: process.env.S3_BUCKET_VIDEOS ?? 'fiapx-videos',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    },
  };
}

@Global()
@Module({})
export class WorkerConfigModule {
  static forRoot(config: WorkerConfig): DynamicModule {
    return {
      module: WorkerConfigModule,
      providers: [{ provide: WORKER_CONFIG, useValue: config }],
      exports: [WORKER_CONFIG],
    };
  }
}

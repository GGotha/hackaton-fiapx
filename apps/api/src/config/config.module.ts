import type { StorageOptions } from '@fiapx/storage';
import { type DynamicModule, Global, Module } from '@nestjs/common';

export const APP_CONFIG = Symbol('APP_CONFIG');

export interface ApiConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  storage: StorageOptions;
  jwksUrl: string;
  jwtIssuer: string;
  jwtAudience: string;
  maxVideoBytes: number;
  corsOrigins: string[];
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function loadConfig(): ApiConfig {
  return {
    port: Number(process.env.API_PORT ?? 3000),
    databaseUrl: required('DATABASE_URL'),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    rabbitmqUrl: required('RABBITMQ_URL'),
    storage: {
      endpoint: process.env.S3_ENDPOINT,
      publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      accessKeyId: required('S3_ACCESS_KEY'),
      secretAccessKey: required('S3_SECRET_KEY'),
      bucket: process.env.S3_BUCKET_VIDEOS ?? 'fiapx-videos',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    },
    jwksUrl: process.env.JWKS_URL ?? 'http://localhost:3001/api/auth/jwks',
    jwtIssuer: process.env.JWT_ISSUER ?? 'http://localhost:3001',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'fiapx',
    maxVideoBytes: Number(process.env.MAX_VIDEO_MB ?? 200) * 1024 * 1024,
    corsOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim()),
  };
}

@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}

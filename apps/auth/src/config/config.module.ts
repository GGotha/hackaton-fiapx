import { type DynamicModule, Global, Module } from '@nestjs/common';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export interface AuthConfig {
  port: number;
  mongoUri: string;
  baseUrl: string;
  secret: string;
  trustedOrigins: string[];
  jwtIssuer: string;
  jwtAudience: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function loadConfig(): AuthConfig {
  return {
    port: Number(process.env.AUTH_PORT ?? 3001),
    mongoUri: required('MONGODB_URI'),
    baseUrl: process.env.AUTH_BASE_URL ?? 'http://localhost:3001',
    secret: required('AUTH_SECRET'),
    trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim()),
    jwtIssuer: process.env.JWT_ISSUER ?? 'http://localhost:3001',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'fiapx',
  };
}

@Global()
@Module({})
export class AuthConfigModule {
  static forRoot(config: AuthConfig): DynamicModule {
    return {
      module: AuthConfigModule,
      providers: [{ provide: AUTH_CONFIG, useValue: config }],
      exports: [AUTH_CONFIG],
    };
  }
}

// Standalone better-auth instance for the @better-auth/cli (schema generate /
// migrate). Kept Nest-free so the CLI can load it directly. The running service
// builds its instance from the same factory via createAuth(loadConfig()).
import { createAuth } from './src/infrastructure/auth.factory';

export const auth = createAuth({
  port: Number(process.env.AUTH_PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://fiapx:fiapx@localhost:5432/fiapx',
  baseUrl: process.env.AUTH_BASE_URL ?? 'http://localhost:3001',
  secret: process.env.AUTH_SECRET ?? 'dev-only-secret',
  trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? 'http://localhost:4200').split(','),
  jwtIssuer: process.env.JWT_ISSUER ?? 'http://localhost:3001',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'fiapx',
});

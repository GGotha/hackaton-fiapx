import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { Pool } from 'pg';
import type { AuthConfig } from '../config/config.module';

export const AUTH = Symbol('AUTH');

export type Auth = ReturnType<typeof betterAuth>;

let pool: Pool | undefined;

export function createAuth(config: AuthConfig): Auth {
  pool = new Pool({ connectionString: config.databaseUrl });

  return betterAuth({
    database: pool,
    baseURL: config.baseUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    plugins: [
      jwt({
        jwt: {
          issuer: config.jwtIssuer,
          audience: config.jwtAudience,
          expirationTime: '1h',
          definePayload: ({ user }) => ({ email: user.email, name: user.name }),
        },
      }),
    ],
  }) as unknown as Auth;
}

export async function closeAuthPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

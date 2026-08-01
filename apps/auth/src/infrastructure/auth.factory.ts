import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { jwt } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';
import type { AuthConfig } from '../config/config.module';

export const AUTH = Symbol('AUTH');

export type Auth = ReturnType<typeof betterAuth>;

let client: MongoClient | undefined;

export function createAuth(config: AuthConfig): Auth {
  // The MongoClient connects lazily, so createAuth stays synchronous. client.db()
  // uses the database encoded in the connection string (fiapx_auth).
  client = new MongoClient(config.mongoUri);

  return betterAuth({
    database: mongodbAdapter(client.db()),
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

export async function closeAuthDb(): Promise<void> {
  await client?.close();
  client = undefined;
}

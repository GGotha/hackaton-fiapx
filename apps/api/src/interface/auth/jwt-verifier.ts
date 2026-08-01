import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import type { AuthenticatedUser } from '../../application/authenticated-user';
import { APP_CONFIG, type ApiConfig } from '../../config/config.module';

@Injectable()
export class JwtVerifier {
  private readonly jwks: JWTVerifyGetKey;

  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {
    this.jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
    });
    const id = payload.sub;
    const email =
      (payload.email as string | undefined) ??
      (payload as { user?: { email?: string } }).user?.email;

    if (!id || !email) {
      throw new Error('token is missing subject or email');
    }
    return { id, email };
  }
}

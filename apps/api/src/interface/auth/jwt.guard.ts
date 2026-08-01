import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtVerifier } from './jwt-verifier';
import type { RequestWithUser } from './request-with-user';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly verifier: JwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }

    try {
      request.user = await this.verifier.verify(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}

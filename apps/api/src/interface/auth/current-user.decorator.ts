import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../application/authenticated-user';
import type { RequestWithUser } from './request-with-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user as AuthenticatedUser;
  },
);

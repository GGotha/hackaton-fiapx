import type { Request } from 'express';
import type { AuthenticatedUser } from '../../application/authenticated-user';

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

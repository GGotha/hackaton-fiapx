import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { VideoNotFoundError, VideoNotReadyError } from '../../domain/errors';

@Catch(VideoNotFoundError, VideoNotReadyError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: VideoNotFoundError | VideoNotReadyError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof VideoNotFoundError ? 404 : 409;
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}

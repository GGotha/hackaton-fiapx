import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AUTH_CONFIG, type AuthConfig } from './config/config.module';
import { AUTH, type Auth } from './infrastructure/auth.factory';

async function bootstrap(): Promise<void> {
  // better-auth reads the raw request body itself, so Nest's body parser is off.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();

  const config = app.get<AuthConfig>(AUTH_CONFIG);
  const auth = app.get<Auth>(AUTH);

  app.enableCors({ origin: config.trustedOrigins, credentials: true });

  const authHandler = toNodeHandler(auth);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/auth')) {
      Promise.resolve(authHandler(req, res)).catch(next);
      return;
    }
    next();
  });

  await app.listen(config.port);
  Logger.log(`Auth listening on http://localhost:${config.port}`, 'Bootstrap');
}

void bootstrap();

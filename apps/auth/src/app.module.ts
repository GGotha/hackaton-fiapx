import { ObservabilityModule } from '@fiapx/observability';
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { AuthConfigModule, loadConfig } from './config/config.module';
import { AUTH, closeAuthPool, createAuth } from './infrastructure/auth.factory';

const config = loadConfig();

@Module({
  imports: [AuthConfigModule.forRoot(config), ObservabilityModule.forRoot('auth')],
  providers: [{ provide: AUTH, useValue: createAuth(config) }],
  exports: [AUTH],
})
export class AppModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await closeAuthPool();
  }
}

import { type DynamicModule, Global, Module } from '@nestjs/common';

export const NOTIFICATION_CONFIG = Symbol('NOTIFICATION_CONFIG');

export interface NotificationConfig {
  metricsPort: number;
  rabbitmqUrl: string;
  prefetch: number;
  resendApiKey: string;
  from: string;
  dryRun: boolean;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function loadConfig(): NotificationConfig {
  const resendApiKey = process.env.RESEND_API_KEY ?? '';
  return {
    metricsPort: Number(process.env.NOTIFICATION_METRICS_PORT ?? 3003),
    rabbitmqUrl: required('RABBITMQ_URL'),
    prefetch: Number(process.env.RABBITMQ_PREFETCH ?? 4),
    resendApiKey,
    from: process.env.RESEND_FROM ?? 'FIAP X <onboarding@resend.dev>',
    dryRun: (process.env.NOTIFY_DRY_RUN ?? 'true') === 'true' || resendApiKey === '',
  };
}

@Global()
@Module({})
export class NotificationConfigModule {
  static forRoot(config: NotificationConfig): DynamicModule {
    return {
      module: NotificationConfigModule,
      providers: [{ provide: NOTIFICATION_CONFIG, useValue: config }],
      exports: [NOTIFICATION_CONFIG],
    };
  }
}

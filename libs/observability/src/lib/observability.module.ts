import { type DynamicModule, Global, Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({})
export class ObservabilityModule {
  static forRoot(serviceName: string): DynamicModule {
    return {
      module: ObservabilityModule,
      controllers: [MetricsController, HealthController],
      providers: [{ provide: MetricsService, useValue: new MetricsService(serviceName) }],
      exports: [MetricsService],
    };
  }
}

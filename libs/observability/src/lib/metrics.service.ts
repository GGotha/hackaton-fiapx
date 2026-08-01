import { Injectable } from '@nestjs/common';
import {
  Counter,
  type CounterConfiguration,
  collectDefaultMetrics,
  Histogram,
  type HistogramConfiguration,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  constructor(serviceName: string) {
    this.registry.setDefaultLabels({ service: serviceName });
    collectDefaultMetrics({ register: this.registry });
  }

  counter(config: CounterConfiguration<string>): Counter<string> {
    return new Counter({ ...config, registers: [this.registry] });
  }

  histogram(config: HistogramConfiguration<string>): Histogram<string> {
    return new Histogram({ ...config, registers: [this.registry] });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}

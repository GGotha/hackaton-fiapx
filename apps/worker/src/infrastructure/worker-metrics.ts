import { MetricsService } from '@fiapx/observability';
import { Injectable } from '@nestjs/common';
import type { Counter, Histogram } from 'prom-client';

@Injectable()
export class WorkerMetrics {
  private readonly processed: Counter<string>;
  private readonly duration: Histogram<string>;

  constructor(metrics: MetricsService) {
    this.processed = metrics.counter({
      name: 'fiapx_videos_processed_total',
      help: 'Total videos processed by result',
      labelNames: ['result'],
    });
    this.duration = metrics.histogram({
      name: 'fiapx_video_processing_seconds',
      help: 'Video processing duration in seconds',
      buckets: [1, 2, 5, 10, 30, 60, 120, 300],
    });
  }

  recordProcessed(result: 'completed' | 'failed', seconds: number): void {
    this.processed.inc({ result });
    this.duration.observe(seconds);
  }
}

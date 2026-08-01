import type { VideoCompletedEvent, VideoFailedEvent } from '@fiapx/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { Notifier } from '../application/notifier.port';
import { NOTIFICATION_CONFIG, type NotificationConfig } from '../config/config.module';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class ResendNotifier implements Notifier {
  private readonly logger = new Logger(ResendNotifier.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly dryRun: boolean;

  constructor(@Inject(NOTIFICATION_CONFIG) config: NotificationConfig) {
    this.dryRun = config.dryRun;
    this.from = config.from;
    this.resend = this.dryRun ? null : new Resend(config.resendApiKey);
  }

  async notifyFailure(event: VideoFailedEvent): Promise<void> {
    const name = escapeHtml(event.originalName);
    await this.send(
      event.userEmail,
      `Processing failed: ${event.originalName}`,
      `<p>We couldn't process <strong>${name}</strong>.</p>
       <p>Reason: ${escapeHtml(event.reason)}</p>
       <p>Please try uploading it again.</p>`,
    );
  }

  async notifyCompletion(event: VideoCompletedEvent): Promise<void> {
    const name = escapeHtml(event.originalName);
    await this.send(
      event.userEmail,
      `Your video is ready: ${event.originalName}`,
      `<p><strong>${name}</strong> was processed into ${event.frameCount} frames.</p>
       <p>Download the ZIP from your dashboard.</p>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dry-run] email to ${to} — ${subject}`);
      return;
    }
    // The Resend SDK resolves with { error } instead of rejecting; throw so the
    // consumer nacks the message to the DLQ rather than dropping it silently.
    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      throw new Error(`resend failed for ${to}: ${error.message}`);
    }
    this.logger.log(`email sent to ${to} — ${subject}`);
  }
}

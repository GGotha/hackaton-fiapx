import { VideoStatus } from '@fiapx/contracts';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: VideoStatus;
  error?: string | null;
}

const CONFIG: Record<VideoStatus, { label: string; tone: string; icon: typeof Clock }> = {
  [VideoStatus.Pending]: { label: 'Pendente', tone: styles.pending, icon: Clock },
  [VideoStatus.Processing]: { label: 'Processando', tone: styles.processing, icon: Loader2 },
  [VideoStatus.Completed]: { label: 'Concluído', tone: styles.completed, icon: CheckCircle2 },
  [VideoStatus.Failed]: { label: 'Falhou', tone: styles.failed, icon: AlertTriangle },
};

export function StatusBadge({ status, error }: StatusBadgeProps) {
  const { label, tone, icon: Icon } = CONFIG[status];
  const isProcessing = status === VideoStatus.Processing;
  const isFailed = status === VideoStatus.Failed;

  return (
    <span className={`${styles.badge} ${tone}`} title={isFailed && error ? error : undefined}>
      {isProcessing ? (
        <span className={styles.pulse} aria-hidden />
      ) : (
        <Icon size={14} strokeWidth={2.4} />
      )}
      {label}
    </span>
  );
}

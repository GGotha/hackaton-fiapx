import { type VideoDto, VideoStatus } from '@fiapx/contracts';
import { motion } from 'framer-motion';
import { Download, Film, Loader2 } from 'lucide-react';
import { useDownload } from '../hooks/useDownload';
import { formatBytes, formatCount, relativeTime } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import styles from './VideoCard.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

export function VideoCard({ video }: { video: VideoDto }) {
  const download = useDownload();
  const isCompleted = video.status === VideoStatus.Completed;

  return (
    <motion.article className={styles.card} variants={cardVariants} layout whileHover={{ y: -3 }}>
      <span className={styles.thumb}>
        <Film size={20} />
      </span>

      <div className={styles.body}>
        <div className={styles.headline}>
          <h3 className={styles.name} title={video.originalName}>
            {video.originalName}
          </h3>
          <StatusBadge status={video.status} error={video.error} />
        </div>

        <div className={styles.meta}>
          <span>{relativeTime(video.createdAt)}</span>
          {video.frameCount != null ? (
            <span className={styles.metaItem}>{formatCount(video.frameCount)} quadros</span>
          ) : null}
          {video.sizeBytes != null ? (
            <span className={styles.metaItem}>{formatBytes(video.sizeBytes)}</span>
          ) : null}
        </div>
      </div>

      <motion.button
        type="button"
        className={styles.download}
        disabled={!isCompleted || download.isPending}
        onClick={() => download.mutate(video.id)}
        whileTap={isCompleted ? { scale: 0.95 } : undefined}
      >
        {download.isPending ? (
          <Loader2 size={16} className={styles.spinner} />
        ) : (
          <Download size={16} />
        )}
        <span className={styles.downloadLabel}>Baixar</span>
      </motion.button>
    </motion.article>
  );
}

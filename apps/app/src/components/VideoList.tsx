import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Film } from 'lucide-react';
import { useState } from 'react';
import { useVideos } from '../hooks/useVideos';
import { Loader } from './Loader';
import { Pagination } from './Pagination';
import { VideoCard } from './VideoCard';
import styles from './VideoList.module.css';

const PAGE_SIZE = 10;

const listVariants = {
  visible: { transition: { staggerChildren: 0.05 } },
};

export function VideoList({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useVideos(page, PAGE_SIZE, enabled);

  if (isPending) {
    return <Loader label="Carregando sua biblioteca" />;
  }

  if (isError) {
    return (
      <div className={styles.state}>
        <span className={`${styles.stateIcon} ${styles.stateError}`}>
          <AlertTriangle size={22} />
        </span>
        <p className={styles.stateTitle}>Não foi possível carregar seus vídeos</p>
        <button type="button" className={styles.retry} onClick={() => void refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className={styles.state}>
        <span className={styles.stateIcon}>
          <Film size={22} />
        </span>
        <p className={styles.stateTitle}>Nenhum vídeo ainda</p>
        <p className={styles.stateHint}>Envie um vídeo acima e ele aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <motion.div
        className={styles.list}
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence initial={false}>
          {data.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </AnimatePresence>
      </motion.div>

      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}

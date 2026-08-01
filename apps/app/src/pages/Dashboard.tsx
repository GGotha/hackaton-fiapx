import { motion } from 'framer-motion';
import { Header } from '../components/Header';
import { UploadZone } from '../components/UploadZone';
import { VideoList } from '../components/VideoList';
import { useVideoSocket } from '../hooks/useVideoSocket';
import { useAuth } from '../providers/auth';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { token } = useAuth();
  useVideoSocket(token);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Header />

        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className={styles.heroTitle}>Processamento de vídeo na velocidade da luz.</h1>
          <p className={styles.heroSubtitle}>
            Envie um vídeo e extrairemos cada quadro em um arquivo para download.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <UploadZone />
        </motion.div>

        <motion.section
          className={styles.library}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className={styles.sectionTitle}>Sua biblioteca</h2>
          <VideoList enabled={Boolean(token)} />
        </motion.section>
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { FileVideo, UploadCloud } from 'lucide-react';
import { type DragEvent, useCallback, useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';
import { formatBytes } from '../lib/format';
import styles from './UploadZone.module.css';

export function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { mutate, isPending, isError, error, progress } = useUpload();

  const submit = useCallback(
    (file: File | undefined) => {
      if (file?.type.startsWith('video/')) {
        mutate(file);
      }
    },
    [mutate],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (!isPending) {
        submit(event.dataTransfer.files?.[0]);
      }
    },
    [isPending, submit],
  );

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Falha no envio. Tente novamente.';

  return (
    <motion.div
      className={`${styles.zone} ${dragging ? styles.dragging : ''} ${isPending ? styles.busy : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isPending) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !isPending && inputRef.current?.click()}
      whileHover={isPending ? undefined : { y: -2 }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isPending) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className={styles.input}
        onChange={(event) => {
          submit(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isPending ? (
          <motion.div
            key="uploading"
            className={styles.content}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className={styles.iconBusy}>
              <FileVideo size={26} />
            </span>
            <div className={styles.copy}>
              <p className={styles.title}>Enviando… {progress}%</p>
              <div className={styles.progressTrack}>
                <motion.div
                  className={styles.progressBar}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            className={styles.content}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className={styles.icon}>
              <UploadCloud size={28} />
            </span>
            <div className={styles.copy}>
              <p className={styles.title}>Solte um vídeo para processar</p>
              <p className={styles.hint}>
                Arraste e solte ou <span className={styles.link}>selecione</span> · até{' '}
                {formatBytes(200 * 1024 * 1024)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isError ? <p className={styles.error}>{message}</p> : null}
    </motion.div>
  );
}

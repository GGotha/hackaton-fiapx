import { Loader2 } from 'lucide-react';
import styles from './Loader.module.css';

export function Loader({ label }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <Loader2 className={styles.spinner} size={26} />
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );
}

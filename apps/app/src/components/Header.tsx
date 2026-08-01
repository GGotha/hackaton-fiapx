import { motion } from 'framer-motion';
import { LogOut, Zap } from 'lucide-react';
import { useAuth } from '../providers/auth';
import styles from './Header.module.css';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.mark}>
          <Zap size={18} strokeWidth={2.6} />
        </span>
        <span className={styles.name}>
          FIAP<span className={styles.accent}>X</span>
        </span>
      </div>

      <div className={styles.actions}>
        {user ? <span className={styles.email}>{user.email}</span> : null}
        <ThemeToggle />
        <motion.button
          type="button"
          className={styles.logout}
          onClick={() => void signOut()}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut size={16} />
          <span className={styles.logoutLabel}>Log out</span>
        </motion.button>
      </div>
    </header>
  );
}

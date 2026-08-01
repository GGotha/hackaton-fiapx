import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import fiapLogo from '../assets/fiap-logo.svg';
import { useAuth } from '../providers/auth';
import styles from './Header.module.css';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={fiapLogo} className={styles.logo} alt="FIAP" />
        <span className={styles.accent}>X</span>
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

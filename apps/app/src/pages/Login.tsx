import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Lock, Mail, User, Zap } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../providers/auth';
import styles from './Login.module.css';

type Mode = 'signin' | 'signup';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const { status, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const isSignup = mode === 'signup';

  const validate = (): string | null => {
    if (isSignup && name.trim().length < 2) {
      return 'Please enter your name.';
    }
    if (!EMAIL_PATTERN.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp(name.trim(), email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.themeSlot}>
        <ThemeToggle />
      </div>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.brand}>
          <span className={styles.mark}>
            <Zap size={20} strokeWidth={2.6} />
          </span>
          <span className={styles.name}>
            FIAP<span className={styles.accent}>X</span>
          </span>
        </div>

        <h1 className={styles.title}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className={styles.subtitle}>
          {isSignup
            ? 'Start turning videos into frames in seconds.'
            : 'Sign in to launch and track your video jobs.'}
        </p>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`${styles.tab} ${!isSignup ? styles.tabActive : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`${styles.tab} ${isSignup ? styles.tabActive : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
          <motion.span
            className={styles.tabGlider}
            animate={{ x: isSignup ? '100%' : '0%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          />
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <AnimatePresence initial={false}>
            {isSignup ? (
              <motion.div
                key="name"
                className={styles.field}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className={styles.label} htmlFor="name">
                  Name
                </label>
                <div className={styles.inputWrap}>
                  <User size={17} className={styles.inputIcon} />
                  <input
                    id="name"
                    className={styles.input}
                    type="text"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <div className={styles.inputWrap}>
              <Mail size={17} className={styles.inputIcon} />
              <input
                id="email"
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrap}>
              <Lock size={17} className={styles.inputIcon} />
              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          <AnimatePresence>
            {error ? (
              <motion.p
                className={styles.error}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="submit"
            className={styles.submit}
            disabled={submitting}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : isSignup ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

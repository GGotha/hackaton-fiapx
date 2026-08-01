import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { registerTokenRefresher, setAuthToken } from '../lib/api';
import { authClient } from '../lib/auth-client';
import { fetchApiToken } from '../lib/tokens';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const applyToken = useCallback((next: string | null) => {
    setToken(next);
    setAuthToken(next);
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const next = await fetchApiToken();
    applyToken(next);
    return next;
  }, [applyToken]);

  const hydrate = useCallback(async (): Promise<boolean> => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      return false;
    }
    setUser({ id: data.user.id, email: data.user.email, name: data.user.name ?? '' });
    await refreshToken();
    return true;
  }, [refreshToken]);

  useEffect(() => {
    registerTokenRefresher(refreshToken);
    return () => registerTokenRefresher(null);
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    hydrate()
      .then((authenticated) => {
        if (active) {
          setStatus(authenticated ? 'authenticated' : 'unauthenticated');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('unauthenticated');
        }
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        throw new Error(error.message ?? 'Não foi possível entrar');
      }
      await hydrate();
      setStatus('authenticated');
    },
    [hydrate],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) {
        throw new Error(error.message ?? 'Não foi possível criar sua conta');
      }
      await hydrate();
      setStatus('authenticated');
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    applyToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, [applyToken]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, token, signIn, signUp, signOut }),
    [status, user, token, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PLATFORM_LINKS } from '../constants';

export type PlatformAuthState = {
  loading: boolean;
  loggedIn: boolean;
  mbId: string;
  mbNick: string;
  refresh: () => Promise<void>;
};

const PlatformAuthContext = createContext<PlatformAuthState | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [mbId, setMbId] = useState('');
  const [mbNick, setMbNick] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(PLATFORM_LINKS.walletBalance, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = (await res.json()) as {
        logged_in?: boolean;
        mb_id?: string;
        mb_nick?: string;
      };
      setLoggedIn(Boolean(data.logged_in));
      setMbId(data.mb_id || '');
      setMbNick(data.mb_nick || '');
    } catch {
      setLoggedIn(false);
      setMbId('');
      setMbNick('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ loading, loggedIn, mbId, mbNick, refresh }),
    [loading, loggedIn, mbId, mbNick, refresh],
  );

  return (
    <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthState {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    return {
      loading: false,
      loggedIn: false,
      mbId: '',
      mbNick: '',
      refresh: async () => undefined,
    };
  }
  return ctx;
}

/** 로그인 여부에 따라 로그인 페이지 또는 플랫폼 바로가기 URL */
export function usePlatformEntryHref(): string {
  const { loggedIn } = usePlatformAuth();
  return loggedIn ? PLATFORM_LINKS.system : PLATFORM_LINKS.login;
}

export function usePlatformEntryLabel(guestLabel = '로그인', memberLabel = '플랫폼 입장'): string {
  const { loggedIn, loading } = usePlatformAuth();
  if (loading) return guestLabel;
  return loggedIn ? memberLabel : guestLabel;
}

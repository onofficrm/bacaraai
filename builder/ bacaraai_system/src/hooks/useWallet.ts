import { useCallback, useEffect, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';

export type WalletState = {
  loading: boolean;
  loggedIn: boolean;
  mbId: string;
  mbNick: string;
  balance: number;
};

const initial: WalletState = {
  loading: true,
  loggedIn: false,
  mbId: '',
  mbNick: '',
  balance: 0,
};

const WALLET_SYNC_KEY = 'bacara_wallet_balance_sync';

export default function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(initial);

  const applyBalance = useCallback((balance: number) => {
    setWallet((prev) => ({ ...prev, balance: Math.max(0, Math.floor(balance)) }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(PLATFORM_LINKS.walletBalance, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const data = await res.json();
      setWallet({
        loading: false,
        loggedIn: !!data.logged_in,
        mbId: data.mb_id || '',
        mbNick: data.mb_nick || '',
        balance: Number(data.balance) || 0,
      });
    } catch {
      setWallet((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onBalance = (event: Event) => {
      const detail = (event as CustomEvent<{ balance?: number }>).detail;
      if (typeof detail?.balance === 'number') {
        applyBalance(detail.balance);
      }
    };
    window.addEventListener('bacara-wallet-balance', onBalance as EventListener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WALLET_SYNC_KEY || !event.newValue) return;
      try {
        const data = JSON.parse(event.newValue) as { balance?: number };
        if (typeof data.balance === 'number') applyBalance(data.balance);
      } catch {
        /* ignore malformed cross-tab message */
      }
    };
    const onVisibility = () => {
      // 백그라운드 탭 복귀 시 서버 권위 잔액으로 재동기화
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('bacara-wallet-balance', onBalance as EventListener);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [applyBalance, refresh]);

  return { ...wallet, refresh, applyBalance };
}

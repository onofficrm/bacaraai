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
    return () => {
      window.removeEventListener('bacara-wallet-balance', onBalance as EventListener);
    };
  }, [applyBalance]);

  return { ...wallet, refresh, applyBalance };
}

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    fetch(PLATFORM_LINKS.walletBalance, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setWallet({
          loading: false,
          loggedIn: !!data.logged_in,
          mbId: data.mb_id || '',
          mbNick: data.mb_nick || '',
          balance: Number(data.balance) || 0,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setWallet({ ...initial, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return wallet;
}

import { useEffect, useState } from 'react';
import {
  getSoundState,
  setAmbientEnabled,
  setSoundEnabled,
  setSoundVolume,
  subscribeSoundState,
} from '../audio/sfxEngine';

export default function useSoundSettings() {
  const [snap, setSnap] = useState(() => getSoundState());

  useEffect(() => subscribeSoundState(() => setSnap(getSoundState())), []);

  return {
    enabled: snap.enabled,
    volume: snap.volume,
    ambient: snap.ambient,
    setEnabled: setSoundEnabled,
    setVolume: setSoundVolume,
    setAmbient: setAmbientEnabled,
    toggleEnabled: () => setSoundEnabled(!getSoundState().enabled),
    toggleAmbient: () => setAmbientEnabled(!getSoundState().ambient),
  };
}

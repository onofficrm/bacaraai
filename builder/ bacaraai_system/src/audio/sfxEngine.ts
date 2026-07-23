/**
 * Casino-style SFX via Web Audio API (no binary assets).
 * Rich layered tones, noise bursts, and short arpeggios.
 */

export type SfxName =
  | 'ui'
  | 'nav'
  | 'chip'
  | 'chipHeavy'
  | 'betConfirm'
  | 'skip'
  | 'sessionStart'
  | 'sessionPause'
  | 'sessionStop'
  | 'ruleTrigger'
  | 'aiReady'
  | 'notification'
  | 'risk'
  | 'win'
  | 'loss'
  | 'error'
  | 'tableSelect'
  | 'toggle'
  | 'tick'
  | 'shuffle'
  | 'betWarn'
  | 'betClosed';

type MasterState = {
  enabled: boolean;
  volume: number; // 0..1
  ambient: boolean;
  /** 베팅 마감 5초 카운트 사운드 */
  betCountdown: boolean;
};

const KEY_ENABLED = 'bacara_sfx_enabled';
const KEY_VOLUME = 'bacara_sfx_volume';
const KEY_AMBIENT = 'bacara_sfx_ambient';
const KEY_BET_COUNTDOWN = 'bacara_sfx_bet_countdown';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambientNodes: { stop: () => void } | null = null;
let unlocked = false;

const listeners = new Set<() => void>();

function readState(): MasterState {
  const enabledRaw = localStorage.getItem(KEY_ENABLED);
  const volRaw = localStorage.getItem(KEY_VOLUME);
  const ambientRaw = localStorage.getItem(KEY_AMBIENT);
  const betCdRaw = localStorage.getItem(KEY_BET_COUNTDOWN);
  return {
    enabled: enabledRaw === null ? true : enabledRaw === 'true',
    volume: volRaw === null ? 0.55 : Math.min(1, Math.max(0, Number(volRaw) || 0.55)),
    ambient: ambientRaw === 'true',
    betCountdown: betCdRaw === null ? true : betCdRaw === 'true',
  };
}

let state: MasterState = typeof localStorage !== 'undefined' ? readState() : { enabled: true, volume: 0.55, ambient: false, betCountdown: true };

function notify() {
  listeners.forEach((fn) => fn());
}

export function getSoundState() {
  return { ...state };
}

export function subscribeSoundState(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSoundEnabled(enabled: boolean) {
  state = { ...state, enabled };
  localStorage.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
  if (!enabled) stopAmbient();
  else if (state.ambient) startAmbient();
  applyMasterVolume();
  notify();
}

export function setSoundVolume(volume: number) {
  state = { ...state, volume: Math.min(1, Math.max(0, volume)) };
  localStorage.setItem(KEY_VOLUME, String(state.volume));
  applyMasterVolume();
  notify();
}

export function setAmbientEnabled(ambient: boolean) {
  state = { ...state, ambient };
  localStorage.setItem(KEY_AMBIENT, ambient ? 'true' : 'false');
  if (ambient && state.enabled) startAmbient();
  else stopAmbient();
  notify();
}

export function setBetCountdownSoundEnabled(betCountdown: boolean) {
  state = { ...state, betCountdown };
  localStorage.setItem(KEY_BET_COUNTDOWN, betCountdown ? 'true' : 'false');
  notify();
}

export function isBetCountdownSoundEnabled() {
  return state.enabled && state.betCountdown;
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = state.enabled ? state.volume : 0;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function applyMasterVolume() {
  if (!masterGain || !ctx) return;
  const now = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(state.enabled ? state.volume : 0, now, 0.03);
}

/** Call on first user gesture to unlock iOS/Chrome autoplay policy. */
export async function unlockAudio() {
  const c = ensureCtx();
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = true;
  if (state.ambient && state.enabled) startAmbient();
}

function out() {
  ensureCtx();
  return masterGain!;
}

function noiseBuffer(durationSec: number) {
  const c = ensureCtx();
  const len = Math.floor(c.sampleRate * durationSec);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    decay?: number;
    detune?: number;
    filterFreq?: number;
  } = {},
) {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);
  filter.type = 'lowpass';
  filter.frequency.value = opts.filterFreq || 6000;
  const peak = opts.gain ?? 0.2;
  const attack = opts.attack ?? 0.008;
  const decay = opts.decay ?? dur;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.01, decay));
  osc.connect(filter);
  filter.connect(g);
  g.connect(out());
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noiseBurst(
  start: number,
  dur: number,
  opts: { gain?: number; freq?: number; q?: number; type?: BiquadFilterType } = {},
) {
  const c = ensureCtx();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(Math.max(dur, 0.05));
  const filter = c.createBiquadFilter();
  filter.type = opts.type || 'bandpass';
  filter.frequency.value = opts.freq || 1800;
  filter.Q.value = opts.q || 1.2;
  const g = c.createGain();
  const peak = opts.gain ?? 0.15;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out());
  src.start(start);
  src.stop(start + dur + 0.02);
}

function playPattern(name: SfxName) {
  if (!state.enabled || state.volume <= 0.001) return;
  const c = ensureCtx();
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.01;

  switch (name) {
    case 'ui':
      tone(880, t, 0.06, { type: 'triangle', gain: 0.08, decay: 0.06 });
      break;
    case 'nav':
      tone(520, t, 0.05, { type: 'sine', gain: 0.07, decay: 0.05 });
      tone(780, t + 0.04, 0.07, { type: 'sine', gain: 0.06, decay: 0.07 });
      break;
    case 'toggle':
      tone(660, t, 0.05, { type: 'square', gain: 0.04, decay: 0.05, filterFreq: 2000 });
      tone(990, t + 0.05, 0.08, { type: 'square', gain: 0.035, decay: 0.08, filterFreq: 2400 });
      break;
    case 'tick':
      noiseBurst(t, 0.03, { gain: 0.06, freq: 4200, q: 4 });
      tone(2400, t, 0.025, { type: 'square', gain: 0.03, decay: 0.025, filterFreq: 5000 });
      break;
    case 'betWarn':
      // 기본형 — playBetCountdownTick 이 초별로 더 정확히 재생
      noiseBurst(t, 0.035, { gain: 0.08, freq: 3800, q: 5 });
      tone(1600, t, 0.04, { type: 'square', gain: 0.05, decay: 0.04, filterFreq: 4500 });
      break;
    case 'betClosed': {
      // 청량한 띵~ (밝은 종소리, 짧게 울리다가 여운)
      tone(2093.0, t, 0.65, {
        type: 'sine',
        gain: 0.16,
        attack: 0.004,
        decay: 0.62,
        filterFreq: 9000,
      });
      tone(3139.5, t, 0.45, {
        type: 'sine',
        gain: 0.055,
        attack: 0.005,
        decay: 0.42,
        filterFreq: 10000,
      });
      tone(4186.0, t + 0.008, 0.32, {
        type: 'sine',
        gain: 0.03,
        attack: 0.004,
        decay: 0.3,
        filterFreq: 12000,
      });
      // 아주 약한 하이 쉬머
      tone(5274.0, t + 0.012, 0.18, {
        type: 'sine',
        gain: 0.016,
        attack: 0.003,
        decay: 0.16,
        filterFreq: 14000,
      });
      break;
    }
    case 'chip':
      noiseBurst(t, 0.06, { gain: 0.18, freq: 3200, q: 2.5 });
      tone(1400, t, 0.08, { type: 'triangle', gain: 0.1, decay: 0.08 });
      tone(2100, t + 0.02, 0.05, { type: 'sine', gain: 0.06, decay: 0.05 });
      break;
    case 'chipHeavy':
      noiseBurst(t, 0.1, { gain: 0.22, freq: 1800, q: 1.8 });
      tone(420, t, 0.12, { type: 'triangle', gain: 0.12, decay: 0.12 });
      tone(840, t + 0.03, 0.1, { type: 'sine', gain: 0.08, decay: 0.1 });
      tone(1260, t + 0.06, 0.08, { type: 'sine', gain: 0.05, decay: 0.08 });
      break;
    case 'betConfirm':
      tone(523.25, t, 0.12, { type: 'triangle', gain: 0.12, decay: 0.12 });
      tone(659.25, t + 0.08, 0.12, { type: 'triangle', gain: 0.11, decay: 0.12 });
      tone(783.99, t + 0.16, 0.18, { type: 'sine', gain: 0.14, decay: 0.2 });
      tone(1046.5, t + 0.22, 0.25, { type: 'sine', gain: 0.1, decay: 0.28 });
      noiseBurst(t + 0.2, 0.08, { gain: 0.08, freq: 4000, q: 3 });
      break;
    case 'skip':
      tone(480, t, 0.08, { type: 'sine', gain: 0.07, decay: 0.08 });
      tone(360, t + 0.06, 0.12, { type: 'sine', gain: 0.06, decay: 0.12 });
      break;
    case 'sessionStart': {
      const notes = [392, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((f, i) => {
        tone(f, t + i * 0.07, 0.22, { type: 'triangle', gain: 0.11 - i * 0.008, decay: 0.25 });
        tone(f * 2, t + i * 0.07 + 0.02, 0.15, { type: 'sine', gain: 0.04, decay: 0.18 });
      });
      noiseBurst(t + 0.28, 0.12, { gain: 0.1, freq: 2500, q: 1.5 });
      break;
    }
    case 'sessionPause':
      tone(660, t, 0.1, { type: 'sine', gain: 0.08, decay: 0.1 });
      tone(440, t + 0.1, 0.18, { type: 'sine', gain: 0.07, decay: 0.18 });
      break;
    case 'sessionStop':
      tone(392, t, 0.12, { type: 'triangle', gain: 0.1, decay: 0.12 });
      tone(311, t + 0.1, 0.14, { type: 'triangle', gain: 0.09, decay: 0.14 });
      tone(196, t + 0.22, 0.28, { type: 'sine', gain: 0.1, decay: 0.3 });
      noiseBurst(t + 0.2, 0.15, { gain: 0.08, freq: 600, q: 0.8, type: 'lowpass' });
      break;
    case 'ruleTrigger':
      tone(880, t, 0.08, { type: 'square', gain: 0.07, decay: 0.08, filterFreq: 2800 });
      tone(1174, t + 0.09, 0.1, { type: 'square', gain: 0.08, decay: 0.1, filterFreq: 3200 });
      tone(1318, t + 0.2, 0.22, { type: 'triangle', gain: 0.12, decay: 0.25 });
      noiseBurst(t, 0.05, { gain: 0.1, freq: 5000, q: 5 });
      break;
    case 'aiReady':
      tone(740, t, 0.1, { type: 'sine', gain: 0.09, decay: 0.1 });
      tone(988, t + 0.1, 0.14, { type: 'sine', gain: 0.1, decay: 0.16 });
      tone(1480, t + 0.2, 0.2, { type: 'triangle', gain: 0.07, decay: 0.22 });
      break;
    case 'notification':
      tone(1046, t, 0.08, { type: 'sine', gain: 0.09, decay: 0.08 });
      tone(1318, t + 0.1, 0.18, { type: 'sine', gain: 0.1, decay: 0.2 });
      break;
    case 'risk':
      tone(220, t, 0.18, { type: 'sawtooth', gain: 0.08, decay: 0.18, filterFreq: 900 });
      tone(185, t + 0.16, 0.22, { type: 'sawtooth', gain: 0.09, decay: 0.22, filterFreq: 800 });
      tone(165, t + 0.34, 0.35, { type: 'square', gain: 0.07, decay: 0.35, filterFreq: 700 });
      noiseBurst(t + 0.05, 0.2, { gain: 0.12, freq: 400, q: 0.7, type: 'lowpass' });
      break;
    case 'win': {
      const winNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
      winNotes.forEach((f, i) => {
        tone(f, t + i * 0.065, 0.28, { type: 'triangle', gain: 0.1, decay: 0.32 });
        tone(f * 2, t + i * 0.065 + 0.01, 0.18, { type: 'sine', gain: 0.035, decay: 0.2 });
      });
      noiseBurst(t + 0.35, 0.15, { gain: 0.12, freq: 4500, q: 2 });
      break;
    }
    case 'loss':
      tone(392, t, 0.2, { type: 'sawtooth', gain: 0.08, decay: 0.2, filterFreq: 1200 });
      tone(311.13, t + 0.15, 0.25, { type: 'sawtooth', gain: 0.09, decay: 0.25, filterFreq: 1000 });
      tone(233.08, t + 0.32, 0.45, { type: 'triangle', gain: 0.11, decay: 0.5 });
      noiseBurst(t + 0.1, 0.25, { gain: 0.1, freq: 250, q: 0.6, type: 'lowpass' });
      break;
    case 'error':
      tone(180, t, 0.12, { type: 'square', gain: 0.07, decay: 0.12, filterFreq: 600 });
      tone(160, t + 0.14, 0.12, { type: 'square', gain: 0.07, decay: 0.12, filterFreq: 600 });
      tone(140, t + 0.28, 0.25, { type: 'square', gain: 0.08, decay: 0.25, filterFreq: 500 });
      break;
    case 'tableSelect':
      tone(620, t, 0.06, { type: 'sine', gain: 0.07, decay: 0.06 });
      tone(930, t + 0.05, 0.1, { type: 'triangle', gain: 0.08, decay: 0.1 });
      break;
    case 'shuffle':
      noiseBurst(t, 0.18, { gain: 0.14, freq: 2200, q: 1.1 });
      noiseBurst(t + 0.08, 0.14, { gain: 0.1, freq: 1600, q: 1.4 });
      noiseBurst(t + 0.16, 0.1, { gain: 0.08, freq: 2800, q: 2 });
      break;
    default:
      break;
  }
}

const lastPlayed = new Map<SfxName, number>();

export function playSfx(name: SfxName, opts?: { throttleMs?: number }) {
  const throttle = opts?.throttleMs ?? (name === 'chip' || name === 'tick' || name === 'ui' || name === 'betWarn' ? 40 : 0);
  const now = performance.now();
  if (throttle > 0) {
    const prev = lastPlayed.get(name) || 0;
    if (now - prev < throttle) return;
  }
  lastPlayed.set(name, now);
  try {
    playPattern(name);
  } catch {
    /* ignore audio errors */
  }
}

/**
 * 베팅 마감 카운트 틱 (5→1). remainingSec 가 작을수록 음이 높아짐.
 */
export function playBetCountdownTick(remainingSec: number) {
  if (!state.enabled || !state.betCountdown || state.volume <= 0.001) return;
  const sec = Math.max(1, Math.min(5, Math.floor(remainingSec)));
  try {
    const c = ensureCtx();
    if (c.state === 'suspended') void c.resume();
    const t = c.currentTime + 0.01;

    // 마지막 1초: 청량한 짧은 띵
    if (sec === 1) {
      tone(2093, t, 0.28, {
        type: 'sine',
        gain: 0.11,
        attack: 0.004,
        decay: 0.26,
        filterFreq: 9000,
      });
      tone(3139.5, t, 0.18, {
        type: 'sine',
        gain: 0.04,
        attack: 0.004,
        decay: 0.16,
        filterFreq: 10000,
      });
      return;
    }

    const urgent = sec <= 2;
    const freq = 1100 + (5 - sec) * 320;
    const gain = urgent ? 0.09 : 0.055 + (5 - sec) * 0.008;
    noiseBurst(t, urgent ? 0.045 : 0.03, {
      gain: urgent ? 0.11 : 0.07,
      freq: 3200 + (5 - sec) * 400,
      q: 5,
    });
    tone(freq, t, urgent ? 0.055 : 0.035, {
      type: 'square',
      gain,
      decay: urgent ? 0.055 : 0.035,
      filterFreq: 5200,
    });
  } catch {
    /* ignore */
  }
}

export function playBetClosed() {
  if (!state.enabled || !state.betCountdown || state.volume <= 0.001) return;
  playSfx('betClosed', { throttleMs: 800 });
}

function startAmbient() {
  if (ambientNodes || !state.enabled || !state.ambient) return;
  const c = ensureCtx();
  if (c.state === 'suspended') return;

  const bed = c.createOscillator();
  const bed2 = c.createOscillator();
  const bedGain = c.createGain();
  const filter = c.createBiquadFilter();
  bed.type = 'sine';
  bed2.type = 'sine';
  bed.frequency.value = 55;
  bed2.frequency.value = 82.5;
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  bedGain.gain.value = 0.0001;
  bed.connect(filter);
  bed2.connect(filter);
  filter.connect(bedGain);
  bedGain.connect(out());
  bed.start();
  bed2.start();
  bedGain.gain.linearRampToValueAtTime(0.035, c.currentTime + 1.5);

  let alive = true;
  const pulse = () => {
    if (!alive || !state.ambient || !state.enabled) return;
    const now = c.currentTime;
    // Soft distant "table" murmur ticks
    if (Math.random() > 0.4) {
      noiseBurst(now, 0.04 + Math.random() * 0.04, {
        gain: 0.015 + Math.random() * 0.02,
        freq: 1200 + Math.random() * 1800,
        q: 2,
      });
    }
    const delay = 1800 + Math.random() * 3200;
    window.setTimeout(pulse, delay);
  };
  window.setTimeout(pulse, 2000);

  ambientNodes = {
    stop: () => {
      alive = false;
      try {
        bedGain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.4);
        bed.stop(c.currentTime + 0.5);
        bed2.stop(c.currentTime + 0.5);
      } catch {
        /* ignore */
      }
    },
  };
}

function stopAmbient() {
  if (!ambientNodes) return;
  ambientNodes.stop();
  ambientNodes = null;
}

export function previewSfx(name: SfxName) {
  void unlockAudio().then(() => playSfx(name));
}

export function installAudioUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  const unlock = () => {
    void unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  // iOS Safari: touchstart 가 더 안정적으로 AudioContext 잠금 해제
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}

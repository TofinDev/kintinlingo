import type { AgeGroup } from '../types';

let cachedVoice: SpeechSynthesisVoice | null = null;

function isChildOrFemaleVoice(name: string): number {
  const lower = name.toLowerCase();
  // Highest priority: real neural child voice (e.g. Microsoft Ana Online on Edge/Windows)
  if (lower.includes('ana') || lower.includes('child') || lower.includes('kid')) return 4;
  // Next: Google female voices in Chrome
  if (lower.includes('google uk english female') || lower.includes('google us english')) return 3;
  // Next: Natural / Online female voices
  if (
    (lower.includes('natural') || lower.includes('online')) &&
    !/\bmale\b/.test(lower)
  ) {
    return 2;
  }
  // Standard female voices
  const femaleKeywords = [
    'female',
    'aria',
    'jenny',
    'sonia',
    'libby',
    'clara',
    'michelle',
    'ava',
    'emma',
    'zira',
    'hazel',
    'susan',
    'samantha',
    'karen',
    'victoria',
  ];
  if (femaleKeywords.some((kw) => lower.includes(kw))) return 1;
  return 0;
}

function pickBestKidEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const enVoices = voices.filter((v) => v.lang.startsWith('en'));
  if (!enVoices.length) return null;

  const sorted = [...enVoices].sort(
    (a, b) => isChildOrFemaleVoice(b.name) - isChildOrFemaleVoice(a.name)
  );
  return sorted[0];
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoice = pickBestKidEnglishVoice();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = pickBestKidEnglishVoice();
  });
}

export function getActiveVoiceName(): string {
  const voice = cachedVoice ?? pickBestKidEnglishVoice();
  return voice ? voice.name : 'Kid Voice (Default)';
}

export function speakEnglish(text: string, ageGroup: AgeGroup = 'lower_primary'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';

  const voice = cachedVoice ?? pickBestKidEnglishVoice();
  if (voice) {
    cachedVoice = voice;
    utterance.voice = voice;
  }

  // If the OS/browser already provides a native child voice (like Microsoft Ana), keep pitch natural (1.05).
  // Otherwise raise pitch gently to 1.32 for a cheerful, natural kid-like voice.
  const isNativeChild =
    voice &&
    (voice.name.toLowerCase().includes('ana') ||
      voice.name.toLowerCase().includes('child') ||
      voice.name.toLowerCase().includes('kid'));

  utterance.pitch = isNativeChild ? 1.05 : 1.32;
  utterance.rate = ageGroup === 'kindergarten' ? 0.92 : ageGroup === 'lower_primary' ? 0.97 : 1.0;

  window.speechSynthesis.speak(utterance);
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function playTone(type: 'correct' | 'wrong' | 'complete'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const playNote = (freq: number, start: number, duration: number, wave: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.14, now + start);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration);
  };

  if (type === 'correct') {
    playNote(523.25, 0, 0.14); // C5
    playNote(659.25, 0.1, 0.22); // E5
  } else if (type === 'wrong') {
    playNote(280, 0, 0.16, 'triangle');
    playNote(220, 0.12, 0.22, 'triangle');
  } else if (type === 'complete') {
    playNote(523.25, 0, 0.15);
    playNote(659.25, 0.12, 0.15);
    playNote(783.99, 0.24, 0.15);
    playNote(1046.5, 0.36, 0.35);
  }
}

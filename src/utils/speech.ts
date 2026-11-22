import type { AgeGroup } from '../types';

const VOICE_SETTINGS_KEY = 'kintin_lingo_voice_settings_v1';

export type VoicePreset = 'kid' | 'female' | 'male' | 'custom';

export interface VoiceSettings {
  preset: VoicePreset;
  customVoiceName?: string;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  cachedVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  return cachedVoices.length > 0 ? cachedVoices : refreshVoices();
}

export function getVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
      if (parsed.preset) {
        return {
          preset: parsed.preset,
          customVoiceName: parsed.customVoiceName,
        };
      }
    }
  } catch {
    // ignore
  }
  return { preset: 'kid' };
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function scoreVoiceForPreset(name: string, preset: 'kid' | 'female' | 'male'): number {
  const lower = name.toLowerCase();
  const isMale = /\bmale\b/.test(lower) || ['david', 'mark', 'george', 'ryan', 'guy', 'daniel'].some((k) => lower.includes(k));
  const isNatural = lower.includes('natural') || lower.includes('online') || lower.includes('google');

  if (preset === 'male') {
    if (isMale && isNatural) return 4;
    if (isMale) return 3;
    return 0;
  }

  if (preset === 'kid') {
    if (lower.includes('ana') || lower.includes('child') || lower.includes('kid')) return 5;
  }

  // kid or female
  if (lower.includes('google uk english female') || lower.includes('google us english')) return 4;
  if (!isMale && isNatural) return 3;
  if (!isMale) return 2;
  return 0;
}

function pickVoice(settings: VoiceSettings): SpeechSynthesisVoice | null {
  const voices = getAvailableEnglishVoices();
  if (!voices.length) return null;

  if (settings.preset === 'custom' && settings.customVoiceName) {
    const exact = voices.find((v) => v.name === settings.customVoiceName);
    if (exact) return exact;
  }

  const targetPreset = settings.preset === 'custom' ? 'female' : settings.preset;
  const sorted = [...voices].sort(
    (a, b) => scoreVoiceForPreset(b.name, targetPreset) - scoreVoiceForPreset(a.name, targetPreset)
  );
  return sorted[0];
}

export function getPresetLabel(settings: VoiceSettings): string {
  switch (settings.preset) {
    case 'kid':
      return '👧 เสียงเด็ก';
    case 'female':
      return '👩 เสียงผู้หญิง';
    case 'male':
      return '👨 เสียงผู้ชาย';
    case 'custom':
      return '🎙️ กำหนดเอง';
  }
}

export function speakEnglish(
  text: string,
  ageGroup: AgeGroup = 'lower_primary',
  overrideSettings?: VoiceSettings
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const settings = overrideSettings ?? getVoiceSettings();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';

  const voice = pickVoice(settings);
  if (voice) {
    utterance.voice = voice;
  }

  const isNativeChild =
    voice &&
    (voice.name.toLowerCase().includes('ana') ||
      voice.name.toLowerCase().includes('child') ||
      voice.name.toLowerCase().includes('kid'));

  if (settings.preset === 'kid') {
    utterance.pitch = isNativeChild ? 1.05 : 1.32;
  } else if (settings.preset === 'male') {
    utterance.pitch = 0.92;
  } else {
    utterance.pitch = 1.0;
  }

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

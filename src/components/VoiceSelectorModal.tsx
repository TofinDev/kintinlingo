import React, { useEffect, useState } from 'react';
import type { AgeGroup } from '../types';
import {
  getAvailableEnglishVoices,
  speakEnglish,
  type VoicePreset,
  type VoiceSettings,
} from '../utils/speech';
import { Check, Volume2, X } from 'lucide-react';

interface VoiceSelectorModalProps {
  settings: VoiceSettings;
  ageGroup: AgeGroup;
  onChange: (next: VoiceSettings) => void;
  onClose: () => void;
}

const PRESETS: { id: Exclude<VoicePreset, 'custom'>; emoji: string; title: string; desc: string }[] = [
  { id: 'kid', emoji: '👧', title: 'เสียงเด็ก', desc: 'สดใส น่ารัก เหมาะกับเด็ก' },
  { id: 'female', emoji: '👩', title: 'เสียงผู้หญิง', desc: 'นุ่มนวล ชัดเจน' },
  { id: 'male', emoji: '👨', title: 'เสียงผู้ชาย', desc: 'ทุ้ม ฟังสบาย' },
];

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  settings,
  ageGroup,
  onChange,
  onClose,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    getAvailableEnglishVoices()
  );

  useEffect(() => {
    const update = () => setVoices(getAvailableEnglishVoices());
    update();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', update);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
    }
  }, []);

  const handleSelectPreset = (preset: Exclude<VoicePreset, 'custom'>) => {
    const next: VoiceSettings = { preset };
    onChange(next);
    speakEnglish('Hello! Welcome to Kintin Kids!', ageGroup, next);
  };

  const handleSelectCustomVoice = (voiceName: string) => {
    const next: VoiceSettings = { preset: 'custom', customVoiceName: voiceName };
    onChange(next);
    speakEnglish('Hello! Welcome to Kintin Kids!', ageGroup, next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-card-pop w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">เลือกเสียงอ่าน</h2>
              <p className="text-xs text-slate-500">เลือกโทนเสียงที่ชอบแล้วลองกดฟังได้เลย</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset Options */}
        <div className="space-y-2.5">
          {PRESETS.map((p) => {
            const active = settings.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`flex w-full items-center justify-between rounded-2xl border-2 p-3.5 text-left transition ${
                  active
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <div className="font-bold text-slate-900">{p.title}</div>
                    <div className="text-xs text-slate-500">{p.desc}</div>
                  </div>
                </div>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Specific Browser/Device Voices */}
        {voices.length > 0 && (
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              หรือเลือกเสียงเฉพาะในเครื่อง/เบราว์เซอร์ ({voices.length} เสียง)
            </label>
            <select
              value={settings.preset === 'custom' ? settings.customVoiceName ?? '' : ''}
              onChange={(e) => {
                if (e.target.value) handleSelectCustomVoice(e.target.value);
              }}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="">-- เลือกเสียงจากระบบ --</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Test + Done */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => speakEnglish('Apple, banana, cat, dog!', ageGroup, settings)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <Volume2 className="h-4 w-4" />
            ทดลองฟังเสียง
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

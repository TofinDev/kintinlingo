import React from 'react';
import { CURRICULUM } from '../data/curriculum';
import type { AgeGroup, GradeId, GradeLevel } from '../types';
import { AVATARS } from '../utils/storage';
import { resizeImageToDataUrl } from '../utils/image';
import { AvatarDisplay } from './AvatarDisplay';
import { Camera, Check, Sparkles } from 'lucide-react';

interface GradeSelectorProps {
  selectedGrade: GradeId;
  selectedAvatar: string;
  onSelectGrade: (gradeId: GradeId) => void;
  onSelectAvatar: (avatar: string) => void;
  onClose?: () => void;
}

const GROUPS: { key: AgeGroup; title: string; subtitle: string; badge: string }[] = [
  {
    key: 'kindergarten',
    title: '🌱 ช่วงปฐมวัย (อนุบาล 1 – 3)',
    subtitle: 'เน้นฟังเสียง จำภาพ ปุ่มใหญ่ สีสันสดใส ไม่เน้นอ่านเยอะ',
    badge: 'Audio & Visual',
  },
  {
    key: 'lower_primary',
    title: '📘 ช่วงประถมต้น (ป.1 – ป.3)',
    subtitle: 'เริ่มสะกดคำ Phonics คำศัพท์รอบตัว และประโยคสั้นๆ',
    badge: 'Pre-A1 Starters',
  },
  {
    key: 'upper_primary',
    title: '🚀 ช่วงประถมปลาย (ป.4 – ป.6)',
    subtitle: 'คำศัพท์สื่อสาร เติมคำในประโยค และเตรียมความพร้อมเข้า ม.1',
    badge: 'A1 Movers – A2 Flyers',
  },
];

export const GradeSelector: React.FC<GradeSelectorProps> = ({
  selectedGrade,
  selectedAvatar,
  onSelectGrade,
  onSelectAvatar,
  onClose,
}) => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">
          <Sparkles className="h-4 w-4" />
          เลือกได้อิสระ เปลี่ยนระดับชั้นได้ตลอดเวลา
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl">
          เลือกระดับชั้นที่ต้องการเรียน
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          ระบบจะปรับรูปแบบเกม ความเร็วเสียงอ่าน และความยากให้เหมาะกับวัยโดยอัตโนมัติ
        </p>
      </div>

      {/* Avatar Picker */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 text-center text-sm font-semibold text-slate-700">
          เลือกตัวละครคู่ใจ หรือ อัพโหลดรูปภาพของคุณ
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {AVATARS.map((av) => {
            const active = av === selectedAvatar;
            return (
              <button
                key={av}
                onClick={() => onSelectAvatar(av)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all sm:h-14 sm:w-14 sm:text-3xl ${
                  active
                    ? 'scale-110 bg-indigo-600 shadow-md ring-4 ring-indigo-200'
                    : 'bg-slate-100 hover:scale-105 hover:bg-slate-200'
                }`}
                aria-label={`เลือกตัวละคร ${av}`}
              >
                {av}
              </button>
            );
          })}

          <label
            className={`flex h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed px-4 text-xs font-bold transition sm:h-14 sm:text-sm ${
              selectedAvatar.startsWith('data:image')
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50'
            }`}
          >
            {selectedAvatar.startsWith('data:image') ? (
              <AvatarDisplay
                avatar={selectedAvatar}
                className="h-9 w-9 rounded-xl"
              />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <span>{selectedAvatar.startsWith('data:image') ? 'เปลี่ยนรูปภาพ' : 'อัพโหลดรูป'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await resizeImageToDataUrl(file);
                  onSelectAvatar(dataUrl);
                } catch {
                  // Ignore invalid file
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Grade Groups */}
      <div className="space-y-8">
        {GROUPS.map((group) => {
          const grades: GradeLevel[] = CURRICULUM.filter((g) => g.ageGroup === group.key);
          return (
            <section key={group.key}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 sm:text-xl">{group.title}</h2>
                  <p className="text-xs text-slate-500 sm:text-sm">{group.subtitle}</p>
                </div>
                <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  {group.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {grades.map((grade) => {
                  const isSelected = grade.id === selectedGrade;
                  return (
                    <button
                      key={grade.id}
                      onClick={() => onSelectGrade(grade.id)}
                      className={`group relative flex flex-col justify-between rounded-3xl border-2 p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                        isSelected
                          ? 'border-indigo-500 bg-white shadow-md ring-4 ring-indigo-100'
                          : 'border-slate-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                          <Check className="h-4 w-4" />
                        </span>
                      )}

                      <div>
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grade.gradient} text-2xl shadow-sm`}
                          >
                            {grade.badgeEmoji}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-slate-900">{grade.nameTh}</div>
                            <div className="text-xs font-medium text-slate-500">
                              อายุ {grade.ageRange} • {grade.cefr}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">{grade.focusTh}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${grade.accentBg} ${grade.accentText}`}>
                          เป้าหมาย: {grade.targetVocab}
                        </span>
                        <span className="font-semibold text-indigo-600 group-hover:underline">
                          เข้าเรียน →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {onClose && (
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-200/70"
          >
            กลับไปหน้าบทเรียน
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import type { AgeGroup, Lesson } from '../types';
import { speakEnglish } from '../utils/speech';
import { ArrowLeft, ArrowRight, CheckCircle2, Gamepad2, Volume2 } from 'lucide-react';

interface FlashcardModeProps {
  lesson: Lesson;
  ageGroup: AgeGroup;
  onMarkLearned: (wordId: string) => void;
  onFinishToQuiz: () => void;
  onBack: () => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  lesson,
  ageGroup,
  onMarkLearned,
  onFinishToQuiz,
  onBack,
}) => {
  const [index, setIndex] = useState(0);
  const word = lesson.words[index];
  const isLast = index === lesson.words.length - 1;

  useEffect(() => {
    if (word) {
      speakEnglish(word.word, ageGroup);
      onMarkLearned(word.id);
    }
  }, [index, word, ageGroup, onMarkLearned]);

  if (!word) return null;

  const isKindergarten = ageGroup === 'kindergarten';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>

        <div className="text-center">
          <div className="text-xs font-semibold text-slate-500">{lesson.titleTh}</div>
          <div className="text-sm font-bold text-slate-800">
            คำที่ {index + 1} / {lesson.words.length}
          </div>
        </div>

        <div className="w-16" />
      </div>

      {/* Progress Dots */}
      <div className="mb-6 flex justify-center gap-2">
        {lesson.words.map((w, i) => (
          <button
            key={w.id}
            onClick={() => setIndex(i)}
            className={`h-2.5 rounded-full transition-all ${
              i === index
                ? 'w-8 bg-indigo-600'
                : i < index
                  ? 'w-2.5 bg-emerald-400'
                  : 'w-2.5 bg-slate-200'
            }`}
            aria-label={`คำที่ ${i + 1}`}
          />
        ))}
      </div>

      {/* Main Flashcard */}
      <div
        key={word.id}
        className="animate-card-pop rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-lg sm:p-10"
      >
        <button
          type="button"
          onClick={() => speakEnglish(word.word, ageGroup)}
          className="group relative mx-auto mb-5 flex h-44 w-44 cursor-pointer flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-sky-50 to-pink-50 shadow-inner ring-2 ring-indigo-100 transition hover:scale-105 hover:ring-indigo-300 active:scale-95 sm:h-52 sm:w-52"
          title="แตะที่รูปเพื่อฟังเสียง"
        >
          <span className="animate-bounce-soft text-8xl sm:text-9xl">{word.emoji}</span>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 shadow-sm">
            <Volume2 className="h-3.5 w-3.5" />
            แตะรูปฟังเสียง
          </span>
        </button>

        {!isKindergarten && (
          <span className="mb-2 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {word.phonicsOrPos}
          </span>
        )}

        <h2
          onClick={() => speakEnglish(word.word, ageGroup)}
          className="font-en cursor-pointer text-5xl font-bold tracking-wide text-slate-900 transition hover:text-indigo-600 sm:text-6xl"
        >
          {word.word}
        </h2>

        <p className="mt-3 text-3xl font-bold text-indigo-600 sm:text-4xl">{word.thai}</p>

        {/* Big Speak button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => speakEnglish(word.word, ageGroup)}
            className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-lg transition hover:bg-indigo-700 active:scale-95 sm:w-auto"
          >
            <Volume2 className="h-7 w-7" />
            กดฟังเสียงอ่าน
          </button>
        </div>

        {/* Example sentence for Primary (and optional smaller hint for Kindergarten) */}
        {!isKindergarten ? (
          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ตัวอย่างประโยค
              </span>
              <button
                type="button"
                onClick={() => speakEnglish(word.exampleEn, ageGroup)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              >
                <Volume2 className="h-4 w-4" />
                ฟังประโยค
              </button>
            </div>
            <p className="font-en mt-2 text-lg font-semibold text-slate-800 sm:text-xl">
              “{word.exampleEn}”
            </p>
            <p className="mt-1 text-base text-slate-600">{word.exampleTh}</p>
          </div>
        ) : (
          <div className="mt-5 text-xs font-medium text-slate-400">
            แตะที่รูปสัตว์/ภาพ หรือปุ่มสีน้ำเงินใหญ่ด้านบนเพื่อฟังเสียงได้เลย!
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          คำก่อนหน้า
        </button>

        {!isLast ? (
          <button
            onClick={() => setIndex((i) => Math.min(lesson.words.length - 1, i + 1))}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600"
          >
            คำถัดไป
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onFinishToQuiz}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-600"
          >
            <Gamepad2 className="h-5 w-5" />
            เล่นเกมทบทวนเลย!
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

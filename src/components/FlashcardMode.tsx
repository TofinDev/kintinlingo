import React, { useEffect, useRef, useState } from 'react';
import type { AgeGroup, Lesson } from '../types';
import { speakEnglish } from '../utils/speech';
import { HoloStage3D } from './HoloStage3D';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Volume2,
} from 'lucide-react';

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
  const touchStartXRef = useRef<number | null>(null);
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

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (!isLast) {
      setIndex((i) => Math.min(lesson.words.length - 1, i + 1));
    } else {
      onFinishToQuiz();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const dx = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else if (index > 0) goPrev();
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
      {/* Compact Header */}
      <div className="mb-3 flex items-center justify-between sm:mb-5">
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

      {/* Progress Bar / Dots */}
      {lesson.words.length <= 12 ? (
        <div className="mb-4 flex justify-center gap-2">
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
      ) : (
        <div className="mb-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 shadow-inner">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((index + 1) / lesson.words.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Flashcard with Floating Left/Right Thumb Buttons */}
      <div
        key={word.id}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="animate-card-pop relative rounded-3xl border-2 border-slate-200 bg-white/95 px-5 py-5 text-center shadow-xl backdrop-blur-md sm:p-9"
      >
        {/* Left Side Thumb Button */}
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="คำก่อนหน้า"
          className="absolute top-1/2 -left-2.5 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50 active:scale-90 disabled:opacity-30 sm:-left-5 sm:h-16 sm:w-16"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        {/* Right Side Thumb Button */}
        <button
          type="button"
          onClick={goNext}
          aria-label={isLast ? 'เล่นเกมทบทวน' : 'คำถัดไป'}
          className={`absolute top-1/2 -right-2.5 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition active:scale-90 sm:-right-5 sm:h-16 sm:w-16 ${
            isLast
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          <ChevronRight className="h-8 w-8" />
        </button>

        <HoloStage3D
          word={word.word}
          emoji={word.emoji}
          onTap={() => speakEnglish(word.word, ageGroup)}
        />
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
          <Volume2 className="h-3.5 w-3.5" />
          แตะที่รูปภาพเพื่อฟังเสียง
        </div>

        {!isKindergarten && (
          <div className="mb-1">
            <span className="inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700">
              {word.phonicsOrPos}
            </span>
          </div>
        )}

        <h2
          onClick={() => speakEnglish(word.word, ageGroup)}
          className="font-en cursor-pointer text-4xl font-bold tracking-wide text-slate-900 transition hover:text-indigo-600 sm:text-6xl"
        >
          {word.word}
        </h2>

        <p className="mt-2 text-2xl font-bold text-indigo-600 sm:text-4xl">{word.thai}</p>

        {/* Big Speak button */}
        <div className="mt-4 flex justify-center sm:mt-6">
          <button
            type="button"
            onClick={() => speakEnglish(word.word, ageGroup)}
            className="inline-flex w-full items-center justify-center gap-3 rounded-3xl border-b-4 border-indigo-800 bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700 active:translate-y-0.5 active:border-b-0 sm:w-auto sm:px-10 sm:py-5 sm:text-xl"
          >
            <Volume2 className="h-6 w-6 sm:h-7 sm:w-7" />
            กดฟังเสียงอ่าน
          </button>
        </div>

        {/* Example sentence for Primary */}
        {!isKindergarten && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 text-left ring-1 ring-slate-200/70 sm:mt-6 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ตัวอย่างประโยค
              </span>
              <button
                type="button"
                onClick={() => speakEnglish(word.exampleEn, ageGroup)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 sm:text-sm"
              >
                <Volume2 className="h-4 w-4" />
                ฟังประโยค
              </button>
            </div>
            <p className="font-en mt-1.5 text-base font-semibold text-slate-800 sm:text-xl">
              “{word.exampleEn}”
            </p>
            <p className="mt-0.5 text-sm text-slate-600 sm:text-base">{word.exampleTh}</p>
          </div>
        )}

        {/* Inside-Card Easy Bottom Navigation Bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 sm:text-base"
          >
            <ArrowLeft className="h-5 w-5" />
            คำก่อนหน้า
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:translate-y-0.5 active:border-b-0 sm:text-base"
            >
              คำถัดไป
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinishToQuiz}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-b-4 border-amber-700 bg-amber-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 active:translate-y-0.5 active:border-b-0 sm:text-base"
            >
              <Gamepad2 className="h-5 w-5" />
              เล่นเกมเลย!
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

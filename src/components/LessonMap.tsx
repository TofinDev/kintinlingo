import React from 'react';
import type { GradeLevel, Lesson, UserProgress } from '../types';
import { BookOpen, Gamepad2, RotateCcw, Star, Trophy } from 'lucide-react';
import { Buddy3D } from './Buddy3D';

interface LessonMapProps {
  grade: GradeLevel;
  progress: UserProgress;
  onStartLearn: (lesson: Lesson) => void;
  onStartQuiz: (lesson: Lesson) => void;
  onStartReview: () => void;
  onChangeGrade: () => void;
}

export const LessonMap: React.FC<LessonMapProps> = ({
  grade,
  progress,
  onStartLearn,
  onStartQuiz,
  onStartReview,
  onChangeGrade,
}) => {
  const totalWordsInGrade = grade.lessons.reduce((sum, l) => sum + l.words.length, 0);
  const learnedInGrade = grade.lessons.reduce(
    (sum, l) => sum + l.words.filter((w) => progress.learnedWords.includes(w.id)).length,
    0
  );
  const percent = totalWordsInGrade > 0 ? Math.round((learnedInGrade / totalWordsInGrade) * 100) : 0;

  const modeLabel =
    grade.ageGroup === 'kindergarten'
      ? '🐣 โหมดปฐมวัย: เน้นภาพ + เสียงฟังง่าย'
      : grade.ageGroup === 'lower_primary'
        ? '📘 โหมดประถมต้น: ฝึกสะกดคำ + Phonics'
        : '🚀 โหมดประถมปลาย: ประโยค + เติมคำท้าทาย';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Grade Hero Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grade.gradient} p-6 text-white shadow-lg sm:p-8`}
      >
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <span>{modeLabel}</span>
            </div>
            <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
              <span className="text-3xl sm:text-4xl">{grade.badgeEmoji}</span>
              <span>{grade.nameTh}</span>
            </h1>
            <p className="mt-1 text-sm text-white/90 sm:text-base">{grade.focusTh}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-lg bg-black/15 px-2.5 py-1">
                คำศัพท์เป้าหมายช่วงชั้น: {grade.targetVocab}
              </span>
              <span className="rounded-lg bg-black/15 px-2.5 py-1">ระดับ {grade.cefr}</span>
            </div>
          </div>

          <button
            onClick={onChangeGrade}
            className="self-start rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-bold text-slate-800 shadow transition hover:scale-105 hover:bg-white sm:self-center"
          >
            เปลี่ยนระดับชั้น
          </button>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mt-6 rounded-2xl bg-black/15 p-3.5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span>ความคืบหน้าคำศัพท์ตัวอย่างในชั้นนี้</span>
            <span>
              {learnedInGrade} / {totalWordsInGrade} คำ ({percent}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3D Interactive Buddy */}
      <div className="mt-6">
        <Buddy3D
          gradeName={grade.shortName}
          ageGroup={grade.ageGroup}
          stars={progress.stars}
        />
      </div>

      {/* Smart Review Banner if there are missed words */}
      {progress.wrongWords.length > 0 && (
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl text-white shadow-sm">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950">
                ทบทวนคำศัพท์ที่เคยตอบผิด ({progress.wrongWords.length} คำ)
              </h3>
              <p className="text-xs text-amber-800 sm:text-sm">
                มาฝึกซ้ำอีกนิดเพื่อให้จำแม่นขึ้นกันเถอะ!
              </p>
            </div>
          </div>
          <button
            onClick={onStartReview}
            className="w-full rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-amber-600 sm:w-auto"
          >
            เริ่มทบทวนเลย
          </button>
        </div>
      )}

      {/* Lessons Grid */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Trophy className="h-5 w-5 text-amber-500" />
            บทเรียนใน {grade.shortName}
          </h2>
          <span className="text-xs font-medium text-slate-500">
            {grade.lessons.length} บทเรียน • แนะนำเรียนวันละ 1 บท
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {grade.lessons.map((lesson, idx) => {
            const bestStars = progress.completedLessons[lesson.id] ?? 0;
            const learnedCount = lesson.words.filter((w) =>
              progress.learnedWords.includes(w.id)
            ).length;

            return (
              <div
                key={lesson.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${lesson.color} text-3xl text-white shadow-sm`}
                      >
                        {lesson.icon}
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          บทที่ {idx + 1} • {lesson.words.length} คำ
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{lesson.titleTh}</h3>
                        <p className="font-en text-sm font-medium text-slate-500">
                          {lesson.titleEn}
                        </p>
                      </div>
                    </div>

                    {/* Stars earned */}
                    <div className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2.5 py-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= bestStars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Word chips preview */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {lesson.words.map((w) => {
                      const known = progress.learnedWords.includes(w.id);
                      return (
                        <span
                          key={w.id}
                          className={`font-en inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                            known
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span>{w.emoji}</span>
                          <span>{w.word}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>จำได้แล้ว {learnedCount}/{lesson.words.length} คำ</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onStartLearn(lesson)}
                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <BookOpen className="h-4 w-4" />
                    เรียนคำศัพท์
                  </button>
                  <button
                    onClick={() => onStartQuiz(lesson)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    เล่นเกมฝึกฝน
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AgeGroup } from '../types';
import { playTone, speakEnglish } from '../utils/speech';
import { WordPicture } from './HoloStage3D';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Flame,
  Gamepad2,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  X as MultiplyIcon,
  XCircle,
} from 'lucide-react';

interface KintinMathModeProps {
  ageGroup: AgeGroup;
  onComplete: (starsEarned: number) => void;
  onBackToVocab: () => void;
}

type MathTab = 'addition' | 'table' | 'mul_quiz';
type AdditionLevel = 'easy' | 'medium' | 'hard';

interface MathQuestion {
  a: number;
  b: number;
  op: '+' | '×';
  answer: number;
  choices: number[];
  visualEmoji?: string;
}

const COUNT_EMOJIS = ['🍎', '🍓', '🐣', '🐱', '⭐', '🎈', '🍪', '🐸'];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeChoices(answer: number): number[] {
  const set = new Set<number>([answer]);
  const offsets = [-3, -2, -1, 1, 2, 3, 4, 5, -4, 10, -10];
  for (const off of shuffle(offsets)) {
    const candidate = answer + off;
    if (candidate >= 0 && !set.has(candidate)) {
      set.add(candidate);
    }
    if (set.size === 4) break;
  }
  let fallback = answer + 1;
  while (set.size < 4) {
    set.add(fallback++);
  }
  return shuffle(Array.from(set));
}

function generateAdditionQuestions(level: AdditionLevel, count = 10): MathQuestion[] {
  return Array.from({ length: count }).map((_, idx) => {
    let a = 1;
    let b = 1;
    if (level === 'easy') {
      a = Math.floor(Math.random() * 5) + 1; // 1..5
      b = Math.floor(Math.random() * 5) + 1; // 1..5
    } else if (level === 'medium') {
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * 20) + 3;
    } else {
      a = Math.floor(Math.random() * 80) + 15;
      b = Math.floor(Math.random() * 80) + 15;
    }
    const answer = a + b;
    return {
      a,
      b,
      op: '+',
      answer,
      choices: makeChoices(answer),
      visualEmoji: level === 'easy' ? COUNT_EMOJIS[idx % COUNT_EMOJIS.length] : undefined,
    };
  });
}

function generateMulQuestions(table: number | 'all', count = 10): MathQuestion[] {
  return Array.from({ length: count }).map(() => {
    const a = table === 'all' ? Math.floor(Math.random() * 11) + 2 : table;
    const b = Math.floor(Math.random() * 12) + 1;
    const answer = a * b;
    return {
      a,
      b,
      op: '×',
      answer,
      choices: makeChoices(answer),
    };
  });
}

export const KintinMathMode: React.FC<KintinMathModeProps> = ({
  ageGroup,
  onComplete,
  onBackToVocab,
}) => {
  const defaultAddLevel: AdditionLevel =
    ageGroup === 'kindergarten'
      ? 'easy'
      : ageGroup === 'lower_primary'
        ? 'medium'
        : 'hard';

  const [tab, setTab] = useState<MathTab>('addition');
  const [addLevel, setAddLevel] = useState<AdditionLevel>(defaultAddLevel);
  const [selectedTable, setSelectedTable] = useState<number>(2);
  const [quizTable, setQuizTable] = useState<number | 'all'>(2);

  const [questions, setQuestions] = useState<MathQuestion[]>(() =>
    generateAdditionQuestions(defaultAddLevel)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQ = questions[currentIdx];

  const startAdditionRound = (lvl: AdditionLevel) => {
    setAddLevel(lvl);
    setTab('addition');
    setQuestions(generateAdditionQuestions(lvl));
    setCurrentIdx(0);
    setSelectedAns(null);
    setStatus('idle');
    setCorrectCount(0);
    setCombo(0);
    setFinished(false);
  };

  const startMulQuizRound = (tbl: number | 'all') => {
    setQuizTable(tbl);
    setTab('mul_quiz');
    setQuestions(generateMulQuestions(tbl));
    setCurrentIdx(0);
    setSelectedAns(null);
    setStatus('idle');
    setCorrectCount(0);
    setCombo(0);
    setFinished(false);
  };

  const handlePickAnswer = (choice: number) => {
    if (status !== 'idle' || !currentQ) return;
    setSelectedAns(choice);

    const isCorrect = choice === currentQ.answer;
    if (isCorrect) {
      playTone('correct');
      setStatus('correct');
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
      const spoken =
        currentQ.op === '+'
          ? `${currentQ.a} plus ${currentQ.b} equals ${currentQ.answer}`
          : `${currentQ.a} times ${currentQ.b} equals ${currentQ.answer}`;
      speakEnglish(spoken, ageGroup);
    } else {
      playTone('wrong');
      setStatus('wrong');
      setCombo(0);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedAns(null);
      setStatus('idle');
    } else {
      const ratio = correctCount / questions.length;
      const starsEarned = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
      setFinished(true);
      playTone('complete');
      confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
      onComplete(starsEarned);
    }
  };

  const starsEarned = useMemo(() => {
    const ratio = correctCount / Math.max(1, questions.length);
    return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  }, [correctCount, questions.length]);

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Top Banner */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-white/80 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white shadow-lg sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm sm:h-14 sm:w-14">
            <Calculator className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
              <Sparkles className="h-3 w-3" />
              Kintin Math — คณิตคิดสนุก
            </div>
            <h1 className="text-xl font-bold sm:text-2xl">บวกเลข & แม่สูตรคูณ 2–12</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToVocab}
          className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไป Kintin Vocab
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200 backdrop-blur-md">
        <button
          type="button"
          onClick={() => startAdditionRound(addLevel)}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === 'addition'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Plus className="h-4 w-4" />
          เกมบวกเลข
        </button>

        <button
          type="button"
          onClick={() => setTab('table')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === 'table'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Calculator className="h-4 w-4" />
          ตารางสูตรคูณ
        </button>

        <button
          type="button"
          onClick={() => startMulQuizRound(quizTable)}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === 'mul_quiz'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MultiplyIcon className="h-4 w-4" />
          เกมทายสูตรคูณ
        </button>
      </div>

      {/* ================= TAB 2: MULTIPLICATION TABLE (แม่ 2 - 12) ================= */}
      {tab === 'table' && (
        <div className="animate-card-pop rounded-3xl border-2 border-white bg-white/95 p-5 shadow-xl backdrop-blur-md sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                เลือกท่องตารางแม่สูตรคูณ (แม่ 2 – แม่ 12)
              </h2>
              <p className="text-xs text-slate-500">
                แตะที่แต่ละแถวเพื่อฟังเสียงภาษาอังกฤษ หรือกดปุ่มทดสอบเพื่อเก็บดาว!
              </p>
            </div>

            <button
              type="button"
              onClick={() => startMulQuizRound(selectedTable)}
              className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 sm:text-sm"
            >
              <Gamepad2 className="h-4 w-4" />
              ทดสอบแม่ {selectedTable} เลย!
            </button>
          </div>

          {/* Number Picker 2..12 */}
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setSelectedTable(num)}
                className={`font-en h-11 w-11 rounded-2xl border-b-4 text-base font-bold transition active:translate-y-0.5 active:border-b-0 sm:h-12 sm:w-12 sm:text-lg ${
                  selectedTable === num
                    ? 'border-amber-700 bg-amber-500 text-white shadow-md scale-105'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-amber-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* 12 Rows Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => {
              const mul = i + 1;
              const res = selectedTable * mul;
              return (
                <button
                  key={mul}
                  type="button"
                  onClick={() =>
                    speakEnglish(`${selectedTable} times ${mul} equals ${res}`, ageGroup)
                  }
                  className="group flex items-center justify-between rounded-2xl border-2 border-slate-100 bg-gradient-to-r from-amber-50/70 to-white px-4 py-3 text-left shadow-xs transition hover:border-amber-400 hover:shadow-md active:scale-95"
                >
                  <div className="font-en text-lg font-bold text-slate-800 sm:text-xl">
                    <span className="text-amber-600">{selectedTable}</span> × {mul} ={' '}
                    <span className="text-2xl text-indigo-600">{res}</span>
                  </div>
                  <Volume2 className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 1 & 3: ADDITION OR MULTIPLICATION QUIZ ================= */}
      {(tab === 'addition' || tab === 'mul_quiz') && (
        <div>
          {/* Sub-filter bar */}
          {tab === 'addition' ? (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {(
                [
                  { id: 'easy', label: '🌱 อนุบาล (บวกเลข 1–10 มีรูปภาพ)' },
                  { id: 'medium', label: '📘 ประถมต้น (ผลบวกไม่เกิน 50)' },
                  { id: 'hard', label: '🚀 ประถมปลาย (บวกเลขเร็ว 2–3 หลัก)' },
                ] as { id: AdditionLevel; label: string }[]
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => startAdditionRound(lvl.id)}
                  className={`rounded-2xl border-b-4 px-4 py-2 text-xs font-bold transition active:translate-y-0.5 active:border-b-0 sm:text-sm ${
                    addLevel === lvl.id
                      ? 'border-emerald-700 bg-emerald-500 text-white shadow'
                      : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-4 flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => startMulQuizRound('all')}
                className={`rounded-xl border-b-4 px-3 py-1.5 text-xs font-bold transition ${
                  quizTable === 'all'
                    ? 'border-indigo-800 bg-indigo-600 text-white shadow'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                🎲 สุ่มรวมแม่ 2–12
              </button>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => startMulQuizRound(num)}
                  className={`font-en rounded-xl border-b-4 px-3 py-1.5 text-xs font-bold transition ${
                    quizTable === num
                      ? 'border-indigo-800 bg-indigo-600 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  แม่ {num}
                </button>
              ))}
            </div>
          )}

          {/* Finished Screen */}
          {finished ? (
            <div className="mx-auto max-w-lg py-4 text-center">
              <div className="animate-card-pop rounded-3xl border-2 border-amber-200 bg-white p-7 shadow-xl">
                <div className="text-6xl">🏆</div>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  เก่งคณิตศาสตร์สุดๆ เลย!
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  ตอบถูก <strong className="text-emerald-600">{correctCount}</strong> จาก{' '}
                  <strong>{questions.length}</strong> ข้อ (รับดาว + ตั๋วสุ่มไข่วิเศษฟรี 1 ฟอง 🥚!)
                </p>

                <div className="my-5 flex justify-center gap-3">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`h-12 w-12 ${
                        s <= starsEarned
                          ? 'scale-110 fill-amber-400 text-amber-400 drop-shadow'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      tab === 'addition'
                        ? startAdditionRound(addLevel)
                        : startMulQuizRound(quizTable)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    เล่นอีกรอบ
                  </button>
                  <button
                    type="button"
                    onClick={onBackToVocab}
                    className="rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
                  >
                    กลับหน้าหลัก
                  </button>
                </div>
              </div>
            </div>
          ) : (
            currentQ && (
              <div
                key={currentIdx}
                className="animate-card-pop mx-auto max-w-2xl rounded-3xl border-2 border-white bg-white/95 p-5 text-center shadow-xl backdrop-blur-md sm:p-8"
              >
                {/* Progress & Combo */}
                <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500 sm:text-sm">
                  <span>
                    ข้อที่ {currentIdx + 1} / {questions.length}
                  </span>
                  {combo >= 2 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white shadow">
                      <Flame className="h-3.5 w-3.5" />
                      Combo {combo} ติดต่อกัน!
                    </span>
                  )}
                  <span className="text-emerald-600">ถูก {correctCount} ข้อ</span>
                </div>

                {/* Visual 3D Objects for Kindergarten Easy Addition */}
                {currentQ.visualEmoji && (
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-indigo-50/70 p-3">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {Array.from({ length: currentQ.a }).map((_, i) => (
                        <WordPicture
                          key={`a-${i}`}
                          emoji={currentQ.visualEmoji!}
                          size="sm"
                        />
                      ))}
                    </div>
                    <span className="font-en text-2xl font-bold text-indigo-600">+</span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {Array.from({ length: currentQ.b }).map((_, i) => (
                        <WordPicture
                          key={`b-${i}`}
                          emoji={currentQ.visualEmoji!}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Big Equation */}
                <div className="my-5 rounded-3xl bg-gradient-to-r from-indigo-50 via-white to-amber-50 py-6 ring-2 ring-indigo-100">
                  <div className="font-en text-5xl font-bold tracking-wider text-slate-900 sm:text-6xl">
                    {currentQ.a}{' '}
                    <span className="text-indigo-600">{currentQ.op}</span>{' '}
                    {currentQ.b} ={' '}
                    <span className="text-amber-500">
                      {status !== 'idle' ? currentQ.answer : '?'}
                    </span>
                  </div>
                </div>

                {/* 4 Number Choices */}
                <div className="grid grid-cols-2 gap-3.5">
                  {currentQ.choices.map((choice) => {
                    const isSelected = selectedAns === choice;
                    const isAnswer = choice === currentQ.answer;
                    let btnStyle =
                      'border-slate-200 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50';
                    if (status !== 'idle') {
                      if (isAnswer) {
                        btnStyle =
                          'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-400 bg-rose-50 text-rose-700';
                      } else {
                        btnStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={status !== 'idle'}
                        onClick={() => handlePickAnswer(choice)}
                        className={`font-en rounded-2xl border-2 border-b-4 py-4 text-3xl font-bold shadow-xs transition active:scale-95 sm:py-5 sm:text-4xl ${btnStyle}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Bar */}
                {status !== 'idle' && (
                  <div
                    className={`mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl p-4 sm:flex-row ${
                      status === 'correct'
                        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                        : 'bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {status === 'correct' ? (
                        <>
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                          <span>
                            ถูกต้อง! {currentQ.a} {currentQ.op} {currentQ.b} ={' '}
                            {currentQ.answer} 👏
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-6 w-6 text-rose-600" />
                          <span>
                            คำตอบที่ถูกคือ {currentQ.a} {currentQ.op} {currentQ.b} ={' '}
                            {currentQ.answer}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleNext}
                      className={`w-full rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow sm:w-auto ${
                        status === 'correct'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      {currentIdx + 1 < questions.length ? 'ข้อถัดไป →' : 'ดูผลคะแนน'}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

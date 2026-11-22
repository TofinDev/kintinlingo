import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AgeGroup, VocabWord } from '../types';
import { playTone, speakEnglish } from '../utils/speech';
import { ArrowLeft, CheckCircle2, RotateCcw, Star, Volume2, XCircle } from 'lucide-react';

type QuestionType = 'listen_pick' | 'meaning_pick' | 'spell' | 'sentence';

interface QuizQuestion {
  word: VocabWord;
  type: QuestionType;
  choices: VocabWord[];
  scrambledLetters?: string[];
  sentenceBlank?: string;
}

interface QuizModeProps {
  title: string;
  words: VocabWord[];
  fallbackPool: VocabWord[];
  ageGroup: AgeGroup;
  onComplete: (result: {
    starsEarned: number;
    correctIds: string[];
    wrongIds: string[];
  }) => void;
  onBack: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestions(
  words: VocabWord[],
  fallbackPool: VocabWord[],
  ageGroup: AgeGroup
): QuizQuestion[] {
  const pool = words.length >= 4 ? words : [...words, ...fallbackPool.filter((f) => !words.some((w) => w.id === f.id))];

  return shuffle(words).map((word, idx) => {
    const distractors = shuffle(pool.filter((w) => w.id !== word.id)).slice(0, 3);
    const choices = shuffle([word, ...distractors]);

    let type: QuestionType = 'listen_pick';
    const cleanWord = word.word.replace(/\s+/g, '');
    const canSpell = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length <= 10;

    if (ageGroup === 'kindergarten') {
      type = idx % 2 === 0 ? 'listen_pick' : 'meaning_pick';
    } else if (ageGroup === 'lower_primary') {
      if (idx % 3 === 2 && canSpell) type = 'spell';
      else type = idx % 2 === 0 ? 'listen_pick' : 'meaning_pick';
    } else {
      const hasBlank = word.exampleEn.toLowerCase().includes(word.word.toLowerCase());
      if (idx % 3 === 0 && hasBlank) type = 'sentence';
      else if (idx % 3 === 1 && canSpell) type = 'spell';
      else type = 'meaning_pick';
    }

    const regex = new RegExp(`\\b${word.word}\\b`, 'i');
    const sentenceBlank = word.exampleEn.replace(regex, '______');

    return {
      word,
      type,
      choices,
      scrambledLetters: type === 'spell' ? shuffle(cleanWord.toLowerCase().split('')) : undefined,
      sentenceBlank: type === 'sentence' ? sentenceBlank : undefined,
    };
  });
}

export const QuizMode: React.FC<QuizModeProps> = ({
  title,
  words,
  fallbackPool,
  ageGroup,
  onComplete,
  onBack,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    buildQuestions(words, fallbackPool, ageGroup)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [spelledIndices, setSpelledIndices] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIdx];

  useEffect(() => {
    if (current && !finished && (current.type === 'listen_pick' || current.type === 'spell')) {
      speakEnglish(current.word.word, ageGroup);
    }
  }, [currentIdx, current, finished, ageGroup]);

  const targetCleanWord = useMemo(
    () => (current ? current.word.word.replace(/\s+/g, '').toLowerCase() : ''),
    [current]
  );

  const spelledWord = useMemo(() => {
    if (!current?.scrambledLetters) return '';
    return spelledIndices.map((i) => current.scrambledLetters![i]).join('');
  }, [current, spelledIndices]);

  const handleChoice = (choice: VocabWord) => {
    if (status !== 'idle' || !current) return;
    setSelectedChoiceId(choice.id);

    const isCorrect = choice.id === current.word.id;
    if (isCorrect) {
      playTone('correct');
      setStatus('correct');
      setCorrectIds((prev) => [...prev, current.word.id]);
    } else {
      playTone('wrong');
      setStatus('wrong');
      setWrongIds((prev) => [...prev, current.word.id]);
    }
  };

  const handleTileTap = (tileIdx: number) => {
    if (status !== 'idle' || !current?.scrambledLetters) return;
    if (spelledIndices.includes(tileIdx)) return;

    const next = [...spelledIndices, tileIdx];
    setSpelledIndices(next);

    if (next.length === current.scrambledLetters.length) {
      const attempt = next.map((i) => current.scrambledLetters![i]).join('');
      if (attempt === targetCleanWord) {
        playTone('correct');
        setStatus('correct');
        setCorrectIds((prev) => [...prev, current.word.id]);
      } else {
        playTone('wrong');
        setStatus('wrong');
        setWrongIds((prev) => [...prev, current.word.id]);
      }
    }
  };

  const handleUndoLetter = () => {
    if (status !== 'idle') return;
    setSpelledIndices((prev) => prev.slice(0, -1));
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedChoiceId(null);
      setSpelledIndices([]);
      setStatus('idle');
    } else {
      const ratio = correctIds.length / questions.length;
      const starsEarned = ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : 1;
      setFinished(true);
      playTone('complete');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onComplete({ starsEarned, correctIds, wrongIds });
    }
  };

  const handleRetry = () => {
    setQuestions(buildQuestions(words, fallbackPool, ageGroup));
    setCurrentIdx(0);
    setSelectedChoiceId(null);
    setSpelledIndices([]);
    setStatus('idle');
    setCorrectIds([]);
    setWrongIds([]);
    setFinished(false);
  };

  if (finished) {
    const ratio = correctIds.length / questions.length;
    const starsEarned = ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : 1;

    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-xl">
          <div className="text-6xl">🎉</div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">เก่งมากเลย!</h2>
          <p className="mt-1 text-sm text-slate-600">
            ทำแบบฝึกหัด “{title}” เสร็จแล้ว
          </p>

          <div className="my-6 flex justify-center gap-3">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`h-12 w-12 transition-transform ${
                  s <= starsEarned
                    ? 'scale-110 fill-amber-400 text-amber-400 drop-shadow'
                    : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            ตอบถูก <span className="font-bold text-emerald-600">{correctIds.length}</span> จาก{' '}
            <span className="font-bold text-slate-800">{questions.length}</span> ข้อ
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              เล่นอีกครั้ง
            </button>
            <button
              onClick={onBack}
              className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
            >
              กลับหน้าบทเรียน
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Top Bar */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          ออก
        </button>

        <div className="text-sm font-bold text-slate-700">
          ข้อที่ {currentIdx + 1} / {questions.length}
        </div>

        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          ถูก {correctIds.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div
        key={currentIdx}
        className="animate-card-pop rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-md sm:p-8"
      >
        {/* 1. Listen & Pick */}
        {current.type === 'listen_pick' && (
          <div className="text-center">
            <span className="inline-block rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">
              🎧 ฟังเสียงแล้วเลือกรูปที่ถูกต้อง
            </span>
            <div className="my-5">
              <button
                onClick={() => speakEnglish(current.word.word, ageGroup)}
                className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-lg transition hover:bg-indigo-700 active:scale-95 sm:w-auto"
              >
                <Volume2 className="h-8 w-8" />
                กดฟังเสียงคำศัพท์
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3.5">
              {current.choices.map((c, idx) => {
                const isSelected = selectedChoiceId === c.id;
                const isAnswer = c.id === current.word.id;
                let style = 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40';
                if (status !== 'idle') {
                  if (isAnswer) style = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200';
                  else if (isSelected) style = 'border-rose-400 bg-rose-50';
                  else style = 'border-slate-100 bg-slate-50 opacity-60';
                }

                return (
                  <button
                    key={c.id}
                    style={{ '--stagger': idx } as React.CSSProperties}
                    onClick={() => handleChoice(c)}
                    disabled={status !== 'idle'}
                    className={`animate-stagger-up flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition active:scale-95 ${style}`}
                  >
                    <span className="text-5xl sm:text-6xl">{c.emoji}</span>
                    {ageGroup !== 'kindergarten' && (
                      <span className="font-en mt-2 text-sm font-semibold text-slate-600">
                        {c.thai}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Meaning Pick */}
        {current.type === 'meaning_pick' && (
          <div className="text-center">
            <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
              📖 คำนี้แปลว่าอะไร?
            </span>

            <div className="my-5 flex flex-col items-center">
              <button
                type="button"
                onClick={() => speakEnglish(current.word.word, ageGroup)}
                className="cursor-pointer text-7xl transition hover:scale-110 active:scale-95"
                title="แตะที่รูปเพื่อฟังเสียง"
              >
                {current.word.emoji}
              </button>
              <div className="font-en mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
                {current.word.word}
              </div>
              <button
                onClick={() => speakEnglish(current.word.word, ageGroup)}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
              >
                <Volume2 className="h-5 w-5" />
                กดฟังเสียง
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {current.choices.map((c, idx) => {
                const isSelected = selectedChoiceId === c.id;
                const isAnswer = c.id === current.word.id;
                let style = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40';
                if (status !== 'idle') {
                  if (isAnswer) style = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                  else if (isSelected) style = 'border-rose-400 bg-rose-50 text-rose-900';
                  else style = 'border-slate-100 bg-slate-50 opacity-60';
                }

                return (
                  <button
                    key={c.id}
                    style={{ '--stagger': idx } as React.CSSProperties}
                    onClick={() => handleChoice(c)}
                    disabled={status !== 'idle'}
                    className={`animate-stagger-up rounded-2xl border-2 px-4 py-4 text-lg font-bold transition active:scale-95 sm:text-xl ${style}`}
                  >
                    {c.thai}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Word Builder (Spelling) */}
        {current.type === 'spell' && current.scrambledLetters && (
          <div className="text-center">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              🔤 เรียงตัวอักษรให้เป็นคำที่ถูกต้อง
            </span>

            <div className="my-4 flex flex-col items-center">
              <div className="text-6xl">{current.word.emoji}</div>
              <div className="mt-2 text-xl font-bold text-slate-800">{current.word.thai}</div>
              <button
                onClick={() => speakEnglish(current.word.word, ageGroup)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Volume2 className="h-4 w-4" />
                ฟังเสียงใบ้
              </button>
            </div>

            {/* Answer slots */}
            <div className="my-5 flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-100 p-3">
              {targetCleanWord.split('').map((_, i) => (
                <div
                  key={i}
                  className={`font-en flex h-11 w-10 items-center justify-center rounded-xl border-2 text-xl font-bold uppercase ${
                    spelledWord[i]
                      ? status === 'correct'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : status === 'wrong'
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-indigo-400 bg-white text-indigo-700 shadow-sm'
                      : 'border-dashed border-slate-300 bg-white/60 text-slate-300'
                  }`}
                >
                  {spelledWord[i] ?? ''}
                </div>
              ))}
            </div>

            {/* Scrambled letter tiles */}
            <div className="flex flex-wrap justify-center gap-2.5">
              {current.scrambledLetters.map((char, idx) => {
                const used = spelledIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleTileTap(idx)}
                    disabled={used || status !== 'idle'}
                    className={`font-en flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-xl font-bold uppercase shadow-sm transition ${
                      used
                        ? 'border-slate-100 bg-slate-100 text-transparent shadow-none'
                        : 'border-indigo-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-400 active:scale-95'
                    }`}
                  >
                    {char}
                  </button>
                );
              })}
            </div>

            {status === 'idle' && spelledIndices.length > 0 && (
              <button
                onClick={handleUndoLetter}
                className="mt-4 text-xs font-bold text-slate-500 underline hover:text-slate-700"
              >
                ลบตัวอักษรล่าสุด
              </button>
            )}
          </div>
        )}

        {/* 4. Sentence Quiz (Upper Primary) */}
        {current.type === 'sentence' && (
          <div className="text-center">
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
              ✍️ เติมคำศัพท์ลงในประโยคให้สมบูรณ์
            </span>

            <div className="my-5 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="font-en text-2xl font-bold text-slate-900 sm:text-3xl">
                {current.sentenceBlank}
              </p>
              <p className="mt-2 text-base text-slate-600">คำแปล: {current.word.exampleTh}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {current.choices.map((c) => {
                const isSelected = selectedChoiceId === c.id;
                const isAnswer = c.id === current.word.id;
                let style = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40';
                if (status !== 'idle') {
                  if (isAnswer) style = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                  else if (isSelected) style = 'border-rose-400 bg-rose-50 text-rose-900';
                  else style = 'border-slate-100 bg-slate-50 opacity-60';
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => handleChoice(c)}
                    disabled={status !== 'idle'}
                    className={`font-en rounded-2xl border-2 px-4 py-3.5 text-base font-bold transition ${style}`}
                  >
                    {c.word}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Banner */}
        {status !== 'idle' && (
          <div
            className={`mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl p-4 sm:flex-row ${
              status === 'correct'
                ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                : 'bg-rose-50 text-rose-900 ring-1 ring-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {status === 'correct' ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-6 w-6 shrink-0 text-rose-600" />
              )}
              <div className="text-left text-sm">
                <div className="font-bold">
                  {status === 'correct' ? 'ถูกต้อง! เก่งมาก 👏' : 'ยังไม่ถูก ลองจำคำนี้นะ:'}
                </div>
                <div>
                  <span className="font-en font-bold">{current.word.word}</span> ={' '}
                  {current.word.thai}
                </div>
              </div>
            </div>

            <button
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
    </div>
  );
};

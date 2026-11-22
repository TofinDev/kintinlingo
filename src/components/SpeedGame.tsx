import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AgeGroup, VocabWord } from '../types';
import { playTone, speakEnglish } from '../utils/speech';
import { ArrowLeft, Flame, RotateCcw, Star, Timer, Volume2 } from 'lucide-react';

interface SpeedGameProps {
  gradeName: string;
  words: VocabWord[];
  ageGroup: AgeGroup;
  onComplete: (starsEarned: number, learnedIds: string[]) => void;
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

function makeRound(words: VocabWord[]) {
  const target = words[Math.floor(Math.random() * words.length)];
  const distractors = shuffle(words.filter((w) => w.id !== target.id)).slice(0, 3);
  const choices = shuffle([target, ...distractors]);
  return { target, choices };
}

export const SpeedGame: React.FC<SpeedGameProps> = ({
  gradeName,
  words,
  ageGroup,
  onComplete,
  onBack,
}) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [round, setRound] = useState(() => makeRound(words));
  const [flash, setFlash] = useState<'none' | 'good' | 'bad'>('none');
  const [finished, setFinished] = useState(false);

  const multiplier = combo >= 5 ? 3 : combo >= 2 ? 2 : 1;

  useEffect(() => {
    if (finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      const stars = score >= 120 ? 3 : score >= 50 ? 2 : 1;
      playTone('complete');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onComplete(stars, Array.from(new Set(correctIds)));
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, finished, score, correctIds, onComplete]);

  useEffect(() => {
    if (!finished && round.target) {
      speakEnglish(round.target.word, ageGroup);
    }
  }, [round, finished, ageGroup]);

  const starsEarned = useMemo(() => (score >= 120 ? 3 : score >= 50 ? 2 : 1), [score]);

  const handlePick = (choice: VocabWord) => {
    if (finished) return;
    if (choice.id === round.target.id) {
      playTone('correct');
      const nextCombo = combo + 1;
      const mult = nextCombo >= 5 ? 3 : nextCombo >= 2 ? 2 : 1;
      setCombo(nextCombo);
      setScore((s) => s + 10 * mult);
      setCorrectIds((prev) => [...prev, choice.id]);
      setFlash('good');
    } else {
      playTone('wrong');
      setCombo(0);
      setFlash('bad');
    }

    setTimeout(() => {
      setFlash('none');
      setRound(makeRound(words));
    }, 220);
  };

  const handleRestart = () => {
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setCorrectIds([]);
    setRound(makeRound(words));
    setFlash('none');
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="animate-card-pop rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-xl">
          <div className="text-6xl">⏱️</div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">หมดเวลา! สุดยอดมาก!</h2>
          <p className="mt-1 text-sm text-slate-600">โหมดแข่งความเร็ว 60 วินาที ({gradeName})</p>

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

          <div className="rounded-2xl bg-indigo-50 p-4">
            <div className="text-xs font-bold text-indigo-600">คะแนนรวมที่ได้</div>
            <div className="font-en text-4xl font-bold text-indigo-700">{score}</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleRestart}
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* HUD */}
      <div className="mb-5 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          ออก
        </button>

        <div
          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 font-en text-lg font-bold shadow-sm ${
            timeLeft <= 10
              ? 'animate-pulse bg-rose-500 text-white'
              : 'bg-white text-slate-800 ring-1 ring-slate-200'
          }`}
        >
          <Timer className="h-5 w-5" />
          <span>{timeLeft}s</span>
        </div>

        <div className="flex items-center gap-2">
          {multiplier > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow">
              <Flame className="h-3.5 w-3.5" />x{multiplier}
            </span>
          )}
          <div className="rounded-2xl bg-indigo-600 px-4 py-2 font-en text-base font-bold text-white shadow-sm">
            {score} pts
          </div>
        </div>
      </div>

      {/* Arcade Card */}
      <div
        className={`rounded-3xl border-2 bg-white p-6 text-center shadow-lg transition-colors sm:p-8 ${
          flash === 'good'
            ? 'border-emerald-400 bg-emerald-50/40'
            : flash === 'bad'
              ? 'border-rose-400 bg-rose-50/40'
              : 'border-slate-200'
        }`}
      >
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
          ⏱️ รีบจับคู่ภาพให้ตรงกับคำศัพท์!
        </div>

        <div className="my-4 flex flex-col items-center">
          <div className="font-en text-4xl font-bold text-slate-900 sm:text-5xl">
            {round.target.word}
          </div>
          <button
            type="button"
            onClick={() => speakEnglish(round.target.word, ageGroup)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <Volume2 className="h-4 w-4" />
            ฟังเสียง
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3.5">
          {round.choices.map((c) => (
            <button
              key={c.id}
              onClick={() => handlePick(c)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-400 hover:bg-indigo-50/50 active:scale-95"
            >
              <span className="text-5xl sm:text-6xl">{c.emoji}</span>
              <span className="mt-2 text-sm font-bold text-slate-700">{c.thai}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AgeGroup, VocabWord } from '../types';
import { playTone, speakEnglish } from '../utils/speech';
import { WordPicture } from './HoloStage3D';
import { ArrowLeft, RotateCcw, Star } from 'lucide-react';

interface MemoryCard {
  uid: string;
  wordId: string;
  kind: 'emoji' | 'word';
  content: string;
  wordObj: VocabWord;
}

interface MemoryMatchGameProps {
  title: string;
  words: VocabWord[];
  ageGroup: AgeGroup;
  onComplete: (starsEarned: number, matchedWordIds: string[]) => void;
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

function buildDeck(words: VocabWord[]): MemoryCard[] {
  const selected = shuffle(words).slice(0, 6); // 6 pairs = 12 cards
  const cards: MemoryCard[] = selected.flatMap((w) => [
    { uid: `${w.id}-emoji`, wordId: w.id, kind: 'emoji', content: w.emoji, wordObj: w },
    { uid: `${w.id}-word`, wordId: w.id, kind: 'word', content: w.word, wordObj: w },
  ]);
  return shuffle(cards);
}

export const MemoryMatchGame: React.FC<MemoryMatchGameProps> = ({
  title,
  words,
  ageGroup,
  onComplete,
  onBack,
}) => {
  const [deck, setDeck] = useState<MemoryCard[]>(() => buildDeck(words));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const totalPairs = deck.length / 2;

  useEffect(() => {
    if (matchedIds.length === totalPairs && totalPairs > 0 && !finished) {
      const starsEarned = moves <= totalPairs + 3 ? 3 : moves <= totalPairs + 7 ? 2 : 1;
      setFinished(true);
      playTone('complete');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onComplete(starsEarned, matchedIds);
    }
  }, [matchedIds, totalPairs, moves, finished, onComplete]);

  const handleCardTap = (idx: number) => {
    if (locked || finished) return;
    if (flipped.includes(idx)) return;
    const card = deck[idx];
    if (matchedIds.includes(card.wordId)) return;

    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (card.kind === 'word' || ageGroup === 'kindergarten') {
      speakEnglish(card.wordObj.word, ageGroup);
    }

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;
      const first = deck[firstIdx];
      const second = deck[secondIdx];

      if (first.wordId === second.wordId && first.kind !== second.kind) {
        playTone('correct');
        speakEnglish(first.wordObj.word, ageGroup);
        setMatchedIds((prev) => [...prev, first.wordId]);
        setFlipped([]);
      } else {
        setLocked(true);
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 700);
      }
    }
  };

  const handleRestart = () => {
    setDeck(buildDeck(words));
    setFlipped([]);
    setMatchedIds([]);
    setMoves(0);
    setLocked(false);
    setFinished(false);
  };

  if (finished) {
    const starsEarned = moves <= totalPairs + 3 ? 3 : moves <= totalPairs + 7 ? 2 : 1;
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="animate-card-pop rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-xl">
          <div className="text-6xl">🃏</div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">จับคู่ครบทุกใบแล้ว!</h2>
          <p className="mt-1 text-sm text-slate-600">โหมดจับคู่: {title}</p>

          <div className="my-6 flex justify-center gap-3">
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

          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            เปิดทั้งหมด <span className="font-bold text-indigo-600">{moves}</span> ครั้ง
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          ออก
        </button>

        <div className="text-center">
          <div className="text-xs font-semibold text-slate-500">🃏 เกมเปิดการ์ดจับคู่</div>
          <div className="text-sm font-bold text-slate-800">{title}</div>
        </div>

        <div className="rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700">
          เปิด {moves} ครั้ง • {matchedIds.length}/{totalPairs} คู่
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
        {deck.map((card, idx) => {
          const isMatched = matchedIds.includes(card.wordId);
          const isOpen = isMatched || flipped.includes(idx);

          return (
            <button
              key={card.uid}
              style={{ '--stagger': idx } as React.CSSProperties}
              onClick={() => handleCardTap(idx)}
              disabled={isOpen}
              className={`animate-stagger-up flex h-28 items-center justify-center rounded-2xl border-2 p-2 shadow-sm transition-all active:scale-95 sm:h-32 ${
                isMatched
                  ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                  : isOpen
                    ? 'border-indigo-500 bg-white shadow-md'
                    : 'border-indigo-200 bg-gradient-to-br from-indigo-500 to-purple-500 text-white hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {isOpen ? (
                card.kind === 'emoji' || ageGroup === 'kindergarten' ? (
                  <WordPicture
                    word={card.wordObj.word}
                    emoji={card.wordObj.emoji}
                    size="sm"
                  />
                ) : (
                  <span className="font-en text-lg font-bold text-slate-900 sm:text-xl">
                    {card.content}
                  </span>
                )
              ) : (
                <span className="text-3xl font-bold opacity-90">?</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

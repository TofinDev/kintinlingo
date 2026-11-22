import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { QRCodeCanvas } from 'qrcode.react';
import { CURRICULUM } from '../data/curriculum';
import type { AgeGroup, GradeId, PlayerProfile, VocabWord } from '../types';
import { playTone, speakEnglish } from '../utils/speech';
import { AvatarDisplay } from './AvatarDisplay';
import { WordPicture } from './HoloStage3D';
import {
  ArrowLeft,
  Check,
  Copy,
  Flame,
  RotateCcw,
  Share2,
  Star,
  Swords,
  Timer,
  Trophy,
  Volume2,
} from 'lucide-react';

export interface VsOpponent {
  id: string;
  name: string;
  avatar: string;
  gradeId: GradeId;
  targetScore: number;
  isOnlineChallenge?: boolean;
}

interface VsBattleModeProps {
  currentPlayer: PlayerProfile;
  allPlayers: PlayerProfile[];
  initialChallenge: VsOpponent | null;
  onClearInitialChallenge: () => void;
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
  return { target, choices: shuffle([target, ...distractors]) };
}

export function encodeVsChallenge(payload: {
  name: string;
  avatar: string;
  gradeId: GradeId;
  score: number;
}): string {
  const safeAvatar = payload.avatar.startsWith('data:image') ? '🦁' : payload.avatar;
  const json = JSON.stringify({
    n: payload.name,
    a: safeAvatar,
    g: payload.gradeId,
    s: payload.score,
  });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

export function decodeVsChallenge(encoded: string): VsOpponent | null {
  try {
    const bin = atob(encoded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as { n?: string; a?: string; g?: GradeId; s?: number };
    if (!parsed.n || typeof parsed.s !== 'number') return null;
    return {
      id: 'online-challenger',
      name: parsed.n,
      avatar: parsed.a || '🦁',
      gradeId: parsed.g || 'k1',
      targetScore: parsed.s,
      isOnlineChallenge: true,
    };
  } catch {
    return null;
  }
}

export const VsBattleMode: React.FC<VsBattleModeProps> = ({
  currentPlayer,
  allPlayers,
  initialChallenge,
  onClearInitialChallenge,
  onComplete,
  onBack,
}) => {
  const [selectedOpponent, setSelectedOpponent] = useState<VsOpponent | null>(
    initialChallenge
  );
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [flash, setFlash] = useState<'none' | 'good' | 'bad'>('none');
  const [finished, setFinished] = useState(false);
  const [showShareBox, setShowShareBox] = useState(false);
  const [copied, setCopied] = useState(false);

  const gradeInfo =
    CURRICULUM.find((g) => g.id === currentPlayer.progress.selectedGrade) ?? CURRICULUM[0];
  const ageGroup: AgeGroup = gradeInfo.ageGroup;
  const words = useMemo(() => gradeInfo.lessons.flatMap((l) => l.words), [gradeInfo]);

  const [round, setRound] = useState(() => makeRound(words));

  // Build opponent list (other local players + smart bot opponents)
  const opponents = useMemo<VsOpponent[]>(() => {
    const locals: VsOpponent[] = allPlayers
      .filter((p) => p.id !== currentPlayer.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.progress.avatar || p.avatar,
        gradeId: p.progress.selectedGrade,
        targetScore: Math.max(60, p.progress.stars * 12),
      }));

    const bots: VsOpponent[] = [
      { id: 'bot-easy', name: 'น้องบอท ฝึกหัด', avatar: '🤖', gradeId: gradeInfo.id, targetScore: 70 },
      { id: 'bot-pro', name: 'กัปตัน อัจฉริยะ', avatar: '🚀', gradeId: gradeInfo.id, targetScore: 140 },
    ];

    return [...(initialChallenge ? [initialChallenge] : []), ...locals, ...bots];
  }, [allPlayers, currentPlayer.id, gradeInfo.id, initialChallenge]);

  const isPlaying = selectedOpponent !== null && !finished;

  useEffect(() => {
    if (!isPlaying) return;
    if (timeLeft <= 0) {
      setFinished(true);
      const won = score >= (selectedOpponent?.targetScore ?? 0);
      const stars = won ? 3 : score >= 50 ? 2 : 1;
      playTone('complete');
      if (won) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
      onComplete(stars, Array.from(new Set(correctIds)));
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft, score, selectedOpponent, correctIds, onComplete]);

  useEffect(() => {
    if (isPlaying && round.target) {
      speakEnglish(round.target.word, ageGroup);
    }
  }, [isPlaying, round, ageGroup]);

  const startBattle = (opp: VsOpponent) => {
    setSelectedOpponent(opp);
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setCorrectIds([]);
    setRound(makeRound(words));
    setFlash('none');
    setFinished(false);
    setShowShareBox(false);
  };

  const handlePick = (choice: VocabWord) => {
    if (!isPlaying) return;
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

  const challengeUrl = useMemo(() => {
    const base =
      typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
        ? `${window.location.origin}/`
        : 'https://kintinlingo.vercel.app/';
    const code = encodeVsChallenge({
      name: currentPlayer.name,
      avatar: currentPlayer.progress.avatar || currentPlayer.avatar,
      gradeId: currentPlayer.progress.selectedGrade,
      score,
    });
    return `${base}?vs=${encodeURIComponent(code)}`;
  }, [currentPlayer, score]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // 1. Opponent Picker Screen
  if (!selectedOpponent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </button>
          <div className="text-center">
            <div className="text-xs font-bold text-rose-600">⚔️ โหมดท้าดวลคำศัพท์</div>
            <h1 className="text-xl font-bold text-slate-900">เลือกคู่แข่งของคุณ</h1>
          </div>
          <div className="w-16" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {opponents.map((opp, idx) => (
            <button
              key={`${opp.id}-${idx}`}
              style={{ '--stagger': idx } as React.CSSProperties}
              onClick={() => startBattle(opp)}
              className={`animate-stagger-up flex items-center justify-between rounded-3xl border-2 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md active:scale-95 ${
                opp.isOnlineChallenge
                  ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-200'
                  : 'border-slate-200 bg-white hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 shadow-xs">
                  <AvatarDisplay
                    avatar={opp.avatar}
                    alt={opp.name}
                    className="h-full w-full"
                    emojiClassName="text-3xl"
                  />
                </div>
                <div>
                  {opp.isOnlineChallenge && (
                    <span className="mb-1 inline-block rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      🌐 คำท้าดวลออนไลน์
                    </span>
                  )}
                  <div className="text-lg font-bold text-slate-900">{opp.name}</div>
                  <div className="text-xs font-semibold text-slate-500">
                    เป้าหมาย: <span className="text-amber-600">{opp.targetScore} คะแนน</span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-2xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow">
                <Swords className="h-4 w-4" />
                ดวล!
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Battle Results Screen
  if (finished) {
    const won = score >= selectedOpponent.targetScore;
    const starsEarned = won ? 3 : score >= 50 ? 2 : 1;

    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <div className="animate-card-pop rounded-3xl border-2 border-indigo-100 bg-white p-7 shadow-xl">
          <div className="text-6xl">{won ? '🏆' : '💪'}</div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {won ? 'ชนะแล้ว! เก่งสุดยอด!' : 'แพ้ไปนิดเดียว ลองใหม่อีกครั้งนะ!'}
          </h2>

          <div className="my-5 flex items-center justify-center gap-6 rounded-2xl bg-slate-50 p-4">
            <div>
              <div className="text-xs font-bold text-indigo-600">คะแนนของคุณ</div>
              <div className="font-en text-3xl font-bold text-indigo-700">{score}</div>
            </div>
            <div className="text-lg font-bold text-slate-400">VS</div>
            <div>
              <div className="text-xs font-bold text-rose-600">{selectedOpponent.name}</div>
              <div className="font-en text-3xl font-bold text-rose-600">
                {selectedOpponent.targetScore}
              </div>
            </div>
          </div>

          <div className="my-4 flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`h-10 w-10 ${
                  s <= starsEarned ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Create Challenge Link & QR to send to online friends */}
          <button
            type="button"
            onClick={() => setShowShareBox((v) => !v)}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95"
          >
            <Share2 className="h-4 w-4" />
            ส่งลิงก์ / QR ท้าดวลเพื่อนออนไลน์ (สถิติ {score} คะแนน)
          </button>

          {showShareBox && (
            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-center">
              <div className="mx-auto mb-3 inline-block rounded-2xl bg-white p-3 shadow-sm">
                <QRCodeCanvas value={challengeUrl} size={150} fgColor="#1e1b4b" />
              </div>
              <p className="mb-2 text-xs text-slate-600">
                ให้เพื่อนสแกน QR หรือกดลิงก์นี้เพื่อแข่งทำลายสถิติของคุณ!
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'คัดลอกลิงก์ท้าดวลแล้ว!' : 'คัดลอกลิงก์ท้าดวล'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startBattle(selectedOpponent)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              ดวลอีกรอบ
            </button>
            <button
              onClick={() => {
                onClearInitialChallenge();
                setSelectedOpponent(null);
              }}
              className="rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
            >
              เปลี่ยนคู่แข่ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Battle Screen
  // Ghost opponent progress scales smoothly with elapsed time
  const elapsedRatio = (60 - timeLeft) / 60;
  const ghostScore = Math.round(selectedOpponent.targetScore * elapsedRatio);
  const multiplier = combo >= 5 ? 3 : combo >= 2 ? 2 : 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            onClearInitialChallenge();
            setSelectedOpponent(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          ยอมแพ้
        </button>

        <div
          className={`flex items-center gap-1.5 rounded-2xl px-4 py-1.5 font-en text-lg font-bold shadow-sm ${
            timeLeft <= 10 ? 'animate-pulse bg-rose-500 text-white' : 'bg-white text-slate-800'
          }`}
        >
          <Timer className="h-5 w-5" />
          {timeLeft}s
        </div>

        {multiplier > 1 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow">
            <Flame className="h-3.5 w-3.5" />x{multiplier}
          </span>
        ) : (
          <div className="w-14" />
        )}
      </div>

      {/* Live VS Scoreboard */}
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-3xl bg-white/95 p-4 shadow-md ring-1 ring-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100">
            <AvatarDisplay
              avatar={currentPlayer.progress.avatar || currentPlayer.avatar}
              className="h-full w-full"
              emojiClassName="text-2xl"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-500">{currentPlayer.name}</div>
            <div className="font-en text-2xl font-bold text-indigo-600">{score}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-500">
              {selectedOpponent.name}
            </div>
            <div className="font-en text-2xl font-bold text-rose-500">
              {ghostScore}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {selectedOpponent.targetScore}
              </span>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rose-100">
            <AvatarDisplay
              avatar={selectedOpponent.avatar}
              className="h-full w-full"
              emojiClassName="text-2xl"
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div
        className={`rounded-3xl border-2 bg-white p-6 text-center shadow-lg transition-colors sm:p-8 ${
          flash === 'good'
            ? 'border-emerald-400 bg-emerald-50/40'
            : flash === 'bad'
              ? 'border-rose-400 bg-rose-50/40'
              : 'border-slate-200'
        }`}
      >
        <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600">
          <Trophy className="h-4 w-4" />
          ดวลความเร็ว! เลือกภาพที่ตรงกับคำศัพท์
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
              <WordPicture word={c.word} emoji={c.emoji} size="md" />
              {ageGroup !== 'kindergarten' && (
                <span className="mt-2 text-sm font-bold text-slate-700">{c.thai}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

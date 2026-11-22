import React from 'react';
import { CURRICULUM } from '../data/curriculum';
import type { PlayerProfile } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { BookCheck, Crown, Medal, Star, Trophy, X } from 'lucide-react';

interface LeaderboardModalProps {
  players: PlayerProfile[];
  activePlayerId: string | null;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  players,
  activePlayerId,
  onClose,
}) => {
  const ranked = [...players].sort((a, b) => {
    if (b.progress.stars !== a.progress.stars) {
      return b.progress.stars - a.progress.stars;
    }
    return b.progress.learnedWords.length - a.progress.learnedWords.length;
  });

  const maxStars = Math.max(1, ...ranked.map((p) => p.progress.stars));
  const top3 = ranked.slice(0, 3);

  const podiumOrder =
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd
      : top3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="animate-card-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                กระดานอันดับคะแนน
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                จัดอันดับผู้เล่นตามจำนวนดาวสะสมและคำศัพท์ที่จำได้
              </p>
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

        {ranked.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
            ยังไม่มีผู้เล่นในระบบ สร้างผู้เล่นและเล่นเกมเพื่อเก็บดาวกันเลย!
          </div>
        ) : (
          <>
            {/* Top 3 Game Podium */}
            {top3.length > 0 && (
              <div className="mb-6 rounded-3xl bg-gradient-to-b from-indigo-50 via-amber-50/50 to-white p-5 ring-1 ring-indigo-100">
                <div className="flex items-end justify-center gap-3 sm:gap-5">
                  {podiumOrder.map((player) => {
                    const rank = ranked.findIndex((p) => p.id === player.id) + 1;
                    const isFirst = rank === 1;
                    const isSecond = rank === 2;
                    const heightClass = isFirst
                      ? 'h-28 bg-gradient-to-t from-amber-500 to-amber-300'
                      : isSecond
                        ? 'h-20 bg-gradient-to-t from-slate-400 to-slate-300'
                        : 'h-16 bg-gradient-to-t from-orange-400 to-amber-200';

                    return (
                      <div
                        key={player.id}
                        className="flex w-28 flex-col items-center text-center sm:w-32"
                      >
                        <div className="relative mb-2">
                          {isFirst && (
                            <Crown className="mx-auto mb-1 h-7 w-7 animate-bounce-soft fill-amber-400 text-amber-500" />
                          )}
                          <div
                            className={`flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-4 ${
                              isFirst
                                ? 'h-16 w-16 ring-amber-400'
                                : isSecond
                                  ? 'h-14 w-14 ring-slate-300'
                                  : 'h-14 w-14 ring-orange-300'
                            }`}
                          >
                            <AvatarDisplay
                              avatar={player.progress.avatar || player.avatar}
                              alt={player.name}
                              className="h-full w-full"
                              emojiClassName={isFirst ? 'text-4xl' : 'text-3xl'}
                            />
                          </div>
                        </div>

                        <div className="w-full truncate text-sm font-bold text-slate-900">
                          {player.name}
                        </div>
                        <div className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {player.progress.stars}
                        </div>

                        <div
                          className={`flex w-full items-center justify-center rounded-t-2xl font-en text-2xl font-bold text-white shadow-inner ${heightClass}`}
                        >
                          #{rank}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score Bar Chart List */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                กราฟเปรียบเทียบคะแนนผู้เล่นทั้งหมด ({ranked.length} คน)
              </div>

              {ranked.map((player, index) => {
                const rank = index + 1;
                const isMe = player.id === activePlayerId;
                const gradeInfo =
                  CURRICULUM.find((g) => g.id === player.progress.selectedGrade) ??
                  CURRICULUM[0];
                const barWidth = Math.max(
                  6,
                  Math.round((player.progress.stars / maxStars) * 100)
                );

                return (
                  <div
                    key={player.id}
                    className={`rounded-2xl border-2 p-3.5 transition ${
                      isMe
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                        : 'border-slate-100 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-en text-base font-bold ${
                            rank === 1
                              ? 'bg-amber-400 text-white'
                              : rank === 2
                                ? 'bg-slate-400 text-white'
                                : rank === 3
                                  ? 'bg-orange-400 text-white'
                                  : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {rank <= 3 ? <Medal className="h-5 w-5" /> : rank}
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs">
                          <AvatarDisplay
                            avatar={player.progress.avatar || player.avatar}
                            alt={player.name}
                            className="h-full w-full"
                            emojiClassName="text-2xl"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-bold text-slate-900">
                              {player.name}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{gradeInfo.shortName}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <BookCheck className="h-3.5 w-3.5 text-emerald-600" />
                              จำได้ {player.progress.learnedWords.length} คำ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                        <span>{player.progress.stars}</span>
                      </div>
                    </div>

                    {/* Visual Score Bar */}
                    <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          rank === 1
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : rank === 2
                              ? 'bg-gradient-to-r from-sky-400 to-indigo-500'
                              : rank === 3
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                : 'bg-indigo-400'
                        }`}
                        style={{ width: `${player.progress.stars === 0 ? 4 : barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-base font-bold text-white shadow hover:bg-indigo-700 sm:w-auto sm:px-10"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ALL_WORDS_MAP, CURRICULUM } from '../data/curriculum';
import type { GradeId, PlayerProfile } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Download,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface AdminAnalyticsModalProps {
  players: PlayerProfile[];
  onRefreshFromCloud: () => Promise<void>;
  onDeletePlayer: (playerId: string) => void;
  onClose: () => void;
}

const ADMIN_PIN_KEY = 'kintin_lingo_admin_unlocked_v2';
const DEFAULT_ADMIN_PIN = '150632';

export const AdminAnalyticsModal: React.FC<AdminAnalyticsModalProps> = ({
  players,
  onRefreshFromCloud,
  onDeletePlayer,
  onClose,
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_PIN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeId | 'all'>('all');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === DEFAULT_ADMIN_PIN) {
      setUnlocked(true);
      setPinError('');
      try {
        sessionStorage.setItem(ADMIN_PIN_KEY, 'true');
      } catch {
        // ignore
      }
    } else {
      setPinError('รหัสผ่าน Admin ไม่ถูกต้อง');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onRefreshFromCloud();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  // 1. Overall KPIs
  const kpis = useMemo(() => {
    const totalPlayers = players.length;
    const totalStars = players.reduce((s, p) => s + p.progress.stars, 0);
    const totalLearned = players.reduce((s, p) => s + p.progress.learnedWords.length, 0);
    const totalWrong = players.reduce((s, p) => s + p.progress.wrongWords.length, 0);
    const avgStars = totalPlayers > 0 ? (totalStars / totalPlayers).toFixed(1) : '0';
    const avgLearned = totalPlayers > 0 ? (totalLearned / totalPlayers).toFixed(1) : '0';
    const accuracy =
      totalLearned + totalWrong > 0
        ? Math.round((totalLearned / (totalLearned + totalWrong)) * 100)
        : 100;

    return {
      totalPlayers,
      totalStars,
      totalLearned,
      totalWrong,
      avgStars,
      avgLearned,
      accuracy,
    };
  }, [players]);

  // 2. Grade Distribution (อ.1 - ป.6)
  const gradeDistribution = useMemo(() => {
    return CURRICULUM.map((g) => {
      const inGrade = players.filter((p) => p.progress.selectedGrade === g.id);
      const count = inGrade.length;
      const stars = inGrade.reduce((s, p) => s + p.progress.stars, 0);
      const words = inGrade.reduce((s, p) => s + p.progress.learnedWords.length, 0);
      return {
        grade: g,
        count,
        stars,
        avgWords: count > 0 ? Math.round(words / count) : 0,
      };
    });
  }, [players]);

  const maxGradeCount = Math.max(1, ...gradeDistribution.map((d) => d.count));

  // 3. Most Missed Words & Most Mastered Words across all students
  const wordFrequency = useMemo(() => {
    const wrongCounts = new Map<string, number>();
    const learnedCounts = new Map<string, number>();

    players.forEach((p) => {
      p.progress.wrongWords.forEach((id) => {
        wrongCounts.set(id, (wrongCounts.get(id) ?? 0) + 1);
      });
      p.progress.learnedWords.forEach((id) => {
        learnedCounts.set(id, (learnedCounts.get(id) ?? 0) + 1);
      });
    });

    const topWrong = Array.from(wrongCounts.entries())
      .map(([id, count]) => ({ word: ALL_WORDS_MAP.get(id), count }))
      .filter((x) => Boolean(x.word))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topLearned = Array.from(learnedCounts.entries())
      .map(([id, count]) => ({ word: ALL_WORDS_MAP.get(id), count }))
      .filter((x) => Boolean(x.word))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { topWrong, topLearned };
  }, [players]);

  // 4. Filtered Player Table
  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...players]
      .filter((p) => (gradeFilter === 'all' ? true : p.progress.selectedGrade === gradeFilter))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.friendCode ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => b.progress.stars - a.progress.stars);
  }, [players, searchQuery, gradeFilter]);

  // 5. CSV Export for Admin / Teacher
  const handleExportCsv = () => {
    const headers = [
      'Player ID',
      'Friend Code',
      'Name',
      'Grade',
      'Stars',
      'Words Mastered',
      'Words Needs Review',
      'Lessons Completed',
      'Friends Count',
      'Created At',
    ];
    const rows = players.map((p) => {
      const g = CURRICULUM.find((c) => c.id === p.progress.selectedGrade);
      return [
        p.id,
        p.friendCode ?? '',
        `"${p.name.replace(/"/g, '""')}"`,
        g?.shortName ?? p.progress.selectedGrade,
        p.progress.stars,
        p.progress.learnedWords.length,
        p.progress.wrongWords.length,
        Object.keys(p.progress.completedLessons).length,
        (p.friends ?? []).length,
        p.createdAt,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kintin-word-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-md">
        <div className="animate-card-pop w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Analytics</h2>
          <p className="mt-1 text-xs text-slate-500">
            กรอกรหัสผ่านผู้ดูแลระบบเพื่อดูสถิติและจัดการข้อมูล
          </p>

          <form onSubmit={handleUnlock} className="mt-5 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 outline-none focus:border-indigo-600"
            />
            {pinError && <p className="text-xs font-bold text-rose-600">{pinError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white shadow hover:bg-slate-800"
              >
                เข้าสู่หน้า Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 backdrop-blur-md sm:p-6">
      <div className="animate-card-pop max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-50 p-5 shadow-2xl sm:p-7">
        {/* Top Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Kintin Word — Admin Analytics
              </h2>
              <p className="text-xs text-slate-500">
                แดชบอร์ดวิเคราะห์ผลการเรียนรู้ของผู้เล่นทั้งหมด อ.1 – ป.6
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              ซิงค์ MySQL
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white p-2 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 1. KPI Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>ผู้เล่นทั้งหมด</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="font-en mt-1 text-3xl font-bold text-slate-900">
              {kpis.totalPlayers}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">โปรไฟล์ในระบบ</div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>ดาวสะสมรวม</span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </div>
            <div className="font-en mt-1 text-3xl font-bold text-amber-600">
              {kpis.totalStars}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              เฉลี่ย {kpis.avgStars} ดาว/คน
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>คำศัพท์ที่จำได้รวม</span>
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-en mt-1 text-3xl font-bold text-emerald-600">
              {kpis.totalLearned}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              เฉลี่ย {kpis.avgLearned} คำ/คน
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>ความแม่นยำรวม</span>
              <Award className="h-4 w-4 text-purple-600" />
            </div>
            <div className="font-en mt-1 text-3xl font-bold text-purple-600">
              {kpis.accuracy}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              ต้องทบทวน {kpis.totalWrong} จุด
            </div>
          </div>
        </div>

        {/* 2. Grade Distribution & Word Insights */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Grade Distribution Chart */}
          <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-slate-200/80">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              สัดส่วนผู้เรียนแยกตามระดับชั้น (อ.1 – ป.6)
            </h3>
            <div className="space-y-2.5">
              {gradeDistribution.map(({ grade, count, stars, avgWords }) => {
                const widthPct = Math.max(4, Math.round((count / maxGradeCount) * 100));
                return (
                  <div key={grade.id} className="text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {grade.badgeEmoji} {grade.shortName} ({grade.nameTh})
                      </span>
                      <span className="text-slate-500">
                        <strong className="text-indigo-700">{count} คน</strong> • ⭐ {stars} • เฉลี่ย{' '}
                        {avgWords} คำ
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${grade.gradient}`}
                        style={{ width: `${count === 0 ? 2 : widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Difficult Words vs Top Mastered Words */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-3xl bg-white p-5 shadow-xs ring-1 ring-slate-200/80">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-rose-700">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                คำศัพท์ที่เด็กตอบผิดบ่อยที่สุด (ควรเน้นย้ำ)
              </h3>
              {wordFrequency.topWrong.length === 0 ? (
                <p className="text-xs text-slate-400">ยังไม่มีสถิติคำที่ตอบผิดในระบบ</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {wordFrequency.topWrong.map(({ word, count }) => (
                    <span
                      key={word!.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200"
                    >
                      <span>{word!.emoji}</span>
                      <span className="font-en">{word!.word}</span>
                      <span className="text-rose-500">({word!.thai})</span>
                      <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] text-white">
                        ผิด {count} คน
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 rounded-3xl bg-white p-5 shadow-xs ring-1 ring-slate-200/80">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
                <Award className="h-5 w-5 text-emerald-500" />
                คำศัพท์ยอดนิยมที่เด็กจำได้แม่นที่สุด
              </h3>
              {wordFrequency.topLearned.length === 0 ? (
                <p className="text-xs text-slate-400">ยังไม่มีสถิติคำศัพท์ที่เรียนแล้ว</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {wordFrequency.topLearned.map(({ word, count }) => (
                    <span
                      key={word!.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200"
                    >
                      <span>{word!.emoji}</span>
                      <span className="font-en">{word!.word}</span>
                      <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                        {count} คน
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Student Drill-down Table */}
        <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-slate-200/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">
              ตารางข้อมูลผู้เรียนทั้งหมด ({filteredPlayers.length} คน)
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือ รหัสเพื่อน..."
                  className="rounded-xl border border-slate-200 py-1.5 pr-3 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value as GradeId | 'all')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">ทุกระดับชั้น</option>
                {CURRICULUM.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.shortName} - {g.nameTh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-2.5 font-bold">ผู้เรียน</th>
                  <th className="pb-2.5 font-bold">รหัสเพื่อน</th>
                  <th className="pb-2.5 font-bold">ระดับชั้น</th>
                  <th className="pb-2.5 font-bold">ดาวสะสม</th>
                  <th className="pb-2.5 font-bold">จำได้แล้ว</th>
                  <th className="pb-2.5 font-bold">ต้องทบทวน</th>
                  <th className="pb-2.5 font-bold">เพื่อน</th>
                  <th className="pb-2.5 text-right font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.map((p) => {
                  const g =
                    CURRICULUM.find((c) => c.id === p.progress.selectedGrade) ?? CURRICULUM[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            <AvatarDisplay
                              avatar={p.progress.avatar || p.avatar}
                              alt={p.name}
                              className="h-full w-full"
                              emojiClassName="text-lg"
                            />
                          </div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="font-en py-2.5 font-semibold text-indigo-600">
                        {p.friendCode ?? '-'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${g.accentBg} ${g.accentText}`}
                        >
                          {g.shortName}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-amber-600">⭐ {p.progress.stars}</td>
                      <td className="py-2.5 font-bold text-emerald-600">
                        {p.progress.learnedWords.length} คำ
                      </td>
                      <td className="py-2.5 font-bold text-rose-600">
                        {p.progress.wrongWords.length} คำ
                      </td>
                      <td className="py-2.5 text-slate-600">{(p.friends ?? []).length} คน</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeletePlayer(p.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="ลบผู้เล่น"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      ไม่พบข้อมูลผู้เล่นที่ตรงตามเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

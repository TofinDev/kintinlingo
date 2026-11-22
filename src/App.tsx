import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_WORDS_MAP, CURRICULUM } from './data/curriculum';
import type { FriendEntry, GradeId, Lesson, PlayerProfile, UserProgress, VocabWord } from './types';
import {
  createNewPlayer,
  deleteCloudPlayer,
  fetchCloudPlayers,
  loadPlayers,
  savePlayers,
  syncPlayerToCloud,
} from './utils/storage';
import { PlayerLogin } from './components/PlayerLogin';
import { GradeSelector } from './components/GradeSelector';
import { AvatarDisplay } from './components/AvatarDisplay';
import { GameLoader } from './components/GameLoader';
import { IntroVideoModal } from './components/IntroVideoModal';
import {
  getPresetLabel,
  getVoiceSettings,
  playTone,
  saveVoiceSettings,
  type VoiceSettings,
} from './utils/speech';
import { BarChart3, GraduationCap, LogOut, QrCode, Star, Trophy, Users, Volume2 } from 'lucide-react';

const Background3D = lazy(() =>
  import('./components/Background3D').then((m) => ({ default: m.Background3D }))
);
const GameWorld3D = lazy(() =>
  import('./components/GameWorld3D').then((m) => ({ default: m.GameWorld3D }))
);
const FlashcardMode = lazy(() =>
  import('./components/FlashcardMode').then((m) => ({ default: m.FlashcardMode }))
);
const QuizMode = lazy(() =>
  import('./components/QuizMode').then((m) => ({ default: m.QuizMode }))
);
const MemoryMatchGame = lazy(() =>
  import('./components/MemoryMatchGame').then((m) => ({ default: m.MemoryMatchGame }))
);
const SpeedGame = lazy(() =>
  import('./components/SpeedGame').then((m) => ({ default: m.SpeedGame }))
);
const VoiceSelectorModal = lazy(() =>
  import('./components/VoiceSelectorModal').then((m) => ({ default: m.VoiceSelectorModal }))
);
const LeaderboardModal = lazy(() =>
  import('./components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }))
);
const VocabAnalysisModal = lazy(() =>
  import('./components/VocabAnalysisModal').then((m) => ({ default: m.VocabAnalysisModal }))
);
const ShareQrModal = lazy(() =>
  import('./components/ShareQrModal').then((m) => ({ default: m.ShareQrModal }))
);
const VsBattleMode = lazy(() =>
  import('./components/VsBattleMode').then((m) => ({ default: m.VsBattleMode }))
);
import { decodeVsChallenge, type VsOpponent } from './components/VsBattleMode';
const FriendsModal = lazy(() =>
  import('./components/FriendsModal').then((m) => ({ default: m.FriendsModal }))
);
import { decodeFriendInvite } from './components/FriendsModal';
const AdminAnalyticsModal = lazy(() =>
  import('./components/AdminAnalyticsModal').then((m) => ({ default: m.AdminAnalyticsModal }))
);
const EggGachaModal = lazy(() =>
  import('./components/EggGachaModal').then((m) => ({ default: m.EggGachaModal }))
);

const APP_VERSION = 'v1.5.0';

type ViewMode =
  | 'login'
  | 'grade_select'
  | 'map'
  | 'learn'
  | 'quiz'
  | 'memory'
  | 'speed'
  | 'vs'
  | 'review';

export function App() {
  const [players, setPlayers] = useState<PlayerProfile[]>(() => loadPlayers());
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('login');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [enteringPlayer, setEnteringPlayer] = useState<PlayerProfile | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => getVoiceSettings());
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showEggModal, setShowEggModal] = useState(false);
  const [freeEggSpins, setFreeEggSpins] = useState(1);
  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname === '/admin' ||
      new URLSearchParams(window.location.search).get('admin') === '1'
    );
  });
  const [pendingFriendInvite, setPendingFriendInvite] = useState<FriendEntry | null>(() => {
    if (typeof window === 'undefined') return null;
    const fParam = new URLSearchParams(window.location.search).get('addfriend');
    return fParam ? decodeFriendInvite(fParam) : null;
  });
  const [pendingChallenge, setPendingChallenge] = useState<VsOpponent | null>(() => {
    if (typeof window === 'undefined') return null;
    const vsParam = new URLSearchParams(window.location.search).get('vs');
    return vsParam ? decodeVsChallenge(vsParam) : null;
  });

  const handleVoiceChange = (next: VoiceSettings) => {
    setVoiceSettings(next);
    saveVoiceSettings(next);
  };

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  const refreshFromCloud = useCallback(async () => {
    const cloudPlayers = await fetchCloudPlayers();
    if (!cloudPlayers || cloudPlayers.length === 0) return;
    setPlayers((localPlayers) => {
      const merged = new Map<string, PlayerProfile>();
      localPlayers.forEach((p) => merged.set(p.id, p));
      cloudPlayers.forEach((cp) => {
        const existing = merged.get(cp.id);
        if (!existing || cp.progress.stars >= existing.progress.stars) {
          merged.set(cp.id, cp);
        }
      });
      return Array.from(merged.values());
    });
  }, []);

  // Fetch players from MySQL backend on startup (if configured)
  useEffect(() => {
    void refreshFromCloud();
  }, [refreshFromCloud]);

  const activePlayer = useMemo(
    () => players.find((p) => p.id === activePlayerId) ?? null,
    [players, activePlayerId]
  );

  const progress = activePlayer?.progress;

  const currentGrade = useMemo(
    () =>
      CURRICULUM.find((g) => g.id === progress?.selectedGrade) ?? CURRICULUM[0],
    [progress?.selectedGrade]
  );

  const fallbackPool = useMemo(
    () => currentGrade.lessons.flatMap((l) => l.words),
    [currentGrade]
  );

  const reviewWords = useMemo(
    () =>
      (progress?.wrongWords ?? [])
        .map((id) => ALL_WORDS_MAP.get(id))
        .filter((w): w is VocabWord => Boolean(w)),
    [progress?.wrongWords]
  );

  const updateActiveProgress = useCallback(
    (updater: (prev: UserProgress) => UserProgress) => {
      if (!activePlayerId) return;
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) => {
          if (p.id !== activePlayerId) return p;
          const updated = { ...p, progress: updater(p.progress) };
          void syncPlayerToCloud(updated);
          return updated;
        })
      );
    },
    [activePlayerId]
  );

  const triggerEnterAnimation = (player: PlayerProfile) => {
    playTone('complete');
    setEnteringPlayer(player);
    setActivePlayerId(player.id);
    setActiveLesson(null);
    setView(pendingChallenge ? 'vs' : 'map');
    setTimeout(() => {
      setEnteringPlayer(null);
    }, 750);
  };

  const handleLogin = (player: PlayerProfile) => {
    triggerEnterAnimation(player);
  };

  const handleCreatePlayer = (params: {
    name: string;
    avatar: string;
    grade: GradeId;
    pin?: string;
  }) => {
    const created = createNewPlayer(params);
    setPlayers((prev) => [...prev, created]);
    void syncPlayerToCloud(created);
    triggerEnterAnimation(created);
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    void deleteCloudPlayer(playerId);
    if (activePlayerId === playerId) {
      setActivePlayerId(null);
      setView('login');
    }
  };

  const handleLogout = () => {
    setActivePlayerId(null);
    setActiveLesson(null);
    setView('login');
  };

  const handleSelectGrade = (gradeId: GradeId) => {
    updateActiveProgress((prev) => ({ ...prev, selectedGrade: gradeId }));
    setView('map');
  };

  const handleSelectAvatar = (avatar: string) => {
    if (!activePlayerId) return;
    setPlayers((prevPlayers) =>
      prevPlayers.map((p) =>
        p.id === activePlayerId
          ? { ...p, avatar, progress: { ...p.progress, avatar } }
          : p
      )
    );
  };

  const handleMarkLearned = useCallback(
    (wordId: string) => {
      updateActiveProgress((prev) => {
        if (prev.learnedWords.includes(wordId)) return prev;
        return { ...prev, learnedWords: [...prev.learnedWords, wordId] };
      });
    },
    [updateActiveProgress]
  );

  const handleQuizComplete = (
    lessonId: string | null,
    result: { starsEarned: number; correctIds: string[]; wrongIds: string[] }
  ) => {
    setFreeEggSpins((s) => s + 1);
    updateActiveProgress((prev) => {
      const nextLearned = Array.from(
        new Set([...prev.learnedWords, ...result.correctIds])
      );
      const nextWrong = Array.from(
        new Set([
          ...prev.wrongWords.filter((id) => !result.correctIds.includes(id)),
          ...result.wrongIds,
        ])
      );
      const prevLessonStars = lessonId ? prev.completedLessons[lessonId] ?? 0 : 0;
      const nextCompleted = lessonId
        ? {
            ...prev.completedLessons,
            [lessonId]: Math.max(prevLessonStars, result.starsEarned),
          }
        : prev.completedLessons;

      return {
        ...prev,
        stars: prev.stars + result.starsEarned,
        completedLessons: nextCompleted,
        learnedWords: nextLearned,
        wrongWords: nextWrong,
      };
    });
  };

  const handleArcadeComplete = useCallback(
    (starsEarned: number, learnedIds: string[]) => {
      setFreeEggSpins((s) => s + 1);
      updateActiveProgress((prev) => ({
        ...prev,
        stars: prev.stars + starsEarned,
        learnedWords: Array.from(new Set([...prev.learnedWords, ...learnedIds])),
      }));
    },
    [updateActiveProgress]
  );

  const handleHatchEgg = useCallback(
    (res: { egg: { id: string }; usedFreeSpin: boolean; netStarsDelta: number }) => {
      if (res.usedFreeSpin) {
        setFreeEggSpins((s) => Math.max(0, s - 1));
      }
      updateActiveProgress((prev) => {
        const eggKey = `__egg_${res.egg.id}`;
        const prevCount = prev.completedLessons[eggKey] ?? 0;
        return {
          ...prev,
          stars: Math.max(0, prev.stars + res.netStarsDelta),
          completedLessons: {
            ...prev.completedLessons,
            [eggKey]: prevCount + 1,
          },
        };
      });
    },
    [updateActiveProgress]
  );

  const handleAddFriend = useCallback(
    (friend: FriendEntry) => {
      if (!activePlayerId) return;
      playTone('correct');
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) => {
          if (p.id !== activePlayerId) return p;
          const existing = p.friends ?? [];
          if (existing.some((f) => f.id === friend.id)) return p;
          const updated = { ...p, friends: [...existing, friend] };
          void syncPlayerToCloud(updated);
          return updated;
        })
      );
    },
    [activePlayerId]
  );

  const handleRemoveFriend = useCallback(
    (friendId: string) => {
      if (!activePlayerId) return;
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) => {
          if (p.id !== activePlayerId) return p;
          const updated = {
            ...p,
            friends: (p.friends ?? []).filter((f) => f.id !== friendId),
          };
          void syncPlayerToCloud(updated);
          return updated;
        })
      );
    },
    [activePlayerId]
  );

  return (
    <div className="relative min-h-screen bg-transparent pb-12">
      {showIntroVideo && !showAdminModal && (
        <IntroVideoModal onFinish={() => setShowIntroVideo(false)} />
      )}

      <Suspense fallback={null}>
        <Background3D
          ageGroup={activePlayer ? currentGrade.ageGroup : 'kindergarten'}
          viewKey={view}
        />
      </Suspense>

      {/* Global Header (Compact single-row on mobile) */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
          <button
            onClick={() => setView(activePlayer ? 'map' : 'login')}
            className="flex shrink-0 items-center gap-2 text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="font-en flex items-center gap-1.5 whitespace-nowrap text-base font-bold leading-tight text-slate-900 sm:text-lg">
                <span>
                  Kintin <span className="text-indigo-600">Vocab</span>
                </span>
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {APP_VERSION}
                </span>
              </div>
              <div className="hidden text-[11px] font-medium text-slate-500 md:block">
                ภาษาอังกฤษ อ.1 – ป.6
              </div>
            </div>
          </button>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {/* Secondary Menu Buttons: hidden on mobile while inside a lesson/quiz to save vertical space */}
            <div
              className={`${
                ['learn', 'quiz', 'memory', 'speed', 'vs', 'review'].includes(view)
                  ? 'hidden sm:flex'
                  : 'flex'
              } items-center gap-1 sm:gap-2`}
            >
              {/* Leaderboard Button */}
              <button
                onClick={() => setShowLeaderboard(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-1.5 text-xs font-bold text-amber-800 shadow-xs transition hover:bg-amber-100 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                title="ดูอันดับคะแนนผู้เล่น"
              >
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="hidden md:inline">อันดับ</span>
              </button>

              {activePlayer && (
                <>
                  <button
                    onClick={() => setShowFriendsModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-1.5 text-xs font-bold text-emerald-700 shadow-xs transition hover:bg-emerald-100 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                    title="เพื่อน (Friends)"
                  >
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="hidden md:inline">
                      เพื่อน ({(activePlayer.friends ?? []).length})
                    </span>
                  </button>

                  <button
                    onClick={() => setShowAnalysis(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 p-1.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-100 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                    title="วิเคราะห์แนวคำศัพท์และหมวดที่ควรเพิ่ม"
                  >
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    <span className="hidden md:inline">วิเคราะห์</span>
                  </button>
                </>
              )}

              {/* QR Code Share Button */}
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                title="สแกน QR Code เพื่อเปิดบนมือถือ"
              >
                <QrCode className="h-4 w-4 text-indigo-600" />
                <span className="hidden lg:inline">QR Code</span>
              </button>
            </div>

            {/* Voice Selector Button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
              title="เลือกเสียงอ่าน"
            >
              <Volume2 className="h-4 w-4 text-indigo-600" />
              <span className="hidden lg:inline">{getPresetLabel(voiceSettings)}</span>
            </button>

            {activePlayer && progress && (
              <>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                  title="เปลี่ยนผู้เล่น / ออกจากระบบ"
                >
                  <AvatarDisplay
                    avatar={progress.avatar || activePlayer.avatar}
                    alt={activePlayer.name}
                    className="h-5 w-5 rounded-md sm:h-6 sm:w-6 sm:rounded-lg"
                    emojiClassName="text-sm sm:text-base"
                  />
                  <span className="hidden max-w-[80px] truncate sm:inline sm:max-w-[120px]">
                    {activePlayer.name}
                  </span>
                  <LogOut className="h-3.5 w-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => setView('grade_select')}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                  title="คลิกเพื่อเปลี่ยนระดับชั้น"
                >
                  {currentGrade.shortName}
                </button>

                <button
                  onClick={() => setShowEggModal(true)}
                  className="relative flex items-center gap-1 rounded-xl border border-rose-200 bg-gradient-to-r from-amber-50 to-rose-50 px-2 py-1 text-xs font-bold text-rose-700 shadow-xs transition hover:from-amber-100 hover:to-rose-100 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm"
                  title="สุ่มไข่วิเศษ & สัตว์ในตำนาน"
                >
                  <span>🥚</span>
                  <span className="hidden md:inline">สุ่มไข่</span>
                  {freeEggSpins > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {freeEggSpins}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 sm:rounded-2xl sm:px-3 sm:py-1.5 sm:text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 sm:h-4 sm:w-4" />
                  <span>{progress.stars}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Portal Overlay on Login */}
      {enteringPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-md">
          <div className="animate-portal-zoom flex flex-col items-center rounded-3xl bg-white/95 px-10 py-8 text-center shadow-2xl ring-4 ring-indigo-200">
            <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100 to-pink-100 shadow-inner">
              <AvatarDisplay
                avatar={enteringPlayer.progress.avatar || enteringPlayer.avatar}
                alt={enteringPlayer.name}
                className="h-full w-full"
                emojiClassName="text-6xl"
              />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              ยินดีต้อนรับ {enteringPlayer.name}!
            </div>
            <div className="font-en mt-1 text-base font-bold text-indigo-600">
              Let’s Go! 🚀
            </div>
          </div>
        </div>
      )}

      {/* Lazy Modals */}
      <Suspense fallback={null}>
        {showAnalysis && activePlayer && (
          <VocabAnalysisModal
            player={activePlayer}
            currentGrade={currentGrade}
            onSelectLesson={(lesson) => {
              setActiveLesson(lesson);
              setView('learn');
            }}
            onClose={() => setShowAnalysis(false)}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal
            players={players}
            activePlayerId={activePlayerId}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {showVoiceModal && (
          <VoiceSelectorModal
            settings={voiceSettings}
            ageGroup={activePlayer ? currentGrade.ageGroup : 'kindergarten'}
            onChange={handleVoiceChange}
            onClose={() => setShowVoiceModal(false)}
          />
        )}

        {showQrModal && <ShareQrModal onClose={() => setShowQrModal(false)} />}

        {showEggModal && activePlayer && (
          <EggGachaModal
            player={activePlayer}
            freeSpins={freeEggSpins}
            onHatchEgg={handleHatchEgg}
            onEquipAvatar={handleSelectAvatar}
            onClose={() => setShowEggModal(false)}
          />
        )}

        {showAdminModal && (
          <AdminAnalyticsModal
            players={players}
            onRefreshFromCloud={refreshFromCloud}
            onDeletePlayer={handleDeletePlayer}
            onClose={() => {
              setShowAdminModal(false);
              if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
                window.history.replaceState({}, '', '/');
              }
            }}
          />
        )}

        {showFriendsModal && activePlayer && (
          <FriendsModal
            currentPlayer={activePlayer}
            allPlayers={players}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            onChallengeFriend={(f) => {
              setPendingChallenge({
                id: f.id,
                name: f.name,
                avatar: f.avatar,
                gradeId: f.gradeId,
                targetScore: Math.max(60, f.stars * 12),
                isOnlineChallenge: true,
              });
              setView('vs');
            }}
            onClose={() => setShowFriendsModal(false)}
          />
        )}
      </Suspense>

      {/* Incoming Friend Invite Banner (when opened via ?addfriend=...) */}
      {pendingFriendInvite && activePlayer && pendingFriendInvite.id !== activePlayer.id && (
        <div className="mx-auto mt-4 max-w-xl px-4">
          <div className="animate-card-pop flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{pendingFriendInvite.avatar}</span>
              <div>
                <div className="text-sm font-bold text-emerald-950">
                  🤝 {pendingFriendInvite.name} ({pendingFriendInvite.friendCode}) ชวนคุณเป็นเพื่อน!
                </div>
                <div className="text-xs text-emerald-700">กดยอมรับเพื่อเพิ่มเข้าลิสต์เพื่อนเลย</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleAddFriend(pendingFriendInvite);
                  setPendingFriendInvite(null);
                }}
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
              >
                ยอมรับ
              </button>
              <button
                onClick={() => setPendingFriendInvite(null)}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Game Loader */}
      <main key={view} className="animate-page-enter">
        <Suspense fallback={<GameLoader />}>
          {(view === 'login' || !activePlayer || !progress) && (
            <PlayerLogin
              players={players}
              onLogin={handleLogin}
              onCreatePlayer={handleCreatePlayer}
              onDeletePlayer={handleDeletePlayer}
            />
          )}

          {activePlayer && progress && view === 'grade_select' && (
            <GradeSelector
              selectedGrade={progress.selectedGrade}
              selectedAvatar={progress.avatar}
              onSelectGrade={handleSelectGrade}
              onSelectAvatar={handleSelectAvatar}
              onClose={() => setView('map')}
            />
          )}

          {activePlayer && progress && view === 'map' && (
            <GameWorld3D
              grade={currentGrade}
              progress={progress}
              onStartLearn={(lesson) => {
                setActiveLesson(lesson);
                setView('learn');
              }}
              onStartQuiz={(lesson) => {
                setActiveLesson(lesson);
                setView('quiz');
              }}
              onStartMemory={() => setView('memory')}
              onStartSpeed={() => setView('speed')}
              onStartVs={() => setView('vs')}
              onStartReview={() => setView('review')}
              onChangeGrade={() => setView('grade_select')}
            />
          )}

          {activePlayer && progress && view === 'learn' && activeLesson && (
            <FlashcardMode
              lesson={activeLesson}
              ageGroup={currentGrade.ageGroup}
              onMarkLearned={handleMarkLearned}
              onFinishToQuiz={() => setView('quiz')}
              onBack={() => setView('map')}
            />
          )}

          {activePlayer && progress && view === 'quiz' && activeLesson && (
            <QuizMode
              title={activeLesson.titleTh}
              words={activeLesson.words}
              fallbackPool={fallbackPool}
              ageGroup={currentGrade.ageGroup}
              onComplete={(res) => handleQuizComplete(activeLesson.id, res)}
              onBack={() => setView('map')}
            />
          )}

          {activePlayer && progress && view === 'memory' && (
            <MemoryMatchGame
              title={`คำศัพท์ ${currentGrade.nameTh}`}
              words={fallbackPool}
              ageGroup={currentGrade.ageGroup}
              onComplete={handleArcadeComplete}
              onBack={() => setView('map')}
            />
          )}

          {activePlayer && progress && view === 'speed' && (
            <SpeedGame
              gradeName={currentGrade.shortName}
              words={fallbackPool}
              ageGroup={currentGrade.ageGroup}
              onComplete={handleArcadeComplete}
              onBack={() => setView('map')}
            />
          )}

          {activePlayer && progress && view === 'vs' && (
            <VsBattleMode
              currentPlayer={activePlayer}
              allPlayers={players}
              initialChallenge={pendingChallenge}
              onClearInitialChallenge={() => setPendingChallenge(null)}
              onComplete={handleArcadeComplete}
              onBack={() => {
                setPendingChallenge(null);
                setView('map');
              }}
            />
          )}

          {activePlayer && progress && view === 'review' && reviewWords.length > 0 && (
            <QuizMode
              title="ทบทวนคำศัพท์ที่เคยตอบผิด"
              words={reviewWords}
              fallbackPool={fallbackPool}
              ageGroup={currentGrade.ageGroup}
              onComplete={(res) => handleQuizComplete(null, res)}
              onBack={() => setView('map')}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default App;

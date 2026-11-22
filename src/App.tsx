import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_WORDS_MAP, CURRICULUM } from './data/curriculum';
import type { GradeId, Lesson, PlayerProfile, UserProgress, VocabWord } from './types';
import { createNewPlayer, loadPlayers, savePlayers } from './utils/storage';
import { PlayerLogin } from './components/PlayerLogin';
import { GradeSelector } from './components/GradeSelector';
import { LessonMap } from './components/LessonMap';
import { AvatarDisplay } from './components/AvatarDisplay';
import { GameLoader } from './components/GameLoader';
import {
  getPresetLabel,
  getVoiceSettings,
  playTone,
  saveVoiceSettings,
  type VoiceSettings,
} from './utils/speech';
import { BarChart3, GraduationCap, LogOut, QrCode, Star, Trophy, Volume2 } from 'lucide-react';

const Background3D = lazy(() =>
  import('./components/Background3D').then((m) => ({ default: m.Background3D }))
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

type ViewMode =
  | 'login'
  | 'grade_select'
  | 'map'
  | 'learn'
  | 'quiz'
  | 'memory'
  | 'speed'
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

  const handleVoiceChange = (next: VoiceSettings) => {
    setVoiceSettings(next);
    saveVoiceSettings(next);
  };

  useEffect(() => {
    savePlayers(players);
  }, [players]);

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
        prevPlayers.map((p) =>
          p.id === activePlayerId ? { ...p, progress: updater(p.progress) } : p
        )
      );
    },
    [activePlayerId]
  );

  const triggerEnterAnimation = (player: PlayerProfile) => {
    playTone('complete');
    setEnteringPlayer(player);
    setActivePlayerId(player.id);
    setActiveLesson(null);
    setView('map');
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
    triggerEnterAnimation(created);
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
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
      updateActiveProgress((prev) => ({
        ...prev,
        stars: prev.stars + starsEarned,
        learnedWords: Array.from(new Set([...prev.learnedWords, ...learnedIds])),
      }));
    },
    [updateActiveProgress]
  );

  return (
    <div className="relative min-h-screen bg-transparent pb-12">
      <Suspense fallback={null}>
        <Background3D ageGroup={activePlayer ? currentGrade.ageGroup : 'kindergarten'} />
      </Suspense>

      {/* Global Header */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <button
            onClick={() => setView(activePlayer ? 'map' : 'login')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="font-en text-lg font-bold leading-tight text-slate-900">
                Kintin <span className="text-indigo-600">Lingo</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                ภาษาอังกฤษ อ.1 – ป.6
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-xs transition hover:bg-amber-100 sm:text-sm"
              title="ดูอันดับคะแนนผู้เล่น"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="hidden sm:inline">อันดับ</span>
            </button>

            {/* Vocab Analysis Button (when logged in) */}
            {activePlayer && (
              <button
                onClick={() => setShowAnalysis(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-100 sm:text-sm"
                title="วิเคราะห์แนวคำศัพท์และหมวดที่ควรเพิ่ม"
              >
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">วิเคราะห์</span>
              </button>
            )}

            {/* QR Code Share Button */}
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 sm:text-sm"
              title="สแกน QR Code เพื่อเปิดบนมือถือ"
            >
              <QrCode className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            {/* Voice Selector Button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 sm:text-sm"
              title="เลือกเสียงอ่าน"
            >
              <Volume2 className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">{getPresetLabel(voiceSettings)}</span>
            </button>

            {activePlayer && progress && (
              <>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 sm:text-sm"
                  title="เปลี่ยนผู้เล่น / ออกจากระบบ"
                >
                  <AvatarDisplay
                    avatar={progress.avatar || activePlayer.avatar}
                    alt={activePlayer.name}
                    className="h-6 w-6 rounded-lg"
                    emojiClassName="text-base"
                  />
                  <span className="max-w-[90px] truncate sm:max-w-[140px]">
                    {activePlayer.name}
                  </span>
                  <LogOut className="h-3.5 w-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => setView('grade_select')}
                  className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 sm:text-sm"
                  title="คลิกเพื่อเปลี่ยนระดับชั้น"
                >
                  {currentGrade.shortName}
                </button>

                <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 sm:text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
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
      </Suspense>

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
            <LessonMap
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

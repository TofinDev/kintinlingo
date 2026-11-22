import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_WORDS_MAP, CURRICULUM } from './data/curriculum';
import type { GradeId, Lesson, PlayerProfile, UserProgress, VocabWord } from './types';
import { createNewPlayer, loadPlayers, savePlayers } from './utils/storage';
import { PlayerLogin } from './components/PlayerLogin';
import { GradeSelector } from './components/GradeSelector';
import { LessonMap } from './components/LessonMap';
import { FlashcardMode } from './components/FlashcardMode';
import { QuizMode } from './components/QuizMode';
import { AvatarDisplay } from './components/AvatarDisplay';
import { Background3D } from './components/Background3D';
import { playTone } from './utils/speech';
import { GraduationCap, LogOut, Star } from 'lucide-react';

type ViewMode = 'login' | 'grade_select' | 'map' | 'learn' | 'quiz' | 'review';

export function App() {
  const [players, setPlayers] = useState<PlayerProfile[]>(() => loadPlayers());
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('login');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [enteringPlayer, setEnteringPlayer] = useState<PlayerProfile | null>(null);

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

  return (
    <div className="relative min-h-screen bg-transparent pb-12">
      <Background3D ageGroup={activePlayer ? currentGrade.ageGroup : 'kindergarten'} />
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
                KidLingo <span className="text-indigo-600">TH</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                ภาษาอังกฤษ อ.1 – ป.6
              </div>
            </div>
          </button>

          {activePlayer && progress && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Active Player + Switch Player */}
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

              {/* Grade Switcher */}
              <button
                onClick={() => setView('grade_select')}
                className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 sm:text-sm"
                title="คลิกเพื่อเปลี่ยนระดับชั้น"
              >
                {currentGrade.shortName}
              </button>

              {/* Stars Counter */}
              <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 sm:text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <span>{progress.stars}</span>
              </div>
            </div>
          )}
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

      {/* Main Content */}
      <main key={view} className="animate-page-enter">
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
      </main>
    </div>
  );
}

export default App;

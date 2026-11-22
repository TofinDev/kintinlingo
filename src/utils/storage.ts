import type { GradeId, PlayerProfile, UserProgress } from '../types';

const LEGACY_STORAGE_KEY = 'kidlingo_th_progress_v1';
const PLAYERS_STORAGE_KEY = 'kidlingo_th_players_v1';

export const AVATARS = ['🦁', '🐰', '🐼', '🦊', '🦄', '🐸', '🦉', '🐬'];

export function createDefaultProgress(
  selectedGrade: GradeId = 'k1',
  avatar = '🦁'
): UserProgress {
  return {
    selectedGrade,
    avatar,
    stars: 0,
    completedLessons: {},
    learnedWords: [],
    wrongWords: [],
  };
}

export function generateFriendCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KL-${num}`;
}

export function loadPlayers(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile[];
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({
          ...p,
          friendCode: p.friendCode || generateFriendCode(),
          friends: p.friends ?? [],
        }));
      }
    }

    // Migrate legacy single-player progress if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<UserProgress>;
      const migrated: PlayerProfile = {
        id: 'player-default',
        name: 'ผู้เล่น 1',
        avatar: legacy.avatar ?? '🦁',
        progress: {
          ...createDefaultProgress(legacy.selectedGrade ?? 'k1', legacy.avatar ?? '🦁'),
          ...legacy,
          completedLessons: legacy.completedLessons ?? {},
          learnedWords: legacy.learnedWords ?? [],
          wrongWords: legacy.wrongWords ?? [],
        },
        createdAt: new Date().toISOString(),
      };
      savePlayers([migrated]);
      return [migrated];
    }

    return [];
  } catch {
    return [];
  }
}

export function savePlayers(players: PlayerProfile[]): void {
  try {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  } catch {
    // Ignore storage quota errors
  }
}

export function createNewPlayer(params: {
  name: string;
  avatar: string;
  grade: GradeId;
  pin?: string;
}): PlayerProfile {
  const cleanPin = params.pin?.trim();
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    friendCode: generateFriendCode(),
    name: params.name.trim(),
    avatar: params.avatar,
    pin: cleanPin ? cleanPin : undefined,
    progress: createDefaultProgress(params.grade, params.avatar),
    friends: [],
    createdAt: new Date().toISOString(),
  };
}

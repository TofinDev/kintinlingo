import React, { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { CURRICULUM } from '../data/curriculum';
import type { FriendEntry, GradeId, PlayerProfile } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import {
  Check,
  Copy,
  QrCode,
  Search,
  Star,
  Swords,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface FriendsModalProps {
  currentPlayer: PlayerProfile;
  allPlayers: PlayerProfile[];
  onAddFriend: (friend: FriendEntry) => void;
  onRemoveFriend: (friendId: string) => void;
  onChallengeFriend: (friend: FriendEntry) => void;
  onClose: () => void;
}

const SUGGESTED_FRIENDS: Omit<FriendEntry, 'addedAt'>[] = [
  { id: 'npc-fox', friendCode: 'KL-1001', name: 'น้องฟ็อกซ์ จอมซน', avatar: '🦊', gradeId: 'k2', stars: 12 },
  { id: 'npc-panda', friendCode: 'KL-2002', name: 'แพนด้า นักอ่าน', avatar: '🐼', gradeId: 'p1', stars: 24 },
  { id: 'npc-unicorn', friendCode: 'KL-3003', name: 'ยูนิคอร์น สายรุ้ง', avatar: '🦄', gradeId: 'p3', stars: 36 },
  { id: 'npc-owl', friendCode: 'KL-4004', name: 'นกฮูก อัจฉริยะ', avatar: '🦉', gradeId: 'p5', stars: 48 },
];

export function encodeFriendInvite(player: PlayerProfile): string {
  const safeAvatar = (player.progress.avatar || player.avatar).startsWith('data:image')
    ? '🦁'
    : player.progress.avatar || player.avatar;
  const json = JSON.stringify({
    id: player.id,
    fc: player.friendCode || 'KL-0000',
    n: player.name,
    a: safeAvatar,
    g: player.progress.selectedGrade,
    s: player.progress.stars,
  });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

export function decodeFriendInvite(encoded: string): FriendEntry | null {
  try {
    const bin = atob(encoded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const p = JSON.parse(json) as {
      id?: string;
      fc?: string;
      n?: string;
      a?: string;
      g?: GradeId;
      s?: number;
    };
    if (!p.n || !p.id) return null;
    return {
      id: p.id,
      friendCode: p.fc || 'KL-0000',
      name: p.n,
      avatar: p.a || '🦁',
      gradeId: p.g || 'k1',
      stars: p.s ?? 0,
      addedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  currentPlayer,
  allPlayers,
  onAddFriend,
  onRemoveFriend,
  onChallengeFriend,
  onClose,
}) => {
  const friends = currentPlayer.friends ?? [];
  const [tab, setTab] = useState<'list' | 'add'>(friends.length === 0 ? 'add' : 'list');
  const [searchCode, setSearchCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const myCode = currentPlayer.friendCode || 'KL-0000';

  const inviteUrl = useMemo(() => {
    const base =
      typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
        ? `${window.location.origin}/`
        : 'https://kintinlingo.vercel.app/';
    return `${base}?addfriend=${encodeURIComponent(encodeFriendInvite(currentPlayer))}`;
  }, [currentPlayer]);

  const candidates = useMemo(() => {
    const friendIds = new Set(friends.map((f) => f.id));
    const localOthers: Omit<FriendEntry, 'addedAt'>[] = allPlayers
      .filter((p) => p.id !== currentPlayer.id)
      .map((p) => ({
        id: p.id,
        friendCode: p.friendCode || 'KL-0000',
        name: p.name,
        avatar: p.progress.avatar || p.avatar,
        gradeId: p.progress.selectedGrade,
        stars: p.progress.stars,
      }));

    const combined = [...localOthers, ...SUGGESTED_FRIENDS].filter(
      (c) => !friendIds.has(c.id)
    );

    const q = searchCode.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.friendCode.toLowerCase().includes(q)
    );
  }, [allPlayers, currentPlayer.id, friends, searchCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="animate-card-pop max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">เพื่อน (Friends)</h2>
              <p className="text-xs text-slate-500">
                รหัสเพื่อนของคุณ:{' '}
                <span className="font-en font-bold text-indigo-600">{myCode}</span>
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

        {/* Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === 'list'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            เพื่อนของฉัน ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('add')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === 'add'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            เพิ่มเพื่อนใหม่
          </button>
        </div>

        {/* TAB 1: Friends List */}
        {tab === 'list' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <div className="text-4xl">🤝</div>
                <div className="mt-2 font-bold text-slate-800">ยังไม่มีเพื่อนในรายชื่อ</div>
                <p className="mt-1 text-xs text-slate-500">
                  กดแท็บ “เพิ่มเพื่อนใหม่” เพื่อแอดเพื่อนหรือส่งลิงก์ให้เพื่อนได้เลย!
                </p>
                <button
                  type="button"
                  onClick={() => setTab('add')}
                  className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  + ไปเพิ่มเพื่อนเลย
                </button>
              </div>
            ) : (
              friends.map((f) => {
                const grade =
                  CURRICULUM.find((g) => g.id === f.gradeId) ?? CURRICULUM[0];
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xs">
                        <AvatarDisplay
                          avatar={f.avatar}
                          alt={f.name}
                          className="h-full w-full"
                          emojiClassName="text-2xl"
                        />
                        <span
                          className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
                          title="ออนไลน์"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-900">{f.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-en font-semibold text-indigo-600">
                            {f.friendCode}
                          </span>
                          <span>•</span>
                          <span>{grade.shortName}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            {f.stars}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onChallengeFriend(f);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600"
                      >
                        <Swords className="h-3.5 w-3.5" />
                        ท้าดวล
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveFriend(f.id)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        title="ลบเพื่อน"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Add Friends */}
        {tab === 'add' && (
          <div className="space-y-5">
            {/* My Friend Code + Invite Link/QR */}
            <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/70 p-4">
              <div className="mb-2 text-xs font-bold text-indigo-900">
                ส่งรหัสหรือลิงก์ให้เพื่อนแอดคุณ (เหมือน Roblox)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-en rounded-xl bg-white px-4 py-2 text-base font-bold text-indigo-700 ring-1 ring-indigo-200">
                  {myCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัส'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์เพิ่มเพื่อน'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR
                </button>
              </div>

              {showQr && (
                <div className="mt-3 flex flex-col items-center rounded-2xl bg-white p-4 text-center">
                  <QRCodeCanvas value={inviteUrl} size={150} fgColor="#1e1b4b" />
                  <p className="mt-2 text-xs text-slate-500">
                    ให้เพื่อนสแกนเพื่อเพิ่ม <strong>{currentPlayer.name}</strong> เป็นเพื่อนทันที
                  </p>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-3.5 left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="ค้นหาด้วยชื่อ หรือ รหัสเพื่อน (เช่น KL-1001)"
                className="w-full rounded-2xl border-2 border-slate-200 py-3 pr-4 pl-10 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Candidate List */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ผู้เล่นที่สามารถเพิ่มเป็นเพื่อนได้
              </div>
              {candidates.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                  ไม่พบรายชื่อ หรือเพิ่มครบทุกคนแล้ว!
                </div>
              ) : (
                candidates.map((c) => {
                  const grade =
                    CURRICULUM.find((g) => g.id === c.gradeId) ?? CURRICULUM[0];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50">
                          <AvatarDisplay
                            avatar={c.avatar}
                            alt={c.name}
                            className="h-full w-full"
                            emojiClassName="text-2xl"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-en font-semibold text-indigo-600">
                              {c.friendCode}
                            </span>{' '}
                            • {grade.shortName} • ⭐ {c.stars}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onAddFriend({ ...c, addedAt: new Date().toISOString() })
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-600"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        เพิ่มเพื่อน
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

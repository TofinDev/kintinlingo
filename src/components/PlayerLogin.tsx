import React, { useState } from 'react';
import { CURRICULUM } from '../data/curriculum';
import type { GradeId, PlayerProfile } from '../types';
import { AVATARS } from '../utils/storage';
import { resizeImageToDataUrl } from '../utils/image';
import { AvatarDisplay } from './AvatarDisplay';
import { Camera, Lock, LogIn, Plus, Sparkles, Star, Trash2, UserPlus, X } from 'lucide-react';

interface PlayerLoginProps {
  players: PlayerProfile[];
  onLogin: (player: PlayerProfile) => void;
  onCreatePlayer: (params: {
    name: string;
    avatar: string;
    grade: GradeId;
    pin?: string;
  }) => void;
  onDeletePlayer: (playerId: string) => void;
}

export const PlayerLogin: React.FC<PlayerLoginProps> = ({
  players,
  onLogin,
  onCreatePlayer,
  onDeletePlayer,
}) => {
  const [showCreate, setShowCreate] = useState(players.length === 0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [grade, setGrade] = useState<GradeId>('k1');
  const [pin, setPin] = useState('');
  const [formError, setFormError] = useState('');

  // PIN verification state when logging into a PIN-protected profile
  const [pinPromptPlayer, setPinPromptPlayer] = useState<PlayerProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('กรุณาใส่ชื่อผู้เล่นก่อนนะครับ');
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      setFormError('รหัส PIN ต้องเป็นตัวเลข 4 หลัก (หรือเว้นว่างไว้ได้)');
      return;
    }
    setFormError('');
    onCreatePlayer({ name, avatar, grade, pin: pin || undefined });
    setName('');
    setPin('');
    setShowCreate(false);
  };

  const handleCardClick = (player: PlayerProfile) => {
    if (player.pin) {
      setPinPromptPlayer(player);
      setPinInput('');
      setPinError('');
    } else {
      onLogin(player);
    }
  };

  const handlePinVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptPlayer) return;
    if (pinInput === pinPromptPlayer.pin) {
      const target = pinPromptPlayer;
      setPinPromptPlayer(null);
      setPinInput('');
      setPinError('');
      onLogin(target);
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง ลองใหม่อีกครั้งนะครับ');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-bold text-indigo-700">
          <Sparkles className="h-4 w-4" />
          ยินดีต้อนรับสู่ Kintin Lingo
        </div>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          วันนี้ใครมาเรียนเอ่ย?
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          เลือกโปรไฟล์ผู้เล่นของคุณ หรือสร้างผู้เล่นใหม่เพื่อเก็บดาวและความคืบหน้าแยกกัน
        </p>
      </div>

      {/* Existing Players Grid */}
      {!showCreate && (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player, idx) => {
              const gradeInfo =
                CURRICULUM.find((g) => g.id === player.progress.selectedGrade) ?? CURRICULUM[0];
              const isConfirmingDelete = confirmDeleteId === player.id;

              return (
                <div
                  key={player.id}
                  style={{ '--stagger': idx } as React.CSSProperties}
                  className="animate-stagger-up group relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white/95 p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg active:scale-95"
                >
                  {/* Delete button */}
                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(player.id);
                      }}
                      className="absolute top-3.5 right-3.5 rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      title="ลบผู้เล่น"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                      <span>ลบ?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePlayer(player.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded bg-rose-600 px-1.5 py-0.5 text-white hover:bg-rose-700"
                      >
                        ใช่
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded bg-white px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200"
                      >
                        ไม่
                      </button>
                    </div>
                  )}

                  <div
                    onClick={() => handleCardClick(player)}
                    className="cursor-pointer"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradeInfo.gradient} shadow-sm`}
                      >
                        <AvatarDisplay
                          avatar={player.progress.avatar || player.avatar}
                          alt={player.name}
                          className="h-full w-full"
                          emojiClassName="text-4xl"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <h2 className="truncate text-xl font-bold text-slate-900">
                            {player.name}
                          </h2>
                          {player.pin && (
                            <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${gradeInfo.accentBg} ${gradeInfo.accentText}`}
                        >
                          {gradeInfo.nameTh}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-sm">
                      <div className="flex items-center gap-1.5 font-bold text-amber-600">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                        <span>{player.progress.stars} ดาว</span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 font-bold text-indigo-600 group-hover:translate-x-0.5 transition">
                        <LogIn className="h-4 w-4" />
                        เข้าเรียน
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Player Card */}
            <button
              type="button"
              style={{ '--stagger': players.length } as React.CSSProperties}
              onClick={() => setShowCreate(true)}
              className="animate-stagger-up flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 p-6 text-indigo-700 transition hover:-translate-y-1 hover:border-indigo-500 hover:bg-indigo-50 active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <Plus className="h-7 w-7" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold">เพิ่มผู้เล่นใหม่</div>
                <div className="text-xs text-indigo-600/80">สร้างโปรไฟล์สำหรับน้องหรือพี่</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Create New Player Form */}
      {showCreate && (
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">สร้างโปรไฟล์ผู้เล่น</h2>
                <p className="text-xs text-slate-500">ตั้งชื่อ เลือกตัวละคร และระดับชั้นเริ่มต้น</p>
              </div>
            </div>

            {players.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                ชื่อเล่นผู้เรียน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น น้องข้าวหอม, พี่ภูมิ"
                maxLength={24}
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Avatar + Photo Upload */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                เลือกตัวละคร หรือ อัพโหลดรูปภาพ
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition ${
                      avatar === av
                        ? 'scale-110 bg-indigo-600 shadow-md ring-4 ring-indigo-200'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {av}
                  </button>
                ))}

                <label
                  className={`flex h-12 cursor-pointer items-center gap-1.5 rounded-2xl border-2 border-dashed px-3.5 text-xs font-bold transition ${
                    avatar.startsWith('data:image')
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                      : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50'
                  }`}
                >
                  {avatar.startsWith('data:image') ? (
                    <AvatarDisplay
                      avatar={avatar}
                      className="h-8 w-8 rounded-xl"
                    />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>{avatar.startsWith('data:image') ? 'เปลี่ยนรูป' : 'อัพโหลดรูป'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await resizeImageToDataUrl(file);
                        setAvatar(dataUrl);
                        setFormError('');
                      } catch {
                        setFormError('ไม่สามารถอัพโหลดรูปนี้ได้ กรุณาลองไฟล์อื่น');
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Grade Selector */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ระดับชั้นที่ต้องการเรียน (เปลี่ยนทีหลังได้)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CURRICULUM.map((g) => {
                  const active = grade === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGrade(g.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      <span>{g.badgeEmoji}</span>
                      <span>{g.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional PIN */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                รหัส PIN 4 หลัก <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="เว้นว่างได้ ถ้าไม่อยากตั้งรหัส"
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-semibold tracking-widest text-slate-900 outline-none transition focus:border-indigo-500"
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {players.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-2xl border-2 border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
              >
                สร้างโปรไฟล์และเริ่มเรียนเลย! 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PIN Modal */}
      {pinPromptPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100">
              <AvatarDisplay
                avatar={pinPromptPlayer.progress.avatar || pinPromptPlayer.avatar}
                alt={pinPromptPlayer.name}
                className="h-full w-full"
                emojiClassName="text-4xl"
              />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{pinPromptPlayer.name}</h3>
            <p className="mt-1 text-sm text-slate-500">กรอกรหัส PIN 4 หลักเพื่อเข้าใช้งาน</p>

            <form onSubmit={handlePinVerify} className="mt-5 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-500"
              />

              {pinError && (
                <p className="text-xs font-bold text-rose-600">{pinError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPinPromptPlayer(null)}
                  className="rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

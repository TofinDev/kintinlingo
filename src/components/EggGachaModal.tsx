import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { EGG_ITEMS, rollMysteryEgg, type EggItem } from '../data/eggs';
import type { PlayerProfile } from '../types';
import { playTone } from '../utils/speech';
import { AvatarDisplay } from './AvatarDisplay';
import { Check, Gift, Sparkles, Star, Trophy, X } from 'lucide-react';

interface EggGachaModalProps {
  player: PlayerProfile;
  freeSpins: number;
  onHatchEgg: (result: { egg: EggItem; usedFreeSpin: boolean; netStarsDelta: number }) => void;
  onEquipAvatar: (emoji: string) => void;
  onClose: () => void;
}

const SPIN_COST_STARS = 10;

export function getCollectedEggsCount(
  completedLessons: Record<string, number>,
  eggId: string
): number {
  return completedLessons[`__egg_${eggId}`] ?? 0;
}

export const EggGachaModal: React.FC<EggGachaModalProps> = ({
  player,
  freeSpins,
  onHatchEgg,
  onEquipAvatar,
  onClose,
}) => {
  const [tab, setTab] = useState<'hatch' | 'dex'>('hatch');
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'hatched'>('idle');
  const [hatchedEgg, setHatchedEgg] = useState<EggItem | null>(null);
  const [equippedToast, setEquippedToast] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const eggColorRef = useRef<number>(0xfbbf24);

  useEffect(() => {
    if (tab !== 'hatch') return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const size = 220;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0.2, 4.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xa855f7, 2.0, 12);
    rimLight.position.set(-2, 2, 2);
    scene.add(rimLight);

    const root = new THREE.Group();
    scene.add(root);

    // 1. Pedestal
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.22, 0.18, 32),
      new THREE.MeshStandardMaterial({
        color: 0x312e81,
        emissive: 0x4338ca,
        emissiveIntensity: 0.45,
        metalness: 0.5,
        roughness: 0.2,
      })
    );
    baseMesh.position.y = -1.18;
    root.add(baseMesh);

    // 2. 3D Mystery Egg Mesh
    const eggGeo = new THREE.SphereGeometry(0.76, 36, 36);
    eggGeo.scale(1, 1.28, 1);
    const eggMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.35,
    });
    const eggMesh = new THREE.Mesh(eggGeo, eggMat);
    eggMesh.position.y = -0.05;
    root.add(eggMesh);

    // Decorative belt around the 3D egg
    const beltMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.05, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
      })
    );
    beltMesh.rotation.x = Math.PI / 2;
    eggMesh.add(beltMesh);

    // 3. Orbiting Magic Rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.03, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring1.rotation.x = Math.PI / 2.3;
    root.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.025, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0xf472b6 })
    );
    ring2.rotation.y = Math.PI / 3;
    root.add(ring2);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      eggMat.emissive.setHex(eggColorRef.current);

      if (phaseRef.current === 'shaking') {
        eggMesh.rotation.z = Math.sin(t * 38) * 0.24;
        eggMesh.rotation.y += 0.14;
        const s = 1 + Math.sin(t * 25) * 0.08;
        eggMesh.scale.set(s, s, s);
        ring1.rotation.z += 0.12;
        ring2.rotation.x += 0.12;
      } else {
        eggMesh.rotation.z = Math.sin(t * 2) * 0.06;
        eggMesh.rotation.y = t * 1.1;
        eggMesh.position.y = -0.05 + Math.sin(t * 2.5) * 0.08;
        eggMesh.scale.set(1, 1, 1);
        ring1.rotation.z = t * 1.3;
        ring2.rotation.x = t * 1.0;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [tab]);

  const canSpin = freeSpins > 0 || player.progress.stars >= SPIN_COST_STARS;

  const handleStartSpin = () => {
    if (phase === 'shaking') return;
    const useFree = freeSpins > 0;
    if (!useFree && player.progress.stars < SPIN_COST_STARS) return;

    const rolled = rollMysteryEgg();
    eggColorRef.current = rolled.colorHex;
    setHatchedEgg(rolled);
    setEquippedToast(false);
    setPhase('shaking');
    playTone('correct');

    setTimeout(() => {
      setPhase('hatched');
      playTone('complete');
      const isRareOrAbove = ['rare', 'epic', 'mythic'].includes(rolled.rarity);
      confetti({
        particleCount: isRareOrAbove ? 150 : 75,
        spread: isRareOrAbove ? 100 : 65,
        origin: { y: 0.55 },
      });

      const netStarsDelta = useFree
        ? rolled.bonusStars
        : rolled.bonusStars - SPIN_COST_STARS;

      onHatchEgg({
        egg: rolled,
        usedFreeSpin: useFree,
        netStarsDelta,
      });
    }, 1250);
  };

  const uniqueOwnedCount = useMemo(
    () =>
      EGG_ITEMS.filter(
        (e) => getCollectedEggsCount(player.progress.completedLessons, e.id) > 0
      ).length,
    [player.progress.completedLessons]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 backdrop-blur-md sm:p-5">
      <div className="animate-card-pop max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 text-2xl text-white shadow-md">
              🥚
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                สุ่มไข่วิเศษ & สัตว์ในตำนาน
              </h2>
              <p className="text-xs text-slate-500">
                ลุ้นไข่แรร์หายาก (Mythic 1%) รับโบนัสดาวสูงสุด +300 ดาว!
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

        {/* Top Stats Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200/80">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            <span>ดาวของคุณ: {player.progress.stars} ดาว</span>
          </div>

          {freeSpins > 0 && (
            <span className="animate-pulse rounded-full bg-rose-500 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
              🎁 มีสิทธิ์สุ่มไข่ฟรี {freeSpins} ฟอง!
            </span>
          )}

          <div className="text-xs font-bold text-indigo-700">
            สะสมแล้ว {uniqueOwnedCount}/{EGG_ITEMS.length} สายพันธุ์
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setTab('hatch')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === 'hatch'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="h-4 w-4" />
            แท่นฟักไข่ 3D
          </button>
          <button
            type="button"
            onClick={() => setTab('dex')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === 'dex'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="h-4 w-4" />
            สมุดสะสมไข่แรร์ ({uniqueOwnedCount}/{EGG_ITEMS.length})
          </button>
        </div>

        {/* TAB 1: Hatch Stage */}
        {tab === 'hatch' && (
          <div className="text-center">
            {/* 3D Egg Canvas or Hatched Pet Reveal */}
            <div className="relative mx-auto mb-4 flex min-h-[230px] flex-col items-center justify-center rounded-3xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900 p-5 text-white shadow-inner">
              <div
                ref={mountRef}
                className={`${phase === 'hatched' ? 'hidden' : 'block'} h-[220px] w-[220px]`}
              />

              {phase === 'shaking' && (
                <div className="mt-1 animate-pulse text-sm font-bold text-amber-300">
                  ⚡ ไข่กำลังกะเทาะแล้ว... ลุ้นๆๆ!
                </div>
              )}

              {phase === 'hatched' && hatchedEgg && (
                <div className="animate-portal-zoom flex flex-col items-center py-2">
                  <span
                    className={`mb-2 inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold shadow ${hatchedEgg.badgeBg} ${hatchedEgg.badgeText}`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {hatchedEgg.rarityLabelTh} • โอกาส {hatchedEgg.chancePct}
                  </span>

                  <div className="my-2 flex h-32 w-32 items-center justify-center rounded-3xl bg-white/15 p-3 ring-4 ring-white/30 backdrop-blur-sm">
                    <AvatarDisplay
                      avatar={hatchedEgg.emoji}
                      alt={hatchedEgg.nameTh}
                      className="animate-bounce-soft h-24 w-24"
                      emojiClassName="text-7xl"
                    />
                  </div>

                  <h3 className="mt-1 text-2xl font-bold text-white">{hatchedEgg.nameTh}</h3>
                  <p className="font-en text-xs font-semibold text-indigo-200">
                    {hatchedEgg.nameEn}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-amber-400 px-4 py-1.5 text-base font-bold text-amber-950 shadow-md">
                    <Star className="h-5 w-5 fill-amber-950" />
                    รับโบนัส +{hatchedEgg.bonusStars} ดาว!
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onEquipAvatar(hatchedEgg.emoji);
                      setEquippedToast(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/40 transition hover:bg-white/30"
                  >
                    {equippedToast ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-300" />
                        ตั้งเป็นรูปโปรไฟล์แล้ว!
                      </>
                    ) : (
                      <>✨ ตั้งเป็นรูปโปรไฟล์อวดเพื่อน</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Rarity Drop Rate Guide */}
            <div className="mb-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                ทั่วไป 55% (+5⭐)
              </span>
              <span className="rounded-lg bg-sky-100 px-2 py-1 text-sky-800">
                พิเศษ 27% (+15⭐)
              </span>
              <span className="rounded-lg bg-purple-100 px-2 py-1 text-purple-800">
                หายาก 12% (+35⭐)
              </span>
              <span className="rounded-lg bg-amber-100 px-2 py-1 text-amber-900">
                Epic 5% (+80⭐)
              </span>
              <span className="rounded-lg bg-gradient-to-r from-rose-500 to-indigo-600 px-2.5 py-1 text-white shadow-xs">
                🌈 ตำนานลับ 1% (+250–300⭐)
              </span>
            </div>

            {/* Spin Button */}
            <button
              type="button"
              disabled={!canSpin || phase === 'shaking'}
              onClick={handleStartSpin}
              className={`w-full rounded-2xl border-b-4 py-4 text-lg font-bold text-white shadow-lg transition active:translate-y-0.5 active:border-b-0 disabled:opacity-45 ${
                freeSpins > 0
                  ? 'border-rose-700 bg-gradient-to-r from-rose-500 via-amber-500 to-pink-500 hover:opacity-95'
                  : 'border-indigo-800 bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {phase === 'shaking'
                ? 'กำลังฟักไข่วิเศษ...'
                : freeSpins > 0
                  ? `🎁 กดสุ่มไข่วิเศษฟรี! (เหลือ ${freeSpins} สิทธิ์)`
                  : player.progress.stars >= SPIN_COST_STARS
                    ? `🥚 ใช้ ${SPIN_COST_STARS} ดาว สุ่มไข่วิเศษเลย!`
                    : `ต้องมีอย่างน้อย ${SPIN_COST_STARS} ดาวเพื่อสุ่มไข่ (ไปเล่นเกมเก็บดาวกัน!)`}
            </button>
          </div>
        )}

        {/* TAB 2: Egg Collection Dex */}
        {tab === 'dex' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EGG_ITEMS.map((item) => {
              const count = getCollectedEggsCount(
                player.progress.completedLessons,
                item.id
              );
              const unlocked = count > 0;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col items-center justify-between rounded-2xl border-2 p-3 text-center transition ${
                    unlocked
                      ? `${item.borderGlow} bg-white shadow-sm`
                      : 'border-dashed border-slate-200 bg-slate-50 opacity-65'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={`rounded-full px-2 py-0.5 ${item.badgeBg} ${item.badgeText}`}>
                        {item.chancePct}
                      </span>
                      {unlocked && (
                        <span className="font-en font-bold text-indigo-600">x{count}</span>
                      )}
                    </div>

                    <div className="my-2 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-slate-50 p-1.5">
                      {unlocked ? (
                        <AvatarDisplay
                          avatar={item.emoji}
                          alt={item.nameTh}
                          className="h-14 w-14"
                          emojiClassName="text-4xl"
                        />
                      ) : (
                        <span className="text-3xl text-slate-300">🥚?</span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-900">
                      {unlocked ? item.nameTh : '??? (ยังไม่ค้นพบ)'}
                    </div>
                    <div className="text-[11px] font-semibold text-amber-600">
                      โบนัส +{item.bonusStars} ⭐
                    </div>
                  </div>

                  {unlocked && (
                    <button
                      type="button"
                      onClick={() => onEquipAvatar(item.emoji)}
                      className="mt-2 w-full rounded-xl bg-indigo-50 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      ใช้เป็นโปรไฟล์
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

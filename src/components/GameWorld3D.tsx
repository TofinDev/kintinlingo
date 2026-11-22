import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GradeLevel, Lesson, UserProgress } from '../types';
import { BookOpen, Gamepad2, RotateCcw, Star, Swords, Timer } from 'lucide-react';

export type IslandAction =
  | { kind: 'lesson'; lesson: Lesson }
  | { kind: 'memory' }
  | { kind: 'speed' }
  | { kind: 'vs' };

interface GameWorld3DProps {
  grade: GradeLevel;
  progress: UserProgress;
  onStartLearn: (lesson: Lesson) => void;
  onStartQuiz: (lesson: Lesson) => void;
  onStartMemory: () => void;
  onStartSpeed: () => void;
  onStartVs: () => void;
  onStartReview: () => void;
  onChangeGrade: () => void;
}

interface IslandMeta {
  id: string;
  labelTh: string;
  subLabel: string;
  emoji: string;
  colorHex: number;
  position: [number, number, number];
  stars: number;
  action: IslandAction;
}

export const GameWorld3D: React.FC<GameWorld3DProps> = ({
  grade,
  progress,
  onStartLearn,
  onStartQuiz,
  onStartMemory,
  onStartSpeed,
  onStartVs,
  onStartReview,
  onChangeGrade,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string>(() => grade.lessons[0]?.id ?? 'memory');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [webglError, setWebglError] = useState(false);

  const islands = useMemo<IslandMeta[]>(() => {
    const lessonIslands: IslandMeta[] = grade.lessons.map((lesson, i) => ({
      id: lesson.id,
      labelTh: lesson.titleTh,
      subLabel: `บทที่ ${i + 1} • ${lesson.words.length} คำ`,
      emoji: lesson.icon,
      colorHex: i === 0 ? 0x38bdf8 : 0x34d399,
      position: [i === 0 ? -3.0 : -0.9, i === 0 ? 0.2 : -0.2, i === 0 ? 0.6 : -0.8],
      stars: progress.completedLessons[lesson.id] ?? 0,
      action: { kind: 'lesson', lesson },
    }));

    const arcadeIslands: IslandMeta[] = [
      {
        id: 'memory',
        labelTh: 'เกาะจับคู่การ์ด',
        subLabel: '🃏 Memory Match',
        emoji: '🃏',
        colorHex: 0xa855f7,
        position: [1.3, 0.35, -0.4],
        stars: 0,
        action: { kind: 'memory' },
      },
      {
        id: 'speed',
        labelTh: 'ภูเขาไฟ 60 วิ',
        subLabel: '⏱️ Speed Challenge',
        emoji: '⏱️',
        colorHex: 0xf59e0b,
        position: [3.2, -0.1, 0.7],
        stars: 0,
        action: { kind: 'speed' },
      },
      {
        id: 'vs',
        labelTh: 'ลานท้าดวล VS',
        subLabel: '⚔️ แข่งกับเพื่อน/ออนไลน์',
        emoji: '⚔️',
        colorHex: 0xf43f5e,
        position: [0.3, 0.55, 1.9],
        stars: 0,
        action: { kind: 'vs' },
      },
    ];

    return [...lessonIslands, ...arcadeIslands];
  }, [grade, progress.completedLessons]);

  const selectedIsland = useMemo(
    () => islands.find((isl) => isl.id === selectedId) ?? islands[0],
    [islands, selectedId]
  );

  // Keep refs updated for Three.js loop
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const hoveredIdRef = useRef(hoveredId);
  hoveredIdRef.current = hoveredId;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 380;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 4.6, 8.6);
    camera.lookAt(0, 0, 0.3);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.25);
    sun.position.set(6, 10, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc7d2fe, 0.55);
    fill.position.set(-6, 4, -5);
    scene.add(fill);

    // World Group (rotatable by drag)
    const world = new THREE.Group();
    scene.add(world);

    // Connecting glowing path tubes between islands
    const pathPoints = islands.map((i) => new THREE.Vector3(...i.position));
    if (pathPoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(pathPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.06, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.35,
        roughness: 0.3,
      });
      world.add(new THREE.Mesh(tubeGeo, tubeMat));
    }

    // Build each 3D Floating Island
    const islandGroups: {
      id: string;
      group: THREE.Group;
      beacon: THREE.Mesh;
      ring: THREE.Mesh;
      baseY: number;
      hitMeshes: THREE.Object3D[];
    }[] = [];

    const earthMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.25,
      metalness: 0.4,
      roughness: 0.2,
    });

    islands.forEach((isl, idx) => {
      const g = new THREE.Group();
      g.position.set(...isl.position);

      // Grassy top disc
      const topGeo = new THREE.CylinderGeometry(0.95, 0.88, 0.28, 24);
      const topMat = new THREE.MeshStandardMaterial({ color: isl.colorHex, roughness: 0.4 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.userData.islandId = isl.id;
      g.add(topMesh);

      // Rocky underside cone
      const baseGeo = new THREE.ConeGeometry(0.86, 0.9, 12);
      const baseMesh = new THREE.Mesh(baseGeo, earthMat);
      baseMesh.rotation.x = Math.PI;
      baseMesh.position.y = -0.58;
      baseMesh.userData.islandId = isl.id;
      g.add(baseMesh);

      // 3D Crystal / Trophy Beacon on top
      const beaconGeo = new THREE.OctahedronGeometry(0.32, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: isl.colorHex,
        emissiveIntensity: 0.45,
        roughness: 0.15,
        metalness: 0.2,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 0.65;
      beacon.userData.islandId = isl.id;
      g.add(beacon);

      // Selection Ring
      const ringGeo = new THREE.TorusGeometry(1.08, 0.05, 12, 36);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.15;
      g.add(ring);

      // Orbiting earned stars
      for (let s = 0; s < isl.stars; s++) {
        const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), goldMat);
        const angle = (s / 3) * Math.PI * 2;
        starMesh.position.set(Math.cos(angle) * 0.65, 0.88, Math.sin(angle) * 0.65);
        g.add(starMesh);
      }

      world.add(g);
      islandGroups.push({
        id: isl.id,
        group: g,
        beacon,
        ring,
        baseY: isl.position[1] + idx * 0.001,
        hitMeshes: [topMesh, baseMesh, beacon],
      });
    });

    // Raycaster & Drag Orbit
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let dragDist = 0;
    let lastX = 0;
    let targetWorldRotY = 0;

    const getHitIsland = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const targets = islandGroups.flatMap((ig) => ig.hitMeshes);
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.islandId as string) || null;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDist = 0;
      lastX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastX;
        dragDist += Math.abs(dx);
        lastX = e.clientX;
        targetWorldRotY += dx * 0.006;
      } else {
        const hit = getHitIsland(e.clientX, e.clientY);
        setHoveredId(hit);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragDist < 8) {
        const hit = getHitIsland(e.clientX, e.clientY);
        if (hit) {
          setSelectedId(hit);
        }
      }
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      world.rotation.y += (targetWorldRotY - world.rotation.y) * 0.08;

      islandGroups.forEach((ig, idx) => {
        const isSel = ig.id === selectedIdRef.current;
        const isHov = ig.id === hoveredIdRef.current;

        ig.group.position.y =
          ig.baseY + Math.sin(t * 1.8 + idx) * 0.09 + (isSel ? 0.22 : 0);

        const targetScale = isSel ? 1.18 : isHov ? 1.08 : 1.0;
        ig.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

        ig.beacon.rotation.y = t * (isSel ? 2.6 : 1.2);
        ig.beacon.position.y = 0.65 + Math.sin(t * 2.5 + idx) * 0.08;
        ig.ring.visible = isSel || isHov;
        ig.ring.rotation.z = t * 1.2;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, [islands]);

  const totalWordsInGrade = grade.lessons.reduce((sum, l) => sum + l.words.length, 0);
  const learnedInGrade = grade.lessons.reduce(
    (sum, l) => sum + l.words.filter((w) => progress.learnedWords.includes(w.id)).length,
    0
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      {/* Game HUD Top Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-white/80 bg-white/85 px-5 py-3.5 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grade.gradient} text-2xl shadow-sm`}
          >
            {grade.badgeEmoji}
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 sm:text-lg">
              โลกผจญภัย {grade.nameTh}
            </div>
            <div className="text-xs font-semibold text-slate-500">
              จำได้แล้ว {learnedInGrade}/{totalWordsInGrade} คำ • เป้าหมาย {grade.targetVocab}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {progress.wrongWords.length > 0 && (
            <button
              onClick={onStartReview}
              className="inline-flex items-center gap-1.5 rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950 transition active:translate-y-0.5 active:border-b-0 sm:text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              ทบทวน ({progress.wrongWords.length})
            </button>
          )}
          <button
            onClick={onChangeGrade}
            className="rounded-2xl border-b-4 border-indigo-700 bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 sm:text-sm"
          >
            เปลี่ยนชั้น ({grade.shortName})
          </button>
        </div>
      </div>

      {/* 3D Interactive World Canvas */}
      {!webglError && (
        <div className="relative mb-5 overflow-hidden rounded-3xl border-2 border-white/80 bg-gradient-to-b from-sky-200/70 via-indigo-100/60 to-emerald-100/70 shadow-xl backdrop-blur-sm">
          <div className="pointer-events-none absolute top-3 left-4 z-10 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-indigo-700 shadow-xs">
            🏝️ แตะที่เกาะ 3D หรือลากเพื่อหมุนแผนที่
          </div>
          <div ref={mountRef} className="h-[310px] w-full sm:h-[370px]" />
        </div>
      )}

      {/* Quick Island Selector Pills (for accessibility & mobile) */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {islands.map((isl) => {
          const active = isl.id === selectedIsland.id;
          return (
            <button
              key={isl.id}
              onClick={() => setSelectedId(isl.id)}
              className={`inline-flex items-center gap-1.5 rounded-2xl border-b-4 px-3.5 py-2 text-xs font-bold transition active:translate-y-0.5 active:border-b-0 sm:text-sm ${
                active
                  ? 'border-indigo-700 bg-indigo-600 text-white shadow-md'
                  : 'border-slate-300 bg-white/90 text-slate-700 hover:bg-white'
              }`}
            >
              <span>{isl.emoji}</span>
              <span>{isl.labelTh}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Island Action Card (3D Game Console Panel) */}
      <div className="animate-card-pop rounded-3xl border-2 border-white bg-white/95 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-4xl shadow-inner">
              {selectedIsland.emoji}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                {selectedIsland.subLabel}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedIsland.labelTh}</h2>
              {selectedIsland.action.kind === 'lesson' && (
                <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= selectedIsland.stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-semibold text-slate-500">
                    ({selectedIsland.action.lesson.words.map((w) => w.word).join(', ')})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full flex-wrap justify-end gap-3 sm:w-auto">
            {selectedIsland.action.kind === 'lesson' && (
              <>
                <button
                  onClick={() => {
                    if (selectedIsland.action.kind === 'lesson') {
                      onStartLearn(selectedIsland.action.lesson);
                    }
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-sky-600 bg-sky-500 px-5 py-3.5 text-sm font-bold text-white shadow transition hover:bg-sky-400 active:translate-y-0.5 active:border-b-0 sm:flex-none"
                >
                  <BookOpen className="h-5 w-5" />
                  เรียนคำศัพท์
                </button>
                <button
                  onClick={() => {
                    if (selectedIsland.action.kind === 'lesson') {
                      onStartQuiz(selectedIsland.action.lesson);
                    }
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow transition hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 sm:flex-none"
                >
                  <Gamepad2 className="h-5 w-5" />
                  เข้าเล่นเกม!
                </button>
              </>
            )}

            {selectedIsland.action.kind === 'memory' && (
              <button
                onClick={onStartMemory}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-purple-800 bg-purple-600 px-7 py-3.5 text-base font-bold text-white shadow transition hover:bg-purple-500 active:translate-y-0.5 active:border-b-0 sm:w-auto"
              >
                <Gamepad2 className="h-5 w-5" />
                เริ่มเปิดการ์ดจับคู่!
              </button>
            )}

            {selectedIsland.action.kind === 'speed' && (
              <button
                onClick={onStartSpeed}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-700 bg-amber-500 px-7 py-3.5 text-base font-bold text-white shadow transition hover:bg-amber-400 active:translate-y-0.5 active:border-b-0 sm:w-auto"
              >
                <Timer className="h-5 w-5" />
                เริ่มแข่งความเร็ว 60 วิ!
              </button>
            )}

            {selectedIsland.action.kind === 'vs' && (
              <button
                onClick={onStartVs}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-rose-700 bg-rose-500 px-7 py-3.5 text-base font-bold text-white shadow transition hover:bg-rose-400 active:translate-y-0.5 active:border-b-0 sm:w-auto"
              >
                <Swords className="h-5 w-5" />
                เข้าสู่ลานท้าดวล!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

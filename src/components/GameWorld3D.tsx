import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GradeLevel, Lesson, UserProgress } from '../types';
import { playTone } from '../utils/speech';
import { AvatarDisplay } from './AvatarDisplay';
import { BookOpen, Gamepad2, RotateCcw, Sparkles, Star, Swords, Timer } from 'lucide-react';

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

function createLabelSprite(emoji: string, text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Glowing pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(24, 24, 464, 112, 56);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.9)';
    ctx.stroke();

    ctx.font = 'bold 46px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${emoji} ${text}`, 256, 82);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.3, 0.72, 1);
  return sprite;
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
    const lessonColors = [0x38bdf8, 0x34d399, 0x818cf8, 0xf472b6, 0x2dd4bf, 0x60a5fa];
    const rawList: Omit<IslandMeta, 'position'>[] = [
      ...grade.lessons.map((lesson, i) => ({
        id: lesson.id,
        labelTh: lesson.titleTh,
        subLabel: `บทที่ ${i + 1} • ${lesson.words.length} คำ`,
        emoji: lesson.icon,
        colorHex: lessonColors[i % lessonColors.length],
        stars: progress.completedLessons[lesson.id] ?? 0,
        action: { kind: 'lesson' as const, lesson },
      })),
      {
        id: 'memory',
        labelTh: 'เกาะจับคู่การ์ด',
        subLabel: '🃏 Memory Match',
        emoji: '🃏',
        colorHex: 0xa855f7,
        stars: 0,
        action: { kind: 'memory' as const },
      },
      {
        id: 'speed',
        labelTh: 'ภูเขาไฟ 60 วิ',
        subLabel: '⏱️ Speed Challenge',
        emoji: '⏱️',
        colorHex: 0xf59e0b,
        stars: 0,
        action: { kind: 'speed' as const },
      },
      {
        id: 'vs',
        labelTh: 'ลานท้าดวล VS',
        subLabel: '⚔️ แข่งกับเพื่อน/ออนไลน์',
        emoji: '⚔️',
        colorHex: 0xf43f5e,
        stars: 0,
        action: { kind: 'vs' as const },
      },
    ];

    const count = rawList.length;
    const radius = 3.85;
    return rawList.map((item, idx) => {
      const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
      const x = Number((Math.cos(angle) * radius).toFixed(2));
      const z = Number((Math.sin(angle) * (radius * 0.78)).toFixed(2));
      const y = Number((Math.sin(idx * 1.4) * 0.35).toFixed(2));
      return {
        ...item,
        position: [x, y, z],
      };
    });
  }, [grade, progress.completedLessons]);

  const selectedIsland = useMemo(
    () => islands.find((isl) => isl.id === selectedId) ?? islands[0],
    [islands, selectedId]
  );

  // Refs for Three.js loop
  const selectedIdRef = useRef(selectedId);
  const prevSelectedPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...(islands[0]?.position ?? [0, 0, 0]))
  );
  const targetSelectedPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...(islands[0]?.position ?? [0, 0, 0]))
  );
  const jumpProgressRef = useRef<number>(1);

  useEffect(() => {
    if (selectedIdRef.current !== selectedId) {
      const prevIsl = islands.find((i) => i.id === selectedIdRef.current);
      const nextIsl = islands.find((i) => i.id === selectedId);
      if (prevIsl && nextIsl) {
        prevSelectedPosRef.current.set(...prevIsl.position);
        targetSelectedPosRef.current.set(...nextIsl.position);
        jumpProgressRef.current = 0;
        playTone('correct');
      }
      selectedIdRef.current = selectedId;
    }
  }, [selectedId, islands]);

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
    const height = container.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 4.8, 8.8);
    camera.lookAt(0, 0.2, 0.2);

    // Futuristic Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sun.position.set(6, 12, 7);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rim.position.set(-7, 5, -6);
    scene.add(rim);

    // World Group (rotatable by drag)
    const world = new THREE.Group();
    scene.add(world);

    // Outer Holographic Compass Ring around the whole map
    const compassRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.9, 0.03, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.35 })
    );
    compassRing.rotation.x = Math.PI / 2;
    compassRing.position.y = -0.5;
    world.add(compassRing);

    // Connecting glowing laser path tubes + moving energy pulses
    const pathPoints = islands.map((i) => new THREE.Vector3(...i.position));
    let curve: THREE.CatmullRomCurve3 | null = null;
    const energyOrbs: THREE.Mesh[] = [];

    if (pathPoints.length >= 2) {
      curve = new THREE.CatmullRomCurve3(pathPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.055, 10, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x6366f1,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      world.add(new THREE.Mesh(tubeGeo, tubeMat));

      const orbGeo = new THREE.SphereGeometry(0.11, 12, 12);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (let i = 0; i < 4; i++) {
        const orb = new THREE.Mesh(orbGeo, orbMat);
        world.add(orb);
        energyOrbs.push(orb);
      }
    }

    // Build each 3D Floating Island
    const islandGroups: {
      id: string;
      group: THREE.Group;
      beacon: THREE.Mesh;
      ring: THREE.Mesh;
      outerRing: THREE.Mesh;
      beam: THREE.Mesh;
      baseY: number;
      hitMeshes: THREE.Object3D[];
    }[] = [];

    const crystalBaseMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.3,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.15,
    });

    islands.forEach((isl, idx) => {
      const g = new THREE.Group();
      g.position.set(...isl.position);

      // Hexagonal futuristic platform top
      const topGeo = new THREE.CylinderGeometry(1.02, 0.92, 0.3, 8);
      const topMat = new THREE.MeshStandardMaterial({
        color: isl.colorHex,
        emissive: isl.colorHex,
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.15,
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.userData.islandId = isl.id;
      g.add(topMesh);

      // Glowing rim band
      const bandGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.07, 8);
      const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.y = 0.02;
      bandMesh.userData.islandId = isl.id;
      g.add(bandMesh);

      // Low-poly crystal underside
      const baseGeo = new THREE.ConeGeometry(0.88, 1.05, 8);
      const baseMesh = new THREE.Mesh(baseGeo, crystalBaseMat);
      baseMesh.rotation.x = Math.PI;
      baseMesh.position.y = -0.65;
      baseMesh.userData.islandId = isl.id;
      g.add(baseMesh);

      // 3D Crystal / Trophy Beacon on top
      const beaconGeo = new THREE.OctahedronGeometry(0.32, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: isl.colorHex,
        emissiveIntensity: 0.65,
        roughness: 0.1,
        metalness: 0.3,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 0.68;
      beacon.userData.islandId = isl.id;
      g.add(beacon);

      // Vertical Holo Energy Beam (visible when selected)
      const beamGeo = new THREE.CylinderGeometry(0.45, 0.75, 2.6, 16, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isl.colorHex,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 1.3;
      g.add(beam);

      // Inner Selection Ring
      const ringGeo = new THREE.TorusGeometry(1.15, 0.045, 12, 36);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.16;
      g.add(ring);

      // Outer Tilted Gyro Ring
      const outerRingGeo = new THREE.TorusGeometry(1.32, 0.025, 10, 36);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRing.rotation.x = Math.PI / 2.3;
      outerRing.position.y = 0.25;
      g.add(outerRing);

      // 3D Floating Label Sprite above island
      const labelSprite = createLabelSprite(isl.emoji, isl.labelTh);
      labelSprite.position.set(0, 1.55, 0);
      g.add(labelSprite);

      // Orbiting earned stars
      for (let s = 0; s < isl.stars; s++) {
        const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), goldMat);
        const angle = (s / 3) * Math.PI * 2;
        starMesh.position.set(Math.cos(angle) * 0.7, 0.92, Math.sin(angle) * 0.7);
        g.add(starMesh);
      }

      world.add(g);
      islandGroups.push({
        id: isl.id,
        group: g,
        beacon,
        ring,
        outerRing,
        beam,
        baseY: isl.position[1] + idx * 0.001,
        hitMeshes: [topMesh, bandMesh, baseMesh, beacon],
      });
    });

    // 3D Cyber-Explorer Mascot that jumps from island to island!
    const explorer = new THREE.Group();
    const expMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.4,
    });
    const expVisorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const expBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.2, 8, 16), expMat);
    expBody.position.y = 0.28;
    explorer.add(expBody);

    const expHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), expMat);
    expHead.position.y = 0.62;
    explorer.add(expHead);

    const expVisor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.14), expVisorMat);
    expVisor.position.set(0, 0.63, 0.14);
    explorer.add(expVisor);

    const initialIsl = islands.find((i) => i.id === selectedIdRef.current) ?? islands[0];
    if (initialIsl) {
      explorer.position.set(
        initialIsl.position[0] + 0.42,
        initialIsl.position[1] + 0.25,
        initialIsl.position[2] + 0.35
      );
      prevSelectedPosRef.current.set(...initialIsl.position);
      targetSelectedPosRef.current.set(...initialIsl.position);
    }
    world.add(explorer);

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
        targetWorldRotY += dx * 0.0065;
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
      const h = container.clientHeight || 400;
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
      compassRing.rotation.z = t * 0.15;

      // Animate energy pulses along connecting tube
      if (curve && energyOrbs.length > 0) {
        energyOrbs.forEach((orb, idx) => {
          const u = (t * 0.22 + idx / energyOrbs.length) % 1;
          const pt = curve!.getPointAt(u);
          orb.position.copy(pt);
        });
      }

      islandGroups.forEach((ig, idx) => {
        const isSel = ig.id === selectedIdRef.current;
        const isHov = ig.id === hoveredIdRef.current;

        ig.group.position.y =
          ig.baseY + Math.sin(t * 2.0 + idx) * 0.09 + (isSel ? 0.25 : 0);

        const targetScale = isSel ? 1.2 : isHov ? 1.09 : 1.0;
        ig.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

        ig.beacon.rotation.y = t * (isSel ? 3.0 : 1.2);
        ig.beacon.rotation.x = Math.sin(t * 2 + idx) * 0.25;
        ig.beacon.position.y = 0.68 + Math.sin(t * 2.8 + idx) * 0.08;

        ig.ring.visible = isSel || isHov;
        ig.ring.rotation.z = t * 1.5;

        ig.outerRing.visible = isSel;
        ig.outerRing.rotation.y = -t * 2.2;
        ig.outerRing.rotation.z = t * 1.4;

        ig.beam.visible = isSel;
      });

      // Animate 3D Explorer jumping between islands
      if (jumpProgressRef.current < 1) {
        jumpProgressRef.current = Math.min(1, jumpProgressRef.current + 0.032);
      }
      const jp = jumpProgressRef.current;
      const lerped = new THREE.Vector3().lerpVectors(
        prevSelectedPosRef.current,
        targetSelectedPosRef.current,
        jp
      );
      const jumpArc = Math.sin(jp * Math.PI) * 1.65;
      const idleBounce = jp >= 1 ? Math.abs(Math.sin(t * 4.5)) * 0.14 : 0;

      explorer.position.set(
        lerped.x + 0.44,
        lerped.y + 0.25 + jumpArc + idleBounce,
        lerped.z + 0.36
      );
      explorer.rotation.y = jp < 1 ? jp * Math.PI * 4 : Math.sin(t * 2) * 0.35;

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
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grade.gradient} p-1.5 shadow-sm`}
          >
            <AvatarDisplay avatar={grade.badgeEmoji} className="h-9 w-9" emojiClassName="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-base font-bold text-slate-900 sm:text-lg">
              <span>จักรวาล 3D {grade.nameTh}</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
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
        <div className="relative mb-5 overflow-hidden rounded-3xl border-2 border-indigo-300/80 bg-gradient-to-b from-slate-900/85 via-indigo-950/80 to-purple-950/80 shadow-2xl backdrop-blur-md">
          <div className="pointer-events-none absolute top-3 left-4 z-10 rounded-full bg-white/90 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-sm">
            🛸 แตะที่เกาะ 3D เพื่อให้หุ่นยนต์กระโดดไป หรือลากเพื่อหมุนมุมกล้อง 360°
          </div>
          <div ref={mountRef} className="h-[330px] w-full sm:h-[390px]" />
        </div>
      )}

      {/* Quick Island Selector Pills */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {islands.map((isl) => {
          const active = isl.id === selectedIsland.id;
          return (
            <button
              key={isl.id}
              onClick={() => setSelectedId(isl.id)}
              className={`inline-flex items-center gap-1.5 rounded-2xl border-b-4 px-3.5 py-2 text-xs font-bold transition active:translate-y-0.5 active:border-b-0 sm:text-sm ${
                active
                  ? 'border-indigo-700 bg-indigo-600 text-white shadow-md scale-105'
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
      <div
        key={selectedIsland.id}
        className="animate-card-pop rounded-3xl border-2 border-white bg-white/95 p-6 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 p-2 shadow-inner ring-2 ring-indigo-200/60">
              <AvatarDisplay
                avatar={selectedIsland.emoji}
                className="animate-bounce-soft h-12 w-12"
                emojiClassName="text-4xl"
              />
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
                    ({selectedIsland.action.lesson.words
                      .slice(0, 8)
                      .map((w) => w.word)
                      .join(', ')}
                    {selectedIsland.action.lesson.words.length > 8
                      ? ` ... +อีก ${selectedIsland.action.lesson.words.length - 8} คำ`
                      : ''}
                    )
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

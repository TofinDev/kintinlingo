import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AgeGroup } from '../types';
import { speakEnglish } from '../utils/speech';
import { Sparkles, Volume2 } from 'lucide-react';

interface Buddy3DProps {
  gradeName: string;
  ageGroup: AgeGroup;
  stars: number;
}

const GREETINGS = [
  'Hello! Let us learn English!',
  'You are doing great!',
  'Tap a lesson to start!',
  'English is fun!',
];

export const Buddy3D: React.FC<Buddy3DProps> = ({ gradeName, ageGroup, stars }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const jumpRef = useRef<number>(0);
  const targetRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bubbleText, setBubbleText] = useState<string>('สวัสดี! แตะตัวฉันเพื่อทักทายได้นะ 👋');
  const [webglError, setWebglError] = useState(false);

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

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 4.4);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.1);
    keyLight.position.set(2.5, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc7d2fe, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Cute 3D Buddy Group
    const buddy = new THREE.Group();
    scene.add(buddy);

    const bodyColor =
      ageGroup === 'kindergarten'
        ? 0xf472b6 // playful pink
        : ageGroup === 'lower_primary'
          ? 0x38bdf8 // bright sky blue
          : 0x818cf8; // indigo

    const mainMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.05,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.5,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.35,
    });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.68, 32, 32);
    bodyGeo.scale(1, 1.08, 0.92);
    const bodyMesh = new THREE.Mesh(bodyGeo, mainMat);
    bodyMesh.position.y = -0.35;
    buddy.add(bodyMesh);

    // Belly patch
    const bellyGeo = new THREE.SphereGeometry(0.46, 24, 24);
    bellyGeo.scale(1, 1.05, 0.45);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, -0.38, 0.44);
    buddy.add(bellyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.62, 32, 32);
    headGeo.scale(1.06, 0.95, 0.96);
    const headMesh = new THREE.Mesh(headGeo, mainMat);
    headMesh.position.y = 0.52;
    buddy.add(headMesh);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const leftEar = new THREE.Mesh(earGeo, mainMat);
    leftEar.position.set(-0.48, 1.02, -0.05);
    buddy.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, mainMat);
    rightEar.position.set(0.48, 1.02, -0.05);
    buddy.add(rightEar);

    // Inner Ears
    const innerEarGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const leftInner = new THREE.Mesh(innerEarGeo, bellyMat);
    leftInner.position.set(-0.48, 1.02, 0.08);
    buddy.add(leftInner);

    const rightInner = new THREE.Mesh(innerEarGeo, bellyMat);
    rightInner.position.set(0.48, 1.02, 0.08);
    buddy.add(rightInner);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.22, 0.56, 0.55);
    buddy.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.22, 0.56, 0.55);
    buddy.add(rightEye);

    // Eye sparkles
    const sparkleGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const leftSparkle = new THREE.Mesh(sparkleGeo, bellyMat);
    leftSparkle.position.set(-0.19, 0.59, 0.62);
    buddy.add(leftSparkle);

    const rightSparkle = new THREE.Mesh(sparkleGeo, bellyMat);
    rightSparkle.position.set(0.25, 0.59, 0.62);
    buddy.add(rightSparkle);

    // Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.09, 16, 16);
    cheekGeo.scale(1.2, 0.7, 0.5);
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.36, 0.43, 0.51);
    buddy.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.36, 0.43, 0.51);
    buddy.add(rightCheek);

    // Cute Nose
    const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
    noseGeo.scale(1.3, 0.9, 0.8);
    const noseMesh = new THREE.Mesh(noseGeo, darkMat);
    noseMesh.position.set(0, 0.46, 0.61);
    buddy.add(noseMesh);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.14, 0.34, 8, 16);
    const leftArm = new THREE.Mesh(armGeo, mainMat);
    leftArm.position.set(-0.74, -0.25, 0.08);
    leftArm.rotation.z = 0.55;
    buddy.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mainMat);
    rightArm.position.set(0.74, -0.25, 0.08);
    rightArm.rotation.z = -0.55;
    buddy.add(rightArm);

    // Floating Star Badge above head
    const starGeo = new THREE.OctahedronGeometry(0.18, 0);
    const floatingStar = new THREE.Mesh(starGeo, goldMat);
    floatingStar.position.set(0, 1.38, 0);
    buddy.add(floatingStar);

    // Animation loop
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle idle float
      let yOffset = Math.sin(t * 2.2) * 0.06;

      // Happy jump + spin when tapped
      if (jumpRef.current > 0) {
        jumpRef.current = Math.max(0, jumpRef.current - 0.035);
        const p = jumpRef.current;
        yOffset += Math.sin(p * Math.PI) * 0.48;
        buddy.rotation.y = (1 - p) * Math.PI * 2;
      } else {
        buddy.rotation.y += (targetRotRef.current.y - buddy.rotation.y) * 0.08;
        buddy.rotation.x += (targetRotRef.current.x - buddy.rotation.x) * 0.08;
      }

      buddy.position.y = yOffset;

      // Wave arms gently & natural breathing
      leftArm.rotation.z = 0.55 + Math.sin(t * 2.4) * 0.1;
      rightArm.rotation.z = -0.55 - Math.sin(t * 2.4) * 0.1;
      const breath = 1 + Math.sin(t * 2.2) * 0.018;
      bodyMesh.scale.set(breath, 1, breath);

      // Natural periodic eye blink
      const blinkCycle = t % 3.8;
      const eyeScaleY = blinkCycle > 3.65 ? 0.12 : 1;
      leftEye.scale.y = eyeScaleY;
      rightEye.scale.y = eyeScaleY;
      leftSparkle.visible = eyeScaleY > 0.5;
      rightSparkle.visible = eyeScaleY > 0.5;

      // Rotate floating star
      floatingStar.rotation.y = t * 1.8;
      floatingStar.position.y = 1.35 + Math.sin(t * 3) * 0.06;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 200;
      const h = container.clientHeight || 200;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [ageGroup]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    targetRotRef.current = {
      x: ny * 0.25,
      y: nx * 0.45,
    };
  };

  const handlePointerLeave = () => {
    targetRotRef.current = { x: 0, y: 0 };
  };

  const handleTapBuddy = () => {
    jumpRef.current = 1;
    const msg =
      stars > 0 && Math.random() > 0.5
        ? `Awesome! You have ${stars} stars!`
        : GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setBubbleText(msg);
    speakEnglish(msg, ageGroup);
  };

  if (webglError) return null;

  return (
    <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 shadow-sm sm:flex-row sm:px-6">
      <div className="flex items-center gap-4">
        <div
          ref={mountRef}
          onClick={handleTapBuddy}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="h-36 w-36 shrink-0 cursor-pointer select-none sm:h-40 sm:w-40"
          title="แตะหรือเลื่อนเมาส์เพื่อเล่นกับเพื่อน 3D"
        />

        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            เพื่อน 3D ประจำชั้น {gradeName}
          </div>

          <div className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80">
            “{bubbleText}”
          </div>

          <p className="mt-2 text-xs text-slate-500">
            ลองขยับเมาส์หรือแตะที่ตัวละครเพื่อหมุนและฟังเสียงทักทาย
          </p>
        </div>
      </div>

      <button
        onClick={handleTapBuddy}
        className="inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 sm:w-auto"
      >
        <Volume2 className="h-5 w-5" />
        ทักทายเพื่อน 3D
      </button>
    </div>
  );
};

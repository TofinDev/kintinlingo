import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HoloStage3DProps {
  emoji: string;
  onTap?: () => void;
}

function createEmojiTexture(emoji: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Glowing radial backdrop
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    grad.addColorStop(0.75, 'rgba(224, 231, 255, 0.92)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.85)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#818cf8';
    ctx.stroke();

    ctx.font = '136px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 136);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const HoloStage3D: React.FC<HoloStage3DProps> = ({ emoji, onTap }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<number>(1);
  const tiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    pulseRef.current = 1;
  }, [emoji]);

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

    const size = 210;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0.3, 4.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const key = new THREE.DirectionalLight(0xfffbeb, 1.3);
    key.position.set(3, 5, 4);
    scene.add(key);

    const root = new THREE.Group();
    scene.add(root);

    // 1. 3D Hologram Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.05, 1.2, 0.16, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      emissive: 0x4338ca,
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.15;
    root.add(baseMesh);

    // 2. Counter-Rotating Gyro Energy Rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.035, 14, 64),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.7,
      })
    );
    ring1.rotation.x = Math.PI / 2.2;
    root.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.34, 0.025, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xf472b6,
        emissiveIntensity: 0.6,
      })
    );
    ring2.rotation.y = Math.PI / 3;
    root.add(ring2);

    // 3. 3D Emoji Medallion Disc
    const emojiTex = createEmojiTexture(emoji);
    const discGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.14, 36);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.25,
      metalness: 0.6,
      roughness: 0.2,
    });
    const faceMat = new THREE.MeshBasicMaterial({ map: emojiTex });
    const discMesh = new THREE.Mesh(discGeo, [rimMat, faceMat, faceMat]);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.rotation.z = Math.PI / 2;
    root.add(discMesh);

    // 4. Orbiting Mini Crystals
    const crystals: THREE.Mesh[] = [];
    const cryGeo = new THREE.OctahedronGeometry(0.11, 0);
    const cryMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.5,
    });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(cryGeo, cryMat);
      root.add(c);
      crystals.push(c);
    }

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (pulseRef.current > 0) {
        pulseRef.current = Math.max(0, pulseRef.current - 0.04);
      }
      const p = pulseRef.current;

      discMesh.position.y = Math.sin(t * 2.6) * 0.09 + Math.sin(p * Math.PI) * 0.25;
      const targetRotY = tiltRef.current.y + Math.sin(t * 1.4) * 0.18 + p * Math.PI * 2;
      const targetRotX = Math.PI / 2 + tiltRef.current.x;

      discMesh.rotation.y += (targetRotY - discMesh.rotation.y) * 0.12;
      discMesh.rotation.x += (targetRotX - discMesh.rotation.x) * 0.12;

      ring1.rotation.z = t * 1.5;
      ring1.rotation.x = Math.PI / 2.2 + Math.sin(t) * 0.25;

      ring2.rotation.x = t * 1.1;
      ring2.rotation.y = -t * 1.3;

      crystals.forEach((c, i) => {
        const ang = t * 1.8 + (i * Math.PI) / 2;
        c.position.set(Math.cos(ang) * 1.25, Math.sin(t * 3 + i) * 0.35, Math.sin(ang) * 0.45);
        c.rotation.y = t * 3;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      emojiTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [emoji]);

  const handleClick = () => {
    pulseRef.current = 1;
    onTap?.();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tiltRef.current = { x: ny * 0.3, y: nx * 0.45 };
  };

  if (webglError) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="mx-auto mb-5 flex h-44 w-44 items-center justify-center rounded-3xl bg-indigo-50 text-8xl"
      >
        {emoji}
      </button>
    );
  }

  return (
    <div
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        tiltRef.current = { x: 0, y: 0 };
      }}
      className="group relative mx-auto mb-4 flex h-[210px] w-[210px] cursor-pointer items-center justify-center select-none"
      title="แตะโฮโลแกรม 3D เพื่อหมุนและฟังเสียง"
    >
      <div ref={mountRef} className="h-[210px] w-[210px]" />
    </div>
  );
};

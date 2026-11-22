import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AgeGroup } from '../types';

interface Background3DProps {
  ageGroup?: AgeGroup;
}

export const Background3D: React.FC<Background3DProps> = ({ ageGroup = 'kindergarten' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
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

    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xfffbeb, 1.1);
    dirLight1.position.set(8, 10, 6);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc7d2fe, 0.7);
    dirLight2.position.set(-8, -6, 4);
    scene.add(dirLight2);

    // Palette based on ageGroup
    const palette =
      ageGroup === 'kindergarten'
        ? [0xf472b6, 0xfbbf24, 0x38bdf8, 0x34d399, 0xa78bfa]
        : ageGroup === 'lower_primary'
          ? [0x38bdf8, 0x818cf8, 0xfbbf24, 0x2dd4bf, 0xfb7185]
          : [0x6366f1, 0x8b5cf6, 0x06b6d4, 0xf59e0b, 0xec4899];

    interface FloatingObj {
      mesh: THREE.Object3D;
      baseY: number;
      speed: number;
      amp: number;
      rotX: number;
      rotY: number;
      phase: number;
    }

    const floaters: FloatingObj[] = [];

    // 1. Puffy 3D Clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.02,
      transparent: true,
      opacity: 0.88,
    });

    const createCloud = (x: number, y: number, z: number, scale: number) => {
      const group = new THREE.Group();
      const puffs = [
        { px: 0, py: 0, pz: 0, r: 0.7 },
        { px: -0.6, py: -0.1, pz: 0.1, r: 0.52 },
        { px: 0.6, py: -0.12, pz: 0.08, r: 0.55 },
        { px: 0.2, py: 0.25, pz: -0.1, r: 0.48 },
      ];
      puffs.forEach((p) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 18, 18), cloudMat);
        m.position.set(p.px, p.py, p.pz);
        group.add(m);
      });
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      scene.add(group);
      floaters.push({
        mesh: group,
        baseY: y,
        speed: 0.5 + Math.random() * 0.4,
        amp: 0.18,
        rotX: 0,
        rotY: 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    };

    createCloud(-6.5, 3.2, -5, 1.15);
    createCloud(6.8, 2.8, -6, 1.25);
    createCloud(-4.5, -3.5, -7, 1.0);
    createCloud(5.5, -3.2, -4.5, 0.9);

    // 2. Floating 3D Geometric Toys (Stars, Donuts, Crystals, Spheres)
    const geometries = [
      () => new THREE.OctahedronGeometry(0.42, 0),
      () => new THREE.TorusGeometry(0.36, 0.14, 16, 32),
      () => new THREE.IcosahedronGeometry(0.4, 0),
      () => new THREE.SphereGeometry(0.34, 24, 24),
      () => new THREE.TorusKnotGeometry(0.28, 0.09, 48, 8),
    ];

    const positions = [
      [-7.5, 1.2, -2.5],
      [7.6, 0.8, -3.0],
      [-5.8, -1.8, -1.8],
      [6.2, -1.6, -2.2],
      [-3.2, 3.8, -4.2],
      [3.4, 3.9, -3.8],
      [0.2, -4.0, -5.0],
      [-8.5, -3.6, -5.5],
      [8.5, 3.6, -5.2],
      [-2.0, -3.4, -3.2],
      [2.6, 2.2, -5.8],
      [-4.0, 0.2, -6.5],
    ];

    positions.forEach(([x, y, z], idx) => {
      const geo = geometries[idx % geometries.length]();
      const mat = new THREE.MeshStandardMaterial({
        color: palette[idx % palette.length],
        roughness: 0.28,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      floaters.push({
        mesh,
        baseY: y,
        speed: 0.8 + (idx % 4) * 0.25,
        amp: 0.25 + (idx % 3) * 0.08,
        rotX: 0.35 + (idx % 3) * 0.15,
        rotY: 0.45 + (idx % 2) * 0.2,
        phase: idx * 0.8,
      });
    });

    // 3. Twinkling 3D Sparkle Particles
    const particleCount = 140;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 24;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 16;
      posArray[i * 3 + 2] = -12 + Math.random() * 10;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.09,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Subtle pointer parallax
    let targetCamX = 0;
    let targetCamY = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetCamX = nx * 0.65;
      targetCamY = -ny * 0.45;
    };
    window.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
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

      floaters.forEach((f) => {
        f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
        f.mesh.rotation.x += f.rotX * 0.008;
        f.mesh.rotation.y += f.rotY * 0.008;
      });

      particles.rotation.y = t * 0.025;
      particles.rotation.x = Math.sin(t * 0.15) * 0.03;

      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -2);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [ageGroup]);

  const bgGradient =
    ageGroup === 'kindergarten'
      ? 'from-rose-100 via-sky-100 to-amber-50'
      : ageGroup === 'lower_primary'
        ? 'from-sky-100 via-indigo-100 to-emerald-50'
        : 'from-indigo-100 via-purple-100 to-cyan-50';

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br ${bgGradient} transition-colors duration-700`}
    >
      {!webglError && <div ref={mountRef} className="h-full w-full" />}
    </div>
  );
};

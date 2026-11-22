import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AgeGroup } from '../types';

interface Background3DProps {
  ageGroup?: AgeGroup;
  viewKey?: string;
}

export const Background3D: React.FC<Background3DProps> = ({
  ageGroup = 'kindergarten',
  viewKey = 'login',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const warpRef = useRef<number>(1);
  const camTargetZRef = useRef<number>(10);
  const [webglError, setWebglError] = useState(false);

  // Trigger a futuristic warp pulse whenever the screen view changes
  useEffect(() => {
    warpRef.current = 1.0;
    camTargetZRef.current =
      viewKey === 'vs' ? 7.8 : viewKey === 'learn' || viewKey === 'quiz' ? 8.6 : 10;
  }, [viewKey]);

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
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 120);
    camera.position.set(0, 0.5, 10);

    // Rich Futuristic Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const dirLight1 = new THREE.DirectionalLight(0xfffbeb, 1.3);
    dirLight1.position.set(8, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.9);
    dirLight2.position.set(-10, -6, 5);
    scene.add(dirLight2);

    const movingLight = new THREE.PointLight(0x38bdf8, 2.2, 25);
    movingLight.position.set(0, 2, 4);
    scene.add(movingLight);

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

    // 1. Futuristic Holographic Horizon Grid at bottom
    const grid = new THREE.GridHelper(48, 32, palette[0], palette[2]);
    grid.position.set(0, -6.5, -8);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.22;
    scene.add(grid);

    // 2. Gyroscope Holo-Portal Rings in the deep background
    const gyroGroup = new THREE.Group();
    gyroGroup.position.set(0, 0.5, -11);
    const ringColors = [palette[0], palette[2], palette[4]];
    const gyroRings: THREE.Mesh[] = [];
    ringColors.forEach((col, i) => {
      const rGeo = new THREE.TorusGeometry(3.2 + i * 0.85, 0.035, 16, 80);
      const rMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.45 - i * 0.08,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.set(i * 0.6, i * 0.4, 0);
      gyroGroup.add(rMesh);
      gyroRings.push(rMesh);
    });
    scene.add(gyroGroup);

    // 3. Ringed 3D Planets (Saturn-style futuristic worlds)
    const createRingedPlanet = (
      x: number,
      y: number,
      z: number,
      radius: number,
      planetCol: number,
      ringCol: number
    ) => {
      const g = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius, 3),
        new THREE.MeshStandardMaterial({
          color: planetCol,
          roughness: 0.25,
          metalness: 0.25,
        })
      );
      g.add(sphere);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.65, radius * 0.12, 12, 48),
        new THREE.MeshStandardMaterial({
          color: ringCol,
          emissive: ringCol,
          emissiveIntensity: 0.35,
          roughness: 0.2,
          metalness: 0.4,
        })
      );
      ring.rotation.x = Math.PI / 2.6;
      ring.rotation.y = 0.35;
      g.add(ring);

      g.position.set(x, y, z);
      scene.add(g);
      floaters.push({
        mesh: g,
        baseY: y,
        speed: 0.65,
        amp: 0.28,
        rotX: 0.15,
        rotY: 0.45,
        phase: x,
      });
    };

    createRingedPlanet(-7.2, 2.8, -5.5, 0.65, palette[0], palette[1]);
    createRingedPlanet(7.4, -2.2, -6.2, 0.75, palette[2], palette[3]);

    // 4. Puffy 3D Clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
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

    createCloud(-6.5, -3.3, -6.5, 1.05);
    createCloud(6.8, 3.1, -6.5, 1.15);

    // 5. Floating 3D Geometric Toys & Energy Crystals
    const geometries = [
      () => new THREE.OctahedronGeometry(0.42, 0),
      () => new THREE.TorusGeometry(0.36, 0.13, 16, 32),
      () => new THREE.IcosahedronGeometry(0.4, 0),
      () => new THREE.TorusKnotGeometry(0.28, 0.085, 56, 12),
    ];

    const positions = [
      [-7.5, 0.4, -2.8],
      [7.6, 0.8, -3.0],
      [-5.8, -1.8, -2.2],
      [6.2, -1.2, -2.5],
      [-3.2, 3.8, -4.2],
      [3.4, 3.9, -3.8],
      [0.2, -4.0, -5.0],
      [-2.4, -3.4, -3.4],
      [2.8, 2.2, -5.8],
      [-4.2, 0.4, -6.5],
    ];

    positions.forEach(([x, y, z], idx) => {
      const col = palette[idx % palette.length];
      const geo = geometries[idx % geometries.length]();
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.18,
        roughness: 0.2,
        metalness: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      floaters.push({
        mesh,
        baseY: y,
        speed: 0.9 + (idx % 4) * 0.25,
        amp: 0.26 + (idx % 3) * 0.08,
        rotX: 0.45 + (idx % 3) * 0.15,
        rotY: 0.55 + (idx % 2) * 0.2,
        phase: idx * 0.8,
      });
    });

    // 6. Twinkling 3D Sparkle Starfield
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 28;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 18;
      posArray[i * 3 + 2] = -15 + Math.random() * 12;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.11,
      transparent: true,
      opacity: 0.9,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Pointer 3D Parallax
    let targetCamX = 0;
    let targetCamY = 0.5;
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetCamX = nx * 0.85;
      targetCamY = 0.4 - ny * 0.55;
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

      // Decay warp boost smoothly
      if (warpRef.current > 0) {
        warpRef.current = Math.max(0, warpRef.current - 0.025);
      }
      const warpBoost = 1 + warpRef.current * 4.5;

      floaters.forEach((f) => {
        f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
        f.mesh.rotation.x += f.rotX * 0.008 * warpBoost;
        f.mesh.rotation.y += f.rotY * 0.008 * warpBoost;
      });

      gyroRings.forEach((r, i) => {
        r.rotation.x += (0.004 + i * 0.002) * warpBoost;
        r.rotation.y += (0.006 - i * 0.0015) * warpBoost;
      });

      grid.position.z = -8 + ((t * 1.2) % 1.5);

      movingLight.position.x = Math.sin(t * 0.9) * 6;
      movingLight.position.y = Math.cos(t * 0.7) * 3;

      particles.rotation.y += 0.0008 * warpBoost;
      particles.position.z = warpRef.current * 2.2;

      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (camTargetZRef.current - warpRef.current * 1.4 - camera.position.z) * 0.06;
      camera.lookAt(0, 0, -3);

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
      ? 'from-rose-100 via-sky-100 to-indigo-100'
      : ageGroup === 'lower_primary'
        ? 'from-sky-100 via-indigo-100 to-purple-100'
        : 'from-indigo-200 via-purple-100 to-cyan-100';

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br ${bgGradient} transition-colors duration-700`}
    >
      {!webglError && <div ref={mountRef} className="h-full w-full" />}
    </div>
  );
};

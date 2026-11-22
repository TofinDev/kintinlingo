import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface HoloStage3DProps {
  word?: string;
  emoji: string;
  onTap?: () => void;
}

const COLOR_HEX_MAP: Record<string, { fill: string; stroke: string }> = {
  red: { fill: '#ef4444', stroke: '#b91c1c' },
  blue: { fill: '#3b82f6', stroke: '#1d4ed8' },
  yellow: { fill: '#facc15', stroke: '#ca8a04' },
  green: { fill: '#22c55e', stroke: '#15803d' },
  pink: { fill: '#ec4899', stroke: '#be185d' },
  orange: { fill: '#f97316', stroke: '#c2410c' },
  purple: { fill: '#a855f7', stroke: '#7e22ce' },
  white: { fill: '#f8fafc', stroke: '#94a3b8' },
  black: { fill: '#1e293b', stroke: '#0f172a' },
  brown: { fill: '#92400e', stroke: '#78350f' },
};

const NUMBER_VALUE_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

export function getEmojiCdnUrls(emoji: string): string[] {
  const trimmed = emoji.trim();
  if (!trimmed) return [];
  const codePoints: string[] = [];
  for (const ch of trimmed) {
    const cp = ch.codePointAt(0);
    if (cp) {
      codePoints.push(cp.toString(16));
    }
  }
  const hasZwj = codePoints.includes('200d');
  const cleanPoints = hasZwj ? codePoints : codePoints.filter((c) => c !== 'fe0f');
  if (cleanPoints.length === 0) return [];

  const hyphenHex = cleanPoints.join('-');
  const underscoreHex = cleanPoints.join('_');

  return [
    // Tier 1: Microsoft Fluent 3D Emoji (High-gloss 3D WebP)
    `https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/${hyphenHex}.webp`,
    // Tier 2: Google Noto Animated Emoji (Animated WebP)
    `https://fonts.gstatic.com/s/e/notoemoji/latest/${underscoreHex}/512.webp`,
    // Tier 3: Twemoji Vector SVG
    `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${hyphenHex}.svg`,
  ];
}

function renderCustomSvg(wordLower: string): React.ReactNode | null {
  if (wordLower === 'triangle') {
    return (
      <svg viewBox="0 0 160 160" className="h-32 w-32 drop-shadow-md sm:h-36 sm:w-36">
        <defs>
          <linearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>
        <polygon
          points="80,18 144,134 16,134"
          fill="url(#triGrad)"
          stroke="#9f1239"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="64" cy="92" r="6" fill="#ffffff" />
        <circle cx="96" cy="92" r="6" fill="#ffffff" />
        <circle cx="64" cy="92" r="3" fill="#1e293b" />
        <circle cx="96" cy="92" r="3" fill="#1e293b" />
        <path
          d="M 68 108 Q 80 118 92 108"
          fill="none"
          stroke="#1e293b"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (wordLower === 'circle') {
    return (
      <svg viewBox="0 0 160 160" className="h-32 w-32 drop-shadow-md sm:h-36 sm:w-36">
        <defs>
          <linearGradient id="cirGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="58" fill="url(#cirGrad)" stroke="#1d4ed8" strokeWidth="6" />
        <circle cx="60" cy="70" r="7" fill="#ffffff" />
        <circle cx="100" cy="70" r="7" fill="#ffffff" />
        <circle cx="60" cy="70" r="3.5" fill="#1e293b" />
        <circle cx="100" cy="70" r="3.5" fill="#1e293b" />
        <path
          d="M 64 94 Q 80 108 96 94"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (wordLower === 'square') {
    return (
      <svg viewBox="0 0 160 160" className="h-32 w-32 drop-shadow-md sm:h-36 sm:w-36">
        <defs>
          <linearGradient id="sqGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect
          x="24"
          y="24"
          width="112"
          height="112"
          rx="18"
          fill="url(#sqGrad)"
          stroke="#047857"
          strokeWidth="6"
        />
        <circle cx="60" cy="70" r="7" fill="#ffffff" />
        <circle cx="100" cy="70" r="7" fill="#ffffff" />
        <circle cx="60" cy="70" r="3.5" fill="#1e293b" />
        <circle cx="100" cy="70" r="3.5" fill="#1e293b" />
        <path
          d="M 64 96 Q 80 110 96 96"
          fill="none"
          stroke="#1e293b"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const colorObj = COLOR_HEX_MAP[wordLower];
  if (colorObj) {
    return (
      <svg viewBox="0 0 160 160" className="h-32 w-32 drop-shadow-md sm:h-36 sm:w-36">
        <path
          d="M80 18 C110 18, 138 42, 138 76 C138 112, 112 140, 78 140 C44 140, 20 114, 22 78 C24 44, 50 18, 80 18 Z"
          fill={colorObj.fill}
          stroke={colorObj.stroke}
          strokeWidth="6"
        />
        <circle cx="52" cy="52" r="10" fill="#ffffff" opacity="0.45" />
      </svg>
    );
  }

  const numVal = NUMBER_VALUE_MAP[wordLower];
  if (numVal !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="font-en flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-6xl font-bold text-white shadow-lg ring-4 ring-white">
          {numVal}
        </div>
        {numVal <= 10 && (
          <div className="mt-2 flex max-w-[140px] flex-wrap justify-center gap-1">
            {Array.from({ length: numVal }).map((_, i) => (
              <span key={i} className="h-3 w-3 rounded-full bg-indigo-500 shadow-xs" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export interface WordPictureProps {
  word?: string;
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
}

export const WordPicture: React.FC<WordPictureProps> = ({
  word = '',
  emoji,
  size = 'md',
}) => {
  const [urlIndex, setUrlIndex] = useState(0);
  const wordLower = word.trim().toLowerCase();
  const customSvg = useMemo(() => renderCustomSvg(wordLower), [wordLower]);
  const urls = useMemo(() => getEmojiCdnUrls(emoji), [emoji]);

  useEffect(() => {
    setUrlIndex(0);
  }, [emoji, word]);

  const sizeClass =
    size === 'sm'
      ? 'h-16 w-16 text-5xl'
      : size === 'lg'
        ? 'h-28 w-28 text-7xl sm:h-32 sm:w-32 sm:text-8xl'
        : 'h-20 w-20 text-6xl sm:h-24 sm:w-24';

  if (customSvg) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${sizeClass}`}>
        <div className={size === 'sm' ? 'scale-50' : size === 'md' ? 'scale-75' : 'scale-100'}>
          {customSvg}
        </div>
      </div>
    );
  }

  const activeUrl = urls[urlIndex];
  if (activeUrl) {
    return (
      <img
        src={activeUrl}
        alt={word || emoji}
        onError={() => setUrlIndex((i) => i + 1)}
        className={`animate-bounce-soft object-contain drop-shadow-lg ${sizeClass}`}
        draggable={false}
      />
    );
  }

  return <span className={sizeClass}>{emoji}</span>;
};

export const HoloStage3D: React.FC<HoloStage3DProps> = ({ word = '', emoji, onTap }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<number>(1);
  const [urlIndex, setUrlIndex] = useState(0);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bouncing, setBouncing] = useState(false);

  const wordLower = word.trim().toLowerCase();
  const customSvg = useMemo(() => renderCustomSvg(wordLower), [wordLower]);
  const urls = useMemo(() => getEmojiCdnUrls(emoji), [emoji]);

  useEffect(() => {
    setUrlIndex(0);
    pulseRef.current = 1;
  }, [emoji, word]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const size = 230;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0.25, 4.3);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const key = new THREE.DirectionalLight(0xfffbeb, 1.2);
    key.position.set(3, 5, 4);
    scene.add(key);

    const root = new THREE.Group();
    scene.add(root);

    const baseGeo = new THREE.CylinderGeometry(1.1, 1.28, 0.16, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.45,
      metalness: 0.5,
      roughness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.22;
    root.add(baseMesh);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.035, 14, 64),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.65,
      })
    );
    ring1.rotation.x = Math.PI / 2.2;
    root.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.44, 0.025, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xf472b6,
        emissiveIntensity: 0.55,
      })
    );
    ring2.rotation.y = Math.PI / 3;
    root.add(ring2);

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

      ring1.rotation.z = t * 1.4;
      ring1.rotation.x = Math.PI / 2.2 + Math.sin(t) * 0.22;

      ring2.rotation.x = t * 1.1;
      ring2.rotation.y = -t * 1.25;

      crystals.forEach((c, i) => {
        const ang = t * 1.7 + (i * Math.PI) / 2;
        c.position.set(Math.cos(ang) * 1.38, Math.sin(t * 2.8 + i) * 0.35, Math.sin(ang) * 0.45);
        c.rotation.y = t * 3;
      });

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
  }, []);

  const handleClick = () => {
    pulseRef.current = 1;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    onTap?.();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setTilt({ x: -ny * 14, y: nx * 16 });
  };

  const activeUrl = urls[urlIndex];

  return (
    <div
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="group relative mx-auto mb-3 flex h-[230px] w-[230px] cursor-pointer items-center justify-center select-none"
      title="แตะที่รูปภาพ 3D เพื่อฟังเสียง"
    >
      {/* Background 3D Hologram Rings & Pedestal */}
      <div ref={mountRef} className="pointer-events-none absolute inset-0 h-[230px] w-[230px]" />

      {/* Center Front-Facing 3D Fluent / Animated Illustration Card */}
      <div
        style={{
          transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${
            bouncing ? 1.14 : 1
          })`,
        }}
        className="relative z-10 flex h-40 w-40 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-white/95 via-indigo-50/90 to-sky-100/90 p-3 shadow-xl transition-transform duration-150 group-hover:scale-105"
      >
        {customSvg ? (
          customSvg
        ) : activeUrl ? (
          <img
            src={activeUrl}
            alt={word || emoji}
            onError={() => setUrlIndex((i) => i + 1)}
            className="animate-bounce-soft h-32 w-32 object-contain drop-shadow-xl sm:h-34 sm:w-34"
            draggable={false}
          />
        ) : (
          <span className="text-7xl sm:text-8xl">{emoji}</span>
        )}
      </div>
    </div>
  );
};

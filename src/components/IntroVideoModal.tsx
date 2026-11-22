import React, { useEffect, useRef, useState } from 'react';
import { Play, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface IntroVideoModalProps {
  onFinish: () => void;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({ onFinish }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsMobilePortrait(window.innerWidth < 768 || window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.play().catch(() => {
      // ignore autoplay block
    });
  }, [isMobilePortrait]);

  const toggleSound = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const nextMuted = !muted;
    vid.muted = nextMuted;
    setMuted(nextMuted);
    if (vid.paused) {
      vid.play().catch(() => {});
    }
  };

  const videoSrc = isMobilePortrait ? '/intro-mobile.mp4' : '/intro.mp4';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-2.5 backdrop-blur-md sm:p-6">
      <div
        className={`animate-portal-zoom relative flex w-full flex-col items-center overflow-hidden rounded-3xl border-2 border-indigo-400/60 bg-slate-900 shadow-2xl ${
          isMobilePortrait ? 'max-w-[360px]' : 'max-w-3xl'
        }`}
      >
        {/* Top Floating Badge + Sound Toggle */}
        <div className="absolute top-3 right-3 left-3 z-20 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/20 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Kintin Vocab</span>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-md backdrop-blur-md transition hover:bg-indigo-500 active:scale-95 sm:text-xs"
          >
            {muted ? (
              <>
                <VolumeX className="h-4 w-4" />
                <span>แตะเปิดเสียง</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                <span>เปิดเสียงอยู่</span>
              </>
            )}
          </button>
        </div>

        {/* Video Player (Portrait on Mobile, Landscape on Desktop) */}
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          playsInline
          onClick={toggleSound}
          onEnded={onFinish}
          onError={onFinish}
          className={`w-full cursor-pointer bg-black ${
            isMobilePortrait ? 'max-h-[76vh] object-cover' : 'max-h-[70vh] object-contain'
          }`}
        />

        {/* Bottom Enter App Bar */}
        <div className="flex w-full items-center justify-between gap-2 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 px-4 py-3 sm:px-5 sm:py-3.5">
          <span className="text-xs font-medium text-indigo-200 sm:text-sm">
            โลกคำศัพท์ 3D อ.1 – ป.6
          </span>

          <button
            type="button"
            onClick={onFinish}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 sm:px-6 sm:text-base"
          >
            <Play className="h-4 w-4 fill-white" />
            เข้าสู่แอปเลย! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

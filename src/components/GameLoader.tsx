import React from 'react';

interface GameLoaderProps {
  label?: string;
}

export const GameLoader: React.FC<GameLoaderProps> = ({
  label = 'กำลังโหลดเกมสนุกๆ...',
}) => {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/90 text-6xl shadow-lg ring-4 ring-indigo-100">
        <span className="animate-bounce-soft">🚀</span>
      </div>
      <div className="text-lg font-bold text-slate-800">{label}</div>
      <div className="mt-3 h-2.5 w-48 overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
      </div>
    </div>
  );
};

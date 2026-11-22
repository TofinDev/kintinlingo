import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, QrCode, X } from 'lucide-react';

interface ShareQrModalProps {
  onClose: () => void;
}

const LIVE_URL = 'https://kintinlingo.vercel.app/';

export const ShareQrModal: React.FC<ShareQrModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const shareUrl =
    typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
      ? window.location.origin + '/'
      : LIVE_URL;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownload = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'kintin-lingo-qrcode.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="animate-card-pop w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="mb-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">สแกน QR Code เพื่อเข้าเล่น</h2>
              <p className="text-xs text-slate-500">เปิดเล่นได้ทันทีทั้งมือถือ iPad และคอมพิวเตอร์</p>
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

        {/* QR Code Box */}
        <div
          ref={qrWrapRef}
          className="mx-auto my-4 inline-flex flex-col items-center rounded-3xl border-2 border-indigo-100 bg-white p-5 shadow-inner"
        >
          <QRCodeCanvas
            value={shareUrl}
            size={210}
            bgColor="#ffffff"
            fgColor="#1e1b4b"
            level="H"
            includeMargin={false}
          />
          <div className="font-en mt-3 text-sm font-bold text-indigo-600">Kintin Lingo</div>
        </div>

        {/* Clickable Link */}
        <div className="mb-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-en inline-flex items-center gap-1.5 break-all text-sm font-bold text-indigo-600 underline hover:text-indigo-700"
          >
            <span>{shareUrl}</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
          >
            <Download className="h-4 w-4" />
            <span>บันทึก QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

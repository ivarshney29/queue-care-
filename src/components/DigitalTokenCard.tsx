import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  Building,
  Activity,
  ShieldCheck,
  Sparkles,
  QrCode as QrCodeIcon
} from 'lucide-react';
import { PatientToken } from '../types';
import { formatWaitTime } from '../utils/waitingTimeEngine';

interface DigitalTokenCardProps {
  token: PatientToken;
  onClose?: () => void;
}

export const DigitalTokenCard: React.FC<DigitalTokenCardProps> = ({ token, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate QR code pointing to non-sensitive opaque token lookup
    // Never include private health or clinical details in the public QR payload
    const lookupUrl = `${window.location.origin}/?verify_token=${encodeURIComponent(token.tokenNumber)}`;
    QRCode.toDataURL(lookupUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0D231E',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [token.tokenNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QueueCare-Token-${token.tokenNumber}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleShare = () => {
    const text = `My QueueCare AI Token is #${token.tokenNumber} for ${token.department}. Registered at ${token.arrivalTime}.`;
    if (navigator.share) {
      navigator.share({
        title: `QueueCare AI Token #${token.tokenNumber}`,
        text,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xl max-w-lg mx-auto print:shadow-none print:border-none print:p-0">
      {/* CARD WRAPPER TO BE PRINTED / DISPLAYED */}
      <div id="printable-token-card" className="relative rounded-3xl bg-[#0D231E] text-white p-6 sm:p-8 shadow-2xl border border-white/10 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-[#B4F481]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Brand Logo & Dept */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B4F481] flex items-center justify-center text-[#0D231E] shadow">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm tracking-tight">QueueCare AI</p>
              <p className="text-[10px] text-[#B4F481] font-mono">Digital Outpatient Pass</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-[#B4F481] border border-white/10">
              {token.department}
            </span>
            <p className="text-[10px] text-stone-400 mt-0.5">Assigned Station</p>
          </div>
        </div>

        {/* Large Prominent Token Number */}
        <div className="my-6 text-center">
          <span className="text-xs uppercase tracking-widest text-stone-400 font-bold block mb-1">
            Official Queue Token
          </span>
          <div className="text-5xl sm:text-6xl font-black font-mono-num text-white tracking-tight">
            #{token.tokenNumber}
          </div>
          <p className="text-xs text-stone-300 mt-2 font-medium">
            Patient: <span className="text-white font-bold">{token.patientName}</span> ({token.age} yrs)
          </p>
        </div>

        {/* Token Metadata Details */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs mb-6">
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Checked In</span>
            <p className="font-bold text-white font-mono mt-0.5">{token.arrivalTime}</p>
          </div>

          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Current Status</span>
            <p className="font-bold text-[#B4F481] capitalize mt-0.5 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B4F481] animate-pulse" />
              <span>{token.status}</span>
            </p>
          </div>

          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Estimated Wait</span>
            <p className="font-bold text-white font-mono mt-0.5">
              {formatWaitTime(token.estimatedWaitingMinutes)}
            </p>
          </div>

          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Appointment</span>
            <p className="font-bold text-white mt-0.5 truncate">{token.appointmentType}</p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="pt-2 flex flex-col items-center justify-center border-t border-white/10">
          <div className="p-3 bg-white rounded-2xl shadow-inner mb-2 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for Token #${token.tokenNumber}`} className="w-28 h-28" />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-stone-400">
                <QrCodeIcon className="w-8 h-8 animate-pulse" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-stone-400 font-mono text-center">
            Scan with reception scanner to verify check-in
          </span>
          <span className="text-[9px] text-stone-500 text-center mt-0.5">
            Opaque token reference • No private medical records exposed
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS (Hidden in Print View) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Token</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download QR</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="px-4 py-2.5 rounded-xl bg-[#0D231E] text-white font-bold text-xs flex items-center space-x-1.5 hover:bg-[#13322B] transition-colors cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-[#B4F481]" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Copied Details!' : 'Share Pass'}</span>
        </button>
      </div>
    </div>
  );
};

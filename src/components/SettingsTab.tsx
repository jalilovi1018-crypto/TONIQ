import { X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';

interface SettingsTabProps {
  onClose: () => void;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${value ? 'bg-[#0180FF]' : 'bg-[#374151]'}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-[14px] font-semibold text-[#E5E7EB]">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsTab({ onClose }: SettingsTabProps) {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('toniq_display_name') || ''
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem('toniq_notifications') !== 'false'
  );

  // Currency lives in context so any component that uses it re-renders immediately
  const { currency, setCurrency } = useCurrency();

  const updateDisplayName = (v: string) => {
    setDisplayName(v);
    localStorage.setItem('toniq_display_name', v);
  };
  const updateNotifications = (v: boolean) => {
    setNotifications(v);
    localStorage.setItem('toniq_notifications', String(v));
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0F] overflow-y-auto no-scrollbar">
      {/* Brand accent */}
      <div className="w-full h-[2px] bg-gradient-to-r from-[#0180FF] to-[#7354F2] shrink-0" />

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 shrink-0">
        <span className="font-bold text-white text-[20px] tracking-tight">Settings</span>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <X size={18} className="text-[#E5E7EB]" />
        </button>
      </div>

      <div className="px-5 pb-12 space-y-6">

        {/* ── PROFILE ── */}
        <div>
          <h2 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Profile</h2>
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">Display Name</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => updateDisplayName(e.target.value)}
              placeholder="Enter your name…"
              className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[10px] px-3 py-2.5 text-[14px] text-[#E5E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0180FF] transition-colors"
            />
          </div>
        </div>

        {/* ── PREFERENCES ── */}
        <div>
          <h2 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Preferences</h2>
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] divide-y divide-[rgba(255,255,255,0.06)]">

            {/* Currency — uses context, updates all tabs instantly */}
            <Row label="Currency">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-[8px] text-[12px] font-bold transition-colors ${currency === 'USD' ? 'bg-[#0180FF] text-white' : 'bg-[#374151] text-[#6B7280]'}`}>
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('EUR')}
                  className={`px-3 py-1 rounded-[8px] text-[12px] font-bold transition-colors ${currency === 'EUR' ? 'bg-[#0180FF] text-white' : 'bg-[#374151] text-[#6B7280]'}`}>
                  € EUR
                </button>
              </div>
            </Row>

            {/* Notifications */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[14px] font-semibold text-[#E5E7EB]">Notifications</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Price alert notifications</p>
              </div>
              <Toggle value={notifications} onChange={updateNotifications} />
            </div>

          </div>
        </div>

        {/* ── ABOUT ── */}
        <div>
          <h2 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">About</h2>
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] divide-y divide-[rgba(255,255,255,0.06)]">

            <div className="flex justify-between items-center p-4">
              <span className="text-[14px] text-[#6B7280]">Version</span>
              <span className="text-[14px] font-semibold text-[#E5E7EB]">1.0.0</span>
            </div>

            <div className="flex justify-between items-start p-4 gap-4">
              <span className="text-[14px] text-[#6B7280] shrink-0">Built for</span>
              <span className="text-[12px] font-semibold text-[#E5E7EB] text-right">
                STON.fi Vibe Coding Hackathon 2026
              </span>
            </div>

            <div className="flex justify-between items-start p-4 gap-4">
              <span className="text-[14px] text-[#6B7280] shrink-0">Powered by</span>
              <span className="text-[11px] font-semibold text-[#E5E7EB] text-right leading-relaxed">
                Claude AI · STON.fi API · Tonstakers
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.open('https://github.com/jalilovi1018-crypto/TONIQ', '_blank')}
              className="flex justify-between items-center p-4 w-full hover:bg-white/[0.02] transition-colors active:scale-[0.99]">
              <span className="text-[14px] text-[#6B7280]">GitHub</span>
              <div className="flex items-center gap-1.5 text-[#3DB1FF]">
                <span className="text-[13px] font-semibold">View source</span>
                <ExternalLink size={13} />
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

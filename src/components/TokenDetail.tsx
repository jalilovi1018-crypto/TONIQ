import { ArrowLeft, Star, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchTopTokens, Token } from '../services/stonfi';

interface DisplayToken extends Token {
  change: string;
}

interface TokenDetailProps {
  token: DisplayToken;
  onBack: () => void;
}

function truncate(addr: string, head = 8, tail = 6): string {
  if (!addr || addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export default function TokenDetail({ token, onBack }: TokenDetailProps) {
  const [fullToken, setFullToken] = useState<Token | null>(null);

  useEffect(() => {
    fetchTopTokens().then((tokens) => {
      const match = tokens.find((t) => t.symbol === token.symbol);
      if (match) setFullToken(match);
    });
  }, [token.symbol]);

  const data = fullToken ?? token;
  const priceNum = parseFloat(data.dex_price_usd);
  const priceDisplay = Number.isFinite(priceNum)
    ? priceNum < 0.01 ? `$${priceNum.toFixed(6)}` : `$${priceNum.toFixed(4)}`
    : data.dex_price_usd;

  const isPositive = token.change.startsWith('+');

  const stats = [
    { label: 'Price (USD)',  value: priceDisplay },
    { label: 'Symbol',       value: data.symbol },
    { label: 'Name',         value: data.display_name || '—' },
    { label: 'Contract',     value: data.contract_address ? truncate(data.contract_address) : '—' },
  ];

  return (
    <div className="p-5 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center -mt-2">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <ArrowLeft size={18} className="text-[#E5E7EB]" />
        </button>
        <div className="font-bold text-[16px] text-white tracking-wide">Asset Details</div>
        <button className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <Star size={18} className="text-[#6B7280]" />
        </button>
      </div>

      {/* Main Info */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center bg-[#374151] text-white mb-4 border-4 border-[#0A0A0F] shadow-lg overflow-hidden">
          {data.image_url
            ? <img src={data.image_url} alt={data.symbol} className="w-full h-full object-cover rounded-full" />
            : <Circle size={32} strokeWidth={2} />}
        </div>
        <h2 className="text-[24px] font-bold text-white mb-1">{data.display_name || data.symbol}</h2>
        <p className="text-[#6B7280] font-medium tracking-wide mb-6">{data.symbol}</p>

        <div className="flex flex-col items-center space-y-2">
          <span className="text-[40px] font-bold text-white leading-none tracking-tight">{priceDisplay}</span>
          <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[13px] font-bold tracking-wide bg-[#374151] text-[#6B7280]">
            N/A (24h)
          </div>
        </div>
      </div>

      {/* Fake Chart */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 h-[180px] flex flex-col relative justify-between">
        <div className="flex justify-between text-[#6B7280] text-[11px] font-bold w-full uppercase tracking-widest absolute top-4 left-0 px-5">
          <span>Price Graph</span>
        </div>
        <div className="flex-1 w-full flex items-end justify-center mt-6">
          <svg width="100%" height="80%" viewBox="0 0 100 40" preserveAspectRatio="none" className="overflow-visible">
            <path
              d={isPositive ? "M0,35 Q20,38 30,25 T60,20 T100,5" : "M0,5 Q20,10 30,25 T60,20 T100,35"}
              fill="none"
              stroke={isPositive ? "#00D395" : "#FF4D4D"}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={isPositive ? "M0,35 Q20,38 30,25 T60,20 T100,5 L100,40 L0,40 Z" : "M0,5 Q20,10 30,25 T60,20 T100,35 L100,40 L0,40 Z"}
              fill={isPositive ? "rgba(0, 211, 149, 0.1)" : "rgba(255, 77, 77, 0.1)"}
            />
          </svg>
        </div>
        <div className="flex justify-between mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3 text-[12px] font-bold tracking-wide">
          <span className="text-[#6B7280]">1H</span>
          <span className="text-[#6B7280]">1D</span>
          <span className="text-[#3DB1FF]">1W</span>
          <span className="text-[#6B7280]">1M</span>
          <span className="text-[#6B7280]">1Y</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1">Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
              <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">{stat.label}</p>
              <p className="font-bold text-[14px] text-[#E5E7EB] break-all">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom spacer for scroll */}
      <div className="h-6"></div>
    </div>
  );
}

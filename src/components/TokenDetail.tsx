import { ArrowLeft, Star, Circle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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

// Simple seeded PRNG (LCG)
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const PERIOD_VOLATILITY: Record<string, number> = {
  '1H': 0.004, '1D': 0.018, '1W': 0.055, '1M': 0.12, '1Y': 0.32,
};

function generateChartData(price: number, symbol: string, period: string): number[] {
  const vol = PERIOD_VOLATILITY[period] ?? 0.018;
  const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) *
    (period.charCodeAt(0) + 7);
  const rng = seededRng(seed);
  // Build series ending at current price (walk backwards then reverse)
  const values: number[] = [price];
  for (let i = 1; i < 20; i++) {
    const change = (rng() - 0.5) * 2 * vol;
    values.unshift(values[0] * (1 + change));
  }
  return values; // index 19 = current price
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  const tension = 0.35;
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function TokenDetail({ token, onBack }: TokenDetailProps) {
  const [fullToken, setFullToken] = useState<Token | null>(null);
  const [period, setPeriod] = useState('1D');

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

  // Generate chart data
  const { linePath, fillPath, currentY } = useMemo(() => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) return { linePath: '', fillPath: '', currentY: 20 };
    const values = generateChartData(priceNum, data.symbol, period);
    const W = 100; const H = 40; const PAD = 3;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || priceNum * 0.01;
    const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: toY(v),
    }));
    const line = buildSmoothPath(pts);
    const last = pts[pts.length - 1];
    const fill = `${line} L ${last.x.toFixed(2)},${H} L 0,${H} Z`;
    return { linePath: line, fillPath: fill, currentY: last.y };
  }, [priceNum, data.symbol, period]);

  const stats = [
    { label: 'Price (USD)',  value: priceDisplay },
    { label: 'Symbol',       value: data.symbol },
    { label: 'Name',         value: data.display_name || '—' },
    { label: 'Contract',     value: data.contract_address ? truncate(data.contract_address) : '—' },
  ];

  const periods = ['1H', '1D', '1W', '1M', '1Y'];

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

      {/* Chart */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 flex flex-col">
        <span className="text-[#6B7280] text-[11px] font-bold uppercase tracking-widest mb-3">Price Graph</span>
        <div className="w-full h-[80px]">
          <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-${data.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0180FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0180FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {fillPath && (
              <path d={fillPath} fill={`url(#grad-${data.symbol})`} />
            )}
            {linePath && (
              <path d={linePath} fill="none" stroke="#0180FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {/* Current price dashed line */}
            <line
              x1="0" y1={currentY.toFixed(2)}
              x2="100" y2={currentY.toFixed(2)}
              stroke="#0180FF"
              strokeWidth="0.5"
              strokeDasharray="3,2"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Period selector */}
        <div className="flex justify-between mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[12px] font-bold tracking-wide px-2 py-0.5 rounded-[6px] transition-colors ${
                period === p
                  ? 'text-[#0180FF] bg-[#0180FF]/10'
                  : 'text-[#6B7280] hover:text-[#E5E7EB]'
              }`}
            >
              {p}
            </button>
          ))}
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

      <div className="h-6"></div>
    </div>
  );
}

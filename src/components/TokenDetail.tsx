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

// ── Seeded PRNG (LCG) ─────────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── Chart generation ──────────────────────────────────────────────────────────

// Volatility per period (half-range of each random step)
const PERIOD_VOLATILITY: Record<string, number> = {
  '1H': 0.005,   // ±0.5%  – barely a ripple
  '1D': 0.015,   // ±1.5%  – gentle intraday moves
  '1W': 0.04,    // ±4%    – visible swings
  '1M': 0.08,    // ±8%    – significant moves
  '1Y': 0.20,    // ±20%   – dramatic year-long trend
};

// Large prime offsets so each period produces a completely different seed
const PERIOD_SEED_OFFSET: Record<string, number> = {
  '1H': 1,
  '1D': 997,
  '1W': 7919,
  '1M': 104723,
  '1Y': 982451,
};

/** Stable hash of the symbol string → used for direction AND seed base */
export function symbolHashValue(symbol: string): number {
  return symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function generateChartData(price: number, symbol: string, period: string): number[] {
  const vol = PERIOD_VOLATILITY[period] ?? 0.015;
  const hash  = symbolHashValue(symbol);
  const seed  = hash * 1000 + (PERIOD_SEED_OFFSET[period] ?? 997);
  const rng   = seededRng(seed);

  // Walk backwards from current price so series always ends at `price`
  const values: number[] = [price];
  for (let i = 1; i < 20; i++) {
    const change = (rng() - 0.5) * 2 * vol;
    values.unshift(values[0] * (1 + change));
  }
  // values[0] = oldest price, values[19] = current price

  // ── Sync direction with sparkline ─────────────────────────────────────────
  // symbolHash % 2 === 0 → "positive" token → chart should end higher than start
  const expectedPositive = hash % 2 === 0;                         // same rule as MarketTab sparkline
  const actualPositive   = values[0] < values[values.length - 1]; // old < current → went up

  if (actualPositive !== expectedPositive) {
    // Reflect all non-final points around the current price to flip the trend
    // while keeping the endpoint (= current price) fixed
    const lastVal = values[values.length - 1];
    for (let i = 0; i < values.length - 1; i++) {
      values[i] = 2 * lastVal - values[i];
    }
  }

  return values;
}

// ── SVG path builder (catmull-rom → cubic bezier) ─────────────────────────────
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

// ── Token descriptions ────────────────────────────────────────────────────────
const TOKEN_DESCRIPTIONS: Record<string, string> = {
  TON:   'Native currency of the TON blockchain',
  USDT:  'USD-pegged stablecoin by Tether',
  TSTON: 'Liquid staking token by Tonstakers, earns ~4.8% APY',
  STON:  'Governance token of STON.fi DEX',
};

function getTokenDescription(symbol: string): string {
  return TOKEN_DESCRIPTIONS[symbol.toUpperCase()] ?? 'TON ecosystem token';
}

// ── Component ─────────────────────────────────────────────────────────────────
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

  // Chart colour is constant per token (synced with MarketTab sparkline)
  const isPositive  = symbolHashValue(data.symbol) % 2 === 0;
  const chartColor  = isPositive ? '#00D395' : '#FF4D4D';
  const gradientId  = `grad-${data.symbol}`;

  // Rebuild chart whenever price, symbol, or period changes
  const { linePath, fillPath, currentY } = useMemo(() => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return { linePath: '', fillPath: '', currentY: 20 };
    }
    const values = generateChartData(priceNum, data.symbol, period);
    const W = 100; const H = 40; const PAD = 3;
    const minV  = Math.min(...values);
    const maxV  = Math.max(...values);
    const range = maxV - minV || priceNum * 0.01;
    const toY   = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
    const pts   = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: toY(v) }));
    const line  = buildSmoothPath(pts);
    const last  = pts[pts.length - 1];
    const fill  = `${line} L ${last.x.toFixed(2)},${H} L 0,${H} Z`;
    return { linePath: line, fillPath: fill, currentY: last.y };
  }, [priceNum, data.symbol, period]);

  const periods = ['1H', '1D', '1W', '1M', '1Y'];

  return (
    <div className="p-5 flex flex-col space-y-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-center -mt-2">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <ArrowLeft size={18} className="text-[#E5E7EB]" />
        </button>
        <div className="font-bold text-[16px] text-white tracking-wide">Asset Details</div>
        <button className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <Star size={18} className="text-[#6B7280]" />
        </button>
      </div>

      {/* ── Main info ── */}
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
          <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[13px] font-bold tracking-wide ${
            isPositive ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FF4D4D]/10 text-[#FF4D4D]'
          }`}>
            {isPositive ? '↑' : '↓'} 24h
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 flex flex-col">
        <span className="text-[#6B7280] text-[11px] font-bold uppercase tracking-widest mb-3">Price Graph</span>
        <div className="w-full h-[80px]">
          <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={chartColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {fillPath && <path d={fillPath} fill={`url(#${gradientId})`} />}
            {linePath && (
              <path d={linePath} fill="none" stroke={chartColor} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            )}
            <line x1="0" y1={currentY.toFixed(2)} x2="100" y2={currentY.toFixed(2)}
              stroke={chartColor} strokeWidth="0.5" strokeDasharray="3,2" opacity="0.4" />
          </svg>
        </div>

        {/* Period selector */}
        <div className="flex justify-between mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3">
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-[12px] font-bold tracking-wide px-2 py-0.5 rounded-[6px] transition-colors ${
                period === p ? 'text-[#0180FF] bg-[#0180FF]/10' : 'text-[#6B7280] hover:text-[#E5E7EB]'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Statistics ── */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1">Statistics</h3>

        {/* Row 1: Price + Liquidity */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Price</p>
            <p className="font-bold text-[14px] text-[#E5E7EB]">{priceDisplay}</p>
          </div>
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Liquidity</p>
            <p className="font-bold text-[14px] text-[#E5E7EB]">STON.fi DEX</p>
          </div>
        </div>

        {/* Row 2: Contract + Network */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Contract</p>
            <p className="font-bold text-[14px] text-[#E5E7EB] break-all">
              {data.contract_address ? truncate(data.contract_address) : '—'}
            </p>
          </div>
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Network</p>
            <p className="font-bold text-[14px] text-[#E5E7EB]">TON Blockchain</p>
          </div>
        </div>

        {/* Row 3: About (full width) */}
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1.5">About</p>
          <p className="font-medium text-[14px] text-[#E5E7EB] leading-relaxed">
            {getTokenDescription(data.symbol)}
          </p>
        </div>
      </div>

      <div className="h-6"></div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpRight } from 'lucide-react';
import { fetchStakingAPY } from '../services/tonstakers';
import { SkeletonLine } from './Skeleton';

type StakingData = Awaited<ReturnType<typeof fetchStakingAPY>>;

const COMPOUND_PERIODS = [
  { label: '1 Month',  months: 1  },
  { label: '3 Months', months: 3  },
  { label: '6 Months', months: 6  },
  { label: '1 Year',   months: 12 },
];

const POOL_COLORS = [
  ['bg-[#7354F2]', 'bg-[#0180FF]'],
  ['bg-[#0180FF]', 'bg-[#00D395]'],
  ['bg-gray-500',  'bg-[#0180FF]'],
  ['bg-[#00D395]', 'bg-[#0180FF]'],
  ['bg-[#EAB308]', 'bg-[#0180FF]'],
];

const FALLBACK_POOLS = [
  { pair: 'STON / TON',   apy: '24.5%', tvl: '$12.4M', color1: 'bg-[#7354F2]', color2: 'bg-[#0180FF]' },
  { pair: 'TON / USDT',   apy: '18.2%', tvl: '$8.1M',  color1: 'bg-[#0180FF]', color2: 'bg-[#00D395]' },
  { pair: 'tsTON / TON',  apy: '12.7%', tvl: '$5.3M',  color1: 'bg-gray-500',  color2: 'bg-[#0180FF]' },
  { pair: 'USDT / TON',   apy: '15.2%', tvl: '$45.1M', color1: 'bg-[#00D395]', color2: 'bg-[#0180FF]' },
  { pair: 'NOT / TON',    apy: '45.8%', tvl: '$8.2M',  color1: 'bg-[#EAB308]', color2: 'bg-[#0180FF]' },
];

interface Pool { pair: string; apy: string; tvl: string; color1: string; color2: string; }

export default function EarnTab() {
  const [stakingData, setStakingData] = useState<StakingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tonAmount, setTonAmount] = useState('');
  const [pools, setPools] = useState<Pool[]>(FALLBACK_POOLS);
  const [poolsLoading, setPoolsLoading] = useState(true);

  useEffect(() => {
    fetchStakingAPY()
      .then(setStakingData)
      .finally(() => setLoading(false));

    axios.get<{ pool_list?: Record<string, unknown>[] }>('https://api.ston.fi/v1/pools?limit=10')
      .then(({ data }) => {
        const list = data.pool_list ?? [];
        console.log('First pool:', JSON.stringify(list[0]));
        if (!list.length) return;
        const mapped: Pool[] = list.map((p, i) => {
          const sym0 = String(p.token0_symbol ?? p.token0_name ?? '???');
          const sym1 = String(p.token1_symbol ?? p.token1_name ?? '???');
          const apyRaw = p.apy_1d ?? p.apy ?? p.apy_30d;
          const apyStr = apyRaw != null ? `${parseFloat(String(apyRaw)).toFixed(1)}%` : '—';
          const tvlRaw = p.lp_total_supply_usd ?? p.tvl_usd ?? p.total_value_locked;
          const tvlNum = tvlRaw != null ? parseFloat(String(tvlRaw)) : null;
          const tvlStr = tvlNum != null
            ? tvlNum >= 1e6 ? `$${(tvlNum / 1e6).toFixed(1)}M`
            : tvlNum >= 1e3 ? `$${(tvlNum / 1e3).toFixed(1)}K`
            : `$${tvlNum.toFixed(0)}`
            : '—';
          const [color1, color2] = POOL_COLORS[i % POOL_COLORS.length];
          return { pair: `${sym0} / ${sym1}`, apy: apyStr, tvl: tvlStr, color1, color2 };
        });
        // Fall back to hardcoded if API didn't return token symbols
        const hasRealSymbols = mapped.some(p => !p.pair.includes('???'));
        setPools(hasRealSymbols ? mapped : FALLBACK_POOLS);
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setPoolsLoading(false));
  }, []);

  const apy = stakingData?.apy ?? 0;
  const tstonRate = stakingData?.tston_rate ?? 1;
  const amount = parseFloat(tonAmount) || 0;
  const yearlyTON = amount * (apy / 100);
  const yearlyTsTON = tstonRate > 0 ? yearlyTON / tstonRate : yearlyTON;
  const tonPriceUSD = 5.23;
  const yearlyUSD = yearlyTON * tonPriceUSD;

  return (
    <div className="p-5 space-y-6">
      <h1 className="text-[24px] font-bold text-white mb-2 leading-none">Earn</h1>

      {/* Staking Section */}
      <div>
        <h2 className="text-[11px] font-bold text-[#6B7280] mb-3 uppercase tracking-widest">Staking</h2>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#0180FF] rounded-[10px] flex items-center justify-center font-bold text-[14px] text-white tracking-tighter">
                ts
              </div>
              <div>
                <h3 className="font-bold text-[14px] text-[#E5E7EB] leading-none">tsTON</h3>
                <p className="text-[11px] text-[#3DB1FF] font-medium uppercase tracking-widest mt-1.5">Tonstakers</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#6B7280] uppercase font-bold tracking-widest mb-1.5">APY</p>
              {loading ? (
                <div className="animate-pulse">
                  <SkeletonLine width="w-14" height="h-6" />
                </div>
              ) : (
                <p className="font-bold text-[#3DB1FF] text-[18px] leading-none">{apy.toFixed(1)}%</p>
              )}
            </div>
          </div>

          <div className="h-px bg-[rgba(255,255,255,0.08)] mb-6 -mx-4 w-[calc(100%+2rem)]"></div>

          {/* Staking Calculator */}
          <div className="space-y-4">
            <p className="text-[14px] font-bold text-[#E5E7EB]">Staking Calculator</p>
            <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex items-center p-1.5 focus-within:border-[#0180FF] transition-colors">
              <input
                type="number"
                placeholder="Enter TON amount"
                value={tonAmount}
                onChange={(e) => setTonAmount(e.target.value)}
                className="bg-transparent pl-3 pr-2 py-2 flex-1 text-[14px] text-[#E5E7EB] font-bold outline-none placeholder:text-[#6B7280]"
              />
              <div className="text-[11px] font-bold bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-[8px] text-[#E5E7EB] mr-1 tracking-widest">TON</div>
            </div>
            <div className="flex justify-between text-[11px] text-[#6B7280] px-1 py-1">
              <span className="font-bold uppercase tracking-widest">Yearly yield</span>
              <span className="font-bold text-[#E5E7EB] tracking-wide">
                ~{yearlyTsTON.toFixed(2)} tsTON (${yearlyUSD.toFixed(2)})
              </span>
            </div>
            <button
              className="w-full bg-[#0180FF] hover:bg-[#3DB1FF] text-white font-bold py-3 rounded-[12px] text-[14px] transition-all tracking-wide mt-2 active:scale-[0.98]"
              style={{ boxShadow: '0 0 20px rgba(1, 128, 255, 0.4)' }}
            >
              Simulate
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.08)] my-5 -mx-4 w-[calc(100%+2rem)]"></div>

          {/* Compound Calculator */}
          <div className="space-y-3">
            <p className="text-[14px] font-bold text-[#E5E7EB]">Compound Growth</p>
            <div className="grid grid-cols-2 gap-2">
              {COMPOUND_PERIODS.map(({ label, months }) => {
                const earnedTON = amount > 0 && apy > 0
                  ? amount * (Math.pow(1 + apy / 100 / 12, months) - 1)
                  : null;
                const earnedTsTON = earnedTON != null
                  ? (tstonRate > 0 ? earnedTON / tstonRate : earnedTON)
                  : null;
                const earnedUSD = earnedTON != null ? earnedTON * tonPriceUSD : null;

                return (
                  <div
                    key={label}
                    className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3">
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1.5">
                      {label}
                    </p>
                    <p className="text-[14px] font-bold text-[#3DB1FF] leading-none">
                      {earnedTsTON != null ? `+${earnedTsTON.toFixed(3)} tsTON` : '—'}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      {earnedUSD != null ? `$${earnedUSD.toFixed(2)}` : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Pools Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Liquidity Pools</h2>
          <button
            onClick={() => window.open('https://app.ston.fi', '_blank')}
            className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#3DB1FF] transition-colors">
            Powered by STON.fi
            <ArrowUpRight size={11} />
          </button>
        </div>
        {poolsLoading ? (
          <p className="text-[#6B7280] text-[14px] text-center py-4">Loading pools...</p>
        ) : (
        <div className="space-y-2.5">
          {pools.map((pool, i) => (
            <div
              key={i}
              onClick={() => window.open('https://app.ston.fi/pools', '_blank')}
              className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors h-[72px]">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  <div className={`w-8 h-8 rounded-full ${pool.color1} border-2 border-[#1A1A2E] z-10 flex items-center justify-center text-white text-[10px] font-bold tracking-tighter`}>
                    {pool.pair.split(' / ')[0].substring(0, 3)}
                  </div>
                  <div className={`w-8 h-8 rounded-full ${pool.color2} border-2 border-[#1A1A2E] flex items-center justify-center text-white text-[10px] font-bold tracking-tighter`}>
                    {pool.pair.split(' / ')[1].substring(0, 3)}
                  </div>
                </div>
                <h3 className="font-bold text-[14px] text-[#E5E7EB] tracking-wide">{pool.pair}</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="font-bold text-[#00D395] text-[14px] tracking-wide">{pool.apy}</span>
                  <span className="text-[11px] text-[#6B7280] font-bold uppercase tracking-widest mt-0.5">TVL {pool.tvl}</span>
                </div>
                <ArrowUpRight size={16} className="text-[#6B7280] shrink-0" />
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      <div className="h-4"></div>
    </div>
  );
}

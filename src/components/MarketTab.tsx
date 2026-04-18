import { Search, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import TokenDetail from './TokenDetail';
import { fetchTopTokens, Token } from '../services/stonfi';

const Sparkline = ({ isPositive }: { isPositive: boolean }) => {
  const color = isPositive ? '#00D395' : '#FF4D4D';
  const points = isPositive
    ? "0,20 10,15 20,22 30,10 40,12 50,2"
    : "0,5 10,8 20,3 30,15 40,12 50,22";

  return (
    <svg width="48" height="24" viewBox="0 0 50 24" className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

type DisplayToken = Token & { change: string };

export default function MarketTab() {
  const [selectedToken, setSelectedToken] = useState<DisplayToken | null>(null);
  const [tokens, setTokens] = useState<DisplayToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopTokens()
      .then((data) => setTokens(data.map((t) => ({ ...t, change: 'N/A' }))))
      .finally(() => setLoading(false));
  }, []);

  if (selectedToken) {
    return <TokenDetail token={selectedToken} onBack={() => setSelectedToken(null)} />;
  }

  return (
    <div className="p-5 flex flex-col h-full">
      <h1 className="text-[24px] font-bold text-white mb-4 leading-none">Market</h1>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-[#6B7280]" />
        </div>
        <input
          type="text"
          className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#E5E7EB] rounded-[16px] w-full pl-12 pr-4 py-3 placeholder-[#6B7280] focus:outline-none focus:border-[#0180FF] transition-colors"
          placeholder="Search tokens..."
        />
      </div>

      {/* Token List */}
      <div className="flex-1 pb-4">
        <div className="flex justify-between items-center text-[11px] uppercase tracking-widest font-semibold text-[#6B7280] px-2 mb-3">
          <span>Asset</span>
          <span>Price / 24h</span>
        </div>

        {loading ? (
          <p className="text-[#6B7280] text-[14px] text-center mt-8">Loading...</p>
        ) : (
          <div className="space-y-[20px]">
            {tokens.map((token) => {
              const isPositive = token.change.startsWith('+');
              const priceNum = parseFloat(token.dex_price_usd);
              const priceDisplay = Number.isFinite(priceNum)
                ? priceNum < 0.01
                  ? `$${priceNum.toFixed(6)}`
                  : `$${priceNum.toFixed(2)}`
                : token.dex_price_usd;

              return (
                <div
                  key={token.symbol}
                  className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] px-4 py-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setSelectedToken(token)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center font-bold text-[13px] bg-[#374151] text-white overflow-hidden">
                      {token.image_url
                        ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover rounded-full" />
                        : <Circle size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#E5E7EB]">{token.symbol}</h3>
                      <p className="text-[11px] text-[#6B7280]">{token.display_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div>
                      <Sparkline isPositive={isPositive} />
                    </div>
                    <div className="text-right w-[72px] flex flex-col items-end">
                      <p className="font-bold text-[14px] text-[#E5E7EB] tracking-wide">{priceDisplay}</p>
                      {token.change === 'N/A' ? (
                        <div className="mt-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-widest bg-[#374151] text-[#6B7280]">
                          N/A
                        </div>
                      ) : (
                        <div className={`mt-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-widest ${isPositive ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FF4D4D]/10 text-[#FF4D4D]'}`}>
                          {token.change}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

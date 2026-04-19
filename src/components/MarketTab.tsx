import { Search, Circle, Star } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TokenDetail, { symbolHashValue } from './TokenDetail';
import { fetchTopTokens, Token } from '../services/stonfi';
import { SkeletonLine } from './Skeleton';

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDE']);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>(
    () => {
      try {
        return JSON.parse(localStorage.getItem('toniq_watchlist') || '[]');
      } catch {
        return [];
      }
    }
  );

  // Keep watchlist symbols in a Set for O(1) lookup
  const watchlistSet = useMemo(() => new Set(watchlist), [watchlist]);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const next = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      localStorage.setItem('toniq_watchlist', JSON.stringify(next));
      return next;
    });
  };

  // Sparkline direction: uses same hash as TokenDetail chart so they always agree
  const sparklineDirection = useMemo(() => {
    const map: Record<string, boolean> = {};
    tokens.forEach((t) => { map[t.symbol] = symbolHashValue(t.symbol) % 2 === 0; });
    return map;
  }, [tokens]);

  // Top 3 non-stablecoin tokens by highest price
  const trending = useMemo(() => {
    return [...tokens]
      .filter(t => !STABLECOINS.has(t.symbol.toUpperCase()))
      .sort((a, b) => parseFloat(b.dex_price_usd) - parseFloat(a.dex_price_usd))
      .slice(0, 3);
  }, [tokens]);

  // Watchlisted tokens that are currently loaded
  const watchlistedTokens = useMemo(
    () => tokens.filter(t => watchlistSet.has(t.symbol)),
    [tokens, watchlistSet]
  );

  useEffect(() => {
    (async () => {
      const [data] = await Promise.all([
        fetchTopTokens(),
        new Promise(resolve => setTimeout(resolve, 800)),
      ]);
      setTokens(data.map((t) => ({ ...t, change: 'N/A' })));
      setLoading(false);
    })();
  }, []);

  if (selectedToken) {
    return <TokenDetail token={selectedToken} onBack={() => setSelectedToken(null)} />;
  }

  const formatPrice = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return raw;
    return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(2)}`;
  };

  const filteredTokens = tokens.filter((t) => {
    const q = searchQuery.toLowerCase();
    return !q || t.symbol.toLowerCase().includes(q) || t.display_name.toLowerCase().includes(q);
  });

  return (
    <div className="p-5 flex flex-col h-full">
      <h1 className="text-[24px] font-bold text-white mb-4 leading-none">Market</h1>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-[#6B7280]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#E5E7EB] rounded-[16px] w-full pl-12 pr-4 py-3 placeholder-[#6B7280] focus:outline-none focus:border-[#0180FF] transition-colors"
          placeholder="Search tokens..."
        />
      </div>

      {/* ⭐ Watchlist chips */}
      {!loading && watchlistedTokens.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2 px-1">
            ⭐ Watchlist
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {watchlistedTokens.map(token => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => setSelectedToken(token)}
                className="flex-shrink-0 bg-[#1A1A2E] border border-[#FFB800]/30 rounded-full px-3 py-1.5 flex items-center gap-2 active:scale-95 transition-transform hover:border-[#FFB800]/60">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#374151] flex items-center justify-center flex-shrink-0">
                  {token.image_url
                    ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover" />
                    : <Circle size={12} strokeWidth={2} className="text-[#6B7280]" />}
                </div>
                <span className="text-[13px] font-bold text-[#E5E7EB]">{token.symbol}</span>
                <span className="text-[12px] text-[#FFB800]">{formatPrice(token.dex_price_usd)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 Trending */}
      {!loading && trending.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2 px-1">🔥 Trending</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {trending.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => setSelectedToken(token)}
                className="flex-shrink-0 bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-full px-3 py-1.5 flex items-center gap-2 active:scale-95 transition-transform hover:border-[#0180FF]/40">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#374151] flex items-center justify-center flex-shrink-0">
                  {token.image_url
                    ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover" />
                    : <Circle size={12} strokeWidth={2} className="text-[#6B7280]" />}
                </div>
                <span className="text-[13px] font-bold text-[#E5E7EB]">{token.symbol}</span>
                <span className="text-[12px] text-[#6B7280]">{formatPrice(token.dex_price_usd)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="flex-1 pb-4">
        <div className="flex justify-between items-center text-[11px] uppercase tracking-widest font-semibold text-[#6B7280] px-2 mb-3">
          <span>Asset</span>
          <span>Price / 24h</span>
        </div>

        {loading ? (
          <div className="space-y-[20px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] px-4 py-5 flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-[40px] h-[40px] rounded-full bg-[#2A2A3E] shrink-0" />
                  <div className="space-y-2">
                    <SkeletonLine width="w-14" height="h-3.5" />
                    <SkeletonLine width="w-20" height="h-3" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-6 bg-[#2A2A3E] rounded-[6px]" />
                  <div className="flex flex-col items-end space-y-2 w-[72px]">
                    <SkeletonLine width="w-full" height="h-3.5" />
                    <SkeletonLine width="w-8" height="h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-[20px]">
            {filteredTokens.length === 0 && (
              <p className="text-[#6B7280] text-[14px] text-center mt-8">No tokens found</p>
            )}
            {filteredTokens.map((token, index) => {
              const isPositive = sparklineDirection[token.symbol] ?? true;
              const isStarred = watchlistSet.has(token.symbol);

              return (
                <div
                  key={index}
                  className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setSelectedToken(token)}
                >
                  {/* Left: avatar + name */}
                  <div className="flex items-center space-x-4">
                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center font-bold text-[13px] bg-[#374151] text-white overflow-hidden shrink-0">
                      {token.image_url
                        ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover rounded-full" />
                        : <Circle size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#E5E7EB]">{token.symbol}</h3>
                      <p className="text-[11px] text-[#6B7280]">{token.display_name}</p>
                    </div>
                  </div>

                  {/* Right: sparkline + price + star */}
                  <div className="flex items-center gap-2">
                    <Sparkline isPositive={isPositive} />

                    <div className="text-right w-[72px] flex flex-col items-end">
                      <p className="font-bold text-[14px] text-[#E5E7EB] tracking-wide">
                        {formatPrice(token.dex_price_usd)}
                      </p>
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

                    {/* Star / watchlist toggle — stopPropagation prevents row navigation */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleWatchlist(token.symbol);
                      }}
                      className={`p-2 rounded-full transition-colors active:scale-90 shrink-0 ${
                        isStarred
                          ? 'text-[#FFB800]'
                          : 'text-[#374151] hover:text-[#FFB800]'
                      }`}
                      aria-label={isStarred ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <Star
                        size={18}
                        strokeWidth={2}
                        className={isStarred ? 'fill-[#FFB800]' : 'fill-none'}
                      />
                    </button>
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

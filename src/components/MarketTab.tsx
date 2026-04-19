import { Search, Star } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import TokenDetail, { symbolHashValue } from './TokenDetail';
import { fetchTopTokens, Token } from '../services/stonfi';
import { SkeletonLine } from './Skeleton';
import { useCurrency, formatTokenPrice } from '../context/CurrencyContext';

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDE']);

const AVATAR_COLORS = [
  '#0180FF', '#7354F2', '#00D395', '#FF4D4D', '#FFB800',
  '#3DB1FF', '#FF6B35', '#A855F7', '#10B981', '#F59E0B',
];

const Sparkline = ({ isPositive }: { isPositive: boolean }) => {
  const color = isPositive ? '#00D395' : '#FF4D4D';
  const points = isPositive
    ? '0,20 10,15 20,22 30,10 40,12 50,2'
    : '0,5 10,8 20,3 30,15 40,12 50,22';
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
  const { currency } = useCurrency();

  const [selectedToken, setSelectedToken] = useState<DisplayToken | null>(null);
  const [tokens, setTokens] = useState<DisplayToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Watchlist ────────────────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('toniq_watchlist') || '[]'); }
    catch { return []; }
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; added: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, added: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, added });
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  };

  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isAdding = !watchlist.includes(symbol);
    setWatchlist(prev => {
      const next = isAdding
        ? [...prev, symbol]
        : prev.filter(s => s !== symbol);
      localStorage.setItem('toniq_watchlist', JSON.stringify(next));
      return next;
    });
    showToast(
      isAdding ? '⭐ Added to watchlist' : 'Removed from watchlist',
      isAdding,
    );
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const sparklineDirection = useMemo(() => {
    const map: Record<string, boolean> = {};
    tokens.forEach(t => { map[t.symbol] = symbolHashValue(t.symbol) % 2 === 0; });
    return map;
  }, [tokens]);

  const trending = useMemo(() =>
    [...tokens]
      .filter(t => !STABLECOINS.has(t.symbol.toUpperCase()))
      .sort((a, b) => parseFloat(b.dex_price_usd) - parseFloat(a.dex_price_usd))
      .slice(0, 3),
    [tokens]);

  const gainers = useMemo(() =>
    [...tokens]
      .filter(t =>
        !STABLECOINS.has(t.symbol.toUpperCase()) &&
        symbolHashValue(t.symbol) % 2 === 0)
      .sort((a, b) => parseFloat(b.dex_price_usd) - parseFloat(a.dex_price_usd))
      .slice(0, 3),
    [tokens]);

  const losers = useMemo(() =>
    [...tokens]
      .filter(t => {
        const p = parseFloat(t.dex_price_usd);
        return (
          !STABLECOINS.has(t.symbol.toUpperCase()) &&
          symbolHashValue(t.symbol) % 2 !== 0 &&
          Number.isFinite(p) &&
          p > 0.001
        );
      })
      .sort((a, b) => parseFloat(a.dex_price_usd) - parseFloat(b.dex_price_usd))
      .slice(0, 3),
    [tokens]);

  const watchlistedTokens = useMemo(
    () => tokens.filter(t => watchlist.includes(t.symbol)),
    [tokens, watchlist]);

  const filteredTokens = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return !q
      ? tokens
      : tokens.filter(t =>
          t.symbol.toLowerCase().includes(q) ||
          t.display_name.toLowerCase().includes(q));
  }, [tokens, searchQuery]);

  useEffect(() => {
    (async () => {
      const [data] = await Promise.all([
        fetchTopTokens(),
        new Promise(resolve => setTimeout(resolve, 800)),
      ]);
      setTokens(data.map(t => ({ ...t, change: 'N/A' })));
      setLoading(false);
    })();
  }, []);

  if (selectedToken) {
    return <TokenDetail token={selectedToken} onBack={() => setSelectedToken(null)} />;
  }

  const price = (raw: string) => formatTokenPrice(parseFloat(raw), currency);

  return (
    <div className="p-5 flex flex-col h-full">

      {/* Search */}
      <div className="relative mb-4 pt-2">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-[#6B7280]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#E5E7EB] rounded-[16px] w-full pl-12 pr-4 py-3 placeholder-[#6B7280] focus:outline-none focus:border-[#0180FF] transition-colors"
          placeholder="Search tokens..."
        />
      </div>

      {/* ⭐ Watchlist chips */}
      {!loading && watchlistedTokens.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2 px-1">⭐ Watchlist</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {watchlistedTokens.map(token => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => setSelectedToken(token)}
                className="flex-shrink-0 bg-[#1A1A2E] border border-[#FFB800]/30 rounded-full px-3 py-1.5 flex items-center gap-2 active:scale-95 transition-transform hover:border-[#FFB800]/60">
                <div
                  className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: token.image_url ? undefined : AVATAR_COLORS[symbolHashValue(token.symbol) % AVATAR_COLORS.length] }}>
                  {token.image_url
                    ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover" />
                    : <span className="text-white text-[7px] font-bold">{token.symbol.slice(0, 2)}</span>}
                </div>
                <span className="text-[13px] font-bold text-[#E5E7EB]">{token.symbol}</span>
                <span className="text-[12px] font-bold text-[#FFB800]">{price(token.dex_price_usd)}</span>
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
            {trending.map(token => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => setSelectedToken(token)}
                className="flex-shrink-0 bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-full px-3 py-1.5 flex items-center gap-2 active:scale-95 transition-transform hover:border-[#0180FF]/40">
                <div
                  className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: token.image_url ? undefined : AVATAR_COLORS[symbolHashValue(token.symbol) % AVATAR_COLORS.length] }}>
                  {token.image_url
                    ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover" />
                    : <span className="text-white text-[7px] font-bold">{token.symbol.slice(0, 2)}</span>}
                </div>
                <span className="text-[13px] font-bold text-[#E5E7EB]">{token.symbol}</span>
                <span className="text-[12px] text-[#6B7280]">{price(token.dex_price_usd)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 📈 Gainers & 📉 Losers */}
      {!loading && gainers.length > 0 && losers.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1">
            📈 Gainers &amp; 📉 Losers
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Gainers */}
            <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-3">
              <p className="text-[11px] font-bold text-[#22C55E] uppercase tracking-widest mb-2.5">
                📈 Gainers
              </p>
              <div className="space-y-2.5">
                {gainers.map(t => (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => setSelectedToken(t)}
                    className="w-full flex justify-between items-center hover:opacity-80 transition-opacity">
                    <span className="text-[13px] font-bold text-[#E5E7EB]">{t.symbol}</span>
                    <span className="text-[12px] font-bold text-[#22C55E]">{price(t.dex_price_usd)}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Losers */}
            <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-3">
              <p className="text-[11px] font-bold text-[#FF4D4D] uppercase tracking-widest mb-2.5">
                📉 Losers
              </p>
              <div className="space-y-2.5">
                {losers.map(t => (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => setSelectedToken(t)}
                    className="w-full flex justify-between items-center hover:opacity-80 transition-opacity">
                    <span className="text-[13px] font-bold text-[#E5E7EB]">{t.symbol}</span>
                    <span className="text-[12px] font-bold text-[#FF4D4D]">{price(t.dex_price_usd)}</span>
                  </button>
                ))}
              </div>
            </div>
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
          <div className="space-y-[10px]">
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
          <div className="space-y-[10px]">
            {filteredTokens.length === 0 && (
              <p className="text-[#6B7280] text-[14px] text-center mt-8">No tokens found</p>
            )}
            {filteredTokens.map((token, index) => {
              const isPositive = sparklineDirection[token.symbol] ?? true;
              const isStarred  = watchlist.includes(token.symbol);

              return (
                <div
                  key={index}
                  className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setSelectedToken(token)}
                >
                  {/* Left: avatar + name */}
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-[40px] h-[40px] rounded-full flex items-center justify-center font-bold text-[13px] text-white overflow-hidden shrink-0"
                      style={{ background: token.image_url ? undefined : AVATAR_COLORS[symbolHashValue(token.symbol) % AVATAR_COLORS.length] }}>
                      {token.image_url
                        ? <img src={token.image_url} alt={token.symbol} className="w-full h-full object-cover rounded-full" />
                        : token.symbol.slice(0, 2)}
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
                        {price(token.dex_price_usd)}
                      </p>
                      {token.change !== 'N/A' && (
                        <div className={`mt-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-widest ${isPositive ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FF4D4D]/10 text-[#FF4D4D]'}`}>
                          {token.change}
                        </div>
                      )}
                    </div>

                    {/* Star — stopPropagation prevents row navigation */}
                    <button
                      type="button"
                      onClick={(e) => toggleWatchlist(token.symbol, e)}
                      className="p-2 z-10 relative"
                    >
                      <Star
                        size={18}
                        className={isStarred ? 'text-[#FFB800]' : 'text-[#6B7280] hover:text-[#FFB800]'}
                        fill={isStarred ? '#FFB800' : 'none'}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Watchlist toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-bold z-50 whitespace-nowrap pointer-events-none transition-opacity ${
          toast.added
            ? 'bg-[#FFB800] text-[#0A0A0F]'
            : 'bg-[#374151] text-[#E5E7EB]'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

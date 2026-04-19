import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Activity, ArrowUp, Coins, Percent, LayoutGrid, Trash2 } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { fetchWalletBalance, fetchTransactions, fetchJettonBalances, JettonBalance } from '../services/tonapi';
import { fetchStakingAPY } from '../services/tonstakers';
import { fetchTopTokens } from '../services/stonfi';
import { SkeletonLine } from './Skeleton';
import { useCurrency, formatPrice } from '../context/CurrencyContext';

type WalletBalance = Awaited<ReturnType<typeof fetchWalletBalance>>;
type TxList = Awaited<ReturnType<typeof fetchTransactions>>;

interface PriceAlert {
  symbol: string;
  targetPrice: number;
  createdAt: number;
}

interface Strategy {
  id: string;
  text: string;
  createdAt: number;
}

function loadAlerts(): PriceAlert[] {
  try {
    return JSON.parse(localStorage.getItem('toniq_alerts') || '[]');
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem('toniq_alerts', JSON.stringify(alerts));
  } catch { /* ignore */ }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(ts: number): string {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type IconComponent = typeof Activity;
function mapAction(type: string): { label: string; Icon: IconComponent; color: string } {
  const lower = type.toLowerCase();
  if (lower.includes('receive')) return { label: 'Received', Icon: ArrowDownRight, color: 'text-[#00D395]' };
  if (lower.includes('send') || lower.includes('transfer')) return { label: 'Sent', Icon: ArrowUpRight, color: 'text-[#FF4D4D]' };
  if (lower.includes('swap') || lower.includes('jetton')) return { label: 'Swapped', Icon: Activity, color: 'text-[#0180FF]' };
  return { label: type.replace(/([A-Z])/g, ' $1').trim() || 'Activity', Icon: Activity, color: 'text-[#E5E7EB]' };
}

interface HomeTabProps {
  onDeFiBriefing: () => void;
}

export default function HomeTab({ onDeFiBriefing }: HomeTabProps) {
  const { currency } = useCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txList, setTxList] = useState<TxList>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [jettonBalances, setJettonBalances] = useState<JettonBalance[]>([]);
  const [loadingJettons, setLoadingJettons] = useState(false);
  const [liveAPY, setLiveAPY] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('toniq_alerts') || '[]');
    } catch { return []; }
  });
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [tonImageUrl, setTonImageUrl] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('toniq_strategies') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    fetchStakingAPY().then((d) => setLiveAPY(d.apy));
  }, []);

  // Fetch live token prices for alert progress bars + TON image
  useEffect(() => {
    fetchTopTokens().then(tokens => {
      const prices: Record<string, number> = {};
      tokens.forEach(t => {
        const p = parseFloat(t.dex_price_usd);
        if (!isNaN(p)) prices[t.symbol.toUpperCase()] = p;
      });
      setTokenPrices(prices);
      const ton = tokens.find(t => t.symbol === 'TON');
      if (ton?.image_url) setTonImageUrl(ton.image_url);
    });
  }, []);

  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      setTxList([]);
      setJettonBalances([]);
      return;
    }

    const address = wallet.account.address;

    (async () => {
      // ── Phase 1: balance + transactions ───────────────────────────────────
      setLoadingData(true);
      try {
        const balanceData = await fetchWalletBalance(address);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const txData = await fetchTransactions(address);
        setBalance(balanceData);
        setTxList(txData);
      } catch (err: unknown) {
        if (!axios.isAxiosError(err) || err.response?.status !== 429) {
          console.error('Wallet data fetch error:', err);
        }
      } finally {
        setLoadingData(false);
      }

      // ── Phase 2: jetton balances (separate, after a gap) ─────────────────
      setLoadingJettons(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const jettons = await fetchJettonBalances(address);
        setJettonBalances(jettons);
      } catch (err: unknown) {
        if (!axios.isAxiosError(err) || err.response?.status !== 429) {
          console.error('Jetton fetch error:', err);
        }
      } finally {
        setLoadingJettons(false);
      }
    })();
  }, [wallet]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const deleteAlert = (createdAt: number) => {
    const updated = alerts.filter(a => a.createdAt !== createdAt);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const deleteStrategy = (id: string) => {
    const updated = strategies.filter(s => s.id !== id);
    setStrategies(updated);
    try { localStorage.setItem('toniq_strategies', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const sharePortfolio = async () => {
    const tonBal = balance ? balance.balance.toFixed(2) : '0.00';
    const usdBal = balance
      ? (balance.usd_value > 0 ? balance.usd_value : balance.balance * 5.24).toFixed(2)
      : '0.00';
    const apy = liveAPY != null ? liveAPY.toFixed(1) : '—';
    const text =
      `My TON Portfolio via TONIQ\nBalance: ${tonBal} TON ($${usdBal})\nStaking APY: ${apy}%\nCheck it out: https://toniq-ten.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copied to clipboard!');
    } catch { /* ignore */ }
  };

  const inviteFriends = async () => {
    const text =
      `🤖 Check out TONIQ — the AI DeFi agent on TON blockchain!\n📊 Real-time prices, staking yields, swap quotes and AI analysis.\n👉 Try it free: https://toniq-ten.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Invite link copied!');
    } catch { /* ignore */ }
  };

  const rawPortfolioUSD = balance
    ? (balance.usd_value > 0 ? balance.usd_value : balance.balance * 5.24)
    : 0;
  const portfolioDisplay = formatPrice(rawPortfolioUSD, currency);

  const tonBalanceDisplay = balance ? balance.balance.toFixed(2) : '—';

  return (
    <div className="p-5 space-y-4">
      {/* Connect Wallet Card */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex justify-between items-center mb-2">
        <div>
          {wallet ? (
            <>
              <p className="text-[14px] text-[#E5E7EB] font-bold">Wallet connected</p>
              <p className="text-[11px] text-[#3DB1FF] tracking-widest uppercase mt-1 font-mono">
                {formatAddress(wallet.account.address)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] text-[#E5E7EB] font-bold">Connect your wallet</p>
              <p className="text-[11px] text-[#6B7280] tracking-widest uppercase mt-1">To access all features</p>
            </>
          )}
        </div>
        {wallet ? (
          <button
            onClick={() => tonConnectUI.disconnect()}
            className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] text-[#6B7280] px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors hover:border-[#FF4D4D] hover:text-[#FF4D4D]">
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => tonConnectUI.openModal()}
            className="bg-[#0180FF] text-white px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors">
            Connect
          </button>
        )}
      </div>

      {/* ── PORTFOLIO (merged: total value + token breakdown) ── */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">Portfolio</h3>
        <div className="glass-card portfolio-glow border border-[#0180FF]/20 rounded-[16px] overflow-hidden divide-y divide-[rgba(255,255,255,0.06)]">

          {/* Total value header */}
          <div className="px-4 py-4">
            <p className="text-[11px] text-[#3DB1FF] uppercase tracking-widest font-semibold mb-1">Total Value</p>
            {loadingData ? (
              <div className="space-y-2 animate-pulse pt-1">
                <SkeletonLine width="w-36" height="h-8" />
                <SkeletonLine width="w-20" height="h-4" />
              </div>
            ) : (
              <>
                <h2 className="text-[32px] font-bold text-white leading-none tracking-tight">{portfolioDisplay}</h2>
                {wallet && balance && (
                  <span className="flex items-center text-[#6B7280] font-medium text-[14px] mt-1">
                    <ArrowUp size={14} className="mr-0.5" />
                    —
                  </span>
                )}
              </>
            )}
          </div>

          {/* Token rows — only when wallet is connected */}
          {wallet && (
            <>
              {/* TON native row */}
              {balance && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#0180FF] overflow-hidden flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {tonImageUrl
                        ? <img src={tonImageUrl} alt="TON" className="w-full h-full object-cover" />
                        : <span>T</span>}
                    </div>
                    <div>
                      <p className="font-bold text-[13px] text-[#E5E7EB]">TON</p>
                      <p className="text-[11px] text-[#6B7280]">{balance.balance.toFixed(2)} TON</p>
                    </div>
                  </div>
                  <p className="font-bold text-[13px] text-[#E5E7EB]">
                    {formatPrice(balance.usd_value > 0 ? balance.usd_value : balance.balance * 5.24, currency)}
                  </p>
                </div>
              )}

              {/* Jetton rows */}
              {loadingJettons ? (
                <div className="px-4 py-3 space-y-3 animate-pulse">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-[#2A2A3E] shrink-0" />
                        <SkeletonLine width="w-16" height="h-3.5" />
                      </div>
                      <SkeletonLine width="w-12" height="h-3.5" />
                    </div>
                  ))}
                </div>
              ) : jettonBalances.length > 0 ? (
                jettonBalances.map(t => (
                  <div key={t.symbol} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-[#374151] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                        {t.image_url
                          ? <img src={t.image_url} alt={t.symbol} className="w-full h-full object-cover" />
                          : <span>{t.symbol.slice(0, 2)}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-[13px] text-[#E5E7EB]">{t.symbol}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {t.balance >= 1 ? t.balance.toFixed(2) : t.balance.toFixed(4)} {t.symbol}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-[13px] text-[#E5E7EB]">
                      {formatPrice(t.usd_value, currency)}
                    </p>
                  </div>
                ))
              ) : balance ? (
                <p className="text-[13px] text-[#6B7280] text-center px-4 py-3">No tokens found</p>
              ) : null}
            </>
          )}

        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDeFiBriefing}
          className="bg-[#0180FF] text-white rounded-[12px] py-3 text-[13px] font-bold transition-all hover:bg-[#3DB1FF] active:scale-[0.98]"
          style={{ boxShadow: '0 0 16px rgba(1,128,255,0.35)' }}>
          📊 Get DeFi Briefing
        </button>
        <button
          onClick={sharePortfolio}
          className="bg-transparent border border-[#0180FF] text-[#0180FF] rounded-[12px] py-3 text-[13px] font-bold transition-all hover:bg-[#0180FF]/10 active:scale-[0.98]">
          🔗 Share Portfolio
        </button>
      </div>
      <button
        onClick={inviteFriends}
        className="w-full text-[#6B7280] border border-[rgba(255,255,255,0.08)] rounded-[12px] py-2.5 text-[13px] font-medium transition-all hover:bg-white/[0.04] active:scale-[0.98]">
        👥 Invite friends to TONIQ
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <Coins size={18} className="text-[#E5E7EB] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">TON</p>
          <p className="font-semibold text-[14px] text-[#E5E7EB] text-center">{tonBalanceDisplay}</p>
        </div>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <Percent size={18} className="text-[#7354F2] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">APY</p>
          <p className="font-semibold text-[14px] text-[#7354F2] text-center">
            {liveAPY != null ? `${liveAPY.toFixed(1)}%` : '...'}
          </p>
        </div>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <LayoutGrid size={18} className="text-[#E5E7EB] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">Assets</p>
          <p className="font-semibold text-[14px] text-[#E5E7EB] text-center">{wallet ? txList.length : '—'}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">Recent Activity</h3>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 divide-y divide-[rgba(255,255,255,0.08)]">
          {!wallet ? (
            <p className="text-[14px] text-[#6B7280] text-center py-4">Connect wallet to see activity</p>
          ) : loadingData ? (
            <p className="text-[14px] text-[#6B7280] text-center py-4">Loading...</p>
          ) : txList.length === 0 ? (
            <p className="text-[14px] text-[#6B7280] text-center py-4">No recent activity</p>
          ) : (
            txList.slice(0, 5).map((tx, i) => {
              const { label, Icon, color } = mapAction(tx.actions.type);
              const amountTON = tx.actions.amount !== null ? (tx.actions.amount / 1e9).toFixed(2) : null;
              const amountDisplay = amountTON ? `${amountTON} TON` : label;
              const isExpanded = expandedId === tx.event_id;
              const items = txList.slice(0, 5);

              return (
                <div
                  key={tx.event_id}
                  onClick={() => setExpandedId(isExpanded ? null : tx.event_id)}
                  className={`${i === 0 ? 'pb-3' : i === items.length - 1 ? 'pt-3' : 'py-3'} cursor-pointer flex flex-col transition-colors hover:bg-white/[0.02] -mx-2 px-2 rounded-[12px]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#0A0A0F] rounded-full flex items-center justify-center">
                        <Icon size={14} className={color} />
                      </div>
                      <div>
                        <p className="font-bold text-[14px] text-[#E5E7EB]">{label}</p>
                        <p className="text-[11px] text-[#6B7280] uppercase tracking-widest mt-1">
                          {formatTimestamp(tx.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-[14px] ${color}`}>{amountDisplay.split(' ')[0]}</p>
                      <p className="text-[11px] text-[#6B7280] uppercase tracking-widest mt-1">TON</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] text-[12px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280] tracking-wide font-medium">Event ID</span>
                        <span className="text-[#3DB1FF] font-mono bg-[#0180FF]/10 px-2.5 py-1 rounded-[6px] text-[11px] tracking-tight">
                          {tx.event_id.slice(0, 20)}…
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map(alert => {
              const currentPrice = tokenPrices[alert.symbol.toUpperCase()] ?? 0;
              const pct = currentPrice > 0
                ? Math.min(100, (currentPrice / alert.targetPrice) * 100)
                : 0;
              const triggered = currentPrice > 0 && currentPrice >= alert.targetPrice;

              return (
                <div
                  key={alert.createdAt}
                  className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[14px] text-[#E5E7EB]">
                      {alert.symbol} → {formatPrice(alert.targetPrice, currency)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        triggered
                          ? 'bg-[#22C55E]/10 text-[#22C55E]'
                          : 'bg-[#374151] text-[#6B7280]'
                      }`}>
                        {triggered ? '🔔 Triggered!' : 'Watching'}
                      </span>
                      <button
                        onClick={() => deleteAlert(alert.createdAt)}
                        className="text-[#6B7280] hover:text-[#FF4D4D] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#6B7280] mb-2">
                    Current: {currentPrice > 0 ? formatPrice(currentPrice, currency) : '—'}
                  </p>
                  <div className="w-full bg-[#374151] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${triggered ? 'bg-[#22C55E]' : 'bg-[#0180FF]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Strategies */}
      {strategies.length > 0 && (
        <div>
          <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">My Strategies</h3>
          <div className="space-y-2">
            {strategies.map(strategy => (
              <div
                key={strategy.id}
                className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#E5E7EB] font-medium leading-relaxed">
                      {strategy.text.length > 60 ? `${strategy.text.slice(0, 60)}…` : strategy.text}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      {formatTimestamp(Math.floor(strategy.createdAt / 1000))}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteStrategy(strategy.id)}
                    className="text-[#6B7280] hover:text-[#FF4D4D] transition-colors mt-0.5 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[#22C55E] text-white px-4 py-2 rounded-full text-[13px] font-bold z-50 whitespace-nowrap">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

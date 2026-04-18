import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, ArrowUp, Coins, Percent, LayoutGrid } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { fetchWalletBalance, fetchTransactions } from '../services/tonapi';

type WalletBalance = Awaited<ReturnType<typeof fetchWalletBalance>>;
type TxList = Awaited<ReturnType<typeof fetchTransactions>>;

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

export default function HomeTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txList, setTxList] = useState<TxList>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      setTxList([]);
      return;
    }
    setLoadingData(true);
    const address = wallet.account.address;
    Promise.all([fetchWalletBalance(address), fetchTransactions(address)])
      .then(([bal, txs]) => {
        setBalance(bal);
        setTxList(txs);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [wallet]);

  const portfolioDisplay = loadingData
    ? '...'
    : balance
    ? `$${balance.usd_value > 0 ? balance.usd_value.toFixed(2) : (balance.balance * 5.24).toFixed(2)}`
    : '$0.00';

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

      {/* Portfolio Card */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
        <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Portfolio Value</p>
        <div className="flex flex-col space-y-1">
          <h2 className="text-[28px] font-bold text-white leading-none tracking-tight">{portfolioDisplay}</h2>
          {wallet && balance && (
            <span className="flex items-center text-[#6B7280] font-medium text-[14px]">
              <ArrowUp size={14} className="mr-0.5" />
              —
            </span>
          )}
        </div>
      </div>

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
          <p className="font-semibold text-[14px] text-[#7354F2] text-center">4.2%</p>
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
    </div>
  );
}

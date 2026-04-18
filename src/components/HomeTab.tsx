import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, ArrowUp, Coins, Percent, LayoutGrid } from 'lucide-react';

export default function HomeTab() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const recentActivity = [
    { 
      id: 1, type: 'Received', amount: '+10 TON', value: '$52.30', date: 'Today', icon: ArrowDownRight, color: 'text-[#00D395]',
      detailLabel: 'From Address', detailValue: 'EQB4zXqw2y_a9sJ1k8z3f'
    },
    { 
      id: 2, type: 'Swapped', amount: '100 USDT → TON', value: '$100.00', date: 'Yesterday', icon: Activity, color: 'text-[#0180FF]',
      detailLabel: 'Exact Amount', detailValue: '100.00 USDT → 19.12 TON'
    },
    { 
      id: 3, type: 'Sent', amount: '-2 TON', value: '$10.46', date: 'Oct 24', icon: ArrowUpRight, color: 'text-[#FF4D4D]',
      detailLabel: 'To Address', detailValue: 'EQC9xT8p2xRb8kVp2xR9m'
    }
  ];

  return (
    <div className="p-5 space-y-4">
      {/* Connect Wallet Card */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex justify-between items-center mb-2">
        <div>
          <p className="text-[14px] text-[#E5E7EB] font-bold">Connect your wallet</p>
          <p className="text-[11px] text-[#6B7280] tracking-widest uppercase mt-1">To access all features</p>
        </div>
        <button className="bg-[#0180FF] text-white px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors">
          Connect
        </button>
      </div>

      {/* Portfolio Card */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
        <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Portfolio Value</p>
        <div className="flex flex-col space-y-1">
          <h2 className="text-[28px] font-bold text-white leading-none tracking-tight">$1,284.42</h2>
          <span className="flex items-center text-[#22C55E] font-medium text-[14px]">
            <ArrowUp size={14} className="mr-0.5" />
            +4.21% ($51.80)
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <Coins size={18} className="text-[#E5E7EB] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">TON</p>
          <p className="font-semibold text-[14px] text-[#E5E7EB] text-center">$5.24</p>
        </div>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <Percent size={18} className="text-[#7354F2] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">APY</p>
          <p className="font-semibold text-[14px] text-[#7354F2] text-center">4.2%</p>
        </div>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col items-center justify-center">
          <LayoutGrid size={18} className="text-[#E5E7EB] mb-2" />
          <p className="text-[11px] text-[#6B7280] uppercase tracking-widest text-center mb-1 font-semibold">Assets</p>
          <p className="font-semibold text-[14px] text-[#E5E7EB] text-center">8</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">Recent Activity</h3>
        <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 divide-y divide-[rgba(255,255,255,0.08)]">
          {recentActivity.map((item, i) => {
            const isExpanded = expandedId === item.id;
            return (
            <div 
              key={item.id} 
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              className={`${i === 0 ? 'pb-3' : i === recentActivity.length - 1 ? 'pt-3' : 'py-3'} cursor-pointer flex flex-col transition-colors hover:bg-white/[0.02] -mx-2 px-2 rounded-[12px]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#0A0A0F] rounded-full flex items-center justify-center">
                    <item.icon size={14} className={item.color} />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-[#E5E7EB]">{item.type}</p>
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-widest mt-1">{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-[14px] ${item.amount.startsWith('+') ? 'text-[#00D395]' : item.amount.startsWith('-') ? 'text-[#FF4D4D]' : 'text-[#E5E7EB]'}`}>{item.amount.split(' ')[0]}</p>
                  <p className="text-[11px] text-[#6B7280] uppercase tracking-widest mt-1">{item.value}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] text-[12px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280] tracking-wide font-medium">{item.detailLabel}</span>
                    <span className="text-[#3DB1FF] font-mono bg-[#0180FF]/10 px-2.5 py-1 rounded-[6px] text-[11px] tracking-tight">{item.detailValue}</span>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

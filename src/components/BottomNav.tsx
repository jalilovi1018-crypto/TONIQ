import { Home, BarChart2, MessageSquare, Coins } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'market', icon: BarChart2, label: 'Market' },
    { id: 'toniq', icon: MessageSquare, label: 'TONIQ' },
    { id: 'earn', icon: Coins, label: 'Earn' },
  ];

  return (
    <div className="absolute bottom-0 w-full bg-[#0A0A0F] border-t border-[rgba(255,255,255,0.08)] px-2 pb-5 pt-3 flex justify-around items-center z-50 h-[72px]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center justify-center space-y-1 w-16 pt-1 ${
              isActive ? 'text-[#0180FF]' : 'text-[#6B7280]'
            }`}
          >
            {isActive && <div className="absolute top-[-13px] left-0 right-0 h-[2px] bg-[#0180FF]" />}
            <item.icon size={24} />
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { Settings } from 'lucide-react';
import BottomNav from './components/BottomNav';
import HomeTab from './components/HomeTab';
import MarketTab from './components/MarketTab';
import AgentTab from './components/AgentTab';
import EarnTab from './components/EarnTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('toniq');

  return (
    <div className="flex justify-center min-h-[100dvh] bg-black font-sans text-white items-center sm:py-8">
      <div className="w-full h-[100dvh] sm:h-[844px] sm:max-w-[390px] relative flex flex-col bg-[#0A0A0F] overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-bg-surface sm:shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* BRAND ACCENT LINE */}
        <div className="w-full h-[2px] bg-gradient-to-r from-[#0180FF] to-[#7354F2] shrink-0"></div>

        {/* UNIFIED HEADER */}
        <div className="flex justify-between items-center px-5 py-4 bg-[#0A0A0F] shrink-0 z-20">
          <span className="font-bold text-white text-[20px] tracking-tight">TONIQ</span>
          <Settings className="text-white opacity-100" size={24} strokeWidth={2} />
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth no-scrollbar relative" style={{ paddingBottom: '90px' }}>
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'market' && <MarketTab />}
          {activeTab === 'toniq' && <AgentTab />}
          {activeTab === 'earn' && <EarnTab />}
        </div>
        
        {/* Scroll gradient overlay */}
        <div className="absolute bottom-[72px] left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0F] to-transparent pointer-events-none z-40"></div>
        
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

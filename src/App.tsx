import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import BottomNav from './components/BottomNav';
import HomeTab from './components/HomeTab';
import MarketTab from './components/MarketTab';
import AgentTab from './components/AgentTab';
import EarnTab from './components/EarnTab';
import SettingsTab from './components/SettingsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('toniq');
  const [initialAgentMessage, setInitialAgentMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('toniq_display_name') || ''
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll back to top on every tab switch
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Keep display name in sync when settings closes
  const handleCloseSettings = () => {
    setDisplayName(localStorage.getItem('toniq_display_name') || '');
    setShowSettings(false);
  };

  return (
    <div className="flex justify-center min-h-[100dvh] bg-black font-sans text-white items-center sm:py-8">
      <div className="w-full h-[100dvh] sm:h-[844px] sm:max-w-[390px] relative flex flex-col bg-[#0A0A0F] overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-bg-surface sm:shadow-[0_0_50px_rgba(0,0,0,0.5)]">

        {/* BRAND ACCENT LINE */}
        <div className="w-full h-[2px] bg-gradient-to-r from-[#0180FF] to-[#7354F2] shrink-0"></div>

        {/* UNIFIED HEADER */}
        <div className="flex justify-between items-center px-5 py-4 bg-[#0A0A0F] shrink-0 z-20">
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white text-[20px] tracking-tight">TONIQ</span>
            {displayName && (
              <span className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Hey, {displayName} 👋
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
            <Settings size={18} className="text-[#E5E7EB]" strokeWidth={2} />
          </button>
        </div>

        <div
          key={activeTab}
          ref={contentRef}
          className="flex-1 overflow-y-auto scroll-smooth no-scrollbar relative tab-enter-active"
          style={{ paddingBottom: '90px' }}
        >
          {activeTab === 'home' && (
            <HomeTab
              onDeFiBriefing={() => {
                setInitialAgentMessage('Give me a DeFi briefing');
                setActiveTab('toniq');
              }}
            />
          )}
          {activeTab === 'market' && <MarketTab />}
          {activeTab === 'toniq' && (
            <AgentTab
              initialMessage={initialAgentMessage}
              onClearInitialMessage={() => setInitialAgentMessage('')}
            />
          )}
          {activeTab === 'earn' && <EarnTab />}
        </div>

        {/* Scroll gradient overlay */}
        <div className="absolute bottom-[72px] left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0F] to-transparent pointer-events-none z-40"></div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Settings overlay */}
        {showSettings && <SettingsTab onClose={handleCloseSettings} />}
      </div>
    </div>
  );
}

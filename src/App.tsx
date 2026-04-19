import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import BottomNav from './components/BottomNav';
import HomeTab from './components/HomeTab';
import MarketTab from './components/MarketTab';
import AgentTab from './components/AgentTab';
import EarnTab from './components/EarnTab';
import SettingsTab from './components/SettingsTab';
import { CurrencyProvider } from './context/CurrencyContext';
import { fetchTopTokens } from './services/stonfi';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [initialAgentMessage, setInitialAgentMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('toniq_username') || ''
  );
  const [tonPrice, setTonPrice] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll back to top on every tab switch
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Fetch & refresh TON price every 30 s
  useEffect(() => {
    const update = () => {
      fetchTopTokens().then(tokens => {
        const ton = tokens.find(t => t.symbol === 'TON');
        if (ton) setTonPrice(`$${parseFloat(ton.dex_price_usd).toFixed(2)}`);
      }).catch(() => {/* ignore — price chip just stays empty */});
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-read display name from localStorage when settings closes
  const handleCloseSettings = () => {
    setDisplayName(localStorage.getItem('toniq_username') || '');
    setShowSettings(false);
  };

  return (
    <CurrencyProvider>
      <div className="flex justify-center min-h-[100dvh] bg-black font-sans text-white items-center sm:py-8">
        <div className="w-full h-[100dvh] sm:h-[844px] sm:max-w-[390px] relative flex flex-col bg-[#0A0A0F] overflow-hidden sm:rounded-[40px] sm:border-[8px] sm:border-bg-surface sm:shadow-[0_0_50px_rgba(0,0,0,0.5)]">

          {/* BRAND ACCENT LINE */}
          <div
            className="w-full h-[3px] bg-gradient-to-r from-[#0180FF] via-[#3DB1FF] to-[#7354F2] shrink-0"
            style={{ boxShadow: '0 0 20px rgba(1,128,255,0.4)' }}
          />

          {/* UNIFIED HEADER */}
          <div className="flex justify-between items-center px-5 py-4 bg-[#0A0A0F] shrink-0 z-20">
            {/* Left: logo + greeting */}
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <defs>
                    <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1a8fe0"/>
                      <stop offset="100%" stopColor="#0055aa"/>
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="50" fill="url(#hbg)"/>
                  <polygon points="50,18 69,32 50,36 31,32" fill="white" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="69,32 50,36 59,74 80,53" fill="rgba(255,255,255,0.85)" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="31,32 50,36 41,74 20,53" fill="rgba(255,255,255,0.7)" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="41,74 50,36 59,74 50,81" fill="rgba(255,255,255,0.6)" stroke="#1472c4" strokeWidth="1.5"/>
                </svg>
                <span className="font-bold text-white text-[20px] tracking-tight">TONIQ</span>
              </div>
              {displayName && (
                <span className="text-[11px] text-[#6B7280] font-medium mt-0.5 pl-8">
                  Hey, {displayName} 👋
                </span>
              )}
            </div>

            {/* Right: price ticker pill + settings */}
            <div className="flex items-center gap-2">
              {tonPrice && (
                <div className="flex flex-col leading-none bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                    <span className="text-[12px] font-medium text-[#E5E7EB]">TON — {tonPrice}</span>
                  </div>
                  <span className="text-[10px] text-[#6B7280] mt-[3px]">market price</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
                <Settings size={18} className="text-[#E5E7EB]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* TAB CONTENT */}
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
          <div className="absolute bottom-[72px] left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0F] to-transparent pointer-events-none z-40" />

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Settings full-screen overlay */}
          {showSettings && <SettingsTab onClose={handleCloseSettings} />}
        </div>
      </div>
    </CurrencyProvider>
  );
}

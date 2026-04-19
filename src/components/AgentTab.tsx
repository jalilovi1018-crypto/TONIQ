import { Send, MessageSquare, X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTonWallet } from '@tonconnect/ui-react';
import { askTONIQ } from '../services/gemini';
import { fetchTopTokens, Token } from '../services/stonfi';
import { fetchStakingAPY } from '../services/tonstakers';
import { getSwapQuote } from '../services/omniston';
import { fetchWalletBalance } from '../services/tonapi';

type StakingData = Awaited<ReturnType<typeof fetchStakingAPY>>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageAction {
  type: 'swap' | 'stake' | 'pool';
  label: string;
  url: string;
}

interface Message {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  action?: MessageAction;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

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

interface AgentTabProps {
  initialMessage?: string;
  onClearInitialMessage?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function loadStrategies(): Strategy[] {
  try {
    return JSON.parse(localStorage.getItem('toniq_strategies') || '[]');
  } catch { return []; }
}

function saveStrategies(strategies: Strategy[]) {
  try {
    localStorage.setItem('toniq_strategies', JSON.stringify(strategies));
  } catch { /* ignore */ }
}

function createDefaultChat(): Chat {
  return { id: Date.now().toString(), title: 'New Chat', messages: [], createdAt: Date.now() };
}

function loadPersistedChats(): { chats: Chat[]; activeChatId: string } {
  try {
    const raw = localStorage.getItem('toniq_chats');
    let chats: Chat[] = raw ? JSON.parse(raw) : [];

    // One-time migration from old single-chat storage
    if (chats.length === 0) {
      const oldHistory = localStorage.getItem('toniq_chat_history');
      if (oldHistory) {
        const oldMsgs: Message[] = JSON.parse(oldHistory);
        if (oldMsgs.length > 0) {
          const firstUserMsg = oldMsgs.find(m => m.sender === 'user');
          const migrated: Chat = {
            id: Date.now().toString(),
            title: firstUserMsg ? firstUserMsg.text.slice(0, 30) : 'Previous Chat',
            messages: oldMsgs,
            createdAt: Date.now(),
          };
          chats = [migrated];
        }
      }
    }

    if (chats.length === 0) {
      const def = createDefaultChat();
      return { chats: [def], activeChatId: def.id };
    }

    const savedId = localStorage.getItem('toniq_active_chat');
    const activeId = savedId && chats.find(c => c.id === savedId) ? savedId : chats[0].id;
    return { chats, activeChatId: activeId };
  } catch {
    const def = createDefaultChat();
    return { chats: [def], activeChatId: def.id };
  }
}

function formatChatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Action detection ─────────────────────────────────────────────────────────

function detectAction(text: string): MessageAction | undefined {
  const lower = text.toLowerCase();

  if (/\b(swap|exchange|convert|trade)\b/.test(lower)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+(?:to|for|into|->)\s+([A-Za-z]+)/i);
    const fromToken = m ? m[2].toUpperCase() : 'TON';
    const toToken   = m ? m[3].toUpperCase() : 'USDT';
    const amount    = m ? m[1] : '1';
    return {
      type: 'swap',
      label: '🔄 Execute Swap on STON.fi',
      url: `https://app.ston.fi/swap?ft=${fromToken}&tt=${toToken}&fa=${amount}`,
    };
  }

  if (/\b(stake|staking|yield|tston)\b/.test(lower)) {
    return {
      type: 'stake',
      label: '💎 Stake on Tonstakers',
      url: 'https://app.tonstakers.com/?source=toniq',
    };
  }

  if (/\b(pool|liquidity|lp)\b/.test(lower)) {
    return {
      type: 'pool',
      label: '💧 Add Liquidity on STON.fi',
      url: 'https://app.ston.fi/pools',
    };
  }

  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentTab({ initialMessage, onClearInitialMessage }: AgentTabProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveMarketData, setLiveMarketData] = useState<Token[]>([]);
  const [liveStakingData, setLiveStakingData] = useState<StakingData | null>(null);
  const wallet = useTonWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');

  // Bootstrap from localStorage (runs once)
  useEffect(() => {
    const { chats: loaded, activeChatId: id } = loadPersistedChats();
    setChats(loaded);
    setActiveChatId(id);
  }, []);

  // Persist chats – max 20 (drop oldest by createdAt)
  useEffect(() => {
    if (!chats.length) return;
    try {
      const toSave = chats.length > 20
        ? [...chats].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20)
        : chats;
      localStorage.setItem('toniq_chats', JSON.stringify(toSave));
    } catch { /* storage full */ }
  }, [chats]);

  // Persist active chat ID
  useEffect(() => {
    if (!activeChatId) return;
    try { localStorage.setItem('toniq_active_chat', activeChatId); } catch { /* ignore */ }
  }, [activeChatId]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages: Message[] = activeChat?.messages ?? [];

  // Mutates messages for the currently active chat only
  const setMessages = (updater: ((prev: Message[]) => Message[]) | Message[]) => {
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const next = typeof updater === 'function' ? updater(c.messages) : updater;
      return { ...c, messages: next };
    }));
  };

  const addAgentMsg = (text: string) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'agent', text }]);

  // ── Chat management ────────────────────────────────────────────────────────

  const createNewChat = () => {
    const nc = createDefaultChat();
    setChats(prev => [nc, ...prev]);
    setActiveChatId(nc.id);
    setSidebarOpen(false);
  };

  const switchChat = (id: string) => {
    setActiveChatId(id);
    setSidebarOpen(false);
  };

  const deleteChat = (id: string) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (updated.length === 0) {
        const def = createDefaultChat();
        setActiveChatId(def.id);
        return [def];
      }
      if (id === activeChatId) setActiveChatId(updated[0].id);
      return updated;
    });
  };

  const clearCurrentChat = () => {
    setChats(prev => prev.map(c =>
      c.id === activeChatId ? { ...c, title: 'New Chat', messages: [] } : c
    ));
  };

  // ── Market data + price alerts ─────────────────────────────────────────────

  useEffect(() => {
    Promise.all([fetchTopTokens(), fetchStakingAPY()]).then(([tokens, staking]) => {
      setLiveMarketData(tokens);
      setLiveStakingData(staking);
    });
  }, []);

  useEffect(() => {
    if (!liveMarketData.length) return;
    const alerts = loadAlerts();
    if (!alerts.length) return;

    const remaining: PriceAlert[] = [];
    let anyTriggered = false;

    alerts.forEach(alert => {
      const token = liveMarketData.find(
        t => t.symbol.toUpperCase() === alert.symbol.toUpperCase()
      );
      const currentPrice = token ? parseFloat(token.dex_price_usd) : NaN;
      if (!isNaN(currentPrice) && currentPrice >= alert.targetPrice) {
        anyTriggered = true;
        const cp = currentPrice;
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          sender: 'agent',
          text: `🔔 Alert triggered! ${alert.symbol} has reached $${cp.toFixed(4)} (your target was $${alert.targetPrice.toFixed(2)})`
        }]);
      } else {
        remaining.push(alert);
      }
    });

    if (anyTriggered) saveAlerts(remaining);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMarketData]);

  // ── Scroll ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Initial message from DeFi Briefing ────────────────────────────────────

  useEffect(() => {
    if (initialMessage && liveMarketData.length > 0 && liveStakingData) {
      handleSend(initialMessage);
      onClearInitialMessage?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, liveMarketData, liveStakingData]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const newMsg: Message = { id: Date.now(), sender: 'user', text };

    // Add user message + auto-title on first message in chat
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return {
        ...c,
        title: isFirst ? text.slice(0, 30) : c.title,
        messages: [...c.messages, newMsg],
      };
    }));

    setInputText('');
    setIsTyping(true);

    try {
      // ── Price Alert ──────────────────────────────────────────────────────
      const alertMatch = text.match(/alert.*(when|if).*?([A-Z]{2,6}).*?\$?([\d.]+)/i);
      if (alertMatch) {
        const symbol = alertMatch[2].toUpperCase();
        const targetPrice = parseFloat(alertMatch[3]);
        if (symbol && !isNaN(targetPrice)) {
          const alerts = loadAlerts();
          alerts.push({ symbol, targetPrice, createdAt: Date.now() });
          saveAlerts(alerts);
          addAgentMsg(`✅ Alert set! I'll notify you when ${symbol} reaches $${targetPrice.toFixed(2)}`);
          setIsTyping(false);
          return;
        }
      }

      // ── Strategy Builder ─────────────────────────────────────────────────
      const strategyIntent = /\b(every|weekly|monthly|daily|strategy|plan|automatically|auto)\b/i;
      if (strategyIntent.test(text)) {
        const existing = loadStrategies();
        const newStrategy: Strategy = { id: Date.now().toString(), text, createdAt: Date.now() };
        const updated = [newStrategy, ...existing].slice(0, 5); // max 5
        saveStrategies(updated);
        addAgentMsg(`📋 Strategy saved! I'll track this for you: "${text.slice(0, 60)}"`);
        setIsTyping(false);
        return;
      }

      // ── Portfolio guard ──────────────────────────────────────────────────
      const portfolioIntent = /\b(my portfolio|portfolio|my holdings|my balance|my assets)\b/i;
      if (portfolioIntent.test(text) && !wallet) {
        addAgentMsg('Connect your wallet first to see personalized analysis.');
        setIsTyping(false);
        return;
      }

      let walletBalance = null;
      if (portfolioIntent.test(text) && wallet) {
        try { walletBalance = await fetchWalletBalance(wallet.account.address); } catch { /* ignore */ }
      }

      // ── Token Comparison ─────────────────────────────────────────────────
      let tokenComparison = null;
      const compareMatch = text.match(/compare\s+(\w+)\s+(vs|and|versus)\s+(\w+)/i);
      if (compareMatch) {
        const sym1 = compareMatch[1].toUpperCase();
        const sym2 = compareMatch[3].toUpperCase();
        const t1 = liveMarketData.find(t => t.symbol.toUpperCase() === sym1);
        const t2 = liveMarketData.find(t => t.symbol.toUpperCase() === sym2);
        if (t1 && t2) {
          tokenComparison = {
            token1: { symbol: t1.symbol, price_usd: t1.dex_price_usd, name: t1.display_name },
            token2: { symbol: t2.symbol, price_usd: t2.dex_price_usd, name: t2.display_name },
          };
        }
      }

      // ── Swap quote ───────────────────────────────────────────────────────
      let swapQuote = null;
      if (/\b(swap|exchange|convert|trade)\b/i.test(text)) {
        const m = text.match(/(\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+(?:to|for|into|->)\s+([A-Za-z]+)/i);
        if (m) {
          swapQuote = await getSwapQuote(m[2].toUpperCase(), m[3].toUpperCase(), parseFloat(m[1]));
        } else {
          const sm = text.match(/\b([A-Z]{2,6})\b.*\b(to|for)\b.*\b([A-Z]{2,6})\b/i);
          if (sm) swapQuote = await getSwapQuote(sm[1].toUpperCase(), sm[3].toUpperCase(), 1);
        }
      }

      const topTokens = (liveMarketData || [])
        .slice(0, 20)
        .map(t => ({ symbol: t.symbol, price_usd: t.dex_price_usd, name: t.display_name }));

      const ctx = {
        prices: topTokens,
        stakingAPY: liveStakingData,
        swapQuote,
        ...(walletBalance ? { walletBalance } : {}),
        ...(wallet ? { walletAddress: wallet.account.address } : {}),
        ...(tokenComparison ? { tokenComparison } : {}),
      };

      console.log('context being sent:', ctx);
      const reply = await askTONIQ(text, ctx);
      const action = detectAction(text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'agent',
        text: reply,
        ...(action ? { action } : {}),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'agent',
        text: "Sorry, I couldn't connect right now.",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full pb-[10px] relative overflow-x-hidden">

      {/* ── Sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`absolute top-0 left-0 h-full w-[75%] bg-[#0D0D1A] z-50 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.08)] shrink-0">
          <span className="text-[16px] font-bold text-[#E5E7EB]">Chats</span>
          <div className="flex items-center gap-2">
            <button
              onClick={createNewChat}
              className="flex items-center gap-1.5 bg-[#0180FF] text-white px-3 py-1.5 rounded-[8px] text-[12px] font-bold active:scale-95 transition-transform">
              <Plus size={13} />
              New Chat
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#E5E7EB] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => switchChat(chat.id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-l-2 ${
                chat.id === activeChatId
                  ? 'bg-[#0180FF]/20 border-[#0180FF]'
                  : 'hover:bg-white/[0.04] border-transparent'
              }`}>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[13px] font-semibold text-[#E5E7EB] truncate">{chat.title}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{formatChatDate(chat.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                className="text-[#6B7280] hover:text-[#FF4D4D] transition-colors p-1 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat header ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#E5E7EB] transition-colors">
          <MessageSquare size={20} />
        </button>
        <span className="text-[14px] font-bold text-[#E5E7EB] truncate max-w-[190px]">
          {activeChat?.title || 'TONIQ'}
        </span>
        {messages.length > 0 ? (
          <button
            onClick={clearCurrentChat}
            className="text-[11px] text-[#6B7280] hover:text-[#E5E7EB] px-2 py-1 transition-colors">
            Clear
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 p-5 space-y-4" style={{ background: 'radial-gradient(ellipse at top, rgba(1,128,255,0.03) 0%, transparent 70%)' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-4 text-[14px] text-[#E5E7EB] leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-[#0180FF] text-white rounded-[16px] rounded-br-[0]'
                : 'bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] rounded-bl-[0]'
            }`}>
              {msg.sender === 'agent' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
            {msg.action && (
              <button
                onClick={() => window.open(msg.action!.url, '_blank')}
                className="mt-2 flex items-center gap-2 bg-[#0180FF] hover:bg-[#3DB1FF] text-white text-[13px] font-bold px-4 py-2.5 rounded-[12px] transition-all active:scale-95"
                style={{ boxShadow: '0 0 15px rgba(1,128,255,0.4)' }}
              >
                {msg.action.label}
                <ExternalLink size={14} />
              </button>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-end space-x-2">
              <div
                className="w-9 h-9 shrink-0 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 8px rgba(1,128,255,0.6))' }}
              >
                <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="tiq-think-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1a8fe0"/>
                      <stop offset="100%" stopColor="#0055aa"/>
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="50" fill="url(#tiq-think-bg)"/>
                  <polygon points="50,18 69,32 50,36 31,32" fill="white" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="69,32 50,36 59,74 80,53" fill="rgba(255,255,255,0.85)" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="31,32 50,36 41,74 20,53" fill="rgba(255,255,255,0.7)" stroke="#1472c4" strokeWidth="1.5"/>
                  <polygon points="41,74 50,36 59,74 50,81" fill="rgba(255,255,255,0.6)" stroke="#1472c4" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="max-w-[85%] px-5 py-4 bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] rounded-bl-[0]">
                <div className="flex space-x-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome card */}
        {messages.length === 0 && !isTyping && (
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
            <p className="text-[14px] text-[#E5E7EB] leading-relaxed">
              👋 Hi! I'm TONIQ, your AI DeFi agent on TON.<br />
              I have live market data loaded. Ask me anything!
            </p>
          </div>
        )}

        {/* Quick action chips — context-aware after first message */}
        {!isTyping && (() => {
          let chips: string[];
          if (messages.length === 0) {
            chips = ['TON price', 'Staking APY', 'Swap 10 TON to USDT', 'My portfolio', 'Top tokens'];
          } else {
            const lastAgentText = [...messages].reverse().find(m => m.sender === 'agent')?.text?.toLowerCase() ?? '';
            if (/staking|apy/.test(lastAgentText)) {
              chips = ['Calculate yield', 'Compare staking options', 'Stake now'];
            } else if (/swap|price/.test(lastAgentText)) {
              chips = ['Swap more', 'Check another token', 'Set price alert'];
            } else if (/portfolio/.test(lastAgentText)) {
              chips = ['Get full analysis', 'Compare tokens', 'Staking APY'];
            } else {
              chips = ['TON price', 'My portfolio', 'Swap TON'];
            }
          }
          const isContextual = messages.length > 0;
          return (
            <div className="flex flex-wrap gap-2 mt-4">
              {chips.map(action => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className={`border border-[#0180FF] text-[#0180FF] bg-transparent px-3 py-1.5 rounded-full font-medium active:scale-95 transition-all hover:bg-[#0180FF]/10 ${isContextual ? 'text-[11px]' : 'text-[12px]'}`}>
                  {action}
                </button>
              ))}
            </div>
          );
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="p-4 mt-auto shrink-0 relative z-10 w-full mb-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message TONIQ..."
            className="w-full bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] py-4 pl-4 pr-14 text-[14px] focus:outline-none focus:border-[#7354F2] transition-colors font-medium text-[#E5E7EB] placeholder:text-[#6B7280]"
          />
          <button
            onClick={() => handleSend()}
            className="absolute right-2 w-[36px] h-[36px] flex items-center justify-center bg-[#0180FF] text-white rounded-[12px] hover:bg-[#3DB1FF] active:scale-95 transition-all">
            <Send size={16} className="ml-[-2px] mt-[1px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTonWallet } from '@tonconnect/ui-react';
import { askTONIQ } from '../services/gemini';
import { fetchTopTokens, Token } from '../services/stonfi';
import { fetchStakingAPY } from '../services/tonstakers';
import { getSwapQuote } from '../services/omniston';
import { fetchWalletBalance } from '../services/tonapi';

type StakingData = Awaited<ReturnType<typeof fetchStakingAPY>>;

interface PriceAlert {
  symbol: string;
  targetPrice: number;
  createdAt: number;
}

interface AgentTabProps {
  initialMessage?: string;
  onClearInitialMessage?: () => void;
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

export default function AgentTab({ initialMessage, onClearInitialMessage }: AgentTabProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveMarketData, setLiveMarketData] = useState<Token[]>([]);
  const [liveStakingData, setLiveStakingData] = useState<StakingData | null>(null);
  const wallet = useTonWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ id: number; sender: string; text: string }[]>(() => {
    try {
      const saved = localStorage.getItem('toniq_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('toniq_chat_history', JSON.stringify(messages));
    } catch { /* storage full or unavailable */ }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('toniq_chat_history');
  };

  const addAgentMsg = (text: string) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'agent', text }]);

  // Load market data + check price alerts on load
  useEffect(() => {
    Promise.all([fetchTopTokens(), fetchStakingAPY()]).then(([tokens, staking]) => {
      setLiveMarketData(tokens);
      setLiveStakingData(staking);
    });
  }, []);

  // Feature 1: Check price alerts whenever market data updates
  useEffect(() => {
    if (!liveMarketData.length) return;
    const alerts = loadAlerts();
    if (!alerts.length) return;

    const triggered: PriceAlert[] = [];
    const remaining: PriceAlert[] = [];

    alerts.forEach(alert => {
      const token = liveMarketData.find(
        t => t.symbol.toUpperCase() === alert.symbol.toUpperCase()
      );
      const currentPrice = token ? parseFloat(token.dex_price_usd) : NaN;
      if (!isNaN(currentPrice) && currentPrice >= alert.targetPrice) {
        triggered.push({ ...alert, targetPrice: alert.targetPrice });
        // Capture currentPrice for the message
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

    if (triggered.length) saveAlerts(remaining);
  }, [liveMarketData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (
      initialMessage &&
      liveMarketData && liveMarketData.length > 0 &&
      liveStakingData
    ) {
      handleSend(initialMessage);
      onClearInitialMessage?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, liveMarketData, liveStakingData]);

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // ── Feature 1: Price Alert ──────────────────────────────────────
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

      // ── Feature 2: Portfolio guard ──────────────────────────────────
      const portfolioIntent = /\b(my portfolio|portfolio|my holdings|my balance|my assets)\b/i;
      if (portfolioIntent.test(text) && !wallet) {
        addAgentMsg("Connect your wallet first to see personalized analysis.");
        setIsTyping(false);
        return;
      }

      let walletBalance = null;
      if (portfolioIntent.test(text) && wallet) {
        try {
          walletBalance = await fetchWalletBalance(wallet.account.address);
        } catch { /* ignore, context will just be missing */ }
      }

      // ── Feature 3: Token Comparison ────────────────────────────────
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

      // ── Swap quote ─────────────────────────────────────────────────
      let swapQuote = null;
      const swapKeywords = /\b(swap|exchange|convert|trade)\b/i;
      if (swapKeywords.test(text)) {
        const match = text.match(/(\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+(?:to|for|into|->)\s+([A-Za-z]+)/i);
        if (match) {
          const [, rawAmount, fromSym, toSym] = match;
          swapQuote = await getSwapQuote(fromSym.toUpperCase(), toSym.toUpperCase(), parseFloat(rawAmount));
        } else {
          const symMatch = text.match(/\b([A-Z]{2,6})\b.*\b(to|for)\b.*\b([A-Z]{2,6})\b/i);
          if (symMatch) {
            swapQuote = await getSwapQuote(symMatch[1].toUpperCase(), symMatch[3].toUpperCase(), 1);
          }
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
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'agent', text: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'agent',
        text: "Sorry, I couldn't connect right now."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-[10px]">
      {/* Chat header with clear button */}
      {messages.length > 0 && (
        <div className="flex justify-end px-5 pt-2">
          <button
            onClick={clearChat}
            className="text-[11px] text-[#6B7280] hover:text-[#E5E7EB] px-2 py-1 transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 p-5 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 text-[14px] text-[#E5E7EB] leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-[#0180FF] text-white rounded-[16px] rounded-br-[0]'
                : 'bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] rounded-bl-[0]'
            }`}>
              {msg.sender === 'agent' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex w-full justify-start typing-indicator animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-[#0180FF] to-[#7354F2] flex items-center justify-center shadow-[0_0_15px_rgba(1,128,255,0.4)] animate-pulse">
                <span className="text-white font-bold text-[10px] tracking-wider">AI</span>
              </div>
              <div className="max-w-[85%] px-5 py-4 bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] rounded-bl-[0]">
                <div className="flex space-x-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome card – shown only before any messages */}
        {messages.length === 0 && !isTyping && (
          <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
            <p className="text-[14px] text-[#E5E7EB] leading-relaxed">
              👋 Hi! I'm TONIQ, your AI DeFi agent on TON.<br />
              I have live market data loaded. Ask me anything!
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {!isTyping && (
          <div className="flex flex-wrap gap-2 mt-4">
            {['TON price', 'Staking APY', 'Swap 10 TON to USDT', 'My portfolio', 'Top tokens'].map(action => (
              <button
                key={action}
                onClick={() => handleSend(action)}
                className="border border-[#0180FF] text-[#0180FF] bg-transparent px-3 py-1.5 rounded-full text-[12px] font-medium active:scale-95 transition-all hover:bg-[#0180FF]/10">
                {action}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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

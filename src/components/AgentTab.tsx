import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { askTONIQ } from '../services/gemini';
import { fetchTopTokens, Token } from '../services/stonfi';
import { fetchStakingAPY } from '../services/tonstakers';
import { getSwapQuote } from '../services/omniston';

type StakingData = Awaited<ReturnType<typeof fetchStakingAPY>>;

export default function AgentTab() {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveMarketData, setLiveMarketData] = useState<Token[]>([]);
  const [liveStakingData, setLiveStakingData] = useState<StakingData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ id: number; sender: string; text: string }[]>([]);

  useEffect(() => {
    Promise.all([fetchTopTokens(), fetchStakingAPY()]).then(([tokens, staking]) => {
      setLiveMarketData(tokens);
      setLiveStakingData(staking);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const topTokens = (liveMarketData || [])
        .slice(0, 20)
        .map((t) => ({
          symbol: t.symbol,
          price_usd: t.dex_price_usd,
          name: t.display_name
        }));

      // Detect swap intent and fetch live quote
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

      console.log('context being sent:', { prices: topTokens, stakingAPY: liveStakingData, swapQuote });
      const reply = await askTONIQ(text, {
        prices: topTokens,
        stakingAPY: liveStakingData,
        swapQuote,
      });
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

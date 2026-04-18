import { ArrowLeft, Star, Clock, ExternalLink } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  price: string;
  change: string;
  color: string;
  Icon: any;
}

interface TokenDetailProps {
  token: Token;
  onBack: () => void;
}

export default function TokenDetail({ token, onBack }: TokenDetailProps) {
  const isPositive = token.change.startsWith('+');
  
  const mockStats = [
    { label: 'Market Cap', value: '$' + (Math.random() * 10 + 1).toFixed(2) + 'B' },
    { label: '24h Volume', value: '$' + (Math.random() * 500 + 50).toFixed(0) + 'M' },
    { label: 'Circulating', value: (Math.random() * 5 + 1).toFixed(1) + 'B ' + token.symbol },
    { label: 'All Time High', value: '$' + (parseFloat(token.price.replace('$', '')) * 1.5).toFixed(2) }
  ];

  const mockNews = [
    { id: 1, title: `${token.symbol} Integrates with Leading DeFi Protocol, Sparking Adoption`, source: 'CryptoBriefing', time: '2h ago' },
    { id: 2, title: `Market Analysis: Is ${token.symbol} Ready for a Breakout?`, source: 'CoinDesk', time: '5h ago' }
  ];

  return (
    <div className="p-5 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center -mt-2">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <ArrowLeft size={18} className="text-[#E5E7EB]" />
        </button>
        <div className="font-bold text-[16px] text-white tracking-wide">Asset Details</div>
        <button className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full border border-[rgba(255,255,255,0.08)] active:scale-95 transition-transform">
          <Star size={18} className="text-[#6B7280]" />
        </button>
      </div>

      {/* Main Info */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className={`w-[64px] h-[64px] rounded-full flex items-center justify-center ${token.color} text-white mb-4 border-4 border-[#0A0A0F] shadow-lg`}>
          <token.Icon size={32} strokeWidth={2} />
        </div>
        <h2 className="text-[24px] font-bold text-white mb-1">{token.name}</h2>
        <p className="text-[#6B7280] font-medium tracking-wide mb-6">{token.symbol}</p>
        
        <div className="flex flex-col items-center space-y-2">
          <span className="text-[40px] font-bold text-white leading-none tracking-tight">{token.price}</span>
          <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[13px] font-bold tracking-wide ${isPositive ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FF4D4D]/10 text-[#FF4D4D]'}`}>
            {token.change} (24h)
          </div>
        </div>
      </div>

      {/* Fake Chart */}
      <div className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 h-[180px] flex flex-col relative justify-between">
         <div className="flex justify-between text-[#6B7280] text-[11px] font-bold w-full uppercase tracking-widest absolute top-4 left-0 px-5">
            <span>Price Graph</span>
         </div>
         {/* Simple curve mockup */}
         <div className="flex-1 w-full flex items-end justify-center mt-6">
            <svg width="100%" height="80%" viewBox="0 0 100 40" preserveAspectRatio="none" className="overflow-visible">
              <path 
                d={isPositive ? "M0,35 Q20,38 30,25 T60,20 T100,5" : "M0,5 Q20,10 30,25 T60,20 T100,35"} 
                fill="none" 
                stroke={isPositive ? "#00D395" : "#FF4D4D"} 
                strokeWidth="3" 
                strokeLinecap="round"
              />
              <path 
                d={isPositive ? "M0,35 Q20,38 30,25 T60,20 T100,5 L100,40 L0,40 Z" : "M0,5 Q20,10 30,25 T60,20 T100,35 L100,40 L0,40 Z"} 
                fill={isPositive ? "rgba(0, 211, 149, 0.1)" : "rgba(255, 77, 77, 0.1)"} 
              />
            </svg>
         </div>
         <div className="flex justify-between mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3 text-[12px] font-bold tracking-wide">
            <span className="text-[#6B7280]">1H</span>
            <span className="text-[#6B7280]">1D</span>
            <span className="text-[#3DB1FF]">1W</span>
            <span className="text-[#6B7280]">1M</span>
            <span className="text-[#6B7280]">1Y</span>
         </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1">Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          {mockStats.map((stat, i) => (
            <div key={i} className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col">
              <p className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">{stat.label}</p>
              <p className="font-bold text-[14px] text-[#E5E7EB]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related News */}
      <div>
        <h3 className="text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold mb-3 px-1 mt-2">Related News</h3>
        <div className="space-y-3">
          {mockNews.map((article) => (
            <div key={article.id} className="bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 flex flex-col cursor-pointer hover:bg-white/[0.02] transition-colors">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-[14px] font-bold text-[#E5E7EB] leading-snug w-[85%]">{article.title}</p>
                 <ExternalLink size={14} className="text-[#6B7280] mt-0.5" />
              </div>
              <div className="flex items-center space-x-2 mt-auto">
                <Clock size={12} className="text-[#0180FF]" />
                <span className="text-[11px] text-[#6B7280] font-semibold tracking-wide">{article.source} • {article.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom spacer for scroll */}
      <div className="h-6"></div>
    </div>
  );
}

interface SkeletonLineProps {
  width?: string;   // Tailwind width class e.g. 'w-32'
  height?: string;  // Tailwind height class e.g. 'h-4'
  className?: string;
}

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: SkeletonLineProps) {
  return (
    <div className={`bg-[#2A2A3E] rounded-[6px] ${width} ${height} ${className}`} />
  );
}

interface SkeletonCardProps {
  className?: string;
  children?: React.ReactNode;
}

export function SkeletonCard({ className = '', children }: SkeletonCardProps) {
  return (
    <div className={`bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 animate-pulse ${className}`}>
      {children}
    </div>
  );
}

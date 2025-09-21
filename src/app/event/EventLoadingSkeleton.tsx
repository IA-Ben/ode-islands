import { useTheme } from '@/contexts/ThemeContext';

export default function EventLoadingSkeleton() {
  return (
    <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
      <div className="absolute inset-0 opacity-20 bg-gradient-radial from-blue-500/40 via-transparent to-transparent" />
      
      <div className="relative z-10">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-white/60">Loading Event Dashboard...</p>
      </div>
    </div>
  );
}
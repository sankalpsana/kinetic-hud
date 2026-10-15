'use client';

interface HUDHeaderProps {
  title: string;
}

export default function HUDHeader({ title }: HUDHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-[#0f131c]/85 backdrop-blur-xl border-b border-[#1F2937]/60 shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
      <div className="h-14 max-w-lg mx-auto px-4 flex items-center justify-between">
        {/* Left Telemetry Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#262a34] border border-[#3c4a42]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span className="font-metric text-[10px] text-[#4edea3] font-bold tracking-wider">SYNC</span>
            <span className="font-metric text-[10px] text-[#bbcabf]">98%</span>
          </div>
          <span className="font-metric text-[11px] text-[#86948a] tracking-wider hidden sm:inline">SYS REV 4.2.0</span>
        </div>

        {/* Right Cockpit Title & Avatar */}
        <div className="flex items-center gap-2.5">
          <span className="font-headline text-[16px] font-bold text-[#dfe2ef] tracking-tight uppercase">
            {title}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center font-bold text-xs shadow-md">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}

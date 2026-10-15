'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavigationDock() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Readiness', path: '/readiness', icon: 'ecg_heart' },
    { label: 'Workout', path: '/workout', icon: 'fitness_center' },
    { label: 'Equipment', path: '/equipment', icon: 'tune' },
    { label: 'Summary', path: '/summary', icon: 'analytics' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-[#0f131c]/92 backdrop-blur-xl border-t border-[#1F2937] shadow-[0_-2px_16px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/readiness' && pathname === '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 transition-all rounded-lg ${
                isActive
                  ? 'text-[#4edea3] font-semibold scale-105'
                  : 'text-[#86948a] hover:text-[#dfe2ef]'
              }`}
            >
              <span 
                className="material-symbols-outlined text-[22px] transition-transform"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-metric text-[10px] tracking-widest uppercase mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

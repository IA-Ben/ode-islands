'use client';

import { surfaces, pills, focus, borders } from '@/lib/admin/designTokens';

export interface SectionSubNavItem {
  id: string;
  label: string;
}

export interface SectionSubNavProps {
  items: SectionSubNavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function SectionSubNav({ items, activeId, onChange }: SectionSubNavProps) {
  return (
    <nav
      className={`${surfaces.darkGlass} sticky top-[64px] z-40 ${borders.glassBorder} border-b`}
      aria-label="Section navigation"
    >
      <div className="flex overflow-x-auto scrollbar-hide space-x-2 px-4 py-3">
        {items.map((item) => {
          const isActive = item.id === activeId;
          
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`
                ${pills.base}
                px-4 py-2
                ${focus.ring}
                transition-all duration-200
                whitespace-nowrap
                ${
                  isActive
                    ? 'bg-fuchsia-600/90 text-white font-medium backdrop-blur-md'
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 backdrop-blur-md'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

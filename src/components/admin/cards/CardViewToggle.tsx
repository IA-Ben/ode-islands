import React from 'react';
import { Grid3x3, Table } from 'lucide-react';
import { surfaces, pills, focus, colors, interactive, borders } from '@/lib/admin/designTokens';

export type ViewMode = 'grid' | 'table';

interface CardViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const CardViewToggle: React.FC<CardViewToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <div 
      className={`
        ${surfaces.darkGlass}
        ${borders.glassBorder}
        ${pills.base}
        ${pills.padding.sm}
        flex gap-1
      `}
      role="group"
      aria-label="View mode toggle"
    >
      <button
        onClick={() => onViewChange('grid')}
        className={`
          flex items-center gap-2
          ${pills.base}
          px-4 py-2
          ${focus.ring}
          ${interactive.hoverSubtle}
          ${interactive.active}
          font-medium text-sm
          transition-all duration-200
          ${currentView === 'grid' 
            ? `${colors.accent.bg} text-white shadow-lg shadow-fuchsia-500/20` 
            : `${colors.slate.text} hover:bg-slate-800/60`
          }
        `}
        aria-label="Grid view"
        aria-pressed={currentView === 'grid'}
      >
        <Grid3x3 className="w-4 h-4" />
        <span>Grid</span>
      </button>

      <button
        onClick={() => onViewChange('table')}
        className={`
          flex items-center gap-2
          ${pills.base}
          px-4 py-2
          ${focus.ring}
          ${interactive.hoverSubtle}
          ${interactive.active}
          font-medium text-sm
          transition-all duration-200
          ${currentView === 'table' 
            ? `${colors.accent.bg} text-white shadow-lg shadow-fuchsia-500/20` 
            : `${colors.slate.text} hover:bg-slate-800/60`
          }
        `}
        aria-label="Table view"
        aria-pressed={currentView === 'table'}
      >
        <Table className="w-4 h-4" />
        <span>Table</span>
      </button>
    </div>
  );
};

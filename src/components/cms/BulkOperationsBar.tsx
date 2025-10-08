'use client';

import { useState } from 'react';
import { Trash2, Eye, EyeOff, Archive, Check, X, FileText } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

export type BulkAction = 'publish' | 'unpublish' | 'delete' | 'archive' | 'draft';

interface BulkOperationsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: BulkAction) => Promise<void>;
  entityType: string;
}

export function BulkOperationsBar({
  selectedCount,
  onClearSelection,
  onBulkAction,
  entityType,
}: BulkOperationsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState<BulkAction | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkAction) => {
    // Confirm destructive actions
    if ((action === 'delete' || action === 'archive') && !showConfirm) {
      setShowConfirm(action);
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkAction(action);
      setShowConfirm(null);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelConfirm = () => {
    setShowConfirm(null);
  };

  const actions: { action: BulkAction; icon: React.ElementType; label: string; color: string; }[] = [
    { action: 'publish', icon: Eye, label: 'Publish', color: 'text-green-400 hover:bg-green-500/10' },
    { action: 'draft', icon: FileText, label: 'Draft', color: 'text-slate-400 hover:bg-slate-500/10' },
    { action: 'unpublish', icon: EyeOff, label: 'Unpublish', color: 'text-amber-400 hover:bg-amber-500/10' },
    { action: 'archive', icon: Archive, label: 'Archive', color: 'text-orange-400 hover:bg-orange-500/10' },
    { action: 'delete', icon: Trash2, label: 'Delete', color: 'text-red-400 hover:bg-red-500/10' },
  ];

  if (showConfirm) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className={`${surfaces.overlayGlass} rounded-xl p-4 border border-red-500/50 shadow-2xl backdrop-blur-xl max-w-md`}>
          <p className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Confirm {showConfirm === 'delete' ? 'Deletion' : 'Archive'}
          </p>
          <p className="text-slate-300 text-sm mb-4">
            {showConfirm === 'delete'
              ? `Are you sure you want to delete ${selectedCount} ${entityType}(s)? This action cannot be undone.`
              : `Are you sure you want to archive ${selectedCount} ${entityType}(s)?`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={cancelConfirm}
              disabled={isProcessing}
              className={`flex-1 ${components.buttonSecondary} justify-center`}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={() => handleAction(showConfirm)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {showConfirm === 'delete' ? 'Delete' : 'Archive'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className={`${surfaces.overlayGlass} rounded-xl p-4 border border-fuchsia-500/50 shadow-2xl backdrop-blur-xl`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
              <span className="text-fuchsia-400 font-semibold text-sm">{selectedCount}</span>
            </div>
            <span className="text-white font-medium">
              {selectedCount} {entityType}{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="h-6 w-px bg-slate-600"></div>

          <div className="flex items-center gap-1">
            {actions.map(({ action, icon: Icon, label, color }) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={isProcessing}
                className={`px-3 py-2 rounded-lg ${color} transition flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                title={label}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-600"></div>

          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700/50 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

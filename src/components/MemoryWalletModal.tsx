"use client";

import { X } from 'lucide-react';
import { surfaces, borders, focus } from '@/lib/admin/designTokens';
import MemoryWalletModern from './MemoryWalletModern';

interface MemoryWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryWalletModal({ isOpen, onClose }: MemoryWalletModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`${surfaces.cardGlass} rounded-2xl border border-slate-700/50 w-full max-w-6xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Memory Wallet</h2>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-white/10 rounded-lg transition ${focus.ring}`}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          <MemoryWalletModern showHeader={false} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, Smartphone, Sparkles, Lock } from "lucide-react";

export interface AtHomeARCardData {
  id: string;
  title: string;
  description: string;
  arExperienceId?: string;
  unlocked: boolean;
  requiredTier?: "Bronze" | "Silver" | "Gold";
  previewImageUrl?: string;
}

interface AtHomeARCardProps {
  data: AtHomeARCardData;
  onLaunch?: () => void;
}

export function AtHomeARCard({ data, onLaunch }: AtHomeARCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      {data.previewImageUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={data.previewImageUrl}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          
          {/* AR Badge */}
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/90 text-white text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              AR
            </span>
          </div>
        </div>
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-purple-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {data.title}
          </h3>
          
          <p className="text-slate-300 leading-relaxed">
            {data.description}
          </p>
        </div>
        
        {data.unlocked ? (
          <button
            onClick={onLaunch}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            Launch AR Experience
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              {data.requiredTier ? `Unlock with ${data.requiredTier} tier` : 'Locked'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

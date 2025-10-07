"use client";

import { ArrowRight, Film, Wand2, Sparkles } from "lucide-react";

export interface SmartVideoEditorCardData {
  id: string;
  title: string;
  description: string;
  features: string[];
  aiPowered: boolean;
  clipCount?: number;
  previewVideoUrl?: string;
}

interface SmartVideoEditorCardProps {
  data: SmartVideoEditorCardData;
  onOpenEditor?: () => void;
}

export function SmartVideoEditorCard({ data, onOpenEditor }: SmartVideoEditorCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10">
      {data.previewVideoUrl && (
        <div className="relative w-full h-48 overflow-hidden bg-slate-800">
          <video
            src={data.previewVideoUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          
          {data.aiPowered && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                AI Powered
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-fuchsia-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {data.title}
          </h3>
          
          <p className="text-slate-300 leading-relaxed">
            {data.description}
          </p>
          
          {data.features && data.features.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {data.features.slice(0, 3).map((feature, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-medium border border-fuchsia-500/20"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
          
          {data.clipCount && (
            <div className="flex items-center gap-2 text-sm text-slate-400 pt-2">
              <Film className="w-4 h-4" />
              <span>{data.clipCount} clips available</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onOpenEditor}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-semibold hover:from-fuchsia-700 hover:to-purple-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
        >
          Open Editor
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, Image as ImageIcon, Download, Share2 } from "lucide-react";

export interface PhotoDropCardData {
  id: string;
  title: string;
  description: string;
  photoCount: number;
  newPhotos?: number;
  collectionUrl?: string;
  thumbnails?: string[];
}

interface PhotoDropCardProps {
  data: PhotoDropCardData;
  onViewGallery?: () => void;
}

export function PhotoDropCard({ data, onViewGallery }: PhotoDropCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      {/* Photo Grid Preview */}
      {data.thumbnails && data.thumbnails.length > 0 && (
        <div className="relative w-full h-48 overflow-hidden bg-slate-800">
          <div className="grid grid-cols-3 gap-1 h-full p-1">
            {data.thumbnails.slice(0, 6).map((thumb, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-lg">
                <img
                  src={thumb}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          
          {data.newPhotos && data.newPhotos > 0 && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold">
                +{data.newPhotos} NEW
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-blue-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {data.title}
          </h3>
          
          <p className="text-slate-300 leading-relaxed">
            {data.description}
          </p>
          
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <ImageIcon className="w-4 h-4" />
              <span>{data.photoCount} photos</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onViewGallery}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            View Gallery
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 border border-white/10">
            <Download className="w-5 h-5" />
          </button>
          
          <button className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all duration-200 border border-white/10">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, ShoppingBag, Tag, TrendingUp } from "lucide-react";

export interface MerchCardData {
  id: string;
  title: string;
  description: string;
  productImageUrl?: string;
  discountPercentage?: number;
  originalPrice?: number;
  salePrice?: number;
  limitedTime?: boolean;
  stockStatus?: "in_stock" | "low_stock" | "sold_out";
}

interface MerchCardProps {
  data: MerchCardData;
  onShopNow?: () => void;
}

export function MerchCard({ data, onShopNow }: MerchCardProps) {
  const stockColors = {
    in_stock: "text-green-400 border-green-500/30 bg-green-500/10",
    low_stock: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    sold_out: "text-red-400 border-red-500/30 bg-red-500/10",
  };

  const stockLabels = {
    in_stock: "In Stock",
    low_stock: "Limited Stock",
    sold_out: "Sold Out",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
      {data.productImageUrl && (
        <div className="relative w-full h-48 overflow-hidden bg-slate-800">
          <img
            src={data.productImageUrl}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          
          {/* Discount Badge */}
          {data.discountPercentage && data.discountPercentage > 0 && (
            <div className="absolute top-3 left-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold">
                -{data.discountPercentage}%
              </span>
            </div>
          )}
          
          {/* Limited Time Badge */}
          {data.limitedTime && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold">
                <TrendingUp className="w-3 h-3" />
                LIMITED
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-amber-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {data.title}
          </h3>
          
          <p className="text-slate-300 leading-relaxed">
            {data.description}
          </p>
          
          {/* Pricing */}
          {(data.salePrice || data.originalPrice) && (
            <div className="flex items-baseline gap-3 pt-2">
              {data.salePrice && (
                <span className="text-2xl font-bold text-white">
                  ${data.salePrice.toFixed(2)}
                </span>
              )}
              {data.originalPrice && data.salePrice && data.originalPrice > data.salePrice && (
                <span className="text-lg text-slate-500 line-through">
                  ${data.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
          
          {/* Stock Status */}
          {data.stockStatus && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${stockColors[data.stockStatus]}`}>
              <Tag className="w-3 h-3" />
              {stockLabels[data.stockStatus]}
            </div>
          )}
        </div>
        
        <button
          onClick={onShopNow}
          disabled={data.stockStatus === "sold_out"}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
            data.stockStatus === "sold_out"
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-amber-600 text-white hover:bg-amber-700 hover:scale-105 shadow-amber-500/25"
          }`}
        >
          {data.stockStatus === "sold_out" ? "Sold Out" : "Shop Now"}
          {data.stockStatus !== "sold_out" && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

"use client";

import { ShoppingBag, Tag, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface MerchItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export interface MerchBundle {
  id: string;
  name: string;
  items: string[];
  price: number;
  savings: number;
}

export interface MerchCardProps {
  catalogue: MerchItem[];
  bundles?: MerchBundle[];
  discountRule?: {
    tier: string;
    discount: number;
  };
  awardMemory?: {
    templateId: string;
    minPurchase: number;
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function MerchCard({
  catalogue,
  bundles,
  discountRule,
  awardMemory,
  title = "Merch Shop",
  subtitle = "Official Merchandise",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: MerchCardProps) {
  const previewItems = catalogue.slice(0, 3);

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<ShoppingBag className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={!!awardMemory}
      analyticsTag={analyticsTag || "merch-card"}
      theme="amber"
    >
      {discountRule && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <Tag className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            {discountRule.tier} Tier: {discountRule.discount}% off
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {previewItems.map((item) => (
          <div
            key={item.id}
            className="aspect-square rounded-lg bg-white/5 border border-white/10 overflow-hidden"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-slate-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {catalogue.length > 3 && (
        <div className="text-xs text-center text-slate-400">
          {catalogue.length} items available
          {bundles && bundles.length > 0 && ` • ${bundles.length} bundles`}
        </div>
      )}

      {awardMemory && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-600/5 border border-fuchsia-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Spend ${awardMemory.minPurchase}+ to earn a memory
          </p>
        </div>
      )}

      <button
        onClick={onClick}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white font-semibold hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg shadow-amber-500/25"
      >
        Shop Now
      </button>
    </EventCard>
  );
}

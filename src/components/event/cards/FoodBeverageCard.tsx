"use client";

import { Coffee, Clock, MapPin, Tag, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: "food" | "beverage" | "snack";
  dietary?: string[];
}

export interface FoodBeverageCardProps {
  menu: MenuItem[];
  collectionPoint?: string;
  prepTime?: number;
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

export function FoodBeverageCard({
  menu,
  collectionPoint,
  prepTime,
  discountRule,
  awardMemory,
  title = "Food & Beverage",
  subtitle = "Order Now",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: FoodBeverageCardProps) {
  const categories = {
    food: menu.filter(item => item.category === "food").length,
    beverage: menu.filter(item => item.category === "beverage").length,
    snack: menu.filter(item => item.category === "snack").length,
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Coffee className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={!!awardMemory}
      analyticsTag={analyticsTag || "food-beverage-card"}
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

      <div className="grid grid-cols-3 gap-2 text-center">
        {categories.food > 0 && (
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="text-lg font-bold text-white">{categories.food}</div>
            <div className="text-xs text-slate-400">Food</div>
          </div>
        )}
        {categories.beverage > 0 && (
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="text-lg font-bold text-white">{categories.beverage}</div>
            <div className="text-xs text-slate-400">Drinks</div>
          </div>
        )}
        {categories.snack > 0 && (
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="text-lg font-bold text-white">{categories.snack}</div>
            <div className="text-xs text-slate-400">Snacks</div>
          </div>
        )}
      </div>

      {(prepTime || collectionPoint) && (
        <div className="space-y-2">
          {prepTime && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>~{prepTime} min prep time</span>
            </div>
          )}
          {collectionPoint && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{collectionPoint}</span>
            </div>
          )}
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
        Order Now
      </button>
    </EventCard>
  );
}

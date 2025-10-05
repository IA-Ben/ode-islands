"use client";

import { QrCode, Award, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface QRScanCardProps {
  scanTypes: ("stamp" | "pickup" | "unlock")[];
  successState?: {
    message: string;
    redirect?: string;
  };
  reward?: {
    type: "points" | "memory";
    points?: number;
    memoryTemplateId?: string;
    memoryTemplateName?: string;
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function QRScanCard({
  scanTypes,
  successState,
  reward,
  title = "QR Scanner",
  subtitle = "Scan & Collect",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: QRScanCardProps) {
  const getScanTypesLabel = () => {
    return scanTypes.map(type => {
      switch (type) {
        case "stamp": return "Check-in";
        case "pickup": return "Pick up";
        case "unlock": return "Unlock";
        default: return type;
      }
    }).join(", ");
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<QrCode className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={reward?.type === "memory"}
      analyticsTag={analyticsTag || "qr-scan-card"}
      theme="fuchsia"
    >
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <div className="px-2 py-1 rounded-md bg-white/5 text-xs font-medium">
          {getScanTypesLabel()}
        </div>
      </div>

      {reward && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-600/5 border border-fuchsia-500/20">
          {reward.type === "points" ? (
            <>
              <Award className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
              <p className="text-sm text-fuchsia-300">
                Earn {reward.points} points
              </p>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                Collect: {reward.memoryTemplateName || "Memory"}
              </p>
            </>
          )}
        </div>
      )}

      {successState && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs text-slate-400">{successState.message}</p>
        </div>
      )}

      <button
        onClick={onClick}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white font-semibold hover:from-fuchsia-700 hover:to-fuchsia-800 transition-all duration-200 shadow-lg shadow-fuchsia-500/25"
      >
        Open Scanner
      </button>
    </EventCard>
  );
}

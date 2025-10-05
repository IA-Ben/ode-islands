"use client";

import { Watch, Bluetooth, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { EventCard } from "./EventCard";

export interface WearablesCardProps {
  pairingType: "bluetooth" | "nfc" | "qr";
  scenes?: string[];
  status: "unpaired" | "pairing" | "paired" | "error";
  awardMemory?: {
    templateId: string;
    points: number;
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function WearablesCard({
  pairingType,
  scenes = [],
  status,
  awardMemory,
  title = "Wearable Device",
  subtitle = "Connect & Enhance",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: WearablesCardProps) {
  const statusConfig = {
    unpaired: {
      icon: Watch,
      color: "text-slate-400",
      bg: "bg-slate-500/20",
      label: "Not Paired",
      message: "Connect your device to unlock experiences",
    },
    pairing: {
      icon: Bluetooth,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      label: "Pairing...",
      message: "Connecting to your device",
    },
    paired: {
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      label: "Connected",
      message: "Your device is ready",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/20",
      label: "Connection Failed",
      message: "Please try pairing again",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const getPairingTypeLabel = () => {
    switch (pairingType) {
      case "bluetooth": return "Bluetooth";
      case "nfc": return "NFC Tap";
      case "qr": return "QR Code";
      default: return pairingType;
    }
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Watch className="w-6 h-6" />}
      onClick={onClick}
      hasMemoryAward={!!awardMemory && status === "unpaired"}
      analyticsTag={analyticsTag || "wearables-card"}
      theme="fuchsia"
      badge={status === "paired" ? { type: "CUSTOM", label: "CONNECTED", color: "bg-emerald-500" } : undefined}
    >
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${
        status === "paired" ? "bg-emerald-500/10 border-emerald-500/20" :
        status === "error" ? "bg-red-500/10 border-red-500/20" :
        "bg-white/5 border-white/10"
      }`}>
        <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${config.color} ${status === "pairing" ? "animate-pulse" : ""}`} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-white">
            {config.label}
          </div>
          <div className="text-xs text-slate-400">
            {config.message}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-300">
        <div className="px-2 py-1 rounded-md bg-white/5 text-xs font-medium">
          {getPairingTypeLabel()}
        </div>
        {scenes.length > 0 && (
          <>
            <span className="text-slate-500">•</span>
            <span className="text-xs">{scenes.length} experiences</span>
          </>
        )}
      </div>

      {awardMemory && status === "unpaired" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Pair to earn {awardMemory.points} points + memory
          </p>
        </div>
      )}

      {status !== "paired" && (
        <button
          onClick={onClick}
          disabled={status === "pairing"}
          className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
            status === "pairing"
              ? "bg-white/10 text-white cursor-not-allowed"
              : "bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white hover:from-fuchsia-700 hover:to-fuchsia-800 shadow-lg shadow-fuchsia-500/25"
          }`}
        >
          {status === "pairing" ? "Pairing..." : status === "error" ? "Retry Pairing" : "Pair Device"}
        </button>
      )}
    </EventCard>
  );
}

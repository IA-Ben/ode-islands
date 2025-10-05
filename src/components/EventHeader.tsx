"use client";

import { SectionSubNav } from "./SectionSubNav";
import { Map, QrCode, Info, Sparkles, Gift } from "lucide-react";

export function EventHeader({
  lane,
  setLane,
  onOpenMap,
  onQuickScan,
}: {
  lane: "info" | "interact" | "rewards";
  setLane: (v: "info" | "interact" | "rewards") => void;
  onOpenMap: () => void;
  onQuickScan: () => void;
}) {
  return (
    <SectionSubNav
      items={[
        { id: "info", label: "Info", icon: Info },
        { id: "interact", label: "Interact", icon: Sparkles },
        { id: "rewards", label: "Rewards", icon: Gift },
      ]}
      activeId={lane}
      onChange={(id) => setLane(id as any)}
      rightSlot={
        <>
          <button
            onClick={onOpenMap}
            className="px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition hidden sm:flex items-center gap-2"
            aria-label="Open Map"
          >
            <Map className="w-4 h-4" />
            <span className="hidden md:inline">Map</span>
          </button>
          <button
            onClick={onQuickScan}
            className="px-3 py-2 rounded-xl bg-slate-200 text-slate-900 hover:bg-white transition flex items-center gap-2"
            aria-label="Quick Scan"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </>
      }
    />
  );
}

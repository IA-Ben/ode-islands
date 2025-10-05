"use client";

import { SectionSubNav } from "./SectionSubNav";
import { Share2, Sparkles, Gift, Camera } from "lucide-react";

export function AfterHeader({
  lane,
  setLane,
  openShareComposer,
}: {
  lane: "recap" | "create" | "offers";
  setLane: (v: "recap" | "create" | "offers") => void;
  openShareComposer: () => void;
}) {
  return (
    <SectionSubNav
      items={[
        { id: "recap", label: "Recap", icon: Camera },
        { id: "create", label: "Create", icon: Sparkles },
        { id: "offers", label: "Offers", icon: Gift },
      ]}
      activeId={lane}
      onChange={(id) => setLane(id as any)}
      rightSlot={
        <button
          onClick={openShareComposer}
          className="px-3 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition flex items-center gap-2"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      }
    />
  );
}

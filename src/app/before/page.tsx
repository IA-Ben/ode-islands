"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BeforePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to first chapter of Before phase
    router.push("/before/chapter-1");
  }, [router]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-fuchsia-950/20 to-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        <div className="text-white/60 text-sm">Loading experience...</div>
      </div>
    </div>
  );
}
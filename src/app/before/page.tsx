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
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white">Redirecting to Before phase...</div>
    </div>
  );
}
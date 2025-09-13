"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyChapterPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.id as string;

  useEffect(() => {
    // Redirect legacy chapter routes to Before phase
    if (chapterId.startsWith('chapter-')) {
      router.push(`/before/${chapterId}`);
    } else {
      router.push('/before/chapter-1');
    }
  }, [chapterId, router]);

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white">Redirecting...</div>
    </div>
  );
}


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Before phase - first chapter
    router.push("/before/chapter-1");
  }, [router]);

  return null;
}

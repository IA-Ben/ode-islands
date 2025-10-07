"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleFadeComplete = () => {
    router.push("/before");
  };

  return (
    <LoadingScreen 
      brandText="Ode Islands"
      fadeOut={fadeOut}
      onFadeComplete={handleFadeComplete}
    />
  );
}

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RewardsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/cms');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to CMS...</p>
      </div>
    </div>
  );
}

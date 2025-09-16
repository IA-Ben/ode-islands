'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CMSRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the secured admin CMS location
    router.replace('/admin/cms');
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold">Redirecting to Admin CMS...</h2>
        <p className="text-gray-400 mt-2">The CMS has moved to a secure admin location.</p>
      </div>
    </div>
  );
}
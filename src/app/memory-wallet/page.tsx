"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MemoryWallet from '@/components/MemoryWallet';
import PhaseNavigation from '@/components/PhaseNavigation';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import { Button } from '@/components/ui/button';

export default function MemoryWalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const theme: ImmersiveTheme = {
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
    title: '#ffffff',
    subtitle: '#e2e8f0',
    description: '#cbd5e0',
    shadow: true
  };

  if (isLoading) {
    return (
      <ImmersivePageLayout theme={theme} centerContent>
        <div className="text-white">Loading...</div>
      </ImmersivePageLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <ImmersivePageLayout theme={theme} centerContent>
        <div className="text-white text-center">
          <p className="mb-4">Please login to view your memory wallet</p>
          <Button
            onClick={() => router.push('/auth/login')}
            className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium"
          >
            Login
          </Button>
        </div>
      </ImmersivePageLayout>
    );
  }

  return (
    <>
      <PhaseNavigation currentPhase="before" />
      <div className="min-h-screen bg-black pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {user?.firstName ? `${user.firstName}'s Memory Wallet` : 'Memory Wallet'}
            </h1>
            <p className="text-white/60 text-lg">
              Your collected memories from your journey through The Ode Islands
            </p>
          </div>
          
          <MemoryWallet 
            showHeader={false}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}
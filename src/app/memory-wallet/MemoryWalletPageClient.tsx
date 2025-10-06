"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MemoryWalletModern from '@/components/MemoryWalletModern';
import UnifiedTopNav from '@/components/UnifiedTopNav';
import { useFanScore } from '@/hooks/useFanScore';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import { Button } from '@/components/ui/button';

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface MemoryWalletPageClientProps {
  user: UserData | null;
}

export default function MemoryWalletPageClient({ user }: MemoryWalletPageClientProps) {
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { scoreData } = useFanScore();

  // Navigation handlers for UnifiedTopNav
  const handlePhaseChange = (phase: "before" | "event" | "after") => {
    switch (phase) {
      case 'before':
        router.push('/before');
        break;
      case 'event':
        router.push('/event');
        break;
      case 'after':
        router.push('/after');
        break;
    }
  };

  const handleOpenWallet = () => {
    router.push('/memory-wallet');
  };

  const handleOpenQR = () => {
    console.log('QR scanner opened');
  };

  const handleSwitchMode = (nextMode: "app" | "admin") => {
    if (nextMode === 'admin') {
      router.push('/admin');
    }
  };

  // Calculate tier from fan score level
  const getTier = (level: number): "Bronze" | "Silver" | "Gold" => {
    if (level >= 8) return "Gold";
    if (level >= 4) return "Silver";
    return "Bronze";
  };

  const points = scoreData?.currentScore?.totalScore || 0;
  const level = scoreData?.currentScore?.level || 1;
  const tier = getTier(level);

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
      <UnifiedTopNav
        mode="app"
        user={user}
        currentPhase="before"
        onPhaseChange={handlePhaseChange}
        walletNewCount={0}
        points={points}
        tier={tier}
        onOpenWallet={handleOpenWallet}
        onOpenQR={handleOpenQR}
        onSwitchMode={handleSwitchMode}
      />
      <div className="min-h-screen bg-black pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {authUser?.firstName ? `${authUser.firstName}'s Memory Wallet` : 'Memory Wallet'}
            </h1>
            <p className="text-white/60 text-lg">
              Your collected memories from your journey through The Ode Islands
            </p>
          </div>
          
          <MemoryWalletModern 
            showHeader={false}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ImmersivePageLayout, { ImmersiveTheme } from "@/components/ImmersivePageLayout";
import { Button } from "@/components/ui/button";
import AnimateText from "@/components/AnimateText";

// AdminMenu Component for admin users
function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const adminMenuItems = [
    { name: "Theme Editor", href: "/admin/theme", description: "Customize brand colors and fonts" },
    { name: "CMS", href: "/admin/cms", description: "Manage content and media" },
    { name: "Analytics", href: "/admin/analytics", description: "View performance metrics" },
    { name: "User Management", href: "/admin/users", description: "Manage users and roles" }
  ];

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
      >
        Admin Menu
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Administration</h3>
            <p className="text-sm text-gray-600">Manage platform settings and content</p>
          </div>
          <div className="p-2">
            {adminMenuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block p-3 rounded-md hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">{item.description}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// User Avatar and Info Component
function UserInfo({ user }: { user: any }) {
  return (
    <div className="flex items-center space-x-3">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt={`${user.firstName} ${user.lastName}`}
          className="w-8 h-8 rounded-full border-2 border-white/20"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/20 flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </span>
        </div>
      )}
      <div className="text-left">
        <div className="text-white font-medium text-sm">
          {user.firstName} {user.lastName}
        </div>
        {user.isAdmin && (
          <div className="text-red-300 text-xs font-medium">Administrator</div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 300);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <ImmersivePageLayout
      theme={theme}
      centerContent
      animateIn={animateIn}
      showHeader
      headerContent={
        <div className="absolute top-0 left-0 right-0 z-50 p-6">
          <div className="flex justify-between items-center">
            <div className="text-white font-bold text-xl">The Ode Islands</div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <UserInfo user={user} />
                  {isAdmin && <AdminMenu />}
                  <Button
                    onClick={() => window.location.href = '/api/logout'}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-lg"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            <AnimateText delay={0} active={animateIn}>Welcome to The Ode Islands</AnimateText>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-12 leading-relaxed">
            <AnimateText delay={200} active={animateIn}>A bold, boundary-defying performance pushing the edges of contemporary storytelling</AnimateText>
          </p>
          
          {isAuthenticated ? (
            <div className="space-y-6">
              <p className="text-2xl text-blue-300 font-medium mb-8">
                <AnimateText delay={400} active={animateIn}>{`Welcome back, ${user?.firstName || 'there'}!`}</AnimateText>
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <Button
                  onClick={() => router.push('/before/chapter-1')}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg text-lg font-medium"
                >
                  Before Experience
                </Button>
                
                <Button
                  onClick={() => router.push('/event')}
                  className="bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg text-lg font-medium"
                >
                  Live Event
                </Button>
                
                <Button
                  onClick={() => router.push('/after')}
                  className="bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg text-lg font-medium"
                >
                  After Experience
                </Button>
              </div>
              
              {isAdmin && (
                <div className="mt-12 p-6 bg-white/10 rounded-lg border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-2">Administrator Tools</h3>
                  <p className="text-gray-300 mb-4">
                    Access advanced management features and analytics
                  </p>
                  <Button
                    onClick={() => router.push('/admin/cms')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
                  >
                    Access CMS
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-lg text-gray-300">
                <AnimateText delay={400} active={animateIn}>Sign in to begin your immersive journey</AnimateText>
              </p>
              
              <Button
                onClick={() => window.location.href = '/api/login'}
                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-medium"
              >
                Start Your Journey
              </Button>
            </div>
          )}
        </div>
      </div>
    </ImmersivePageLayout>
  );
}

import { useEffect, useState } from 'react';
import { stackClientApp } from '../stack/client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Secure authentication hook using Stack Auth
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        // Get user from Stack Auth
        const stackUser = await stackClientApp.getUser();

        if (!mounted) return;

        if (!stackUser) {
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Fetch additional user data from our API (including isAdmin status)
        const response = await fetch('/api/auth/me');

        if (!mounted) return;

        if (!response.ok) {
          console.error('Failed to fetch user profile');
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const userData = await response.json();

        if (!mounted) return;

        // Set user data with admin status from backend
        setUser({
          id: stackUser.id,
          email: stackUser.primaryEmail ?? '',
          firstName: stackUser.displayName?.split(' ')[0] ?? '',
          lastName: stackUser.displayName?.split(' ').slice(1).join(' ') ?? '',
          profileImageUrl: stackUser.profileImageUrl ?? undefined,
          isAdmin: userData.isAdmin ?? false,
          permissions: userData.permissions ?? []
        });

        setIsAdmin(userData.isAdmin ?? false);
        setIsLoading(false);

      } catch (error) {
        if (!mounted) return;

        console.error('Auth error:', error);
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    }

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isAdmin
  };
}
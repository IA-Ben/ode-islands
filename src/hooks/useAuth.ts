import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/csrfUtils';
import { logger } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await apiGet<User | { user: User }>('/api/me');
        if (response) {
          // Handle both formats: direct user object or wrapped response
          const actualUser = 'user' in response ? response.user : response;
          setUser(actualUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        logger.error('Auth check failed', error, 'useAuth');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
  };
}
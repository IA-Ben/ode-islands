interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
}

// Authentication bypassed - always return authenticated admin user
export function useAuth() {
  const mockUser: User & { permissions?: string[] } = {
    id: 'dev-user',
    email: 'dev@example.com',
    firstName: 'Dev',
    lastName: 'User',
    isAdmin: true,
    permissions: ['*', 'system:admin', 'content:view', 'content:edit', 'content:delete', 'content:publish'],
  };

  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true,
  };
}
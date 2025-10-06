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
  const mockUser: User = {
    id: 'dev-user',
    email: 'dev@example.com',
    firstName: 'Dev',
    lastName: 'User',
    isAdmin: true,
  };

  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true,
  };
}
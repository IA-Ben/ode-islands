import BeforePageClient from './BeforePageClient';

// Mock admin user with full permissions (authentication bypassed per project requirements)
const mockAdminUser = {
  id: 'mock-admin-user',
  username: 'Dev User',
  email: 'dev@odeislands.com',
  role: 'owner' as const,
  permissions: ['*'] // Wildcard permission for full access
};

export default async function BeforePage() {
  return <BeforePageClient user={mockAdminUser} />;
}

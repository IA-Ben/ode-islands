import { Suspense } from 'react';
import BeforePageClient from './BeforePageClient';

// Mock admin user with full permissions (authentication bypassed per project requirements)
const mockAdminUser = {
  id: 'mock-admin-user',
  email: 'dev@odeislands.com',
  firstName: 'Dev',
  lastName: 'User',
  isAdmin: true,
  permissions: ['*'] // Wildcard permission for full access
};

export default async function BeforePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <BeforePageClient user={mockAdminUser} />
    </Suspense>
  );
}

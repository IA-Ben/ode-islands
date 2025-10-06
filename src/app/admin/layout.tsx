import { ReactNode } from 'react';
import AdminTopNav from '@/components/admin/TopNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminTopNav />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}

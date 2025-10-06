import { ReactNode } from 'react';
import AdminTopNav from '@/components/admin/TopNav';
import { layout } from '@/lib/admin/designTokens';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={layout.page}>
      <AdminTopNav />
      <main className={layout.content}>
        {children}
      </main>
    </div>
  );
}

import { ReactNode } from 'react';
import { getServerUser } from '../../../server/auth';
import AdminLayoutClient from './AdminLayoutClient';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getServerUser();
  
  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}

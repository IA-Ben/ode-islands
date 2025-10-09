import { Suspense } from 'react';
import BeforePageClient from './BeforePageClient';
import { getServerUser } from '../../../server/auth';

export default async function BeforePage() {
  const user = await getServerUser();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <BeforePageClient user={user} />
    </Suspense>
  );
}

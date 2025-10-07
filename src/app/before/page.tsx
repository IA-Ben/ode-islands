import { getServerUser } from '../../../server/auth';
import BeforePageClient from './BeforePageClient';

export default async function BeforePage() {
  const user = await getServerUser();

  return <BeforePageClient user={user} />;
}

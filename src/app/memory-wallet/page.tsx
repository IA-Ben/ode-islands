import { getServerUser } from '../../../server/auth';
import MemoryWalletPageClient from './MemoryWalletPageClient';

export default async function MemoryWalletPage() {
  const user = await getServerUser();

  return <MemoryWalletPageClient user={user} />;
}

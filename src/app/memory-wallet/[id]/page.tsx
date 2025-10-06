import { getServerUser } from '../../../../server/auth';
import MemoryDetailPageClient from './MemoryDetailPageClient';

export default async function MemoryDetailPage() {
  const user = await getServerUser();

  return <MemoryDetailPageClient user={user} />;
}

import { getServerUser } from '../../../../server/auth';
import BeforeChapterPageClient from './BeforeChapterPageClient';

export default async function BeforeChapterPage() {
  const user = await getServerUser();

  return <BeforeChapterPageClient user={user} />;
}

import { getServerUser } from '../../../server/auth';
import AfterPageClient from './AfterPageClient';

export default async function AfterPage() {
  const user = await getServerUser();

  return <AfterPageClient user={user} />;
}

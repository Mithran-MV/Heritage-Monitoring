import { Dashboard } from '@/components/dashboard';
import { listSites } from '@/lib/db';

// Sites come from SQLite on every request; nothing here is statically cacheable.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <Dashboard sites={listSites()} />;
}

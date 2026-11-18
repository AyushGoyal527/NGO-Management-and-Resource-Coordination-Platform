import { useCallback, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { usePageTitle } from '../../context/SiteContext';
import { publicApi } from '../../services/websiteApi';
import { ErrorState, Pagination, Skeleton, Tabs } from '../../components/ui';
import { EventRows, Note, PageTop, Wrap } from '../../components/site';

export default function Events() {
  usePageTitle('Events');
  const [when, setWhen] = useState('upcoming');
  const [page, setPage] = useState(1);
  const load = useCallback(() => publicApi.events({ when, page, limit: 10 }), [when, page]);
  const { data, loading, error, reload } = useFetch(load);
  return (
    <>
      <PageTop title="Events" intro="Come along, bring a friend, or read about what already happened." />
      <Wrap className="py-10 sm:py-14">
        <Tabs value={when} onChange={(v) => { setWhen(v); setPage(1); }} tabs={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }]} />
        <div className="mt-6" aria-live="polite">
          {loading && <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
          {error && <ErrorState message="Events could not be loaded" onRetry={reload} />}
          {data && (data.items.length ? <EventRows events={data.items} /> : <Note title={when === 'upcoming' ? 'No upcoming events right now' : 'No past events to show'} hint={when === 'upcoming' ? 'New events are announced here first.' : undefined} />)}
          {data && data.pages > 1 && <Pagination pagination={{ page: data.page, pages: data.pages, total: data.total, limit: 10 }} onPage={setPage} />}
        </div>
      </Wrap>
    </>
  );
}

import useFetch from '../../hooks/useFetch';
import { usePageTitle } from '../../context/SiteContext';
import { publicApi } from '../../services/websiteApi';
import { ErrorState, Skeleton } from '../../components/ui';
import { Note, PageTop, ProgramList, LinkButton, Wrap } from '../../components/site';

const load = () => publicApi.programs();

export default function Programs() {
  usePageTitle('Programs');
  const { data, loading, error, reload } = useFetch(load);
  return (
    <>
      <PageTop title="Our programs" intro="The ongoing work your support makes possible." />
      <Wrap className="py-12 sm:py-16">
        {loading && <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}
        {error && <ErrorState message="Programs could not be loaded" onRetry={reload} />}
        {data && (data.length ? <ProgramList programs={data} /> : <Note title="No programs to show yet" hint="We are getting ready to share what we do." />)}
        <div className="mt-10"><LinkButton to="/donate" variant="sun">Support our programs</LinkButton></div>
      </Wrap>
    </>
  );
}

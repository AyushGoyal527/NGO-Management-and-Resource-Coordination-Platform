import { useCallback, useEffect, useState } from 'react';

// Loads a dashboard once and exposes loading / error / retry.
export default function useDashboard(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    loader().then(setData).catch(() => setError(true));
  }, [loader]);
  useEffect(load, [load]);
  return { data, error, loading: !data && !error, reload: load };
}

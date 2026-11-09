import { useCallback, useEffect, useState } from 'react';

// Runs an async loader on mount. Returns { data, loading, error, reload }.
export default function useFetch(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }));
    loader().then((data) => setState({ data, loading: false, error: false })).catch(() => setState({ data: null, loading: false, error: true }));
  }, [loader]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}

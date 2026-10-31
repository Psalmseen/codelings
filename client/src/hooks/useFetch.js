import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/** Loads `path` on mount (and when it changes). `setData` allows updating after a mutation. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await api(path), error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback(
    (update) => setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update })),
    []
  );

  return { ...state, reload, setData };
}

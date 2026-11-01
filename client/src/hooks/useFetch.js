import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/** Loads `path` on mount (and when it changes). `setData` allows updating after a mutation. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latest.current; // only the newest request may update state
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api(path);
      if (request === latest.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (request === latest.current) setState({ data: null, error, loading: false });
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

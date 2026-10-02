import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook skeleton for data fetching
 */
export const useFetch = (fetchFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchFunction();
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
};

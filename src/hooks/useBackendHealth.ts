import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth, getApiBaseUrl } from '../services/api';
import type { BackendConnectionStatus, BackendHealthResponse } from '../types/analysis';

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendConnectionStatus>('checking');
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const performCheck = useCallback(async () => {
    setStatus('checking');
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
      setStatus('connected');
      setErrorMessage(null);
      setLastChecked(new Date());
    } catch (err: any) {
      setStatus('unavailable');
      setHealthData(null);
      setErrorMessage(err.message || 'Unable to communicate with the analysis backend.');
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    checkBackendHealth()
      .then((data) => {
        if (!isCancelled) {
          setHealthData(data);
          setStatus('connected');
          setErrorMessage(null);
          setLastChecked(new Date());
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          setStatus('unavailable');
          setHealthData(null);
          setErrorMessage(err.message || 'Unable to communicate with the analysis backend.');
          setLastChecked(new Date());
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    status,
    healthData,
    errorMessage,
    lastChecked,
    retry: performCheck,
    apiBaseUrl: getApiBaseUrl()
  };
}

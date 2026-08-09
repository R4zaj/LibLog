import { useCallback } from 'react';
import { useNetwork } from '../contexts/NetworkContext';

export const useOfflineApi = () => {
  const { isOnline, addToSyncQueue } = useNetwork();

  const fetchWithOfflineSupport = useCallback(async (url, options = {}, cacheKey = null) => {
    const isGet = !options.method || options.method === 'GET';

    if (isOnline) {
      try {
        const response = await fetch(url, options);
        // If GET request with cacheKey, save to cache
        if (isGet && cacheKey && response.ok) {
          const clone = response.clone();
          const data = await clone.json();
          localStorage.setItem(`liblog_cache_${cacheKey}`, JSON.stringify(data));
        }
        return response;
      } catch (error) {
        if (isGet && cacheKey) {
          // Fallback to cache on network failure even if isOnline says true
          return getCachedResponse(cacheKey);
        }
        throw error;
      }
    } else {
      // OFFLINE MODE
      if (isGet) {
        if (cacheKey) {
          return getCachedResponse(cacheKey);
        }
        throw new Error('Offline and no cache key provided');
      } else {
        // POST, PUT, DELETE - queue the request
        addToSyncQueue(url, options, { url, cacheKey });
        
        // Return a mocked success response so the UI can proceed optimistically
        return new Response(JSON.stringify({ success: true, offlineQueued: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }, [isOnline, addToSyncQueue]);

  const getCachedResponse = (cacheKey) => {
    const cached = localStorage.getItem(`liblog_cache_${cacheKey}`);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error('Offline and data not in cache');
  };

  return { fetchWithOfflineSupport };
};

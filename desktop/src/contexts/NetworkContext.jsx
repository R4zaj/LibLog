import React, { createContext, useState, useEffect, useContext } from 'react';

const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState([]);

  const dismissSyncError = (id) => {
    setSyncErrors(prev => prev.filter(e => e.id !== id));
  };

  // Load sync queue from localStorage on boot
  useEffect(() => {
    try {
      const storedQueue = localStorage.getItem('liblog_sync_queue');
      if (storedQueue) {
        setSyncQueue(JSON.parse(storedQueue));
      }
    } catch (e) {
      console.error('Error loading sync queue', e);
    }
  }, []);

  // Save sync queue to localStorage on change
  useEffect(() => {
    localStorage.setItem('liblog_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Network event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]); // Dependency needed to process the latest queue when coming online

  const addToSyncQueue = (url, options, meta = {}) => {
    const job = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      options: {
        method: options.method,
        headers: options.headers,
        body: options.body
      },
      meta,
      timestamp: Date.now()
    };
    setSyncQueue(prev => [...prev, job]);
    return job.id;
  };

  const processSyncQueue = async () => {
    if (syncQueue.length === 0 || isSyncing || !navigator.onLine) return;
    
    setIsSyncing(true);
    let queue = [...syncQueue];

    while (queue.length > 0 && navigator.onLine) {
      const job = queue[0];
      try {
        const response = await fetch(job.url, job.options);
        if (response.status >= 500) {
          // Server-side failure: the write never landed, so keep it queued and
          // retry on the next sync instead of silently dropping it.
          console.warn('Sync job deferred, server returned', response.status, job.url);
          break;
        }
        // 2xx succeeded; 4xx is a permanent rejection (bad payload, duplicate
        // scan, expired token) that retrying will never fix. Both leave the queue.
        if (!response.ok) {
          console.warn('Sync job rejected with', response.status, '- discarding', job.url);
          const errorData = await response.json().catch(() => ({}));
          setSyncErrors(prev => [...prev, {
            id: Date.now().toString(),
            url: job.url,
            status: response.status,
            message: errorData.error || 'A queued offline action was rejected by the server.'
          }]);
        }
        queue.shift();
        setSyncQueue([...queue]); // Update state incrementally
      } catch (error) {
        console.error('Sync failed for job', job.id, error);
        break; // Stop syncing on network failure
      }
    }
    
    setIsSyncing(false);
  };

  return (
    <NetworkContext.Provider value={{ isOnline, syncQueue, addToSyncQueue, processSyncQueue, isSyncing, syncErrors, dismissSyncError }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

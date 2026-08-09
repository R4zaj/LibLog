import React, { createContext, useState, useEffect, useContext } from 'react';

const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

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
        if (response.ok || response.status >= 400) {
          // If successful OR if it's a valid server error (e.g., 400 Bad Request)
          queue.shift();
          setSyncQueue([...queue]); // Update state incrementally
        } else {
          // Network error or 5xx error, retry later
          break;
        }
      } catch (error) {
        console.error('Sync failed for job', job.id, error);
        break; // Stop syncing on network failure
      }
    }
    
    setIsSyncing(false);
  };

  return (
    <NetworkContext.Provider value={{ isOnline, syncQueue, addToSyncQueue, processSyncQueue, isSyncing }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

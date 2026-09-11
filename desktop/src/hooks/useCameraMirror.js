import { useState, useEffect, useCallback } from 'react';

export function useCameraMirror() {
  const [isMirrored, setIsMirrored] = useState(() => {
    const saved = localStorage.getItem('camera_mirrored');
    // Default to true (mirrored) so webcam movements feel natural and un-inverted
    return saved === null ? true : saved === 'true';
  });

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => {
      const next = !prev;
      localStorage.setItem('camera_mirrored', String(next));
      window.dispatchEvent(new CustomEvent('camera-mirror-changed', { detail: next }));
      return next;
    });
  }, []);

  const setMirror = useCallback((value) => {
    setIsMirrored(Boolean(value));
    localStorage.setItem('camera_mirrored', String(Boolean(value)));
    window.dispatchEvent(new CustomEvent('camera-mirror-changed', { detail: Boolean(value) }));
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.type === 'camera-mirror-changed') {
        setIsMirrored(Boolean(e.detail));
      } else if (e.key === 'camera_mirrored') {
        setIsMirrored(e.newValue !== 'false');
      }
    };

    window.addEventListener('camera-mirror-changed', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('camera-mirror-changed', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { isMirrored, toggleMirror, setMirror };
}

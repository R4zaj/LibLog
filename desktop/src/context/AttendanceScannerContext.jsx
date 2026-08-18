import { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, LogIn, LogOut, X, AlertCircle } from 'lucide-react';
import { useOfflineApi } from '../hooks/useOfflineApi';

export const AttendanceScannerContext = createContext();

// Simple video mirror - just displays an existing MediaStream
function StreamVideo({ stream, className }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
      if (stream) videoRef.current.play().catch(() => {});
    }
  }, [stream]);
  return <video ref={videoRef} className={className} autoPlay playsInline muted />;
}

export function AttendanceScannerProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  
  const location = useLocation();
  const isAttendanceRoute = location.pathname === '/attendance';

  // Refs for stream lifecycle (survive re-renders)
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const cleanupIdRef = useRef(0);
  const handleScanRef = useRef(null);

  const { fetchWithOfflineSupport } = useOfflineApi();

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const handleScan = useCallback(async (identifier) => {
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/attendance/scan`, { 
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,  
          'Content-Type': 'application/json'  
        },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (res.ok) {
        // If it was queued offline, data.user won't exist. Mock a generic UI update.
        const scanData = {
          user: data.offlineQueued ? `User ${identifier}` : `${data.user.first_name} ${data.user.last_name}`,
          action: data.offlineQueued ? 'CHECK_IN' : data.action, // Default to check-in optimistically if offline
          time: new Date().toLocaleTimeString(),
          duration: data.duration
        };
        setLastScan(scanData);
        pushToast(scanData);
      } else {
        // A failed scan used to be a console.warn only, so at the desk it just
        // looked like the camera had stopped reading QR codes.
        const message = res.status === 401 || res.status === 403
          ? 'Session expired - please log in again'
          : (data.error || `Scan failed (${res.status})`);
        console.warn('Scan failed:', message);
        pushToast({ user: message, error: true, time: new Date().toLocaleTimeString() });
      }
    } catch (e) {
      console.error('Network error connecting to server', e);
      pushToast({ user: 'Cannot reach the server', error: true, time: new Date().toLocaleTimeString() });
    }
  }, [fetchWithOfflineSupport, pushToast]);

  handleScanRef.current = handleScan;

  // ---- STREAM LIFECYCLE: managed here, never restarts on navigation ----
  useEffect(() => {
    if (!isScanning) {
      // Stop everything
      if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraStream(null);
      }
      return;
    }
    if (!selectedDevice) return;

    let cancelled = false;
    cleanupIdRef.current++;
    const myCleanupId = cleanupIdRef.current;

    const start = async () => {
      // Reuse existing stream if same device and still alive
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        if (tracks.length > 0 && tracks[0].readyState === 'live' && tracks[0].getSettings().deviceId === selectedDevice) {
          setCameraStream(streamRef.current);
          startScanLoop();
          return;
        }
        // Different device or dead stream - clean up
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      // Acquire camera with progressive relaxation
      const attempts = [
        { audio: false, video: { deviceId: { exact: selectedDevice }, width: { ideal: 640 }, height: { ideal: 480 } } },
        { audio: false, video: { deviceId: { exact: selectedDevice }, width: { ideal: 320 }, height: { ideal: 240 } } },
        { audio: false, video: { deviceId: { exact: selectedDevice } } },
        { audio: false, video: { deviceId: selectedDevice } },
      ];

      let stream = null;
      for (let i = 0; i < attempts.length; i++) {
        if (cancelled) return;
        try {
          stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
          break;
        } catch (err) {
          console.warn(`Attendance camera attempt ${i+1}/${attempts.length}:`, err.message);
          if (i < attempts.length - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
      }

      if (!stream || cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStream(stream);

      // Attach to hidden video for barcode detection
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;
        try { await hiddenVideoRef.current.play(); } catch(e) {}
      }

      startScanLoop();
    };

    const startScanLoop = async () => {
      let BarcodeDetector;
      try {
        const mod = await import('barcode-detector/ponyfill');
        BarcodeDetector = mod.BarcodeDetector;
      } catch (e) {
        // Without the detector the camera runs but nothing is ever scanned,
        // so make the failure loud instead of dying silently.
        console.error('Failed to load barcode-detector; attendance scanning is disabled.', e);
        return;
      }

      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] });
      const lastScanned = { text: null, time: 0 };

      const loop = async () => {
        if (cancelled) return;
        const video = hiddenVideoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
          scanTimerRef.current = setTimeout(loop, 300);
          return;
        }
        try {
          const barcodes = await detector.detect(video);
          if (cancelled) return;
          if (barcodes.length > 0) {
            const text = barcodes[0].rawValue;
            if (text && text.trim().length > 0) {
              const isBook = /^BK-[A-Z0-9-]+$/.test(text);
              const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(text);
              const isOldUser = /^[A-Z0-9-]+$/.test(text);
              if (isBook || isJwt || isOldUser) {
                const now = Date.now();
                if (lastScanned.text !== text || (now - lastScanned.time) >= 3000) {
                  lastScanned.text = text;
                  lastScanned.time = now;
                  handleScanRef.current(text);
                }
              }
            }
          }
        } catch (e) {}
        if (!cancelled) scanTimerRef.current = setTimeout(loop, 300);
      };
      loop();
    };

    start();

    return () => {
      cancelled = true;
      if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
      // Deferred cleanup for Strict Mode
      const capturedStream = streamRef.current;
      const capturedId = myCleanupId;
      setTimeout(() => {
        if (cleanupIdRef.current === capturedId && capturedStream) {
          capturedStream.getTracks().forEach(t => t.stop());
          if (streamRef.current === capturedStream) { streamRef.current = null; setCameraStream(null); }
        }
      }, 500);
    };
  }, [isScanning, selectedDevice]);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <AttendanceScannerContext.Provider value={{ 
      isScanning, setIsScanning, setPortalTarget, lastScan, setLastScan,
      handleScan, selectedDevice, setSelectedDevice, cameraStream
    }}>
      {children}

      {/* Hidden video for barcode detection - always mounted when scanning */}
      {isScanning && (
        <video
          ref={hiddenVideoRef}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999 }}
          muted playsInline
        />
      )}

      {/* Display widget - just shows the stream, never manages the camera */}
      {isScanning && cameraStream && (
        <AttendanceCameraDisplay
          stream={cameraStream}
          portalTarget={portalTarget}
          isAttendanceRoute={isAttendanceRoute}
          onStop={() => setIsScanning(false)}
        />
      )}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto p-4 rounded-lg border shadow-lg flex items-start gap-3 w-72 animate-fade-in ${toast.error ? 'bg-red-50 border-red-200 text-gray-900' : toast.action === 'CHECK_IN' ? 'bg-green-50 border-green-200 text-gray-900' : 'bg-orange-50 border-orange-200 text-gray-900'} dark:bg-dark-card dark:border-dark-border`}>
             <div className={`p-2 rounded-full ${toast.error ? 'bg-red-100 text-red-700' : toast.action === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {toast.error ? <AlertCircle size={20} /> : toast.action === 'CHECK_IN' ? <LogIn size={20} /> : <LogOut size={20} />}
             </div>
             <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-slate-200 text-sm">{toast.user}</p>
                <p className={`text-xs font-semibold ${toast.error ? 'text-red-700 dark:text-red-400' : toast.action === 'CHECK_IN' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                   {toast.error ? `Scan not recorded • ${toast.time}` : `${toast.action === 'CHECK_IN' ? 'Checked In' : 'Checked Out'} • ${toast.time}`}
                </p>
                {toast.duration && (
                   <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Duration: {toast.duration} mins</p>
                )}
             </div>
             <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
               <X size={16} />
             </button>
          </div>
        ))}
      </div>
    </AttendanceScannerContext.Provider>
  );
}

// Pure display component - just renders a <video> connected to the stream.
// No camera management here, so mounting/unmounting is free.
function AttendanceCameraDisplay({ stream, portalTarget, isAttendanceRoute, onStop }) {
  const videoElement = <StreamVideo stream={stream} className="w-full h-auto object-cover max-h-96" />;

  if (isAttendanceRoute && portalTarget) {
    return createPortal(videoElement, portalTarget);
  }

  if (!isAttendanceRoute) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-2xl p-4 flex flex-col gap-3 w-64 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Camera size={18} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Attendance On</span>
          </div>
          <button onClick={onStop} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">
            <CameraOff size={14} />
          </button>
        </div>
        <div className="w-full h-32 bg-black rounded overflow-hidden relative">
          {videoElement}
        </div>
        <p className="text-[10px] text-gray-500 text-center dark:text-slate-400">Scanning continues in background</p>
      </div>
    );
  }

  return null;
}

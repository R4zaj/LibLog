import { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, LogIn, LogOut, X, AlertCircle } from 'lucide-react';
import { useOfflineApi } from '../hooks/useOfflineApi';
import { playScannerSound } from '../utils/scannerAudio';
import MovableAttendanceWidget from '../components/MovableAttendanceWidget';

export const AttendanceScannerContext = createContext();

// Simple video mirror - displays an existing MediaStream with mirror transform
function StreamVideo({ stream, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
      if (stream) videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ transform: 'scaleX(-1)' }}
      autoPlay
      playsInline
      muted
    />
  );
}

export function AttendanceScannerProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'verifying' | 'success' | 'error', title, message }
  
  const location = useLocation();
  const isAttendanceRoute = location.pathname === '/attendance';

  // Refs for stream lifecycle (survive re-renders)
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const cleanupIdRef = useRef(0);
  const handleScanRef = useRef(null);

  const { fetchWithOfflineSupport } = useOfflineApi();

  const processingRef = useRef(false);

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    if (hiddenVideoRef.current && cameraStream) {
      if (hiddenVideoRef.current.srcObject !== cameraStream) {
        hiddenVideoRef.current.srcObject = cameraStream;
        hiddenVideoRef.current.play().catch(() => {});
      }
    }
  }, [cameraStream]);

  const handleScan = useCallback(async (identifier) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      setScanFeedback({ type: 'verifying', message: 'Verifying QR code...' });

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
        const userName = data.offlineQueued ? `User ${identifier}` : `${data.user.first_name} ${data.user.last_name}`;
        const actionText = data.action === 'CHECK_IN' ? 'Checked In' : 'Checked Out';
        const scanData = {
          user: userName,
          action: data.offlineQueued ? 'CHECK_IN' : data.action,
          time: new Date().toLocaleTimeString(),
          duration: data.duration
        };
        setLastScan(scanData);
        pushToast(scanData);
        playScannerSound('success');
        setScanFeedback({
          type: 'success',
          title: userName,
          message: `${actionText} • ${scanData.time}`
        });
        setTimeout(() => setScanFeedback(null), 2000);
      } else {
        const message = (res.status === 401 || res.status === 403)
          ? (data.error === 'Invalid or expired QR token' ? data.error : (data.error || 'Session expired - please log in again'))
          : (data.error || `Scan failed (${res.status})`);
        console.warn('Scan failed:', message);
        playScannerSound('error');
        pushToast({ user: message, error: true, time: new Date().toLocaleTimeString() });
        setScanFeedback({
          type: 'error',
          title: data.error === 'Invalid or expired QR token' ? 'Expired QR Token' : 'Scan Error',
          message: data.error === 'Invalid or expired QR token'
            ? 'QR token has expired. Please refresh the QR code on your mobile device.'
            : message
        });
        setTimeout(() => setScanFeedback(null), 3500);
      }
    } catch (e) {
      console.error('Network error connecting to server', e);
      playScannerSound('error');
      pushToast({ user: 'Cannot reach the server', error: true, time: new Date().toLocaleTimeString() });
      setScanFeedback({
        type: 'error',
        title: 'Connection Error',
        message: 'Cannot reach the server. Please check network connection.'
      });
      setTimeout(() => setScanFeedback(null), 3500);
    } finally {
      processingRef.current = false;
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
          if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject !== streamRef.current) {
            hiddenVideoRef.current.srcObject = streamRef.current;
            try { await hiddenVideoRef.current.play(); } catch(e) {}
          }
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
          scanTimerRef.current = setTimeout(loop, 250);
          return;
        }
        try {
          const barcodes = await detector.detect(video);
          if (cancelled) return;
          if (barcodes.length > 0) {
            const text = barcodes[0].rawValue;
            if (text && text.trim().length > 0) {
              const isBook = /^BK-[A-Za-z0-9-]+$/i.test(text);
              const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(text);
              const isOldUser = /^[A-Za-z0-9-_/]+$/i.test(text);
              const isOffline = /^OFFLINE:/.test(text);
              if (isBook || isJwt || isOldUser || isOffline) {
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
        if (!cancelled) scanTimerRef.current = setTimeout(loop, 250);
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
      handleScan, selectedDevice, setSelectedDevice, cameraStream,
      scanFeedback, setScanFeedback
    }}>
      {children}

      {/* Hidden video for barcode detection - given real dimensions so browser decodes active frames */}
      {isScanning && (
        <video
          ref={hiddenVideoRef}
          width={640}
          height={480}
          style={{ position: 'fixed', top: -9999, left: -9999, width: '640px', height: '480px', opacity: 0.001, pointerEvents: 'none' }}
          muted playsInline autoPlay
        />
      )}

      {/* Display widget - just shows the stream, never manages the camera */}
      {isScanning && cameraStream && (
        <AttendanceCameraDisplay
          stream={cameraStream}
          portalTarget={portalTarget}
          isAttendanceRoute={isAttendanceRoute}
          onStop={() => setIsScanning(false)}
          scanFeedback={scanFeedback}
          lastScan={lastScan}
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
function AttendanceCameraDisplay({ stream, portalTarget, isAttendanceRoute, onStop, scanFeedback, lastScan }) {
  const videoElement = (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <StreamVideo stream={stream} className="w-full h-auto object-cover max-h-96" />

      {/* Live Scanner indicator in corner */}
      <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-green-400 flex items-center gap-1.5 pointer-events-none select-none">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span>Live Scanner</span>
      </div>

      {/* In-Scanner Feedback Overlay */}
      {scanFeedback && (
        <div className={`absolute inset-0 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in transition-all ${
          scanFeedback.type === 'error'
            ? 'bg-red-950/80 border-4 border-red-500'
            : scanFeedback.type === 'success'
            ? 'bg-emerald-950/80 border-4 border-emerald-500'
            : 'bg-black/60'
        }`}>
          {scanFeedback.type === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/30 border-2 border-red-400 flex items-center justify-center mb-2 animate-bounce">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h4 className="text-white font-bold text-base mb-1 tracking-wide">{scanFeedback.title || 'Scan Error'}</h4>
              <p className="text-red-200 text-xs font-semibold max-w-xs leading-relaxed">{scanFeedback.message}</p>
            </>
          )}

          {scanFeedback.type === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center mb-2 animate-pulse">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-white font-bold text-base mb-0.5">{scanFeedback.title}</h4>
              <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider">{scanFeedback.message}</p>
            </>
          )}

          {scanFeedback.type === 'verifying' && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-xs font-medium tracking-wide">{scanFeedback.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isAttendanceRoute && portalTarget && portalTarget.isConnected) {
    return createPortal(videoElement, portalTarget);
  }

  if (!isAttendanceRoute) {
    return (
      <MovableAttendanceWidget
        videoElement={videoElement}
        onStop={onStop}
        lastScan={lastScan}
      />
    );
  }

  return null;
}


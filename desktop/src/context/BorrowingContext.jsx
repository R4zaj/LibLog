import { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { BookUp, X } from 'lucide-react';

import { useCameraMirror } from '../hooks/useCameraMirror';

export const BorrowingContext = createContext(null);

// Simple video mirror - displays an existing MediaStream with mirror transform
function StreamVideo({ stream, className }) {
  const videoRef = useRef(null);
  const { isMirrored } = useCameraMirror();

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
      style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
      autoPlay
      playsInline
      muted
    />
  );
}

export function BorrowingProvider({ children }) {
  const location = useLocation();
  const isBorrowingRoute = location.pathname === '/borrowing';

  // --- CAMERA STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [portalTarget, setPortalTarget] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);

  // --- BORROWING FLOW STATE ---
  const [activeTab, setActiveTab] = useState('Borrow');
  
  // Borrow Flow
  const [step, setStep] = useState(1);
  const [scannedBook, setScannedBook] = useState(null);
  const [scannedUser, setScannedUser] = useState(null);
  
  // Return Flow
  const [returnStep, setReturnStep] = useState(1);
  const [returnBookIdentifier, setReturnBookIdentifier] = useState(null);
  const [returnRecord, setReturnRecord] = useState(null);
  const [returnScannedUser, setReturnScannedUser] = useState(null);

  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Refs for stream lifecycle
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const cleanupIdRef = useRef(0);
  const handleScanRef = useRef(null);

  // --- NOTIFICATIONS ---
  const triggerToast = useCallback((title, message, isError = false) => {
    const time = Date.now();
    setToastMessage({ title, message, isError, time });
    setTimeout(() => {
      setToastMessage(current => (current?.time === time ? null : current));
    }, 5000);
  }, []);

  // --- ACTIONS ---
  const handleScan = useCallback(async (identifier) => {
    setError(null);
    if (!identifier) return;

    if (activeTab === 'Borrow') {
      if (step === 1) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-book/${identifier}`);
          const data = await res.json();
          if (res.ok) {
            setScannedBook(data);
            setStep(2);
            if (!isBorrowingRoute) triggerToast('Book Scanned', `${data.title} ready for checkout. Now scan student ID.`);
          } else {
            setError(data.error || 'Book validation failed');
            if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Invalid book', true);
          }
        } catch (e) {
          setError('Server error during validation');
        }
      } else if (step === 2) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-user/${identifier}`);
          const data = await res.json();
          if (res.ok) {
            setScannedUser(data);
            setStep(3);
            if (!isBorrowingRoute) triggerToast('Student Verified', `${data.first_name} ${data.last_name}. Please confirm checkout on Borrowing tab.`);
          } else {
            setError(data.error || 'User validation failed');
            if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Invalid student', true);
          }
        } catch (e) {
          setError('Server error during validation');
        }
      }
    } else if (activeTab === 'Return') {
      if (returnStep === 1) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-book/${identifier}?action=return`);
          const data = await res.json();
          if (res.ok) {
            setReturnBookIdentifier(identifier);
            setReturnStep(2);
            if (!isBorrowingRoute) triggerToast('Book Scanned', 'Now scan the returning student ID.');
          } else {
            setError(data.error || 'Could not find book');
            if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Could not find book', true);
          }
        } catch (e) {
          setError('Server error during scan');
        }
      } else if (returnStep === 2) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/user-active-borrow/${returnBookIdentifier}/${identifier}`);
          const data = await res.json();
          if (res.ok) {
            setReturnRecord(data);
            setReturnScannedUser(data.user);
            setReturnStep(3);
            if (!isBorrowingRoute) triggerToast('Return Ready', 'Please confirm return on Borrowing tab.');
          } else {
            setError(data.error || 'No active borrow record.');
            if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'No active borrow record.', true);
          }
        } catch (e) {
          setError('Server error');
        }
      }
    }
  }, [activeTab, step, returnStep, returnBookIdentifier, isBorrowingRoute, triggerToast]);

  handleScanRef.current = handleScan;

  // ---- STREAM LIFECYCLE ----
  useEffect(() => {
    if (!isScanning) {
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
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

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
          console.warn(`Borrowing camera attempt ${i+1}/${attempts.length}:`, err.message);
          if (i < attempts.length - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
      }

      if (!stream || cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStream(stream);

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
        console.error('Failed to load barcode-detector; borrowing scanning is disabled.', e);
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

  const value = {
    isScanning, setIsScanning,
    selectedDevice, setSelectedDevice,
    portalTarget, setPortalTarget,
    handleScan, cameraStream,
    activeTab, setActiveTab,
    step, setStep,
    scannedBook, setScannedBook,
    scannedUser, setScannedUser,
    returnStep, setReturnStep,
    returnBookIdentifier, setReturnBookIdentifier,
    returnRecord, setReturnRecord,
    returnScannedUser, setReturnScannedUser,
    error, setError
  };

  return (
    <BorrowingContext.Provider value={value}>
      {children}

      {/* Hidden video for barcode detection */}
      {isScanning && (
        <video
          ref={hiddenVideoRef}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999 }}
          muted playsInline
        />
      )}

      {/* Display widget */}
      {isScanning && cameraStream && (
        <BorrowingCameraDisplay
          stream={cameraStream}
          portalTarget={portalTarget}
          isBorrowingRoute={isBorrowingRoute}
          onStop={() => setIsScanning(false)}
          activeTab={activeTab}
          step={activeTab === 'Borrow' ? step : returnStep}
        />
      )}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 max-w-sm w-full shadow-lg rounded-lg border flex items-start gap-3 p-4 z-50 animate-fade-in ${
          toastMessage.isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex-1">
            <h4 className="font-bold text-sm">{toastMessage.title}</h4>
            <p className="text-xs mt-1 opacity-90">{toastMessage.message}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-current opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
    </BorrowingContext.Provider>
  );
}

function BorrowingCameraDisplay({ stream, portalTarget, isBorrowingRoute, onStop, activeTab, step }) {
  const videoElement = <StreamVideo stream={stream} className="w-full h-auto object-cover max-h-96" />;

  if (isBorrowingRoute && portalTarget) {
    return createPortal(videoElement, portalTarget);
  }

  if (!isBorrowingRoute) {
    return (
      <div className="fixed bottom-24 right-6 w-64 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-2xl overflow-hidden z-40 flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
            <BookUp size={14} /> Borrowing Scanner
          </div>
          <button onClick={onStop} className="text-blue-400 hover:text-blue-600 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="relative w-full h-36 bg-black flex items-center justify-center overflow-hidden">
          {videoElement}
        </div>
        <div className="px-3 py-2 bg-gray-50 dark:bg-dark-bg text-[10px] text-gray-500 font-medium text-center border-t border-gray-200 dark:border-dark-border">
          {activeTab}: Step {step}
        </div>
      </div>
    );
  }

  return null;
}

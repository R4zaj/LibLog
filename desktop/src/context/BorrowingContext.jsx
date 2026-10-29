import { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { BookUp, X, AlertCircle } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { playScannerSound } from '../utils/scannerAudio';

export const BorrowingContext = createContext(null);

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

export function BorrowingProvider({ children }) {
  const location = useLocation();
  const isBorrowingRoute = location.pathname === '/borrowing';
  const { isOnline } = useNetwork();

  // --- CAMERA STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [portalTarget, setPortalTarget] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'verifying' | 'success' | 'error', title, message }

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
  const processingRef = useRef(false);

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
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      setError(null);
      if (!identifier) return;

      setScanFeedback({ type: 'verifying', message: 'Validating barcode / QR...' });

      if (activeTab === 'Borrow') {
        if (step === 1) {
          if (!isOnline) {
            setScannedBook({ id: `offline-${identifier}`, title: `Book (${identifier})`, qr_code: identifier, isbn: identifier });
            setStep(2);
            playScannerSound('chime');
            setScanFeedback({ type: 'success', title: 'Book Scanned', message: `Offline Mode: Book (${identifier}) ready` });
            setTimeout(() => setScanFeedback(null), 2500);
            if (!isBorrowingRoute) triggerToast('Book Scanned', `Offline Mode: Book (${identifier}) ready. Now scan student ID.`);
            return;
          }
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-book/${identifier}`);
            const data = await res.json();
            if (res.ok) {
              setScannedBook(data);
              setStep(2);
              playScannerSound('chime');
              setScanFeedback({
                type: 'success',
                title: data.library_use_only ? 'Book Verified (Library Use Only)' : 'Book Verified',
                message: data.library_use_only ? `${data.title} • In Circulation` : data.title
              });
              setTimeout(() => setScanFeedback(null), 2500);
              if (!isBorrowingRoute) {
                triggerToast(
                  data.library_use_only ? 'In Circulation Book Scanned' : 'Book Scanned',
                  data.library_use_only
                    ? `${data.title} is for library use only. Scan student ID for in-library reading.`
                    : `${data.title} ready for checkout. Now scan student ID.`
                );
              }
            } else {
              setError(data.error || 'Book validation failed');
              playScannerSound('error');
              setScanFeedback({
                type: 'error',
                title: 'Invalid Book',
                message: data.error || 'Book validation failed'
              });
              setTimeout(() => setScanFeedback(null), 3500);
              if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Invalid book', true);
            }
          } catch (e) {
            setError('Server error during validation');
            playScannerSound('error');
            setScanFeedback({
              type: 'error',
              title: 'Server Error',
              message: 'Server error during book validation'
            });
            setTimeout(() => setScanFeedback(null), 3500);
          }
        } else if (step === 2) {
          if (!isOnline) {
            setScannedUser({ id: `offline-${identifier}`, first_name: 'Student', last_name: `(${identifier})`, student_id: identifier });
            setStep(3);
            playScannerSound('chime');
            setScanFeedback({ type: 'success', title: 'Student Verified', message: `Offline Mode: Student (${identifier})` });
            setTimeout(() => setScanFeedback(null), 2500);
            if (!isBorrowingRoute) triggerToast('Student Verified', `Offline Mode: Student (${identifier}). Please confirm checkout on Borrowing tab.`);
            return;
          }
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-user/${identifier}`);
            const data = await res.json();
            if (res.ok) {
              setScannedUser(data);
              setStep(3);
              playScannerSound('chime');
              setScanFeedback({ type: 'success', title: 'Student Verified', message: `${data.first_name} ${data.last_name}` });
              setTimeout(() => setScanFeedback(null), 2500);
              if (!isBorrowingRoute) triggerToast('Student Verified', `${data.first_name} ${data.last_name}. Please confirm checkout on Borrowing tab.`);
            } else {
              setError(data.error || 'User validation failed');
              playScannerSound('error');
              const isExpired = data.error === 'Invalid or expired QR token';
              setScanFeedback({
                type: 'error',
                title: isExpired ? 'Expired QR Token' : 'Student Error',
                message: isExpired
                  ? 'QR token has expired. Please refresh the QR code on your mobile device.'
                  : (data.error || 'Invalid student ID')
              });
              setTimeout(() => setScanFeedback(null), 3500);
              if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Invalid student', true);
            }
          } catch (e) {
            setError('Server error during validation');
            playScannerSound('error');
            setScanFeedback({
              type: 'error',
              title: 'Server Error',
              message: 'Server error during student validation'
            });
            setTimeout(() => setScanFeedback(null), 3500);
          }
        }
      } else if (activeTab === 'Return') {
        if (returnStep === 1) {
          if (!isOnline) {
            setReturnBookIdentifier(identifier);
            setReturnStep(2);
            playScannerSound('chime');
            setScanFeedback({ type: 'success', title: 'Book Scanned', message: 'Offline Mode: Now scan returning student ID' });
            setTimeout(() => setScanFeedback(null), 2500);
            if (!isBorrowingRoute) triggerToast('Book Scanned', 'Offline Mode: Now scan the returning student ID.');
            return;
          }
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/validate-book/${identifier}?action=return`);
            const data = await res.json();
            if (res.ok) {
              setReturnBookIdentifier(identifier);
              setReturnStep(2);
              playScannerSound('chime');
              setScanFeedback({ type: 'success', title: 'Book Scanned', message: 'Now scan returning student ID' });
              setTimeout(() => setScanFeedback(null), 2500);
              if (!isBorrowingRoute) triggerToast('Book Scanned', 'Now scan the returning student ID.');
            } else {
              setError(data.error || 'Could not find book');
              playScannerSound('error');
              setScanFeedback({
                type: 'error',
                title: 'Invalid Book',
                message: data.error || 'Could not find book'
              });
              setTimeout(() => setScanFeedback(null), 3500);
              if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'Could not find book', true);
            }
          } catch (e) {
            setError('Server error during scan');
            playScannerSound('error');
            setScanFeedback({
              type: 'error',
              title: 'Server Error',
              message: 'Server error during book scan'
            });
            setTimeout(() => setScanFeedback(null), 3500);
          }
        } else if (returnStep === 2) {
          if (!isOnline) {
            setReturnRecord({ id: 'offline-record', book: { title: `Book (${returnBookIdentifier})` } });
            setReturnScannedUser({ id: `offline-${identifier}`, first_name: 'Student', last_name: `(${identifier})`, student_id: identifier });
            setReturnStep(3);
            playScannerSound('chime');
            setScanFeedback({ type: 'success', title: 'Return Ready', message: 'Offline Mode: Please confirm return on Borrowing tab' });
            setTimeout(() => setScanFeedback(null), 2500);
            if (!isBorrowingRoute) triggerToast('Return Ready', 'Offline Mode: Please confirm return on Borrowing tab.');
            return;
          }
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/user-active-borrow/${returnBookIdentifier}/${identifier}`);
            const data = await res.json();
            if (res.ok) {
              setReturnRecord(data);
              setReturnScannedUser(data.user);
              setReturnStep(3);
              playScannerSound('chime');
              setScanFeedback({ type: 'success', title: 'Return Ready', message: `${data.user?.first_name || 'Student'} ${data.user?.last_name || ''}` });
              setTimeout(() => setScanFeedback(null), 2500);
              if (!isBorrowingRoute) triggerToast('Return Ready', 'Please confirm return on Borrowing tab.');
            } else {
              setError(data.error || 'No active borrow record.');
              playScannerSound('error');
              const isExpired = data.error === 'Invalid or expired QR token';
              setScanFeedback({
                type: 'error',
                title: isExpired ? 'Expired QR Token' : 'Return Error',
                message: isExpired
                  ? 'QR token has expired. Please refresh the QR code on your mobile device.'
                  : (data.error || 'No active borrow record.')
              });
              setTimeout(() => setScanFeedback(null), 3500);
              if (!isBorrowingRoute) triggerToast('Scan Failed', data.error || 'No active borrow record.', true);
            }
          } catch (e) {
            setError('Server error');
            playScannerSound('error');
            setScanFeedback({
              type: 'error',
              title: 'Server Error',
              message: 'Server error during return verification'
            });
            setTimeout(() => setScanFeedback(null), 3500);
          }
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [activeTab, step, returnStep, returnBookIdentifier, isBorrowingRoute, isOnline, triggerToast]);

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
    error, setError,
    scanFeedback, setScanFeedback
  };

  return (
    <BorrowingContext.Provider value={value}>
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

      {/* Display widget */}
      {isScanning && cameraStream && (
        <BorrowingCameraDisplay
          stream={cameraStream}
          portalTarget={portalTarget}
          isBorrowingRoute={isBorrowingRoute}
          onStop={() => setIsScanning(false)}
          activeTab={activeTab}
          step={activeTab === 'Borrow' ? step : returnStep}
          scanFeedback={scanFeedback}
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

function BorrowingCameraDisplay({ stream, portalTarget, isBorrowingRoute, onStop, activeTab, step, scanFeedback }) {
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

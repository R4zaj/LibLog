import { useState, useRef, useEffect, useContext } from 'react';
import { Maximize, Camera, Printer, ArrowRightLeft, CameraOff } from 'lucide-react';
import { AttendanceScannerContext } from '../context/AttendanceScannerContext';
import { BorrowingContext } from '../context/BorrowingContext';

export function ZxingScanner({ onScan, deviceId }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const cleanupIdRef = useRef(0);
  const lastScanned = useRef({ text: null, time: 0 });
  const [showCheck, setShowCheck] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const activeDeviceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Cancel any pending deferred cleanup from a previous unmount (Strict Mode)
    cleanupIdRef.current++;
    const myCleanupId = cleanupIdRef.current;

    const attachStream = async (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        try { await videoRef.current.play(); } catch (e) { /* AbortError ok */ }
      }
    };

    const startScanLoop = async () => {
      let BarcodeDetector;
      try {
        const module = await import('barcode-detector/ponyfill');
        BarcodeDetector = module.BarcodeDetector;
      } catch (e) {
        console.error('Failed to load BarcodeDetector:', e);
        return;
      }

      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] });

      const scanLoop = async () => {
        if (cancelled) return;
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
          scanTimerRef.current = setTimeout(scanLoop, 300);
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
                if (lastScanned.current.text !== text || (now - lastScanned.current.time) >= 3000) {
                  lastScanned.current = { text, time: now };
                  setShowCheck(true);
                  setTimeout(() => setShowCheck(false), 1200);
                  onScanRef.current(text);
                }
              }
            }
          }
        } catch (e) {
          // Ignore detection errors
        }

        if (!cancelled) {
          scanTimerRef.current = setTimeout(scanLoop, 300);
        }
      };

      scanLoop();
    };

    const startCamera = async () => {
      // If we already have a live stream for this exact device, just reattach it
      // This handles React Strict Mode double-invoke without restarting the camera
      if (streamRef.current && activeDeviceRef.current === deviceId) {
        const tracks = streamRef.current.getTracks();
        if (tracks.length > 0 && tracks[0].readyState === 'live') {
          await attachStream(streamRef.current);
          startScanLoop();
          return;
        }
      }

      // Different device or no stream — clean up old one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        activeDeviceRef.current = null;
      }
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      // Progressive constraint relaxation for multi-camera USB bandwidth issues
      const constraintAttempts = deviceId
        ? [
            { audio: false, video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } } },
            { audio: false, video: { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } } },
            { audio: false, video: { deviceId: { exact: deviceId } } },
            { audio: false, video: { deviceId: deviceId } },
          ]
        : [
            { audio: false, video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } },
            { audio: false, video: { facingMode: 'environment', width: { ideal: 320 }, height: { ideal: 240 } } },
            { audio: false, video: { facingMode: 'environment' } },
            { audio: false, video: true },
          ];

      let stream = null;
      for (let attempt = 0; attempt < constraintAttempts.length; attempt++) {
        if (cancelled) return;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraintAttempts[attempt]);
          break;
        } catch (err) {
          console.warn(`Camera attempt ${attempt + 1}/${constraintAttempts.length} failed:`, err.message);
          if (attempt < constraintAttempts.length - 1) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }

      if (!stream || cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      activeDeviceRef.current = deviceId;
      await attachStream(stream);
      startScanLoop();
    };

    startCamera();

    return () => {
      cancelled = true;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      // DEFERRED CLEANUP: Don't kill the stream immediately.
      // React Strict Mode will re-mount within ~50ms. If no re-mount reclaims
      // the stream, the deferred cleanup will stop it after 500ms.
      const capturedStream = streamRef.current;
      const capturedCleanupId = myCleanupId;
      setTimeout(() => {
        // Only stop if no new mount has cancelled this cleanup
        if (cleanupIdRef.current === capturedCleanupId && capturedStream) {
          capturedStream.getTracks().forEach(t => t.stop());
          if (streamRef.current === capturedStream) {
            streamRef.current = null;
            activeDeviceRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }
      }, 500);
    };
  }, [deviceId]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-auto object-cover max-h-96"
        style={{ transform: 'scaleX(-1)' }}
        autoPlay
        playsInline
        muted
      />
      {showCheck && (
        <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center transition-all z-10">
          <div className="bg-white dark:bg-dark-card rounded-full p-4 shadow-2xl animate-pulse">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ScannerSim({ 
  title, 
  subtitle, 
  boxTitle, 
  placeholder, 
  helperText, 
  icon: Icon = Maximize,
  onSubmit,
  isGlobalScanner = false,
  globalIsScanning,
  onStartScanner,
  onStopScanner,
  setPortalTarget,
  globalSelectedDevice,
  onSelectGlobalDevice
}) {
  const [inputValue, setInputValue] = useState('');
  const [localIsScanning, setLocalIsScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [localSelectedDevice, setLocalSelectedDevice] = useState('');

  const isScanning = isGlobalScanner ? globalIsScanning : localIsScanning;
  const selectedDevice = isGlobalScanner ? globalSelectedDevice : localSelectedDevice;
  const setSelectedDevice = isGlobalScanner ? onSelectGlobalDevice : setLocalSelectedDevice;

  const startScanner = isGlobalScanner ? onStartScanner : () => setLocalIsScanning(true);
  const stopScanner = isGlobalScanner ? onStopScanner : () => setLocalIsScanning(false);

  useEffect(() => {
    const getDevices = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const deviceInfos = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');

          setDevices(videoDevices);
          
          if (videoDevices.length > 0 && !selectedDevice) {
            let defaultDev = videoDevices.find(d => d.label.toLowerCase().includes('back'));
            
            // Filter out virtual cameras
            const validDevices = videoDevices.filter(d => {
              const isVirtual = d.label.toLowerCase().includes('virtual') || d.label.toLowerCase().includes('iriun') || d.label.toLowerCase().includes('obs');
              return !isVirtual;
            });
            
            if (validDevices.length > 0) {
              defaultDev = validDevices.find(d => d.label.toLowerCase().includes('back')) || validDevices[0];
            }
            
            setSelectedDevice(defaultDev ? defaultDev.deviceId : videoDevices[0].deviceId);
          }
        } catch (err) {
          console.error("Error enumerating devices:", err);
        }
      }
    };
    getDevices();
  }, [isScanning, isGlobalScanner, selectedDevice, setSelectedDevice]);

  const handleScanSuccess = (decodedText) => {
    // Deliberately NOT calling setIsScanning(false) here
    // so the camera remains active for continuous scanning!
    if (onSubmit) onSubmit(decodedText);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && onSubmit) {
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 dark:border-dark-border flex items-start gap-3">
        <div className="w-10 h-10 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 dark:text-slate-200 text-base">{title}</h3>
            {title.includes('Student') && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Ready
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Camera Box */}
        <div className="border border-dashed border-gray-300 dark:border-dark-border rounded-lg p-2">
          <div className="flex justify-between items-center px-2 py-1 mb-2">
            <span className="text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
              <Icon size={12} /> {boxTitle}
            </span>
            <span className={`text-[10px] font-medium flex items-center gap-1 ${isScanning ? 'text-green-500' : 'text-gray-400 dark:text-slate-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div> 
              {isScanning ? 'Scanner Active' : 'Scanner Inactive'}
            </span>
          </div>
          
          <div className={`w-full overflow-hidden rounded bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-dark-border ${!isScanning ? 'h-64 flex flex-col items-center justify-center text-primary-600 dark:text-primary-400 gap-3' : 'bg-black flex items-center justify-center min-h-[16rem]'}`}>
            {isScanning ? (
              isGlobalScanner ? (
                <div ref={(el) => setPortalTarget && setPortalTarget(el)} className="w-full h-full min-h-[16rem] bg-black overflow-hidden relative"></div>
              ) : (
                <ZxingScanner key={selectedDevice || 'default'} onScan={handleScanSuccess} deviceId={selectedDevice} />
              )
            ) : (
              <>
                <div className="w-12 h-12 bg-white dark:bg-transparent border border-transparent dark:border-primary-800 rounded-full flex items-center justify-center shadow-sm">
                  <Camera size={24} />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Click "Start Scanner" to activate the camera</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap w-full">
          {!isScanning ? (
            <button onClick={startScanner} className="self-start px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded shadow-sm hover:bg-primary-900 flex items-center gap-2 transition-colors">
              <Camera size={16} /> Start Scanner
            </button>
          ) : (
            <button onClick={stopScanner} className="self-start px-4 py-2 bg-red-600 text-white text-sm font-medium rounded shadow-sm hover:bg-red-700 flex items-center gap-2 transition-colors">
              <CameraOff size={16} /> Stop Scanner
            </button>
          )}
          
          {devices.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Camera:</span>
              <select 
                className="bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-slate-200"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-dark-border">
          <span className="text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
            <Printer size={12} /> Manual Input
          </span>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder} 
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:text-slate-200"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-primary-300 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-primary-400 transition-colors">
              Submit
            </button>
          </div>
          {helperText && (
            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mt-1">
              {helperText}
            </span>
          )}
        </form>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Maximize, Camera, Printer, ArrowRightLeft, CameraOff } from 'lucide-react';
import { useZxing } from 'react-zxing';

function ZxingScanner({ onScan, deviceId }) {
  const lastScanned = useRef({ text: null, time: 0 });
  const [showCheck, setShowCheck] = useState(false);

  const constraints = deviceId 
    ? { video: { deviceId: { exact: deviceId } } }
    : { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };

  const { ref } = useZxing({
    constraints,
    // Restrict to standard formats to prevent hallucinating background noise as Code39/ITF
    formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'],
    onDecodeResult(result) {
      const text = result.rawValue || result.getText?.() || result.text;
      
      // Filter out empty reads
      if (!text || text.trim().length < 1) {
        return;
      }

      // STRICT VALIDATION: Must be a Book ID (BK-...) or a JWT (three base64url segments) or legacy USR-...
      const isBook = /^BK-[A-Z0-9-]+$/.test(text);
      const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(text);
      const isOldUser = /^[A-Z0-9-]+$/.test(text); // For backwards compatibility and generic IDs like CCC-1234

      if (!isBook && !isJwt && !isOldUser) {
        console.warn('Blocked malicious or invalid QR payload:', text);
        return; 
      }

      const now = Date.now();
      
      // Prevent scanning the exact same code multiple times within 3 seconds
      if (lastScanned.current.text === text && (now - lastScanned.current.time) < 3000) {
        return;
      }
      
      lastScanned.current = { text, time: now };
      
      // Flash the green checkmark
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 1200);

      onScan(text);
    },
    onError(error) {
      // Ignore background decode errors that happen continuously before a code is found
    }
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video ref={ref} className="w-full h-auto object-cover max-h-96" />
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
  onSubmit 
}) {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  useEffect(() => {
    if (isScanning && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
          const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');
          setDevices(videoDevices);
          if (videoDevices.length > 0 && !selectedDevice) {
            const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
            setSelectedDevice(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
          }
        })
        .catch(err => console.error("Error enumerating devices:", err));
    }
  }, [isScanning, selectedDevice]);

  const startScanner = () => {
    setIsScanning(true);
  };

  const stopScanner = () => {
    setIsScanning(false);
  };

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
              <ZxingScanner onScan={handleScanSuccess} deviceId={selectedDevice} />
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
        
        <div className="flex gap-2 items-center flex-wrap">
          {!isScanning ? (
            <button onClick={startScanner} className="self-start px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded shadow-sm hover:bg-primary-900 flex items-center gap-2 transition-colors">
              <Camera size={16} /> Start Scanner
            </button>
          ) : (
            <>
              <button onClick={stopScanner} className="self-start px-4 py-2 bg-red-600 text-white text-sm font-medium rounded shadow-sm hover:bg-red-700 flex items-center gap-2 transition-colors">
                <CameraOff size={16} /> Stop Scanner
              </button>
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
            </>
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

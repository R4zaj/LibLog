import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  CameraOff, 
  GripHorizontal, 
  ExternalLink, 
  Minus, 
  Maximize2, 
  LogIn, 
  LogOut 
} from 'lucide-react';

const STORAGE_KEY = 'liblog_attendance_pip_pos';
const WIDGET_WIDTH_NORMAL = 288; // w-72
const WIDGET_HEIGHT_NORMAL = 245;
const WIDGET_WIDTH_MINI = 230;
const WIDGET_HEIGHT_MINI = 46;
const PADDING = 12;

function getDefaultPosition(isMini = false) {
  const width = isMini ? WIDGET_WIDTH_MINI : WIDGET_WIDTH_NORMAL;
  const height = isMini ? WIDGET_HEIGHT_MINI : WIDGET_HEIGHT_NORMAL;
  return {
    x: Math.max(PADDING, (typeof window !== 'undefined' ? window.innerWidth : 1200) - width - 24),
    y: Math.max(PADDING, (typeof window !== 'undefined' ? window.innerHeight : 800) - height - 24)
  };
}

function loadSavedPosition(isMini = false) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        const width = isMini ? WIDGET_WIDTH_MINI : WIDGET_WIDTH_NORMAL;
        const height = isMini ? WIDGET_HEIGHT_MINI : WIDGET_HEIGHT_NORMAL;
        const maxX = Math.max(PADDING, window.innerWidth - width - PADDING);
        const maxY = Math.max(PADDING, window.innerHeight - height - PADDING);
        return {
          x: Math.min(Math.max(PADDING, parsed.x), maxX),
          y: Math.min(Math.max(PADDING, parsed.y), maxY)
        };
      }
    }
  } catch (e) {
    // fallback to default
  }
  return getDefaultPosition(isMini);
}

export default function MovableAttendanceWidget({ videoElement, onStop, lastScan }) {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => loadSavedPosition(false));

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  const widgetRef = useRef(null);

  // Keep widget within screen bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = isMinimized ? WIDGET_WIDTH_MINI : WIDGET_WIDTH_NORMAL;
      const height = isMinimized ? WIDGET_HEIGHT_MINI : WIDGET_HEIGHT_NORMAL;
      setPosition(prev => {
        const maxX = Math.max(PADDING, window.innerWidth - width - PADDING);
        const maxY = Math.max(PADDING, window.innerHeight - height - PADDING);
        const clampedX = Math.min(Math.max(PADDING, prev.x), maxX);
        const clampedY = Math.min(Math.max(PADDING, prev.y), maxY);
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

  // Pointer drag listeners on window for smooth tracking
  const handlePointerDown = (e) => {
    // Do not initiate drag if user clicked an interactive control
    if (e.target.closest('button, a, input, select')) return;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    setIsDragging(true);

    const onPointerMove = (moveEvt) => {
      if (!dragRef.current.isDragging) return;
      const deltaX = moveEvt.clientX - dragRef.current.startX;
      const deltaY = moveEvt.clientY - dragRef.current.startY;

      const width = isMinimized ? WIDGET_WIDTH_MINI : WIDGET_WIDTH_NORMAL;
      const height = isMinimized ? WIDGET_HEIGHT_MINI : WIDGET_HEIGHT_NORMAL;

      const maxX = Math.max(PADDING, window.innerWidth - width - PADDING);
      const maxY = Math.max(PADDING, window.innerHeight - height - PADDING);

      const nextX = Math.min(Math.max(PADDING, dragRef.current.posX + deltaX), maxX);
      const nextY = Math.min(Math.max(PADDING, dragRef.current.posY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Persist last valid position
      setPosition(currentPos => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPos));
        } catch (err) {}
        return currentPos;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Reset to default bottom-right on double-click
  const handleResetPosition = () => {
    const defaultPos = getDefaultPosition(isMinimized);
    setPosition(defaultPos);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPos));
    } catch (e) {}
  };

  const handleOpenAttendance = (e) => {
    e.stopPropagation();
    navigate('/attendance');
  };

  return (
    <div
      ref={widgetRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleResetPosition}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      className={`fixed z-50 select-none backdrop-blur-md rounded-2xl border transition-shadow ${
        isDragging
          ? 'cursor-grabbing ring-2 ring-primary-500 shadow-2xl scale-[1.01]'
          : 'cursor-grab shadow-2xl hover:shadow-primary-900/10'
      } ${
        isMinimized
          ? 'w-[230px] p-2 bg-white/95 dark:bg-dark-card/95 border-gray-200 dark:border-dark-border'
          : 'w-72 bg-white/95 dark:bg-dark-card/95 border-gray-200 dark:border-dark-border overflow-hidden'
      }`}
      title="Drag to move • Double-click to reset"
    >
      {/* HEADER BAR */}
      <div className={`flex items-center justify-between ${isMinimized ? 'px-1' : 'px-3 py-2.5 bg-gray-50/90 dark:bg-dark-bg/80 border-b border-gray-200 dark:border-dark-border'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
          <span className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
            {isMinimized ? 'Attendance' : 'Attendance Scanner'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpenAttendance}
            className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title="Open Attendance page"
          >
            <ExternalLink size={13} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(prev => !prev);
            }}
            className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title={isMinimized ? 'Expand preview' : 'Minimize preview'}
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="p-1 rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ml-0.5"
            title="Stop scanner"
          >
            <CameraOff size={13} />
          </button>
        </div>
      </div>

      {/* FULL CAMERA PREVIEW (When not minimized) */}
      {!isMinimized && (
        <>
          <div className="relative w-full h-36 bg-black flex items-center justify-center overflow-hidden">
            {videoElement}
          </div>

          {/* Footer Bar */}
          <div className="px-3 py-2 bg-gray-50/70 dark:bg-dark-bg/60 text-[10px] text-gray-500 dark:text-slate-400 flex items-center justify-between border-t border-gray-100 dark:border-dark-border">
            {lastScan ? (
              <div className="flex items-center gap-1.5 truncate max-w-[190px]" title={`${lastScan.user} - ${lastScan.action}`}>
                {lastScan.action === 'CHECK_IN' ? (
                  <LogIn size={11} className="text-green-600 shrink-0" />
                ) : (
                  <LogOut size={11} className="text-orange-600 shrink-0" />
                )}
                <span className="truncate font-semibold text-gray-700 dark:text-slate-300">
                  {lastScan.user}
                </span>
                <span className="text-[9px] text-gray-400 shrink-0">
                  {lastScan.time}
                </span>
              </div>
            ) : (
              <span className="truncate">Scanning active in background</span>
            )}
            <span className="text-[9px] text-gray-400 font-medium shrink-0 ml-1">
              Movable
            </span>
          </div>
        </>
      )}
    </div>
  );
}

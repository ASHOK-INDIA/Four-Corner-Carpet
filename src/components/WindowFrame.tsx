import React, { useState, useRef, useEffect } from 'react';

interface WindowFrameProps {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  onMinimize: () => void;
  isMaximized: boolean;
  onMaximize: () => void;
  zIndex: number;
  onFocus: () => void;
  children: React.ReactNode;
  initialWidth?: string;
  initialHeight?: string;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  icon,
  isOpen,
  onClose,
  isMinimized,
  onMinimize,
  isMaximized,
  onMaximize,
  zIndex,
  onFocus,
  children,
  initialWidth = 'w-[95vw]',
  initialHeight = 'h-[90vh]',
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 50,
    initialY: 50,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
    onFocus();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, dragRef.current.initialX + dx),
        y: Math.max(0, dragRef.current.initialY + dy),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  if (isMinimized) {
    return null; // Handled in taskbar
  }

  return (
    <div
      onClick={onFocus}
      style={{
        zIndex,
        ...(isMaximized
          ? { inset: '12px 12px 60px 12px' }
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
            }),
      }}
      className={`fixed flex flex-col bg-transparent border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-150 ${
        isMaximized ? 'w-auto h-auto' : `${initialWidth} ${initialHeight}`
      }`}
    >
      {/* Windows 11 style Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="h-11 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between px-4 select-none cursor-move shrink-0"
      >
        <div className="flex items-center gap-2.5 text-slate-200">
          {icon || <span className="w-3 h-3 rounded-full bg-cyan-400"></span>}
          <span className="text-xs font-bold tracking-wide truncate max-w-[280px] md:max-w-[450px]">
            {title}
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            Window
          </span>
        </div>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMinimize}
            title="Minimize"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={onMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            {isMaximized ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-auto bg-transparent text-slate-100 relative">
        {children}
      </div>
    </div>
  );
};

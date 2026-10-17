import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface WindowItem {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  colorClass: string;
  isAdminOnly?: boolean;
}

interface WindowsTaskbarProps {
  windows: WindowItem[];
  onToggleWindow: (id: string) => void;
  onCloseAll: () => void;
  adminMode: boolean;
  weather: WeatherData;
  isStartMenuOpen: boolean;
  onToggleStartMenu: () => void;
}

export const WindowsTaskbar: React.FC<WindowsTaskbarProps> = ({
  windows,
  onToggleWindow,
  onCloseAll,
  adminMode,
  weather,
  isStartMenuOpen,
  onToggleStartMenu,
}) => {
  const [time, setTime] = useState<string>('');
  const [startSearch, setStartSearch] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const openWindows = windows.filter((w) => w.isOpen);

  const filteredWindows = windows.filter((w) =>
    w.title.toLowerCase().includes(startSearch.toLowerCase())
  );

  return (
    <>
      {/* Windows 11 Style Start Menu Sidebar (Popup on bottom left) */}
      {isStartMenuOpen && (
        <div className="fixed bottom-14 left-3 w-80 sm:w-96 bg-transparent border border-orange-400/50 rounded-2xl shadow-2xl z-50 p-4 text-slate-950 flex flex-col max-h-[75vh] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-orange-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md">
                P
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wide block text-slate-950">PoptopOS Start Menu</span>
                <span className="text-[10px] text-slate-800">All Programs & Admin Modules</span>
              </div>
            </div>
            <span className="text-[10px] bg-white/40 text-slate-900 px-2.5 py-0.5 rounded-full font-mono border border-orange-500/30 font-bold">
              {windows.length} Apps
            </span>
          </div>

          {/* Search inside Start Menu */}
          <div className="py-3">
            <input
              type="text"
              placeholder="Search programs & modules (e.g. QC, Lead, Invoice)..."
              value={startSearch}
              onChange={(e) => setStartSearch(e.target.value)}
              className="w-full bg-white/60 backdrop-blur-md border border-orange-500/30 text-xs rounded-xl px-3 py-2.5 text-slate-950 focus:outline-none focus:border-cyan-600 font-mono placeholder:text-slate-600 shadow-inner"
              autoFocus
            />
          </div>

          {/* Scrollable Apps List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredWindows.map((win) => (
              <button
                key={win.id}
                onClick={() => {
                  onToggleWindow(win.id);
                  onToggleStartMenu();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/30 hover:bg-white/60 backdrop-blur-xs transition flex items-center justify-between group border border-orange-500/20 hover:border-orange-500/40 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${win.colorClass} shadow-md group-hover:scale-125 transition-transform shrink-0`}></span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-slate-950 flex items-center gap-2">
                      {win.title}
                      {win.isOpen && (
                        <span className="text-[9px] bg-emerald-600/20 text-emerald-800 px-1.5 py-0.2 rounded font-mono border border-emerald-600/30 font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    {win.isAdminOnly && (
                      <span className="text-[9px] text-amber-900 font-mono font-bold">Admin Only Module</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-700 group-hover:text-cyan-900 font-mono font-bold">
                  Open →
                </span>
              </button>
            ))}
            {filteredWindows.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-700 italic font-medium">
                No matching programs found.
              </div>
            )}
          </div>

          {/* Start Menu Footer */}
          <div className="pt-3 mt-2 border-t border-orange-500/30 flex items-center justify-between text-[11px] text-slate-900">
            <span className="font-mono flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${adminMode ? 'bg-amber-600 animate-pulse' : 'bg-slate-700'}`}></span>
              {adminMode ? 'Admin Mode (Full Access)' : 'Standard User Mode'}
            </span>
            <button
              onClick={onToggleStartMenu}
              className="text-slate-950 hover:text-slate-900 font-bold px-2 py-1 bg-white/50 rounded-lg border border-orange-500/30"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Taskbar Bar at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-12 bg-amber-400/40 backdrop-blur-xl border-t border-amber-500/40 flex items-center justify-between px-3 text-slate-950 select-none shadow-2xl font-medium">
        {/* Left: Start Button & Running Windows */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStartMenu}
            title="Start Menu"
            className={`h-9 px-3.5 rounded-xl flex items-center gap-2 font-black text-xs transition shadow-lg ${
              isStartMenuOpen
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
            <span>Start</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1"></div>

          {/* Running Windows Taskbar Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50vw] sm:max-w-[60vw] py-1 custom-scrollbar">
            {openWindows.map((win) => (
              <div
                key={win.id}
                onClick={() => onToggleWindow(win.id)}
                className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition border shrink-0 cursor-pointer ${
                  !win.isMinimized
                    ? 'bg-slate-800 text-white border-slate-600 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-white border-slate-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${win.colorClass}`}></span>
                <span className="truncate max-w-[90px] sm:max-w-[120px]">{win.title}</span>
                {win.isMinimized && <span className="text-[10px] text-slate-500 font-mono">(Min)</span>}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWindow(win.id);
                  }}
                  className="w-4 h-4 rounded-full hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center text-[11px] font-mono transition"
                  title="Close Window"
                >
                  ×
                </button>
              </div>
            ))}
            {openWindows.length === 0 && (
              <span className="text-xs text-slate-500 px-2 italic">
                Click "Start" to open programs & modules.
              </span>
            )}
          </div>
        </div>

        {/* Right: System Tray (Weather, Admin, Time) */}
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {openWindows.length > 0 && (
            <button
              onClick={onCloseAll}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded-lg transition border border-slate-800 text-[11px]"
            >
              Close All ({openWindows.length})
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Bhadohi: {weather.temp}°C {weather.condition}</span>
          </div>

          {adminMode && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold tracking-wider uppercase">
              Admin
            </span>
          )}

          <div className="font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-slate-200">
            {time}
          </div>
        </div>
      </div>
    </>
  );
};

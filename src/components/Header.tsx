import React from 'react';
import { Clock, Sun, CloudSun, CloudRain, CloudFog, CloudSnow, CloudLightning, Plus, Route, Leaf, Printer, Lock, Unlock, Database } from 'lucide-react';
import { WeatherData } from '../types';

interface HeaderProps {
  timeString: string;
  weather: WeatherData;
  adminMode: boolean;
  isSyncing?: boolean;
  onToggleAdmin: () => void;
  onOpenCreatePo: () => void;
  onOpenShipmentTrack: () => void;
  onOpenPPWR: () => void;
  onOpenPrintReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeString,
  weather,
  adminMode,
  isSyncing,
  onToggleAdmin,
  onOpenCreatePo,
  onOpenShipmentTrack,
  onOpenPPWR,
  onOpenPrintReport,
}) => {
  const renderWeatherIcon = () => {
    switch (weather.iconName) {
      case 'sun':
        return <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />;
      case 'cloud-rain':
        return <CloudRain className="w-4 h-4 text-sky-200" />;
      case 'cloud-snow':
        return <CloudSnow className="w-4 h-4 text-slate-100" />;
      case 'cloud-lightning':
        return <CloudLightning className="w-4 h-4 text-amber-300" />;
      case 'cloud-fog':
        return <CloudFog className="w-4 h-4 text-slate-200" />;
      case 'cloud-sun':
      default:
        return <CloudSun className="w-4 h-4 text-amber-300" />;
    }
  };

  return (
    <header className="bg-[#EF3340] backdrop-blur-md border-b border-rose-700/40 sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md text-white">
      {/* Logo & Title */}
      <div className="flex items-center space-x-3.5">
        {/* Official Wordmark Logo Container */}
        <div className="h-10 px-3 bg-white rounded-xl border border-rose-200 flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 600 160" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="125" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="120" fill="#111827" letterSpacing="-2">
              popTop<tspan fontSize="50" dy="-40">®</tspan>
            </text>
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-base lg:text-lg text-white tracking-wide">POPTOP PRODUCTION</h1>
          </div>
        </div>
      </div>

      {/* Center Clock & Firestore Status */}
      <div className="hidden md:flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-xs bg-rose-900/30 border border-rose-700/50 px-4 py-2 rounded-xl text-rose-50">
          <Clock className="w-3.5 h-3.5 text-rose-200" />
          <span id="istDigitalClock" className="font-mono font-bold text-white">
            {timeString || '--:--:-- PM'}
          </span>
          <span className="text-[10px] bg-rose-900/50 px-1.5 py-0.5 rounded text-rose-200 font-mono">IST</span>
        </div>

        {/* Firestore Live Connected Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs bg-rose-900/30 border border-rose-700/50 px-3 py-2 rounded-xl text-rose-100" title="Live Firebase Cloud Firestore Database">
          <Database className={`w-3.5 h-3.5 ${isSyncing ? 'text-amber-300 animate-pulse' : 'text-emerald-300'}`} />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
      </div>

      {/* Weather Widget */}
      <div
        className="hidden lg:flex items-center space-x-2 text-xs bg-rose-900/30 border border-rose-700/50 px-3.5 py-2 rounded-xl text-rose-50"
        title="Live Weather"
      >
        {renderWeatherIcon()}
        <div className="flex items-center space-x-1.5">
          <span id="bhadohiTemp" className="font-mono font-bold text-rose-100">
            {weather.temp}°C
          </span>
          <span id="bhadohiCondition" className="text-[10px] bg-rose-900/50 px-1 py-0.5 rounded text-rose-200">
            {weather.condition}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Create PO Top Button (Visible ONLY in Admin Mode) */}
        {adminMode && (
          <button
            id="createPoTopBtn"
            onClick={onOpenCreatePo}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-[#EF3340] transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Create New Purchase Order"
          >
            <Plus className="w-3.5 h-3.5 text-[#EF3340]" />
            <span>Create PO</span>
          </button>
        )}

        {/* Shipment Track Menu Button */}
        <button
          id="shipmentTrackNavBtn"
          onClick={onOpenShipmentTrack}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 border border-indigo-400/40 text-indigo-100 hover:bg-indigo-600/40 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="Advanced 9-Step Shipment Tracking & Logistics Suite"
        >
          <Route className="w-3.5 h-3.5 text-indigo-300" />
          <span className="font-bold">Shipment Track</span>
        </button>

        {/* PPWR Compliance Menu Button */}
        <button
          id="ppwrNavBtn"
          onClick={onOpenPPWR}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-100 hover:bg-amber-500/30 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="EU PPWR Packaging & Waste Regulation Menu"
        >
          <Leaf className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-bold">PPWR Menu</span>
        </button>

        {/* Print Summary Report Button */}
        <button
          id="printReportNavBtn"
          onClick={onOpenPrintReport}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-900/40 border border-rose-700/50 text-white hover:bg-rose-900/60 transition flex items-center gap-1.5 cursor-pointer"
          title="Print Official A4 Summary"
        >
          <Printer className="w-3.5 h-3.5 text-white" />
          <span className="hidden md:inline">Print Report</span>
        </button>

        {/* Admin Mode Toggle */}
        <button
          id="adminToggleBtn"
          onClick={onToggleAdmin}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
            adminMode
              ? 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-100 hover:bg-emerald-900/60'
              : 'bg-rose-900/40 border border-rose-700/50 text-white hover:bg-rose-900/60'
          }`}
        >
          {adminMode ? (
            <Unlock id="adminLockIcon" className="w-3.5 h-3.5 text-emerald-200" />
          ) : (
            <Lock id="adminLockIcon" className="w-3.5 h-3.5 text-rose-200" />
          )}
          <span id="adminBtnText">{adminMode ? 'Admin Mode On' : 'Admin Mode Off'}</span>
        </button>
      </div>
    </header>
  );
};

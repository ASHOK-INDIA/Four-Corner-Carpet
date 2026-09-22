import React from 'react';
import { Sun, CloudSun, CloudRain, CloudFog, CloudSnow, CloudLightning, Plus, Route, Leaf, Printer, Lock, Unlock, Database, Box, Globe, Languages } from 'lucide-react';
import { WeatherData } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  weather: WeatherData;
  adminMode: boolean;
  isSyncing?: boolean;
  onToggleAdmin: () => void;
  onOpenCreatePo: () => void;
  onOpenShipmentTrack: () => void;
  onOpenPPWR: () => void;
  onOpenPrintReport: () => void;
  onOpen3DContainer: () => void;
  onOpenCompetitorIntel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  weather,
  adminMode,
  isSyncing,
  onToggleAdmin,
  onOpenCreatePo,
  onOpenShipmentTrack,
  onOpenPPWR,
  onOpenPrintReport,
  onOpen3DContainer,
  onOpenCompetitorIntel,
}) => {
  const { language, setLanguage, t } = useLanguage();

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
    <header className="bg-[#E4002B] border-b border-rose-700 sticky top-0 z-50 h-[64px] px-4 lg:px-8 py-3 flex items-center justify-between shadow-md text-white">
      {/* Logo & Title */}
      <div className="flex items-center space-x-3.5">
        {/* Official Wordmark Logo Container */}
        <div 
          onClick={() => window.location.reload()}
          className="h-10 px-3 bg-white rounded-xl border border-white/40 flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-100 transition"
          title="Return to Home"
        >
          <svg viewBox="0 0 600 160" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="125" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="120" fill="#000000" letterSpacing="-2">
              popTop<tspan fontSize="50" dy="-40">®</tspan>
            </text>
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-base lg:text-lg text-white tracking-wide font-sans">{t.appTitle}</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-white/20 border border-white/30 text-white rounded-md">
              IT DIGITAL OS
            </span>
          </div>
        </div>
      </div>

      {/* Weather Widget */}
      <div
        className="hidden lg:flex items-center space-x-2 text-xs text-white"
        title="Live Weather"
      >
        {renderWeatherIcon()}
        <div className="flex items-center space-x-1.5">
          <span id="bhadohiTemp" className="font-mono font-bold text-white">
            {weather.temp}°C
          </span>
          <span id="bhadohiCondition" className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
            {weather.condition}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-1">
        {/* Language Toggle Switch (English & Austrian German) */}
        <div className="p-0.5 flex items-center">
          <button
            id="lang-en-btn"
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              language === 'en'
                ? 'bg-white text-[#E4002B] shadow-sm font-extrabold'
                : 'text-white/80 hover:text-white'
            }`}
            title="Switch to English"
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
          <button
            id="lang-de-at-btn"
            type="button"
            onClick={() => setLanguage('de-at')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              language === 'de-at'
                ? 'bg-white text-[#E4002B] shadow-sm font-extrabold'
                : 'text-white/80 hover:text-white'
            }`}
            title="Auf Österreichisches Deutsch umschalten"
          >
            <span>🇦🇹</span>
            <span>AT</span>
          </button>
        </div>

        {/* Create PO Top Button (Visible ONLY in Admin Mode) */}
        {adminMode && (
          <button
            id="createPoTopBtn"
            onClick={onOpenCreatePo}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-[#E4002B] hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Create New Purchase Order"
          >
            <Plus className="w-3.5 h-3.5 text-[#E4002B]" />
            <span>{t.createPo}</span>
          </button>
        )}

        {/* 3D Container Stuffing Button */}
        <button
          id="containerStuffingNavBtn"
          onClick={onOpen3DContainer}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1.5 cursor-pointer"
          title="3D Container Stuffing & CBM Calculator"
        >
          <Box className="w-3.5 h-3.5 text-white" />
          <span className="font-bold">{t.cbmCalc}</span>
        </button>

        {/* Competitor Intelligence Button */}
        <button
          id="competitorIntelNavBtn"
          onClick={onOpenCompetitorIntel}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1.5 cursor-pointer"
          title="Competitor Intelligence - German & EU Kids Brands, Chairs & Rugs"
        >
          <Globe className="w-3.5 h-3.5 text-white" />
          <span className="font-bold">{t.competitorIntel}</span>
        </button>

        {/* Shipment Track Menu Button */}
        <button
          id="shipmentTrackNavBtn"
          onClick={onOpenShipmentTrack}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1.5 cursor-pointer"
          title="Advanced 9-Step Shipment Tracking & Logistics Suite"
        >
          <Route className="w-3.5 h-3.5 text-white" />
          <span className="font-bold hidden xl:inline">{t.shipmentTrack}</span>
        </button>

        {/* PPWR Compliance Menu Button */}
        <button
          id="ppwrNavBtn"
          onClick={onOpenPPWR}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1.5 cursor-pointer"
          title="EU PPWR Packaging & Waste Regulation Menu"
        >
          <Leaf className="w-3.5 h-3.5 text-white" />
          <span className="font-bold hidden xl:inline">{t.ppwr}</span>
        </button>

        {/* Print Summary Report Button */}
        <button
          id="printReportNavBtn"
          onClick={onOpenPrintReport}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1.5 cursor-pointer"
          title="Print Official A4 Summary"
        >
          <Printer className="w-3.5 h-3.5 text-white" />
          <span className="hidden 2xl:inline">{t.print}</span>
        </button>

        {/* Admin Mode Toggle */}
        <button
          id="adminToggleBtn"
          onClick={onToggleAdmin}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            adminMode
              ? 'bg-white text-[#E4002B]'
              : 'text-white hover:bg-white/15'
          }`}
        >
          {adminMode ? (
            <Unlock id="adminLockIcon" className="w-3.5 h-3.5 text-[#E4002B]" />
          ) : (
            <Lock id="adminLockIcon" className="w-3.5 h-3.5 text-white/80" />
          )}
          <span id="adminBtnText" className="hidden lg:inline">{adminMode ? t.adminOn : t.adminOff}</span>
        </button>
      </div>
    </header>
  );
};

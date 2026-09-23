import React, { useState } from 'react';
import { Sun, CloudSun, CloudRain, CloudFog, CloudSnow, CloudLightning, Plus, Route, Leaf, Printer, Lock, Unlock, Database, Box, Globe, Languages, Images, Menu, X, Palette } from 'lucide-react';
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
  onOpenSamples: () => void;
  onOpenColorwayStudio: () => void;
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
  onOpenSamples,
  onOpenColorwayStudio,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleMobileNavClick = (action: () => void) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <header className="bg-[#E4002B] border-b border-rose-700 sticky top-0 z-50 px-4 lg:px-8 py-3 flex flex-col shadow-md text-white select-none">
      <div className="flex items-center justify-between w-full h-10">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          {/* Official Wordmark Logo Container */}
          <div 
            onClick={() => window.location.reload()}
            className="h-9 px-2 bg-white rounded-xl border border-white/40 flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-100 transition shrink-0"
            title="Return to Home"
          >
            <svg viewBox="0 0 600 160" className="h-5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="10" y="125" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="120" fill="#000000" letterSpacing="-2">
                popTop<tspan fontSize="50" dy="-40">®</tspan>
              </text>
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-sm lg:text-base text-white tracking-wide font-sans">{t.appTitle}</h1>
            </div>
          </div>
        </div>

        {/* Weather Widget (Hidden on mobile/tablet) */}
        <div
          className="hidden xl:flex items-center space-x-2 text-xs text-white"
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

        {/* Action Controls & Hamburger Toggle */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Switch (English & Austrian German) */}
          <div className="p-0.5 flex items-center bg-white/10 rounded-xl border border-white/15">
            <button
              id="lang-en-btn"
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-[#E4002B] shadow-sm font-extrabold'
                  : 'text-white/85 hover:text-white'
              }`}
              title="Switch to English"
            >
              <span>🇬🇧</span>
              <span className="hidden xs:inline">EN</span>
            </button>
            <button
              id="lang-de-at-btn"
              type="button"
              onClick={() => setLanguage('de-at')}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                language === 'de-at'
                  ? 'bg-white text-[#E4002B] shadow-sm font-extrabold'
                  : 'text-white/85 hover:text-white'
              }`}
              title="Auf Österreichisches Deutsch umschalten"
            >
              <span>🇦🇹</span>
              <span className="hidden xs:inline">AT</span>
            </button>
          </div>

          {/* Desktop Only Actions Menu (Full screen grid) */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Create PO Top Button (Visible ONLY in Admin Mode) */}
            {adminMode && (
              <button
                id="createPoTopBtn"
                onClick={onOpenCreatePo}
                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-white text-[#E4002B] hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer shadow-sm"
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
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="3D Container Stuffing & CBM Calculator"
            >
              <Box className="w-3.5 h-3.5 text-white" />
              <span className="font-bold">{t.cbmCalc}</span>
            </button>

            {/* Competitor Intelligence Button */}
            <button
              id="competitorIntelNavBtn"
              onClick={onOpenCompetitorIntel}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="Competitor Intelligence - German & EU Kids Brands, Chairs & Rugs"
            >
              <Globe className="w-3.5 h-3.5 text-white" />
              <span className="font-bold">{t.competitorIntel}</span>
            </button>

            {/* Samples Interactive Slider Gallery Button */}
            <button
              id="samplesNavBtn"
              onClick={onOpenSamples}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="Samples Gallery - Interactive 3D Flip & Slide Viewer"
            >
              <Images className="w-3.5 h-3.5 text-white" />
              <span className="font-bold">Samples</span>
            </button>

            {/* Virtual Yarn Pom & Colorway Studio Button */}
            <button
              id="colorwayStudioNavBtn"
              onClick={onOpenColorwayStudio}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="Virtual Yarn Pom Box & B2B Colorway Studio"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-bold">Colorway Studio</span>
            </button>

            {/* Shipment Track Menu Button */}
            <button
              id="shipmentTrackNavBtn"
              onClick={onOpenShipmentTrack}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="Advanced 9-Step Shipment Tracking & Logistics Suite"
            >
              <Route className="w-3.5 h-3.5 text-white" />
              <span className="font-bold hidden xl:inline">{t.shipmentTrack}</span>
            </button>

            {/* PPWR Compliance Menu Button */}
            <button
              id="ppwrNavBtn"
              onClick={onOpenPPWR}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="EU PPWR Packaging & Waste Regulation Menu"
            >
              <Leaf className="w-3.5 h-3.5 text-white" />
              <span className="font-bold hidden xl:inline">{t.ppwr}</span>
            </button>

            {/* Print Summary Report Button */}
            <button
              id="printReportNavBtn"
              onClick={onOpenPrintReport}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
              title="Print Official A4 Summary"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span className="hidden 2xl:inline">{t.print}</span>
            </button>

            {/* Admin Mode Toggle */}
            <button
              id="adminToggleBtn"
              onClick={onToggleAdmin}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
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
              <span id="adminBtnText" className="hidden xl:inline">{adminMode ? t.adminOn : t.adminOff}</span>
            </button>
          </div>

          {/* Hamburger Mobile Toggle (Visible ONLY on mobile / tablet) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-white/15 rounded-xl transition-colors cursor-pointer lg:hidden flex items-center justify-center text-white"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Dropdown Actions Panel */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-white/15 flex flex-col gap-2.5 animate-fadeIn">
          {/* Quick Stats Summary for Mobile */}
          <div className="px-2.5 py-1.5 bg-white/10 rounded-xl flex items-center justify-between text-xs text-white/90">
            <span className="font-semibold flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-300" /> Bhadohi Live:
            </span>
            <span className="font-mono font-bold">{weather.temp}°C ({weather.condition})</span>
          </div>

          {/* Action List items styled beautifully as tappable cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Create PO Form (Admin Mode Only) */}
            {adminMode && (
              <button
                onClick={() => handleMobileNavClick(onOpenCreatePo)}
                className="col-span-2 p-2.5 bg-white text-[#E4002B] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t.createPo}</span>
              </button>
            )}

            <button
              onClick={() => handleMobileNavClick(onOpen3DContainer)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Box className="w-4 h-4 shrink-0 text-rose-200" />
              <span className="truncate">{t.cbmCalc}</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenCompetitorIntel)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Globe className="w-4 h-4 shrink-0 text-rose-200" />
              <span className="truncate">{t.competitorIntel}</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenSamples)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Images className="w-4 h-4 shrink-0 text-rose-200" />
              <span>Samples Gallery</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenColorwayStudio)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Palette className="w-4 h-4 shrink-0 text-amber-300" />
              <span>Colorway Studio</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenShipmentTrack)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Route className="w-4 h-4 shrink-0 text-rose-200" />
              <span className="truncate">{t.shipmentTrack}</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenPPWR)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white"
            >
              <Leaf className="w-4 h-4 shrink-0 text-rose-200" />
              <span className="truncate">{t.ppwr}</span>
            </button>

            <button
              onClick={() => handleMobileNavClick(onOpenPrintReport)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold flex items-center gap-2 text-white col-span-2"
            >
              <Printer className="w-4 h-4 shrink-0 text-rose-200" />
              <span>{t.print} (A4 Official PDF)</span>
            </button>
          </div>

          {/* Mobile Admin toggle button */}
          <button
            onClick={() => handleMobileNavClick(onToggleAdmin)}
            className={`w-full p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
              adminMode
                ? 'bg-rose-100 text-[#E4002B] border border-rose-200'
                : 'bg-white/20 text-white border border-white/10'
            }`}
          >
            {adminMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{adminMode ? t.adminOn : t.adminOff}</span>
          </button>
        </div>
      )}
    </header>
  );
};

import React from 'react';
import { Plus } from 'lucide-react';
import { WeatherData } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  weather: WeatherData;
  adminMode: boolean;
  isSyncing?: boolean;
  onToggleAdmin: () => void;
  onOpenCreatePo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  adminMode,
  onOpenCreatePo,
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-[#E4002B] border-b border-rose-700 sticky top-0 z-40 px-4 lg:px-8 py-3 flex flex-col shadow-md text-white select-none">
      <div className="flex items-center justify-between w-full h-10">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
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
          <div className="hidden sm:flex flex-col justify-center">
            <h1 className="font-extrabold text-sm lg:text-base text-white tracking-wide font-sans">{t.appTitle}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Switch */}
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

          {/* Create PO Button (Admin Mode Only) */}
          {adminMode && (
            <button
              id="createPoTopBtn"
              onClick={onOpenCreatePo}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-[#E4002B] hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer shadow-sm"
              title="Create New Purchase Order"
            >
              <Plus className="w-3.5 h-3.5 text-[#E4002B]" />
              <span>{t.createPo}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

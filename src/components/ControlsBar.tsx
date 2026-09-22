import React from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ControlsBarProps {
  productionData: PurchaseOrder[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedPoFilter: string;
  onPoFilterChange: (value: string) => void;
  selectedStatusFilter: string;
  onStatusFilterChange: (value: string) => void;
  adminMode: boolean;
  onOpenCreatePo: () => void;
  onClearData?: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  productionData,
  searchTerm,
  onSearchChange,
  selectedPoFilter,
  onPoFilterChange,
  selectedStatusFilter,
  onStatusFilterChange,
  adminMode,
  onOpenCreatePo,
  onClearData,
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <input
            type="text"
            id="searchInput"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E4002B] focus:ring-1 focus:ring-[#E4002B] transition font-mono placeholder:text-slate-400"
          />
        </div>

        {/* PO Filter Dropdown */}
        <select
          id="poFilter"
          value={selectedPoFilter}
          onChange={(e) => onPoFilterChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E4002B] transition cursor-pointer font-mono font-medium"
        >
          <option value="ALL" className="bg-white text-slate-800">{t.allPOs} ({productionData.length})</option>
          {productionData.map((item) => (
            <option key={item.po} value={item.po} className="bg-white text-slate-800">
              {item.po} ({item.appRef})
            </option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          id="statusFilter"
          value={selectedStatusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E4002B] transition cursor-pointer font-mono font-medium"
        >
          <option value="ALL" className="bg-white text-slate-800">{t.allStatus}</option>
          <option value="Order Received" className="bg-white text-slate-800">{t.orderReceived}</option>
          <option value="Material Prep" className="bg-white text-slate-800">{t.materialPrep}</option>
          <option value="In Production" className="bg-white text-slate-800">{t.inProduction}</option>
          <option value="QC Inspection" className="bg-white text-slate-800">{t.qcInspection}</option>
          <option value="Ready for Shipment" className="bg-white text-slate-800">{t.readyForShipment}</option>
          <option value="Shipped" className="bg-white text-slate-800">{t.shippedStatus}</option>
          <option value="On Hold" className="bg-white text-slate-800">On Hold</option>
        </select>
      </div>

      {/* Admin Actions (Visible when Admin Mode is ON) */}
      {adminMode && (
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            id="addOrderBtn"
            onClick={onOpenCreatePo}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E4002B] hover:bg-rose-700 text-white transition shadow-sm flex items-center gap-2 cursor-pointer font-mono"
          >
            <Plus className="w-3.5 h-3.5 text-white" /> {t.createPo}
          </button>
          {onClearData && productionData.length > 0 && (
            <button
              id="clearDataBtn"
              onClick={onClearData}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer font-mono"
              title={t.clearAllData}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> {t.delete}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

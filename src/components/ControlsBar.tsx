import React from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { PurchaseOrder } from '../types';

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
  productionData = [],
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
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            id="searchInput"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PO#, Style, Buyer, Factory..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-hidden focus:border-[#EF3340] transition font-mono"
          />
        </div>

        {/* PO Filter Dropdown */}
        <select
          id="poFilter"
          value={selectedPoFilter}
          onChange={(e) => onPoFilterChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-[#EF3340] transition cursor-pointer"
        >
          <option value="ALL">All Purchase Orders ({productionData.length})</option>
          {productionData.map((item) => {
            const poNum = item.poNumber || (item as any).po || item.id;
            const styleLabel = item.styleName || (item as any).appRef || 'Order';
            return (
              <option key={item.id || poNum} value={poNum}>
                {poNum} ({styleLabel})
              </option>
            );
          })}
        </select>

        {/* Status Filter Dropdown */}
        <select
          id="statusFilter"
          value={selectedStatusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-[#EF3340] transition cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ON_TRACK">On Track</option>
          <option value="DELAYED">Delayed</option>
          <option value="CRITICAL_DELAY">Critical Delay</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Admin Actions (Visible when Admin Mode is ON) */}
      {adminMode && (
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            id="addOrderBtn"
            onClick={onOpenCreatePo}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EF3340] hover:bg-rose-700 text-white transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" /> Create PO
          </button>
          {onClearData && productionData.length > 0 && (
            <button
              id="clearDataBtn"
              onClick={onClearData}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
              title="Clear all records in database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Eye, Route, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ProductionTableProps {
  filteredData: PurchaseOrder[];
  allData: PurchaseOrder[];
  adminMode: boolean;
  onViewDetails: (index: number) => void;
  onSelectShipmentPo: (po: string) => void;
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => void;
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Order Received':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Material Prep':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'In Production':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Packing':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'QC Inspection':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Ready for Shipment':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Shipped':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  filteredData,
  allData,
  adminMode,
  onViewDetails,
  onSelectShipmentPo,
  onEditOrder,
  onDeleteOrder,
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-md overflow-hidden">
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-mono font-bold text-[11px] border-b-2 border-[#E4002B]">
              <th className="py-4 px-4 text-center w-12">{t.view}</th>
              <th className="py-4 px-4">{t.poAndAppRef}</th>
              <th className="py-4 px-4 text-center">{t.designBatches}</th>
              <th className="py-4 px-4 text-right">{t.totalUnits}</th>
              <th className="py-4 px-4">{t.primaryStatus}</th>
              <th className="py-4 px-4">{t.shipmentMilestone}</th>
              <th className="py-4 px-4">{t.estDelivery}</th>
              <th className="py-4 px-4 text-center">{t.actions}</th>
            </tr>
          </thead>
          <tbody id="productionTableBody" className="divide-y divide-slate-200 text-slate-800 font-sans bg-white">
            {filteredData.map((item, idx) => {
              const realIndex = allData.indexOf(item);
              const totalUnits = item.designs.reduce((acc, curr) => acc + curr.qty, 0);
              const primaryStatus = item.designs[0]?.status || 'Order Received';
              const badgeClass = getStatusBadgeClass(primaryStatus);
              const currentMilestone = item.shipmentMilestone || '1. Packing';

              return (
                <tr key={item.po} className={idx % 2 === 0 ? 'bg-white hover:bg-rose-50/30 transition' : 'bg-slate-50/70 hover:bg-rose-50/30 transition'}>
                   <td className="py-3.5 px-4 text-center">
                    <button
                      id={`view-po-${item.po}`}
                      onClick={() => onViewDetails(realIndex)}
                      className="w-8 h-8 rounded-lg bg-[#E4002B] hover:bg-rose-700 text-white flex items-center justify-center transition mx-auto cursor-pointer shadow-xs active:scale-95"
                      title={t.details}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-bold font-mono text-xs tracking-tight shadow-2xs">
                      {item.po}
                    </span>
                    <span className="text-[11px] text-[#E4002B] font-mono font-extrabold block mt-0.5">{item.appRef}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-mono border border-slate-300 font-bold">
                      {item.designs.length} batch(es)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                    {totalUnits.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border shadow-2xs ${badgeClass} block w-fit mb-1`}>
                      {primaryStatus}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      Progress: {item.designs[0]?.progress || 0}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      id={`milestone-btn-${item.po}`}
                      onClick={() => onSelectShipmentPo(item.po)}
                      className="cursor-pointer px-3 py-1 rounded-lg text-[11px] font-bold font-mono bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-xs"
                      title="Click to view full 9-step tracking"
                    >
                      <Route className="w-3.5 h-3.5 text-indigo-200" /> {currentMilestone}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 font-bold text-[11px]">{item.estDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    {adminMode ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`edit-po-${item.po}`}
                          onClick={() => onEditOrder(realIndex)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#E4002B] text-slate-700 hover:text-white border border-slate-300 flex items-center justify-center transition cursor-pointer"
                          title={t.edit}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-po-${item.po}`}
                          onClick={() => onDeleteOrder(realIndex)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 flex items-center justify-center transition cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">{t.viewOnly}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Card Layout (Visible on Small Screens) */}
      <div className="block md:hidden bg-slate-50/50 divide-y divide-slate-200">
        {filteredData.map((item) => {
          const realIndex = allData.indexOf(item);
          const totalUnits = item.designs.reduce((acc, curr) => acc + curr.qty, 0);
          const primaryStatus = item.designs[0]?.status || 'Order Received';
          const badgeClass = getStatusBadgeClass(primaryStatus);
          const currentMilestone = item.shipmentMilestone || '1. Packing';

          return (
            <div key={item.po} className="p-4 space-y-3.5 bg-white">
              {/* Card Header: PO & Ref */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-bold font-mono text-xs shadow-2xs">
                    {item.po}
                  </span>
                  <span className="text-[11px] text-[#E4002B] font-mono font-extrabold block mt-0.5">{item.appRef}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold font-mono">Total Qty</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">{totalUnits.toLocaleString()}</span>
                </div>
              </div>

              {/* Status and Progress Info */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">Primary Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${badgeClass}`}>
                    {primaryStatus}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">Est. Delivery</span>
                  <span className="font-mono text-[10px] text-slate-700 font-bold block mt-0.5">{item.estDate}</span>
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-bold font-mono">
                  <span>Batch Completion:</span>
                  <span className="text-slate-800 font-extrabold">{item.designs[0]?.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-[#E4002B] h-full rounded-full transition-all duration-300"
                    style={{ width: `${item.designs[0]?.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Shipment Tracking Trigger */}
              <div className="flex flex-wrap items-center justify-between pt-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold font-mono">Milestone:</span>
                  <button
                    onClick={() => onSelectShipmentPo(item.po)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Route className="w-3 h-3 text-indigo-200" /> {currentMilestone}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{item.designs.length} item(s)</span>
              </div>

              {/* Action Buttons with 44px high-precision Touch Targets */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onViewDetails(realIndex)}
                  className="flex-1 h-10 rounded-xl bg-[#E4002B] hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t.details}</span>
                </button>

                {adminMode ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => onEditOrder(realIndex)}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-[#E4002B] text-slate-700 hover:text-white border border-slate-300 flex items-center justify-center transition cursor-pointer"
                      title={t.edit}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteOrder(realIndex)}
                      className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 flex items-center justify-center transition cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase font-mono block">Access</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.viewOnly}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div id="emptyState" className="p-12 text-center space-y-3 bg-white">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 flex items-center justify-center mx-auto text-xl">
            <FolderOpen className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 font-mono">{t.noOrdersFound}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
            {t.noOrdersSub}
          </p>
        </div>
      )}
    </div>
  );
};

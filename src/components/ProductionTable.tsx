import React from 'react';
import { Eye, Route, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { PurchaseOrder } from '../types';

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
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Material Prep':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'In Production':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'QC Inspection':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Ready for Shipment':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Shipped':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
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
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
              <th className="py-3.5 px-4 text-center w-12">View</th>
              <th className="py-3.5 px-4">PO & App Ref</th>
              <th className="py-3.5 px-4 text-center">Design Batches</th>
              <th className="py-3.5 px-4 text-right">Total Units</th>
              <th className="py-3.5 px-4">Primary Status</th>
              <th className="py-3.5 px-4">Shipment Milestone</th>
              <th className="py-3.5 px-4">Est. Delivery</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody id="productionTableBody" className="divide-y divide-slate-100 text-slate-700">
            {filteredData.map((item) => {
              const realIndex = allData.indexOf(item);
              const totalUnits = item.designs.reduce((acc, curr) => acc + curr.qty, 0);
              const primaryStatus = item.designs[0]?.status || 'Order Received';
              const badgeClass = getStatusBadgeClass(primaryStatus);
              const currentMilestone = item.shipmentMilestone || '1. Packing';

              return (
                <tr key={item.po} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-center">
                    <button
                      id={`view-po-${item.po}`}
                      onClick={() => onViewDetails(realIndex)}
                      className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center transition mx-auto cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 font-mono block">{item.po}</span>
                    <span className="text-[11px] text-[#EF3340] font-mono">{item.appRef}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-mono border border-slate-200">
                      {item.designs.length} batch(es)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {totalUnits.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
                      {primaryStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      id={`milestone-btn-${item.po}`}
                      onClick={() => onSelectShipmentPo(item.po)}
                      className="cursor-pointer px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition inline-flex items-center gap-1"
                      title="Click to view full 9-step tracking"
                    >
                      <Route className="w-3 h-3" /> {currentMilestone}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{item.estDate}</td>
                  <td className="py-3 px-4 text-center">
                    {adminMode ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`edit-po-${item.po}`}
                          onClick={() => onEditOrder(realIndex)}
                          className="w-7 h-7 rounded bg-rose-50 hover:bg-rose-100 text-[#EF3340] flex items-center justify-center transition cursor-pointer"
                          title="Edit PO"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          id={`delete-po-${item.po}`}
                          onClick={() => onDeleteOrder(realIndex)}
                          className="w-7 h-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">View Only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div id="emptyState" className="p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Purchase Orders Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No production records match your current search filters or database is empty.
          </p>
        </div>
      )}
    </div>
  );
};

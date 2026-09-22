import React from 'react';
import { X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { getStatusBadgeClass } from './ProductionTable';

interface DetailModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const totalQty = order.designs.reduce((acc, curr) => acc + curr.qty, 0);
  const totalProg = order.designs.reduce((acc, curr) => acc + curr.progress, 0);
  const avgProg = order.designs.length > 0 ? Math.round(totalProg / order.designs.length) : 0;

  return (
    <div
      id="detailModal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="modalPoTitle" className="text-base font-bold text-slate-900">
              Purchase Order: {order.po}
            </h2>
            <p id="modalItemSubtitle" className="text-xs text-slate-500">
              Client App Reference: {order.appRef}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                App Ref
              </span>
              <span id="modalAppRef" className="text-sm font-bold font-mono text-[#EF3340]">
                {order.appRef}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Designs Count
              </span>
              <span id="modalDesignCount" className="text-sm font-bold font-mono text-slate-900">
                {order.designs.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Total Quantity
              </span>
              <span id="modalQty" className="text-sm font-bold font-mono text-emerald-600">
                {totalQty.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Est. Target Date
              </span>
              <span id="modalDate" className="text-sm font-bold font-mono text-slate-900">
                {order.estDate}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Production & Client Notes
            </span>
            <p id="modalNotes" className="text-xs text-slate-600 italic">
              {order.notes || 'No additional production notes recorded.'}
            </p>
          </div>

          {/* Design Specifications Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Design Batches Breakdown
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Design Name</th>
                    <th className="p-3">Batch #</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Progress</th>
                  </tr>
                </thead>
                <tbody id="modalDesignsList" className="divide-y divide-slate-100 bg-white">
                  {order.designs.map((d, i) => (
                    <tr key={i}>
                      <td className="p-3 font-semibold text-slate-900">{d.name}</td>
                      <td className="p-3 font-mono text-[#EF3340]">{d.batch}</td>
                      <td className="p-3 text-slate-600">{d.size}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {d.qty.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${getStatusBadgeClass(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="bg-[#EF3340] h-full rounded-full"
                              style={{ width: `${d.progress}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-900">{d.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Overall Progress:</span>
            <span id="modalOverallProgress" className="font-bold text-slate-900 font-mono">
              {avgProg}%
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

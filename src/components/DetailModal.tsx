import React from 'react';
import { X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { getStatusBadgeClass } from './ProductionTable';
import { PageFlipModal } from './PageFlipModal';

interface DetailModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const totalQty = order.designs.reduce((acc, curr) => acc + curr.qty, 0);
  const totalProg = order.designs.reduce((acc, curr) => acc + curr.progress, 0);
  const avgProg = order.designs.length > 0 ? Math.round(totalProg / order.designs.length) : 0;

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-3xl" id="detailModal">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 id="modalPoTitle" className="text-base font-bold text-slate-800 font-mono">
            Purchase Order: <span className="text-[#EF3340]">{order.po}</span>
          </h2>
          <p id="modalItemSubtitle" className="text-xs text-slate-500 font-mono">
            Client App Reference: <span className="text-slate-800 font-bold">{order.appRef}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
          title="Close Modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 bg-white overflow-y-auto space-y-6 custom-scrollbar flex-1 text-slate-700">
        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold font-mono">
              App Ref
            </span>
            <span id="modalAppRef" className="text-sm font-extrabold font-mono text-[#EF3340]">
              {order.appRef}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold font-mono">
              Designs Count
            </span>
            <span id="modalDesignCount" className="text-sm font-extrabold font-mono text-slate-800">
              {order.designs.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold font-mono">
              Total Quantity
            </span>
            <span id="modalQty" className="text-sm font-extrabold font-mono text-emerald-600">
              {totalQty.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold font-mono">
              Est. Target Date
            </span>
            <span id="modalDate" className="text-sm font-extrabold font-mono text-slate-800">
              {order.estDate}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">
            Production & Client Notes
          </span>
          <p id="modalNotes" className="text-xs text-slate-700 italic">
            {order.notes || 'No additional production notes recorded.'}
          </p>
        </div>

        {/* Design Specifications Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 font-mono">
            Design Batches Breakdown
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-x-auto custom-scrollbar bg-slate-50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-3">Design Name</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Progress</th>
                </tr>
              </thead>
              <tbody id="modalDesignsList" className="divide-y divide-slate-200 bg-white text-slate-700">
                {order.designs.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-800">{d.name}</td>
                    <td className="p-3 font-mono text-[#EF3340] font-extrabold">{d.batch}</td>
                    <td className="p-3 text-slate-600 font-mono">{d.size}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-600">
                      {d.qty.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadgeClass(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-[#E4002B] h-full rounded-full"
                            style={{ width: `${d.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-700">{d.progress}%</span>
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
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>Overall Progress:</span>
          <span id="modalOverallProgress" className="font-bold text-slate-800">
            {avgProg}%
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200 font-mono"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

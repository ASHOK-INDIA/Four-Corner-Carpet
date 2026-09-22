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
      <div className="px-6 py-4 bg-slate-950 border-b border-rose-700 flex items-center justify-between">
        <div>
          <h2 id="modalPoTitle" className="text-base font-bold text-slate-100 font-mono">
            Purchase Order: <span className="text-cyan-400">{order.po}</span>
          </h2>
          <p id="modalItemSubtitle" className="text-xs text-slate-400 font-mono">
            Client App Reference: <span className="text-[#EF3340] font-bold">{order.appRef}</span>
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
      <div className="p-6 bg-slate-900 overflow-y-auto space-y-6 custom-scrollbar flex-1 text-slate-200">
        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-rose-700">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">
              App Ref
            </span>
            <span id="modalAppRef" className="text-sm font-bold font-mono text-[#EF3340]">
              {order.appRef}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">
              Designs Count
            </span>
            <span id="modalDesignCount" className="text-sm font-bold font-mono text-cyan-300">
              {order.designs.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">
              Total Quantity
            </span>
            <span id="modalQty" className="text-sm font-bold font-mono text-emerald-400">
              {totalQty.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">
              Est. Target Date
            </span>
            <span id="modalDate" className="text-sm font-bold font-mono text-slate-200">
              {order.estDate}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
            Production & Client Notes
          </span>
          <p id="modalNotes" className="text-xs text-slate-300 italic">
            {order.notes || 'No additional production notes recorded.'}
          </p>
        </div>

        {/* Design Specifications Table */}
        <div>
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 font-mono">
            Design Batches Breakdown
          </h3>
          <div className="border border-rose-700 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-cyan-400 font-semibold border-b border-rose-700 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-3">Design Name</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Progress</th>
                </tr>
              </thead>
              <tbody id="modalDesignsList" className="divide-y divide-slate-800/80 bg-slate-900 text-slate-200">
                {order.designs.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-100">{d.name}</td>
                    <td className="p-3 font-mono text-[#EF3340] font-bold">{d.batch}</td>
                    <td className="p-3 text-slate-400 font-mono">{d.size}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {d.qty.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadgeClass(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-rose-700">
                          <div
                            className="bg-cyan-500 h-full rounded-full"
                            style={{ width: `${d.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-cyan-300">{d.progress}%</span>
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
      <div className="px-6 py-3.5 bg-slate-950 border-t border-rose-700 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Overall Progress:</span>
          <span id="modalOverallProgress" className="font-bold text-cyan-400">
            {avgProg}%
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl transition cursor-pointer border border-rose-700 font-mono"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

import React from 'react';
import { Printer, X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { PageFlipModal } from './PageFlipModal';

interface PrintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: PurchaseOrder[];
}

export const PrintSummaryModal: React.FC<PrintSummaryModalProps> = ({
  isOpen,
  onClose,
  productionData,
}) => {
  const totalPOs = productionData.length;
  let totalUnits = 0;
  let shippedCount = 0;

  productionData.forEach((item) => {
    item.designs.forEach((d) => {
      totalUnits += d.qty;
      if (d.status === 'Shipped' || d.status === 'Ready for Shipment') shippedCount++;
    });
  });

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-5xl" id="printSummaryModal">
      {/* Header (hidden in print) */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Official Production Report</h2>
            <p className="text-xs text-slate-500">
              Printable A4 summary document with synchronized data layout
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Now
          </button>
          <button
            onClick={onClose}
            className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
            title="Close Modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-slate-900">
        <div
          id="printableA4Sheet"
          className="bg-slate-950 text-slate-200 p-8 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6 font-sans border border-rose-700"
        >
          {/* Report Header */}
          <div className="flex items-start justify-between border-b border-rose-700 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#EF3340] border border-rose-700 flex items-center justify-center p-1">
                <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="55" r="32" stroke="#FFFFFF" strokeWidth="12" />
                  <circle cx="100" cy="145" r="32" stroke="#FFFFFF" strokeWidth="12" />
                  <circle cx="55" cy="100" r="32" stroke="#FFFFFF" strokeWidth="12" />
                  <circle cx="145" cy="100" r="32" stroke="#FFFFFF" strokeWidth="12" />
                  <rect
                    x="78"
                    y="78"
                    width="44"
                    height="44"
                    rx="6"
                    transform="rotate(45 100 100)"
                    stroke="#FFFFFF"
                    strokeWidth="10"
                    fill="#EF3340"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-wider">POPTOP PRODUCTION</h2>
                <p className="text-xs text-slate-400 font-medium">Production & Order Tracking Report</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-900 text-[#EF3340] border border-rose-700 rounded font-mono font-bold text-xs uppercase">
                Official Document
              </span>
              <p id="printReportDate" className="text-xs text-slate-400 font-mono mt-1">
                Date: {formattedDate}
              </p>
            </div>
          </div>

          {/* Report KPI Bar */}
          <div
            id="printKpiContainer"
            className="grid grid-cols-4 gap-4 bg-slate-900 border border-rose-700 p-3.5 rounded-lg text-center"
          >
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total POs</span>
              <span className="text-base font-bold text-white font-mono">{totalPOs}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Units</span>
              <span className="text-base font-bold text-white font-mono">{totalUnits.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Ready/Shipped</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{shippedCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Report Status</span>
              <span className="text-base font-bold text-indigo-400">Verified</span>
            </div>
          </div>

          {/* Production Orders Summary Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Active Purchase Orders Overview
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-semibold border-b-2 border-rose-700">
                  <th className="py-2 px-3">PO & Ref</th>
                  <th className="py-2 px-3">Design Breakdown</th>
                  <th className="py-2 px-3 text-center">Batches</th>
                  <th className="py-2 px-3 text-right">Total Qty</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Progress</th>
                  <th className="py-2 px-3">Est. Delivery</th>
                </tr>
              </thead>
              <tbody id="printSummaryTableBody" className="divide-y divide-slate-800">
                {productionData.map((item) => {
                  const itemQty = item.designs.reduce((acc, c) => acc + c.qty, 0);
                  const avgProg =
                    item.designs.length > 0
                      ? Math.round(item.designs.reduce((a, c) => a + c.progress, 0) / item.designs.length)
                      : 0;
                  const primaryStatus = item.designs[0]?.status || 'Order Received';
                  const designNames = item.designs.map((d) => `${d.name} (${d.batch})`).join(', ');

                  return (
                    <tr key={item.po} className="border-b border-slate-800">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white font-mono block">{item.po}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.appRef}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{designNames}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.designs.length}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {itemQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200 text-[11px]">{primaryStatus}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{avgProg}%</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{item.estDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Report Footer */}
          <div className="border-t border-rose-700 pt-5 mt-auto">
            <div className="flex justify-between items-end text-[10px] text-slate-400">
              <div>
                <p className="font-bold text-white">POPTOP PRODUCTION MANUFACTURING UNIT</p>
                <p>Automated Production Tracking System</p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Confidential internal report generated for official operations use.
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-300">Authorized Signatory</p>
                <img src="https://i.postimg.cc/B6v0YTML/Signature-Ashok.png" alt="Signature" className="h-12 w-auto mt-1 mb-1 object-contain" />
                <p className="text-[9px]">POPTOP PRODUCTION QC & MANAGEMENT</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer (hidden in print) */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print">
        <p className="text-xs text-slate-500 italic">
          Table columns perfectly aligned with dashboard data for A4 printing.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

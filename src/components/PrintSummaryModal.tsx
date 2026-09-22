import React from 'react';
import { Printer, X } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface PrintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: PurchaseOrder[];
}

export const PrintSummaryModal: React.FC<PrintSummaryModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
}) => {
  if (!isOpen) return null;

  const totalPOs = productionData.length;
  let totalUnits = 0;
  let shippedCount = 0;

  productionData.forEach((item) => {
    const rawDesigns = (item as any).designs;
    if (Array.isArray(rawDesigns) && rawDesigns.length > 0) {
      rawDesigns.forEach((d: any) => {
        totalUnits += d?.qty || 0;
        if (d?.status === 'Shipped' || d?.status === 'Ready for Shipment') shippedCount++;
      });
    } else {
      totalUnits += item.orderQuantity || 0;
      if (item.status === 'COMPLETED' || item.milestones?.packedAndReady) shippedCount++;
    }
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
    <div
      id="printSummaryModal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
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
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Now
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl p-1 cursor-pointer rounded-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-slate-100">
          <div
            id="printableA4Sheet"
            className="bg-white text-slate-900 p-8 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6 font-sans"
          >
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF3340] border border-rose-200 flex items-center justify-center p-1">
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
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-wider">POPTOP PRODUCTION</h2>
                  <p className="text-xs text-slate-600 font-medium">Production & Order Tracking Report</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-rose-50 text-[#EF3340] border border-rose-200 rounded font-mono font-bold text-xs uppercase">
                  Official Document
                </span>
                <p id="printReportDate" className="text-xs text-slate-600 font-mono mt-1">
                  Date: {formattedDate}
                </p>
              </div>
            </div>

            {/* Report KPI Bar */}
            <div
              id="printKpiContainer"
              className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-center"
            >
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total POs</span>
                <span className="text-base font-bold text-slate-900 font-mono">{totalPOs}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Units</span>
                <span className="text-base font-bold text-slate-900 font-mono">{totalUnits.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Ready/Shipped</span>
                <span className="text-base font-bold text-emerald-600 font-mono">{shippedCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Report Status</span>
                <span className="text-base font-bold text-indigo-600">Verified</span>
              </div>
            </div>

            {/* Production Orders Summary Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Active Purchase Orders Overview
              </h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-300">
                    <th className="py-2 px-3">PO & Ref</th>
                    <th className="py-2 px-3">Style / Buyer</th>
                    <th className="py-2 px-3 text-center">Factory</th>
                    <th className="py-2 px-3 text-right">Total Qty</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">EU PPWR</th>
                    <th className="py-2 px-3">Ex-Factory</th>
                  </tr>
                </thead>
                <tbody id="printSummaryTableBody" className="divide-y divide-slate-200">
                  {productionData.map((item) => {
                    const poNum = item.poNumber || (item as any).po || item.id;
                    const styleStr = `${item.styleName || 'Apparel'} (${item.colorway || 'Std'})`;
                    const buyerStr = item.buyerName || 'Client';
                    const factoryStr = item.factoryName || 'Hub Unit 1';
                    const itemQty = item.orderQuantity || 0;
                    const estDelivery = item.exFactoryDate || (item as any).estDate || '-';

                    return (
                      <tr key={item.id || poNum} className="border-b border-slate-100">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 font-mono block">{poNum}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{buyerStr}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{styleStr}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{factoryStr}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {itemQty.toLocaleString()} Pcs
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 text-[11px]">{item.status || 'ON_TRACK'}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.ppwrStatus || 'PENDING'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{estDelivery}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="border-t border-slate-200 pt-5 mt-auto">
              <div className="flex justify-between items-end text-[10px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-900">POPTOP PRODUCTION MANUFACTURING UNIT</p>
                  <p>Automated Production Tracking System</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Confidential internal report generated for official operations use.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">Authorized Signatory</p>
                  <div className="h-8 border-b border-dashed border-slate-400 w-36 mt-1 mb-1"></div>
                  <p className="text-[9px] text-slate-400">Operations & Quality Lead</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

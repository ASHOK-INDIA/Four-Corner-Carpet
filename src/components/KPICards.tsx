import React from 'react';
import { FileText, Cog, Microscope, Truck } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface KPICardsProps {
  productionData: PurchaseOrder[];
}

export const KPICards: React.FC<KPICardsProps> = ({ productionData }) => {
  const total = productionData.length;
  let inProd = 0;
  let qcCount = 0;
  let shippedCount = 0;

  productionData.forEach((item) => {
    item.designs.forEach((d) => {
      if (d.status === 'In Production' || d.status === 'Material Prep') inProd++;
      if (d.status === 'QC Inspection') qcCount++;
      if (d.status === 'Shipped' || d.status === 'Ready for Shipment') shippedCount++;
    });
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Active POs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active POs</p>
          <h3 id="statTotal" className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {total}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* In Production */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Production</p>
          <h3 id="statInProd" className="text-2xl font-bold text-[#EF3340] mt-1 font-mono">
            {inProd}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 text-[#EF3340] flex items-center justify-center text-lg">
          <Cog className="w-5 h-5" />
        </div>
      </div>

      {/* QC Inspection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">QC Inspection</p>
          <h3 id="statQC" className="text-2xl font-bold text-purple-600 mt-1 font-mono">
            {qcCount}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center text-lg">
          <Microscope className="w-5 h-5" />
        </div>
      </div>

      {/* Ready / Shipped */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ready / Shipped</p>
          <h3 id="statShipped" className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
            {shippedCount}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
          <Truck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { FileText, Cog, Microscope, Truck } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface KPICardsProps {
  productionData: PurchaseOrder[];
}

export const KPICards: React.FC<KPICardsProps> = ({ productionData }) => {
  const { t } = useLanguage();
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
        <div>
          <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">{t.totalPOs}</p>
          <h3 id="statTotal" className="text-3xl font-extrabold text-cyan-600 mt-1 font-mono tracking-tight">
            {total}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center text-lg">
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* In Production */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E4002B]"></div>
        <div>
          <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">{t.inProduction}</p>
          <h3 id="statInProd" className="text-3xl font-extrabold text-[#E4002B] mt-1 font-mono tracking-tight">
            {inProd}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-[#E4002B] flex items-center justify-center text-lg">
          <Cog className="w-5 h-5" />
        </div>
      </div>

      {/* QC Inspection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
        <div>
          <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">{t.qcInspection}</p>
          <h3 id="statQC" className="text-3xl font-extrabold text-purple-600 mt-1 font-mono tracking-tight">
            {qcCount}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-lg">
          <Microscope className="w-5 h-5" />
        </div>
      </div>

      {/* Ready / Shipped */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
        <div>
          <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">{t.shipped}</p>
          <h3 id="statShipped" className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono tracking-tight">
            {shippedCount}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-lg">
          <Truck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

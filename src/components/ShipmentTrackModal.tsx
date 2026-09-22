import React, { useState, useEffect } from 'react';
import { Route, X, MapPin, Edit3, Unlock, Lock, Check, FolderOpen } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { SHIPMENT_STEPS, getMilestoneDescription } from '../data/defaultData';
import { PageFlipModal } from './PageFlipModal';

interface ShipmentTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: PurchaseOrder[];
  selectedPoNumber: string;
  onSelectPo: (po: string) => void;
  adminMode: boolean;
  onUnlockAdmin: () => void;
  onUpdateMilestone: (po: string, milestone: string) => void;
}

export const ShipmentTrackModal: React.FC<ShipmentTrackModalProps> = ({
  isOpen,
  onClose,
  productionData,
  selectedPoNumber,
  onSelectPo,
  adminMode,
  onUnlockAdmin,
  onUpdateMilestone,
}) => {
  const currentOrder = productionData.find((i) => i.po === selectedPoNumber) || productionData[0];
  const [adminMilestone, setAdminMilestone] = useState<string>('1. Packing');

  useEffect(() => {
    if (currentOrder) {
      setAdminMilestone(currentOrder.shipmentMilestone || '1. Packing');
    }
  }, [currentOrder, selectedPoNumber]);

  const currentMilestone = currentOrder?.shipmentMilestone || '1. Packing';
  const currentMilestoneIndex = SHIPMENT_STEPS.indexOf(currentMilestone as any);

  const handleSaveMilestone = () => {
    if (!adminMode || !currentOrder) return;
    onUpdateMilestone(currentOrder.po, adminMilestone);
  };

  const getStepStyles = (idx: number) => {
    const isCompleted = idx <= currentMilestoneIndex;
    const isCurrent = idx === currentMilestoneIndex;

    let customBgClass = 'bg-slate-950 border-slate-800';
    let textColorClass = 'text-slate-200';
    let badgeBgClass = 'bg-slate-800 text-slate-400';

    if (idx === 0) {
      customBgClass = 'bg-sky-500/10 border-sky-500/30';
      textColorClass = 'text-sky-300';
      badgeBgClass = 'bg-sky-500 text-slate-950';
    } else if (idx === 1) {
      customBgClass = 'bg-slate-950 border-slate-800 shadow-sm';
      textColorClass = 'text-slate-100';
      badgeBgClass = 'bg-slate-700 text-white';
    } else if (idx === 2) {
      customBgClass = 'bg-yellow-500/10 border-yellow-500/30';
      textColorClass = 'text-yellow-300';
      badgeBgClass = 'bg-yellow-500 text-slate-950';
    } else if (idx === 3) {
      customBgClass = 'bg-amber-500/15 border-amber-500/40';
      textColorClass = 'text-amber-300 font-bold';
      badgeBgClass = 'bg-amber-500 text-slate-950';
    } else if (idx === 4) {
      customBgClass = 'bg-orange-500/10 border-orange-500/30';
      textColorClass = 'text-orange-300';
      badgeBgClass = 'bg-orange-500 text-slate-950';
    } else if (idx === 5) {
      customBgClass = 'bg-orange-500/20 border-orange-500/40';
      textColorClass = 'text-orange-200 font-bold';
      badgeBgClass = 'bg-orange-600 text-white';
    } else if (idx === 6) {
      customBgClass = 'bg-emerald-500/10 border-emerald-500/30';
      textColorClass = 'text-emerald-300';
      badgeBgClass = 'bg-emerald-500 text-slate-950';
    } else if (idx === 7) {
      customBgClass = 'bg-cyan-500/10 border-cyan-500/30';
      textColorClass = 'text-cyan-300';
      badgeBgClass = 'bg-cyan-500 text-slate-950';
    } else if (idx === 8) {
      customBgClass = 'bg-emerald-500/20 border-emerald-500/40';
      textColorClass = 'text-emerald-200 font-bold';
      badgeBgClass = 'bg-emerald-500 text-slate-950';
    }

    return { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent };
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl" id="shipmentTrackModal">
      {/* Modal Header */}
      <div className="px-6 py-4 bg-slate-950 border-b border-rose-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-mono">Shipment Track & Logistics Suite</h2>
            <p className="text-xs text-slate-400 font-mono">9-Step Export Milestone Management</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
          title="Close Modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-[#d7be9f] text-slate-100">
        {!currentOrder ? (
          <div className="bg-slate-950 p-12 rounded-xl border border-rose-700 text-center space-y-3">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/30">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">No Purchase Orders Available</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
              There are no purchase orders in the database yet. Create a purchase order in Admin Mode to track its 9-step shipment milestones.
            </p>
          </div>
        ) : (
          <>
            {/* PO Selector & Milestone Control Bar */}
            <div className="bg-slate-950 p-4 rounded-xl border border-rose-700 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Select Purchase Order to Track:
                  </label>
                  <select
                    id="trackPoSelect"
                    value={currentOrder.po}
                    onChange={(e) => onSelectPo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {productionData.map((item) => (
                      <option key={item.po} value={item.po} className="bg-slate-900 text-slate-100">
                        {item.po} - Ref: {item.appRef} [Current: {item.shipmentMilestone || '1. Packing'}]
                      </option>
                    ))}
                  </select>
                </div>
                <div id="trackAdminBadgeContainer" className="pt-0 sm:pt-5">
                  <span className="px-3 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Active Milestone: {currentMilestone}
                  </span>
                </div>
              </div>

              {/* Admin Edit Milestone Form */}
              {adminMode ? (
                <div id="trackAdminEditSection" className="border-t border-rose-700 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Edit3 className="w-3.5 h-3.5" /> Admin Milestone Updater
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-400" /> Admin Edit Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase font-mono">
                        Select Milestone Stage (1 to 9):
                      </label>
                      <select
                        id="adminMilestoneSelect"
                        value={adminMilestone}
                        onChange={(e) => setAdminMilestone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
                      >
                        {SHIPMENT_STEPS.map((step) => (
                          <option key={step} value={step} className="bg-slate-900 text-slate-100">
                            {step}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        id="saveMilestoneBtn"
                        onClick={handleSaveMilestone}
                        className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                      >
                        <Check className="w-3.5 h-3.5" /> Update Milestone
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  id="trackUserNotice"
                  className="border-t border-rose-700 pt-3 flex items-center justify-between text-xs text-slate-400 font-mono"
                >
                  <span>
                    <Lock className="w-3.5 h-3.5 inline text-[#EF3340] mr-1" /> Admin mode is currently OFF. Milestone
                    updates are restricted.
                  </span>
                  <button
                    onClick={onUnlockAdmin}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Unlock Admin
                  </button>
                </div>
              )}
            </div>

            {/* Visual 9-Step Progress Timeline */}
            <div className="bg-slate-950 p-5 rounded-xl border border-rose-700 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                Logistics Journey Timeline
              </h3>
              <div id="timelineStepsContainer" className="space-y-3">
                {SHIPMENT_STEPS.map((step, idx) => {
                  const { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent } = getStepStyles(idx);
                  
                  // Update border in loop dynamically for rose-700 if necessary
                  let finalCustomBgClass = customBgClass.replace('border-slate-800', 'border-rose-700');

                  return (
                    <div
                      key={step}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${finalCustomBgClass} ${
                        isCurrent ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-950/50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${badgeBgClass}`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${textColorClass} font-mono`}>{step}</h4>
                          <p className={`text-[10px] opacity-80 ${textColorClass} font-sans`}>
                            {getMilestoneDescription(idx + 1)}
                          </p>
                        </div>
                      </div>
                      <div>
                        {isCurrent ? (
                          <span className="px-2.5 py-1 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded font-mono uppercase shadow-sm">
                            Current Stage
                          </span>
                        ) : isCompleted ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold rounded font-mono border border-emerald-500/30">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-50 font-mono text-slate-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-3.5 bg-slate-950 border-t border-rose-700 flex justify-between items-center">
        <p className="text-xs text-slate-400 italic font-mono">
          Shipment status updates are synchronized with Cloud Firestore.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl transition cursor-pointer font-mono border border-rose-700"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

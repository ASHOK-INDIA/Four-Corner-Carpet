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

    let customBgClass = 'bg-slate-50 border-slate-200';
    let textColorClass = 'text-slate-700';
    let badgeBgClass = 'bg-slate-200 text-slate-600';

    if (idx === 0) {
      customBgClass = 'bg-sky-50 border-sky-200';
      textColorClass = 'text-sky-800';
      badgeBgClass = 'bg-sky-500 text-white';
    } else if (idx === 1) {
      customBgClass = 'bg-slate-50 border-slate-200';
      textColorClass = 'text-slate-800';
      badgeBgClass = 'bg-slate-500 text-white';
    } else if (idx === 2) {
      customBgClass = 'bg-yellow-50 border-yellow-200';
      textColorClass = 'text-yellow-800';
      badgeBgClass = 'bg-yellow-500 text-white';
    } else if (idx === 3) {
      customBgClass = 'bg-amber-50 border-amber-200';
      textColorClass = 'text-amber-800 font-bold';
      badgeBgClass = 'bg-amber-500 text-white';
    } else if (idx === 4) {
      customBgClass = 'bg-orange-50 border-orange-200';
      textColorClass = 'text-orange-800';
      badgeBgClass = 'bg-orange-500 text-white';
    } else if (idx === 5) {
      customBgClass = 'bg-orange-50 border-orange-200';
      textColorClass = 'text-orange-900 font-bold';
      badgeBgClass = 'bg-orange-600 text-white';
    } else if (idx === 6) {
      customBgClass = 'bg-emerald-50 border-emerald-200';
      textColorClass = 'text-emerald-800';
      badgeBgClass = 'bg-emerald-500 text-white';
    } else if (idx === 7) {
      customBgClass = 'bg-cyan-50 border-cyan-200';
      textColorClass = 'text-cyan-800';
      badgeBgClass = 'bg-cyan-500 text-white';
    } else if (idx === 8) {
      customBgClass = 'bg-emerald-50 border-emerald-200';
      textColorClass = 'text-emerald-900 font-bold';
      badgeBgClass = 'bg-emerald-600 text-white';
    }

    return { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent };
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl" id="shipmentTrackModal">
      {/* Modal Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-[#E4002B] flex items-center justify-center">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 font-mono">Shipment Track & Logistics Suite</h2>
            <p className="text-xs text-slate-500 font-mono">9-Step Export Milestone Management</p>
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
      <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-white text-slate-800">
        {!currentOrder ? (
          <div className="bg-slate-50 p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-rose-50 text-[#E4002B] rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 font-mono">No Purchase Orders Available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
              There are no purchase orders in the database yet. Create a purchase order in Admin Mode to track its 9-step shipment milestones.
            </p>
          </div>
        ) : (
          <>
            {/* PO Selector & Milestone Control Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Select Purchase Order to Track:
                  </label>
                  <select
                    id="trackPoSelect"
                    value={currentOrder.po}
                    onChange={(e) => onSelectPo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {productionData.map((item) => (
                      <option key={item.po} value={item.po} className="bg-white text-slate-800">
                        {item.po} - Ref: {item.appRef} [Current: {item.shipmentMilestone || '1. Packing'}]
                      </option>
                    ))}
                  </select>
                </div>
                <div id="trackAdminBadgeContainer" className="pt-0 sm:pt-5">
                  <span className="px-3 py-2 bg-rose-50 text-[#EF3340] border border-rose-200 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-[#E4002B]" /> Active Milestone: {currentMilestone}
                  </span>
                </div>
              </div>

              {/* Admin Edit Milestone Form */}
              {adminMode ? (
                <div id="trackAdminEditSection" className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#E4002B] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Edit3 className="w-3.5 h-3.5" /> Admin Milestone Updater
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-600" /> Admin Edit Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase font-mono">
                        Select Milestone Stage (1 to 9):
                      </label>
                      <select
                        id="adminMilestoneSelect"
                        value={adminMilestone}
                        onChange={(e) => setAdminMilestone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer font-mono"
                      >
                        {SHIPMENT_STEPS.map((step) => (
                          <option key={step} value={step} className="bg-white text-slate-800">
                            {step}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        id="saveMilestoneBtn"
                        onClick={handleSaveMilestone}
                        className="w-full py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer font-mono border border-transparent"
                      >
                        <Check className="w-3.5 h-3.5" /> Update Milestone
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  id="trackUserNotice"
                  className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono"
                >
                  <span>
                    <Lock className="w-3.5 h-3.5 inline text-[#EF3340] mr-1" /> Admin mode is currently OFF. Milestone
                    updates are restricted.
                  </span>
                  <button
                    onClick={onUnlockAdmin}
                    className="text-[#E4002B] font-bold hover:underline cursor-pointer"
                  >
                    Unlock Admin
                  </button>
                </div>
              )}
            </div>

            {/* Visual 9-Step Progress Timeline */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Logistics Journey Timeline
              </h3>
              <div id="timelineStepsContainer" className="space-y-3">
                {SHIPMENT_STEPS.map((step, idx) => {
                  const { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent } = getStepStyles(idx);
                  
                  // Keep it pristine with border-slate-200/60
                  let finalCustomBgClass = customBgClass;

                  return (
                    <div
                      key={step}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${finalCustomBgClass} ${
                        isCurrent ? 'ring-2 ring-rose-500 shadow-md' : 'border-slate-200/60'
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
                          <span className="px-2.5 py-1 bg-[#E4002B] text-white text-[10px] font-bold rounded font-mono uppercase shadow-sm">
                            Current Stage
                          </span>
                        ) : isCompleted ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded font-mono border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">Pending</span>
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
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <p className="text-xs text-slate-500 italic font-mono">
          Shipment status updates are synchronized with Cloud Firestore.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer font-mono border border-slate-200"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

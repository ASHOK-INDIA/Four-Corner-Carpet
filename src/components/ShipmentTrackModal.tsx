import React, { useState, useEffect } from 'react';
import { Route, X, MapPin, Edit3, Unlock, Check, FolderOpen } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { SHIPMENT_STEPS } from '../data/defaultData';

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
  productionData = [],
  selectedPoNumber,
  onSelectPo,
  adminMode,
  onUpdateMilestone,
}) => {
  const currentOrder =
    productionData.find(
      (i) =>
        (i.poNumber || (i as any).po || i.id) === selectedPoNumber
    ) || productionData[0] || null;

  const [adminMilestone, setAdminMilestone] = useState<string>('1. Packing');

  useEffect(() => {
    if (currentOrder) {
      setAdminMilestone((currentOrder as any).shipmentMilestone || '1. Packing');
    }
  }, [currentOrder, selectedPoNumber]);

  if (!isOpen) return null;

  const currentMilestone = (currentOrder as any)?.shipmentMilestone || '1. Packing';
  const currentMilestoneIndex = SHIPMENT_STEPS.indexOf(currentMilestone as any);

  const handleSaveMilestone = () => {
    if (!adminMode || !currentOrder) return;
    const poNum = currentOrder.poNumber || (currentOrder as any).po || currentOrder.id;
    onUpdateMilestone(poNum, adminMilestone);
  };

  const getStepStyles = (idx: number) => {
    const isCompleted = idx <= currentMilestoneIndex;
    const isCurrent = idx === currentMilestoneIndex;

    let customBgClass = 'bg-slate-50 border-slate-200';
    let textColorClass = 'text-slate-800';
    let badgeBgClass = 'bg-slate-200 text-slate-600';

    if (idx === 0) {
      customBgClass = 'bg-blue-50 border-blue-200';
      textColorClass = 'text-blue-900';
      badgeBgClass = 'bg-blue-600 text-white';
    } else if (idx === 1) {
      customBgClass = 'bg-white border-slate-200 shadow-xs';
      textColorClass = 'text-slate-900';
      badgeBgClass = 'bg-slate-700 text-white';
    } else if (idx === 2) {
      customBgClass = 'bg-yellow-50 border-yellow-300';
      textColorClass = 'text-yellow-900';
      badgeBgClass = 'bg-yellow-500 text-white';
    } else if (idx === 3) {
      customBgClass = 'bg-amber-100 border-amber-400';
      textColorClass = 'text-amber-950 font-bold';
      badgeBgClass = 'bg-amber-700 text-white';
    } else if (idx === 4) {
      customBgClass = 'bg-orange-50 border-orange-300';
      textColorClass = 'text-orange-900';
      badgeBgClass = 'bg-orange-500 text-white';
    } else if (idx === 5) {
      customBgClass = 'bg-orange-200 border-orange-400';
      textColorClass = 'text-orange-950 font-bold';
      badgeBgClass = 'bg-orange-800 text-white';
    } else if (idx === 6) {
      customBgClass = 'bg-emerald-50 border-emerald-300';
      textColorClass = 'text-emerald-900';
      badgeBgClass = 'bg-emerald-500 text-white';
    } else if (idx === 7) {
      customBgClass = 'bg-cyan-50 border-cyan-300';
      textColorClass = 'text-cyan-900';
      badgeBgClass = 'bg-cyan-600 text-white';
    } else if (idx === 8) {
      customBgClass = 'bg-emerald-100 border-emerald-400';
      textColorClass = 'text-emerald-950 font-bold';
      badgeBgClass = 'bg-emerald-700 text-white';
    }

    return { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent };
  };

  return (
    <div
      id="shipmentTrackModal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-300 text-indigo-700 flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Shipment Track & Logistics Suite</h2>
              <p className="text-xs text-slate-600">9-Step Export Milestone Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl cursor-pointer p-1 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-slate-50">
          {!currentOrder ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Purchase Orders Available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no purchase orders in the database yet. Create a purchase order or load sample data to track 9-step shipment milestones.
              </p>
            </div>
          ) : (
            <>
              {/* PO Selector & Milestone Control Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select Purchase Order to Track:
                    </label>
                    <select
                      id="trackPoSelect"
                      value={currentOrder.poNumber || (currentOrder as any).po || currentOrder.id}
                      onChange={(e) => onSelectPo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 cursor-pointer"
                    >
                      {productionData.map((item) => {
                        const poNum = item.poNumber || (item as any).po || item.id;
                        const label = item.styleName || (item as any).appRef || 'Order';
                        return (
                          <option key={item.id || poNum} value={poNum}>
                            {poNum} - {label} [Current: {(item as any).shipmentMilestone || '1. Packing'}]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div id="trackAdminBadgeContainer" className="pt-0 sm:pt-5">
                    <span className="px-3 py-2 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Active Milestone: {currentMilestone}
                    </span>
                  </div>
                </div>

                {/* Admin Edit Milestone Form */}
                {adminMode && (
                  <div id="trackAdminEditSection" className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Admin Milestone Updater
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> Admin Edit Active
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">
                          Select Milestone Stage (1 to 9):
                        </label>
                        <select
                          id="adminMilestoneSelect"
                          value={adminMilestone}
                          onChange={(e) => setAdminMilestone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-600 cursor-pointer"
                        >
                          {SHIPMENT_STEPS.map((step) => (
                            <option key={step} value={step}>
                              {step}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          id="saveMilestoneBtn"
                          onClick={handleSaveMilestone}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Update Milestone
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Steps Progress Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  9-Step Export Process Checklist
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {SHIPMENT_STEPS.map((step, idx) => {
                    const { customBgClass, textColorClass, badgeBgClass, isCompleted, isCurrent } = getStepStyles(idx);
                    return (
                      <div
                        key={step}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${customBgClass} ${
                          isCurrent ? 'ring-2 ring-indigo-500/50 shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${badgeBgClass}`}>
                            Step {idx + 1}
                          </span>
                          <div>
                            <h4 className={`text-xs ${textColorClass}`}>{step}</h4>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isCurrent ? (
                            <span className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                              In Progress
                            </span>
                          ) : isCompleted ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-medium rounded">
                              Pending
                            </span>
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

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
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

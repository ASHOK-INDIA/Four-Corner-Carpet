import React from 'react';
import { PurchaseOrder } from '../types';
import {
  ArrowUpDown,
  Eye,
  Truck,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Sparkles,
} from 'lucide-react';

export const getStatusBadgeClass = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'ON_TRACK':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'DELAYED':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'CRITICAL_DELAY':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

interface ProductionTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  sortField: keyof PurchaseOrder;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof PurchaseOrder) => void;
  onSelectPO: (po: PurchaseOrder) => void;
  onTrackShipment: (po: PurchaseOrder) => void;
  onMilestoneToggle: (poId: string, milestoneKey: string) => void;
  onEditPO: (po: PurchaseOrder) => void;
  onDeletePO: (poId: string) => void;
  onSeedSampleData?: () => void;
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  orders,
  isLoading,
  sortField,
  sortDirection,
  onSort,
  onSelectPO,
  onTrackShipment,
  onMilestoneToggle,
  onEditPO,
  onDeletePO,
  onSeedSampleData,
}) => {
  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            On Track
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Delayed
          </span>
        );
      case 'CRITICAL_DELAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Critical
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getPPWRBadge = (status: PurchaseOrder['ppwrStatus']) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Compliant
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
      case 'NON_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldX className="w-3.5 h-3.5 text-rose-600" />
            Non-Compliant
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">PO & Style</th>
              <th className="py-3.5 px-4">Factory & Buyer</th>
              <th className="py-3.5 px-4">
                <button
                  onClick={() => onSort('orderQuantity')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <span>Qty (Pcs)</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
              <th className="py-3.5 px-4">
                <button
                  onClick={() => onSort('exFactoryDate')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <span>Ex-Factory Date</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">EU PPWR</th>
              <th className="py-3.5 px-4">Key Milestones</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Syncing production records from Cloud Firestore...</p>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="text-base font-semibold text-slate-700">No Purchase Orders Found</p>
                    <p className="text-xs text-slate-500 max-w-md">
                      Your Firestore database is active. You can create a new order manually or load sample demo data.
                    </p>
                    {onSeedSampleData && (
                      <button
                        onClick={onSeedSampleData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Load Sample Demo Data</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {po.poNumber}
                        <button
                          onClick={() => onSelectPO(po)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Quick View PO Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">{po.styleName} ({po.colorway})</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-semibold text-slate-800">{po.factoryName}</div>
                      <div className="text-xs text-slate-500 font-normal">{po.buyerName} ({po.destinationCountry})</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-900">
                    {po.orderQuantity.toLocaleString()} pcs
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-slate-700 font-medium">{po.exFactoryDate}</span>
                  </td>
                  <td className="py-4 px-4">{getStatusBadge(po.status)}</td>
                  <td className="py-4 px-4">{getPPWRBadge(po.ppwrStatus)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                      {[
                        { key: 'fabricInHouse', label: 'Fabric' },
                        { key: 'cuttingStarted', label: 'Cutting' },
                        { key: 'sewingStarted', label: 'Sewing' },
                        { key: 'qualityInspected', label: 'QA' },
                        { key: 'packedAndReady', label: 'Packed' },
                      ].map((m) => {
                        const isDone = (po.milestones as any)?.[m.key];
                        return (
                          <button
                            key={m.key}
                            onClick={() => onMilestoneToggle(po.id, m.key)}
                            title={`Toggle ${m.label}`}
                            className={`px-2 py-0.5 text-[11px] rounded font-medium transition-all ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onTrackShipment(po)}
                        title="Track Shipment / Logistics"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditPO(po)}
                        title="Edit PO"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePO(po.id)}
                        title="Delete PO"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

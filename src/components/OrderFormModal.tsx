import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface OrderFormModalProps {
  editingPO: PurchaseOrder | null;
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  editingPO,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    poNumber: '',
    styleName: '',
    colorway: '',
    buyerName: '',
    factoryName: '',
    destinationCountry: 'Germany',
    orderQuantity: 5000,
    exFactoryDate: new Date().toISOString().split('T')[0],
    status: 'ON_TRACK',
    ppwrStatus: 'PENDING',
    carrier: 'DHL Express',
    trackingNumber: '',
    notes: '',
    milestones: {
      fabricInHouse: false,
      cuttingStarted: false,
      sewingStarted: false,
      qualityInspected: false,
      packedAndReady: false,
    },
  });

  useEffect(() => {
    if (editingPO) {
      setFormData(editingPO);
    }
  }, [editingPO]);

  const handleChange = (field: keyof PurchaseOrder, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poNumber || !formData.styleName) return;

    const newPO: PurchaseOrder = {
      id: editingPO ? editingPO.id : `po_${Date.now()}`,
      poNumber: formData.poNumber || 'PO-2026-000',
      styleName: formData.styleName || 'Sample Style',
      colorway: formData.colorway || 'Standard',
      buyerName: formData.buyerName || 'Unassigned Buyer',
      factoryName: formData.factoryName || 'Surat Hub Unit 1',
      destinationCountry: formData.destinationCountry || 'Germany',
      orderQuantity: Number(formData.orderQuantity) || 1000,
      exFactoryDate: formData.exFactoryDate || new Date().toISOString().split('T')[0],
      status: formData.status || 'ON_TRACK',
      ppwrStatus: formData.ppwrStatus || 'PENDING',
      carrier: formData.carrier || 'DHL Express',
      trackingNumber: formData.trackingNumber || '',
      notes: formData.notes || '',
      milestones: formData.milestones || {
        fabricInHouse: false,
        cuttingStarted: false,
        sewingStarted: false,
        qualityInspected: false,
        packedAndReady: false,
      },
    };

    onSave(newPO);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {editingPO ? 'Edit Purchase Order' : 'Create New Purchase Order'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm font-medium">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">PO Number *</label>
              <input
                type="text"
                required
                value={formData.poNumber || ''}
                onChange={(e) => handleChange('poNumber', e.target.value)}
                placeholder="PO-2026-101"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Style Name *</label>
              <input
                type="text"
                required
                value={formData.styleName || ''}
                onChange={(e) => handleChange('styleName', e.target.value)}
                placeholder="Crew Neck Cotton Tee"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Colorway</label>
              <input
                type="text"
                value={formData.colorway || ''}
                onChange={(e) => handleChange('colorway', e.target.value)}
                placeholder="Navy Blue"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Order Qty (Pcs)</label>
              <input
                type="number"
                value={formData.orderQuantity || 0}
                onChange={(e) => handleChange('orderQuantity', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Buyer Name</label>
              <input
                type="text"
                value={formData.buyerName || ''}
                onChange={(e) => handleChange('buyerName', e.target.value)}
                placeholder="H&M Global"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Factory Name</label>
              <input
                type="text"
                value={formData.factoryName || ''}
                onChange={(e) => handleChange('factoryName', e.target.value)}
                placeholder="Surat Fine Apparels"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Destination Country</label>
              <input
                type="text"
                value={formData.destinationCountry || ''}
                onChange={(e) => handleChange('destinationCountry', e.target.value)}
                placeholder="Germany"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Ex-Factory Date</label>
              <input
                type="date"
                value={formData.exFactoryDate || ''}
                onChange={(e) => handleChange('exFactoryDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Production Status</label>
              <select
                value={formData.status || 'ON_TRACK'}
                onChange={(e) => handleChange('status', e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option value="ON_TRACK">On Track</option>
                <option value="DELAYED">Delayed</option>
                <option value="CRITICAL_DELAY">Critical Delay</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">EU PPWR Status</label>
              <select
                value={formData.ppwrStatus || 'PENDING'}
                onChange={(e) => handleChange('ppwrStatus', e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option value="COMPLIANT">Compliant</option>
                <option value="PENDING">Pending Review</option>
                <option value="NON_COMPLIANT">Non-Compliant</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Production & Packaging Notes</label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="E.g., GOTS certified organic yarn in house. Recycled polybags ready."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-semibold shadow-sm"
            >
              {editingPO ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

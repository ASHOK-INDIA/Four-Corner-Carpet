import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { PurchaseOrder, DesignBatch } from '../types';
import { PageFlipModal } from './PageFlipModal';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit: PurchaseOrder | null;
  editIndex: number;
  onSaveOrder: (order: PurchaseOrder, index: number) => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  orderToEdit,
  editIndex,
  onSaveOrder,
}) => {
  const [po, setPo] = useState<string>('');
  const [appRef, setAppRef] = useState<string>('');
  const [estDate, setEstDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [designs, setDesigns] = useState<DesignBatch[]>([]);

  useEffect(() => {
    if (orderToEdit) {
      setPo(orderToEdit.po);
      setAppRef(orderToEdit.appRef);
      setEstDate(orderToEdit.estDate);
      setNotes(orderToEdit.notes || '');
      setDesigns(orderToEdit.designs || []);
    } else {
      setPo('');
      setAppRef('');
      setEstDate('');
      setNotes('');
      setDesigns([
        {
          name: '',
          batch: '',
          size: '',
          qty: 0,
          status: 'Order Received',
          progress: 0,
        },
      ]);
    }
  }, [orderToEdit, isOpen]);

  const handleAddDesign = () => {
    setDesigns([
      ...designs,
      {
        name: '',
        batch: '',
        size: '',
        qty: 0,
        status: 'Order Received',
        progress: 0,
      },
    ]);
  };

  const handleRemoveDesign = (index: number) => {
    if (designs.length === 1) {
      alert('A purchase order must have at least one design specification.');
      return;
    }
    setDesigns(designs.filter((_, i) => i !== index));
  };

  const handleDesignChange = (index: number, field: keyof DesignBatch, value: any) => {
    const updated = [...designs];
    updated[index] = {
      ...updated[index],
      [field]: field === 'qty' || field === 'progress' ? Number(value) || 0 : value,
    };
    setDesigns(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!po.trim() || !appRef.trim() || !estDate) {
      alert('Please fill out all required fields (PO Number, App Ref, Est. Delivery Date).');
      return;
    }
    if (designs.length === 0) {
      alert('Please add at least one design specification.');
      return;
    }
    for (let i = 0; i < designs.length; i++) {
      const d = designs[i];
      if (!d.name.trim() || !d.batch.trim()) {
        alert(`Please fill in Design Name and Batch Number for specification #${i + 1}.`);
        return;
      }
      if (d.qty <= 0) {
        alert(`Quantity for design "${d.name || '#' + (i + 1)}" must be greater than 0.`);
        return;
      }
    }

    const milestone = orderToEdit ? orderToEdit.shipmentMilestone || '1. Packing' : '1. Packing';

    const newOrder: PurchaseOrder = {
      po: po.trim(),
      appRef: appRef.trim(),
      estDate,
      notes: notes.trim(),
      shipmentMilestone: milestone,
      designs,
    };

    onSaveOrder(newOrder, editIndex);
    onClose();
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-3xl" id="orderFormModal">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <h2 id="formModalTitle" className="text-base font-bold text-slate-100 font-mono">
          {orderToEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h2>
        <button
          onClick={onClose}
          className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
          title="Close Modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 bg-slate-900 overflow-y-auto space-y-5 custom-scrollbar flex-1 text-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              PO Number *
            </label>
            <input
              type="text"
              id="formPO"
              required
              value={po}
              onChange={(e) => setPo(e.target.value)}
              placeholder="Enter PO Number"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              App Reference *
            </label>
            <input
              type="text"
              id="formAppRef"
              required
              value={appRef}
              onChange={(e) => setAppRef(e.target.value)}
              placeholder="Enter App Reference"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Est. Delivery Date *
            </label>
            <input
              type="date"
              id="formEstDate"
              required
              value={estDate}
              onChange={(e) => setEstDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Production Notes
          </label>
          <textarea
            id="formNotes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter special requirements, yarn quality, or finishing instructions..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
          ></textarea>
        </div>

        {/* Design Specifications Builder Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              Design Specifications & Batches
            </label>
            <button
              type="button"
              onClick={handleAddDesign}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer font-mono"
            >
              <Plus className="w-3.5 h-3.5" /> Add Design
            </button>
          </div>

          <div id="designsList" className="space-y-3">
            {designs.map((d, index) => (
              <div
                key={index}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Design Specification #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDesign(index)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Design Name *</label>
                    <input
                      type="text"
                      required
                      value={d.name}
                      onChange={(e) => handleDesignChange(index, 'name', e.target.value)}
                      placeholder="Enter Design Name"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Batch Number *</label>
                    <input
                      type="text"
                      required
                      value={d.batch}
                      onChange={(e) => handleDesignChange(index, 'batch', e.target.value)}
                      placeholder="Enter Batch Number"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Size Spec</label>
                    <input
                      type="text"
                      value={d.size}
                      onChange={(e) => handleDesignChange(index, 'size', e.target.value)}
                      placeholder="e.g. 10x12, Standard, Custom"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Quantity *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={d.qty || ''}
                      onChange={(e) => handleDesignChange(index, 'qty', e.target.value)}
                      placeholder="Enter quantity"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Status</label>
                    <select
                      value={d.status}
                      onChange={(e) => handleDesignChange(index, 'status', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 cursor-pointer font-mono"
                    >
                      <option value="Order Received" className="bg-slate-900 text-slate-100">Order Received</option>
                      <option value="Material Prep" className="bg-slate-900 text-slate-100">Material Prep</option>
                      <option value="In Production" className="bg-slate-900 text-slate-100">In Production</option>
                      <option value="Packing" className="bg-slate-900 text-slate-100">Packing</option>
                      <option value="QC Inspection" className="bg-slate-900 text-slate-100">QC Inspection</option>
                      <option value="Ready for Shipment" className="bg-slate-900 text-slate-100">Ready for Shipment</option>
                      <option value="Shipped" className="bg-slate-900 text-slate-100">Shipped</option>
                      <option value="On Hold" className="bg-slate-900 text-slate-100">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">Progress (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={d.progress}
                      onChange={(e) => handleDesignChange(index, 'progress', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl transition cursor-pointer font-mono border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold bg-[#EF3340] hover:bg-rose-600 text-white rounded-xl transition shadow-lg shadow-rose-950/50 cursor-pointer font-mono border border-rose-500/30"
          >
            Save Purchase Order
          </button>
        </div>
      </form>
    </PageFlipModal>
  );
};

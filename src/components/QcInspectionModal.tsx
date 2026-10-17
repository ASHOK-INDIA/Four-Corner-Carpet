import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Camera,
  Printer,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  Search,
  Check,
  X,
  Package,
  Layers,
  Droplets,
  Ruler,
  Maximize2
} from 'lucide-react';
import { PurchaseOrder, QcInspectionReport, QcCheckItem, QcInspectionPhoto } from '../types';
import {
  subscribeQcInspections,
  saveQcInspectionToFirestore,
  deleteQcInspectionFromFirestore,
  DEFAULT_QC_REPORTS
} from '../lib/firestoreService';
import { PageFlipModal } from './PageFlipModal';

interface QcInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
  productionData?: PurchaseOrder[];
  selectedPoNumber?: string;
}

export const QcInspectionModal: React.FC<QcInspectionModalProps> = ({
  isOpen,
  onClose,
  adminMode,
  productionData = [],
  selectedPoNumber = ''
}) => {
  const [reports, setReports] = useState<QcInspectionReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<QcInspectionReport | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'CHECKLIST' | 'PHOTOS' | 'CERTIFICATE'>('AUDIT');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
  const [newPhotoCaption, setNewPhotoCaption] = useState<string>('');
  const [newPhotoTag, setNewPhotoTag] = useState<'FACE' | 'BACKING' | 'BINDING' | 'PALLET' | 'LABEL' | 'GENERAL'>('FACE');

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Real-time Firestore subscription
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeQcInspections((data) => {
      setReports(data);
      if (data.length > 0) {
        setActiveReportId((prev) => {
          if (prev && data.some((r) => r.id === prev)) return prev;
          if (selectedPoNumber) {
            const match = data.find((r) => r.poNumber.toLowerCase() === selectedPoNumber.toLowerCase());
            if (match) return match.id;
          }
          return data[0].id;
        });
      }
    });
    return () => unsubscribe();
  }, [isOpen, selectedPoNumber]);

  // Active Report
  const currentReport = useMemo(() => {
    return reports.find((r) => r.id === activeReportId) || reports[0] || null;
  }, [reports, activeReportId]);

  // Sync edit form with current report when switching
  useEffect(() => {
    if (currentReport && !isEditing) {
      setEditForm(JSON.parse(JSON.stringify(currentReport)));
    }
  }, [currentReport, isEditing]);

  if (!isOpen) return null;

  const displayData = isEditing && editForm ? editForm : currentReport;

  // Handlers
  const handleSelectReport = (rep: QcInspectionReport) => {
    setActiveReportId(rep.id);
    setEditForm(JSON.parse(JSON.stringify(rep)));
    setIsEditing(false);
  };

  const handleCreateNewReport = (fromPo?: PurchaseOrder) => {
    const poNum = fromPo?.po || (selectedPoNumber || 'PO-2025-' + Math.floor(1000 + Math.random() * 9000));
    const buyer = fromPo?.appRef?.includes('poptop') ? 'poptop Handels GmbH' : (fromPo?.appRef || 'International Consignee');
    const newRep: QcInspectionReport = {
      id: `qc_${poNum}_${Date.now()}`,
      poNumber: poNum,
      buyerName: buyer,
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorName: 'Sanjay Kumar (Senior QC Auditor)',
      inspectionStage: 'PRE_SHIPMENT',
      aqlStandard: 'AQL 2.5 Major / 4.0 Minor (ISO 2859-1)',
      totalLotPieces: fromPo ? fromPo.designs.reduce((acc, d) => acc + (d.qty || 0), 0) || 100 : 100,
      samplePiecesChecked: 20,
      moisturePercent: 8.5,
      pileHeightMm: 12.0,
      weightPerSqMtrGsm: 2400,
      overallGrade: 'PASS',
      minorDefectsCount: 0,
      majorDefectsCount: 0,
      criticalDefectsCount: 0,
      certificateNo: `QC-FCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      verifiedBy: 'Ashok Maurya (Factory Quality Head)',
      inspectorRemarks: 'All inspected rugs conform to approved specifications. Zero critical defects.',
      palletCondition: 'EXCELLENT',
      cornerProtectorsPresent: true,
      strappingTensionOk: true,
      isLockedApproved: false,
      createdAt: new Date().toISOString(),
      checks: [
        { id: 'c1', title: 'Length & Width Tolerance', category: 'DIMENSIONS', standard: '±1.0% Max variance', status: 'PASS', remarks: 'Meets dimensional specifications' },
        { id: 'c2', title: 'Corner Diagonal Squareness', category: 'DIMENSIONS', standard: 'Diagonal diff < 1.5 cm', status: 'PASS', remarks: 'Squareness verified' },
        { id: 'c3', title: 'Pile Height & Tuft Density', category: 'WEAVE', standard: '12.0 mm ± 1 mm, dense tufting', status: 'PASS', remarks: 'Uniform tuft density' },
        { id: 'c4', title: 'Color Fastness & Shading', category: 'COLOR', standard: 'Match Grade 4-5', status: 'PASS', remarks: 'Exact match with approved master' },
        { id: 'c5', title: 'Latex Backing Cure & Odor', category: 'BACKING', standard: 'High adhesion, zero chalking', status: 'PASS', remarks: 'Proper latex vulcanization' },
        { id: 'c6', title: 'Edge Binding / Serging Stitches', category: 'FINISHING', standard: 'Heavy thread, zero skips', status: 'PASS', remarks: 'Neat edge finishing' },
        { id: 'c7', title: 'Moisture Content Meter Check', category: 'FINISHING', standard: 'Must be < 12.0%', status: 'PASS', remarks: 'Moisture level safe for export containers' },
        { id: 'c8', title: 'Metal Needle Scan', category: 'FINISHING', standard: 'Metal detector scan pass', status: 'PASS', remarks: 'Clean and metal free' },
        { id: 'c9', title: 'Waterproof Pallet Shrink Wrap', category: 'PACKAGING', standard: '200 Gauge UV wrap + Top cap', status: 'PASS', remarks: 'Fully sealed' },
        { id: 'c10', title: 'Corner Guards & Strapping', category: 'PACKAGING', standard: '4 corner rigid guards + 4 straps', status: 'PASS', remarks: 'Heavy tension straps secured' },
        { id: 'c11', title: 'Shipping Marks & Barcodes', category: 'LABELING', standard: 'Scannable barcode & SKU tags', status: 'PASS', remarks: 'Clearly labeled' }
      ],
      photos: [
        { id: 'p1', caption: 'Full Rug Face & Pile Texture', url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80', tag: 'FACE', uploadedAt: new Date().toISOString() },
        { id: 'p2', caption: 'Pallet Packaging with Corner Guards', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', tag: 'PALLET', uploadedAt: new Date().toISOString() }
      ]
    };

    setEditForm(newRep);
    setIsEditing(true);
    setActiveReportId(newRep.id);
    setToastMessage({ type: 'success', text: `Created new QC audit report for ${poNum}!` });
  };

  const handleSaveReport = async () => {
    if (!editForm) return;
    try {
      setIsSaving(true);
      await saveQcInspectionToFirestore(editForm);
      setIsEditing(false);
      setToastMessage({ type: 'success', text: `Saved QC inspection report ${editForm.certificateNo}!` });
    } catch (e) {
      console.error('Error saving QC report:', e);
      setToastMessage({ type: 'error', text: 'Failed to save report to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QC inspection report?')) return;
    try {
      await deleteQcInspectionFromFirestore(id);
      setToastMessage({ type: 'success', text: 'QC Report deleted successfully.' });
    } catch (e) {
      console.error('Error deleting report:', e);
      setToastMessage({ type: 'error', text: 'Could not delete report.' });
    }
  };

  const handleUpdateCheckStatus = (checkId: string, status: 'PASS' | 'MINOR' | 'MAJOR' | 'NA') => {
    if (!editForm) return;
    const updatedChecks = editForm.checks.map((c) => (c.id === checkId ? { ...c, status } : c));
    const minorCount = updatedChecks.filter((c) => c.status === 'MINOR').length;
    const majorCount = updatedChecks.filter((c) => c.status === 'MAJOR').length;
    let grade: 'PASS' | 'CONDITIONAL_PASS' | 'REWORK_REQUIRED' | 'FAIL' = 'PASS';
    if (majorCount > 1 || editForm.criticalDefectsCount > 0) grade = 'FAIL';
    else if (majorCount === 1) grade = 'REWORK_REQUIRED';
    else if (minorCount > 2) grade = 'CONDITIONAL_PASS';

    setEditForm({
      ...editForm,
      checks: updatedChecks,
      minorDefectsCount: minorCount,
      majorDefectsCount: majorCount,
      overallGrade: grade
    });
  };

  const handleAddPhoto = () => {
    if (!editForm) return;
    if (!newPhotoUrl.trim()) {
      alert('Please enter a valid photo image URL.');
      return;
    }
    const photo: QcInspectionPhoto = {
      id: `photo_${Date.now()}`,
      caption: newPhotoCaption.trim() || 'QC Inspection Photo',
      url: newPhotoUrl.trim(),
      tag: newPhotoTag,
      uploadedAt: new Date().toISOString()
    };
    setEditForm({
      ...editForm,
      photos: [...(editForm.photos || []), photo]
    });
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setToastMessage({ type: 'success', text: 'Photo attached to QC Report!' });
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      photos: editForm.photos.filter((p) => p.id !== photoId)
    });
  };

  const filteredReports = reports.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.poNumber.toLowerCase().includes(q) ||
      r.buyerName.toLowerCase().includes(q) ||
      r.certificateNo.toLowerCase().includes(q) ||
      r.inspectorName.toLowerCase().includes(q)
    );
  });

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-6xl" id="qcInspectionModal">
      <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[90vh] max-h-[920px]">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border animate-bounce ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-rose-600 text-white border-rose-400'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Studio Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">Digital QC & Pallet Inspection Studio</h2>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[10px] font-black rounded-full uppercase border border-emerald-400/30">
                  AQL 2.5 Audit
                </span>
                {displayData?.overallGrade === 'PASS' && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase">
                    GRADE: PASS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Pre-Shipment Quality Assurance, Rug Dimensional Tolerance & Pallet Integrity Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Audit Report Button */}
            {adminMode && (
              <button
                onClick={() => handleCreateNewReport()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Audit</span>
              </button>
            )}

            {/* Edit / Save Report Buttons */}
            {adminMode && displayData && (
              <>
                {isEditing ? (
                  <button
                    onClick={handleSaveReport}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Audit'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Edit Audit</span>
                  </button>
                )}
              </>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'AUDIT'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Inspection Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('CHECKLIST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CHECKLIST'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>11 Factory Checkpoints</span>
            </button>
            <button
              onClick={() => setActiveTab('PHOTOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PHOTOS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Pallet & Rug Photos ({displayData?.photos?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('CERTIFICATE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CERTIFICATE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-100 font-bold'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official QC Certificate</span>
            </button>
          </div>

          {/* Quick PO Search & Select */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audit PO..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
              />
            </div>
            {productionData.length > 0 && adminMode && (
              <select
                onChange={(e) => {
                  const po = productionData.find((p) => p.po === e.target.value);
                  if (po) handleCreateNewReport(po);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>
                  + Audit Active PO...
                </option>
                {productionData.map((p) => (
                  <option key={p.po} value={p.po}>
                    PO #{p.po} ({p.appRef})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: List of Reports */}
          <div className="w-64 sm:w-72 border-r border-slate-200 bg-slate-50 flex flex-col p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <span>Audited Orders ({filteredReports.length})</span>
            </div>

            {filteredReports.map((rep) => {
              const isSelected = rep.id === displayData?.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => handleSelectReport(rep)}
                  className={`p-3 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                      : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-black text-slate-900">PO #{rep.poNumber}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        rep.overallGrade === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rep.overallGrade === 'CONDITIONAL_PASS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rep.overallGrade}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 truncate">{rep.buyerName}</div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1.5 font-mono">
                    <span>{rep.inspectionDate}</span>
                    <span className="text-emerald-700 font-bold">{rep.moisturePercent}% Moisture</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate">{rep.certificateNo}</div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 italic">No reports match search.</div>
            )}
          </div>

          {/* Right Main Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
            {displayData ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* TAB 1: OVERVIEW & KEY METRICS */}
                {activeTab === 'AUDIT' && (
                  <div className="space-y-6">
                    {/* Top Order & Certificate Card */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          Inspection Target PO
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                          PO #{displayData.poNumber}
                          <span className="text-xs font-normal text-slate-500">({displayData.buyerName})</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Audited on <span className="font-bold text-slate-800">{displayData.inspectionDate}</span> by{' '}
                          <span className="font-bold text-slate-800">{displayData.inspectorName}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          Certificate Reference
                        </div>
                        <div className="font-mono text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 inline-block mt-0.5">
                          {displayData.certificateNo}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Standard: <span className="font-bold text-slate-700">{displayData.aqlStandard}</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* Moisture Meter Check */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <Droplets className="w-5 h-5 text-sky-500" />
                          <span className="text-[10px] font-black uppercase text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                            Target &lt; 12%
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">Moisture Content</div>
                        <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-baseline gap-1">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={displayData.moisturePercent}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, moisturePercent: parseFloat(e.target.value) || 0 } : null
                                )
                              }
                              className="w-20 px-1 py-0.5 border rounded font-mono font-black text-xl text-slate-900"
                            />
                          ) : (
                            displayData.moisturePercent
                          )}
                          <span className="text-sm text-slate-500 font-bold">% RH</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 font-bold mt-1">
                          {displayData.moisturePercent <= 10.0
                            ? 'Optimal Dry (Container Safe)'
                            : displayData.moisturePercent <= 12.0
                            ? 'Within Permissible Limit'
                            : 'WARNING: Moisture High!'}
                        </p>
                      </div>

                      {/* Pile Height (mm) */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <Ruler className="w-5 h-5 text-indigo-500" />
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Pile Gauge
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">Pile Height</div>
                        <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-baseline gap-1">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              value={displayData.pileHeightMm}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, pileHeightMm: parseFloat(e.target.value) || 0 } : null
                                )
                              }
                              className="w-20 px-1 py-0.5 border rounded font-mono font-black text-xl text-slate-900"
                            />
                          ) : (
                            displayData.pileHeightMm
                          )}
                          <span className="text-sm text-slate-500 font-bold">mm</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Weight: ~{displayData.weightPerSqMtrGsm || 2400} GSM</p>
                      </div>

                      {/* AQL Sample Size */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <Layers className="w-5 h-5 text-amber-500" />
                          <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Level II
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">Audit Sample Size</div>
                        <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-baseline gap-1">
                          {displayData.samplePiecesChecked}
                          <span className="text-sm text-slate-500 font-bold">/ {displayData.totalLotPieces} pcs</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">10% Random Lot Verification</p>
                      </div>

                      {/* Overall Grade */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Audit Status
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">AQL Verdict</div>
                        <div className="text-xl font-black text-emerald-700 mt-0.5">
                          {displayData.overallGrade}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Defects: {displayData.minorDefectsCount} Minor / {displayData.majorDefectsCount} Major
                        </p>
                      </div>
                    </div>

                    {/* Pallet Integrity Details */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span>Pallet & Export Packaging Integrity</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Pallet Condition</span>
                          <div className="font-black text-sm text-slate-900 mt-0.5">
                            {displayData.palletCondition || 'EXCELLENT'}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Double fumigated heat-treated pallet base</p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Rigid Corner Protectors</span>
                          <div className="font-black text-sm text-emerald-700 mt-0.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Present on All 4 Edges</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Prevents strap crushing during sea freight</p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Strapping Tension</span>
                          <div className="font-black text-sm text-emerald-700 mt-0.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>High Tension Cross Strapped</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Heavy polypropylene 16mm straps</p>
                        </div>
                      </div>

                      {/* Auditor Remarks */}
                      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60">
                        <span className="text-[10px] font-black text-emerald-900 uppercase">
                          Auditor Summary & Recommendations:
                        </span>
                        {isEditing ? (
                          <textarea
                            value={displayData.inspectorRemarks}
                            onChange={(e) =>
                              setEditForm((prev) => (prev ? { ...prev, inspectorRemarks: e.target.value } : null))
                            }
                            rows={3}
                            className="w-full mt-1.5 p-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800"
                          />
                        ) : (
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                            {displayData.inspectorRemarks}
                          </p>
                        )}
                        <div className="mt-2 text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                          <span>Quality Head: {displayData.verifiedBy}</span>
                          <span>Audit Inspector: {displayData.inspectorName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: 11 FACTORY QUALITY CHECKPOINTS */}
                {activeTab === 'CHECKLIST' && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">11 Rug & Pallet Inspection Standards</h3>
                        <p className="text-[11px] text-slate-500">
                          Detailed check parameters strictly evaluated prior to container dispatch
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl">
                        AQL 2.5 Major / 4.0 Minor
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {displayData.checks?.map((chk) => (
                        <div key={chk.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded">
                                {chk.category}
                              </span>
                              <span className="font-bold text-xs text-slate-900">{chk.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Standard: <span className="text-slate-700 font-mono">{chk.standard}</span>
                            </p>
                            {chk.remarks && (
                              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                Result: {chk.remarks}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                {(['PASS', 'MINOR', 'MAJOR', 'NA'] as const).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleUpdateCheckStatus(chk.id, st)}
                                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition cursor-pointer ${
                                      chk.status === st
                                        ? st === 'PASS'
                                          ? 'bg-emerald-600 text-white'
                                          : st === 'MINOR'
                                          ? 'bg-amber-500 text-white'
                                          : st === 'MAJOR'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-400 text-white'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                                  chk.status === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : chk.status === 'MINOR'
                                    ? 'bg-amber-100 text-amber-800'
                                    : chk.status === 'MAJOR'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {chk.status === 'PASS' ? <Check className="w-3.5 h-3.5" /> : null}
                                {chk.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: PHOTO GALLERY */}
                {activeTab === 'PHOTOS' && (
                  <div className="space-y-6">
                    {/* Add Photo Form (in Edit Mode) */}
                    {isEditing && (
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>Attach Inspection Photo Evidence</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <input
                            type="text"
                            value={newPhotoUrl}
                            onChange={(e) => setNewPhotoUrl(e.target.value)}
                            placeholder="Enter image URL (e.g. https://...)"
                            className="sm:col-span-5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                          />
                          <input
                            type="text"
                            value={newPhotoCaption}
                            onChange={(e) => setNewPhotoCaption(e.target.value)}
                            placeholder="Caption (e.g. Pallet 1 strapping)"
                            className="sm:col-span-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                          />
                          <select
                            value={newPhotoTag}
                            onChange={(e) => setNewPhotoTag(e.target.value as any)}
                            className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="FACE">FACE</option>
                            <option value="BACKING">BACKING</option>
                            <option value="BINDING">BINDING</option>
                            <option value="PALLET">PALLET</option>
                            <option value="LABEL">LABEL</option>
                            <option value="GENERAL">GENERAL</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleAddPhoto}
                            className="sm:col-span-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Photo Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {displayData.photos?.map((photo) => (
                        <div
                          key={photo.id}
                          className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group relative"
                        >
                          <div className="h-48 overflow-hidden bg-slate-100 relative">
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black uppercase rounded-lg">
                              {photo.tag}
                            </span>
                            {isEditing && (
                              <button
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="absolute top-2 right-2 w-7 h-7 bg-rose-600 text-white rounded-lg flex items-center justify-center hover:bg-rose-700 transition cursor-pointer shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="font-bold text-xs text-slate-800 truncate">{photo.caption}</div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: OFFICIAL QC CERTIFICATE (PRINTABLE) */}
                {activeTab === 'CERTIFICATE' && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm print:hidden"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Certificate</span>
                      </button>
                    </div>

                    {/* Official Document View */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-300 shadow-lg font-serif text-slate-900 space-y-6">
                      {/* Certificate Top Header */}
                      <div className="text-center border-b-2 border-slate-900 pb-4">
                        <div className="text-xs font-mono font-bold tracking-widest text-[#E4002B] uppercase">
                          FOUR CORNERS CARPETS — EXPORT QUALITY ASSURANCE DIVISION
                        </div>
                        <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 mt-1">
                          Certificate of Quality Inspection
                        </h1>
                        <p className="text-xs font-sans text-slate-600 mt-1">
                          Conforming to International AQL 2.5 Standard (ISO 2859-1) for Handcrafted Carpets & Rugs
                        </p>
                      </div>

                      {/* Meta Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-4">
                        <div>
                          <p>
                            <span className="font-bold text-slate-700">Certificate No:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{displayData.certificateNo}</span>
                          </p>
                          <p className="mt-1">
                            <span className="font-bold text-slate-700">Inspection Date:</span>{' '}
                            <span>{displayData.inspectionDate}</span>
                          </p>
                          <p className="mt-1">
                            <span className="font-bold text-slate-700">Client / Buyer:</span>{' '}
                            <span className="font-bold">{displayData.buyerName}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p>
                            <span className="font-bold text-slate-700">Purchase Order:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">PO #{displayData.poNumber}</span>
                          </p>
                          <p className="mt-1">
                            <span className="font-bold text-slate-700">Lot Quantity:</span>{' '}
                            <span>{displayData.totalLotPieces} Pieces ({displayData.samplePiecesChecked} audited)</span>
                          </p>
                          <p className="mt-1">
                            <span className="font-bold text-slate-700">Moisture Content:</span>{' '}
                            <span className="font-bold text-emerald-700">{displayData.moisturePercent}% RH (Max &lt; 12%)</span>
                          </p>
                        </div>
                      </div>

                      {/* Statement */}
                      <div className="text-xs font-sans leading-relaxed text-slate-800">
                        <p>
                          This is to certify that the rug lots under Purchase Order Ref.{' '}
                          <span className="font-bold">PO #{displayData.poNumber}</span> have undergone thorough inline and pre-shipment
                          examination at our manufacturing facility in Bhadohi, India. All audited pieces meet the specified
                          parameters for dimensional accuracy, pile density, latex backing vulcanization, colorfastness, and
                          moisture threshold.
                        </p>
                      </div>

                      {/* Verdict Banner */}
                      <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-center font-sans">
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                          Final Quality Audit Verdict
                        </span>
                        <div className="text-2xl font-black text-emerald-800 tracking-wide mt-0.5">
                          APPROVED FOR CONTAINER PACKING & EXPORT
                        </div>
                        <div className="text-xs text-emerald-700 mt-1 font-medium">
                          Zero critical defects. Pallet strapping and weatherproofing passed.
                        </div>
                      </div>

                      {/* Signatory Footer */}
                      <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center font-sans text-xs">
                        <div>
                          <div className="w-40 border-b border-slate-900 mx-auto pb-1 font-serif italic text-slate-700">
                            Sanjay Kumar
                          </div>
                          <div className="font-bold text-slate-900 mt-1">{displayData.inspectorName}</div>
                          <div className="text-[10px] text-slate-500">Chief Quality Auditor</div>
                        </div>

                        <div>
                          <div className="w-40 border-b border-slate-900 mx-auto pb-1 font-serif italic text-slate-700">
                            Ashok Maurya
                          </div>
                          <div className="font-bold text-slate-900 mt-1">{displayData.verifiedBy}</div>
                          <div className="text-[10px] text-slate-500">Factory Quality Head & Export Manager</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">No QC report selected.</div>
            )}
          </div>
        </div>
      </div>
    </PageFlipModal>
  );
};

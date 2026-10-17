import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  Save, 
  Plus, 
  Camera, 
  Trash2, 
  Award, 
  FileText, 
  Share2, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { PurchaseOrder, QcInspectionReport, QcCheckItem, QcInspectionPhoto } from '../types';
import { saveQcInspectionToFirestore, deleteQcInspectionFromFirestore } from '../lib/firestoreService';

interface DigitalQcModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: PurchaseOrder[];
  selectedPoNumber?: string;
  adminMode: boolean;
  qcReports: QcInspectionReport[];
  onOpenBuyerPortal?: (po: string) => void;
}

export const DigitalQcModal: React.FC<DigitalQcModalProps> = ({
  isOpen,
  onClose,
  productionData,
  selectedPoNumber,
  adminMode,
  qcReports,
  onOpenBuyerPortal
}) => {
  const [activePo, setActivePo] = useState<string>(selectedPoNumber || productionData[0]?.po || '1128405');
  const [activeTab, setActiveTab] = useState<'audit' | 'certificate' | 'photos'>('audit');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Synchronize when selectedPoNumber changes
  useEffect(() => {
    if (selectedPoNumber) {
      setActivePo(selectedPoNumber);
    }
  }, [selectedPoNumber]);

  const currentPoOrder = productionData.find(p => p.po === activePo);

  // Find existing QC report for this PO, or initialize standard template
  const existingReport = qcReports.find(r => r.poNumber === activePo);

  const [formData, setFormData] = useState<QcInspectionReport>(() => {
    return existingReport || createInitialReport(activePo, currentPoOrder);
  });

  useEffect(() => {
    if (existingReport) {
      setFormData(existingReport);
    } else {
      setFormData(createInitialReport(activePo, currentPoOrder));
    }
  }, [activePo, existingReport, currentPoOrder]);

  function createInitialReport(po: string, poOrder?: PurchaseOrder): QcInspectionReport {
    const totalPcs = poOrder ? poOrder.designs.reduce((acc, d) => acc + (d.qty || 0), 0) : 320;
    const sampleSize = Math.max(10, Math.min(50, Math.round(totalPcs * 0.1)));

    return {
      id: `qc_${po}_${Date.now()}`,
      poNumber: po,
      buyerName: poOrder?.appRef || 'poptop Handels GmbH',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorName: 'Sanjay Maurya (Lead QC Auditor)',
      inspectionStage: 'PRE_SHIPMENT',
      aqlStandard: 'AQL 2.5 Major / 4.0 Minor (ISO 2859-1)',
      totalLotPieces: totalPcs || 320,
      samplePiecesChecked: sampleSize || 32,
      moisturePercent: 8.6,
      pileHeightMm: 12.0,
      weightPerSqMtrGsm: 2450,
      overallGrade: 'PASS',
      minorDefectsCount: 0,
      majorDefectsCount: 0,
      criticalDefectsCount: 0,
      certificateNo: `QC-FCC-${po}-${new Date().getFullYear()}`,
      verifiedBy: 'Ashok Maurya (Factory Quality Head)',
      inspectorRemarks: 'Sample inspected thoroughly against approved master swatch. Pile density, color fastness, latex backing adhesion and moisture limits (<12%) are 100% compliant. Pallet packaging with 200 gauge polythene wrap and corner guards approved for international export.',
      palletCondition: 'EXCELLENT',
      cornerProtectorsPresent: true,
      strappingTensionOk: true,
      isLockedApproved: false,
      createdAt: new Date().toISOString(),
      checks: [
        { id: 'c1', title: 'Length & Width Dimensional Tolerance', category: 'DIMENSIONS', standard: 'Within ±1.0% allowable limit', status: 'PASS', remarks: 'All samples within tolerance' },
        { id: 'c2', title: 'Diagonal Corner Squareness', category: 'DIMENSIONS', standard: 'Diagonal difference < 1.5 cm', status: 'PASS', remarks: 'Square corners verified' },
        { id: 'c3', title: 'Pile Height & Tufting Uniformity', category: 'WEAVE', standard: '12.0 mm ± 1 mm, dense pile', status: 'PASS', remarks: 'Uniform 12mm pile throughout' },
        { id: 'c4', title: 'Color Shading vs Approved Master Swatch', category: 'COLOR', standard: 'Color Match Grade 4-5', status: 'PASS', remarks: '100% tone match under D65 light' },
        { id: 'c5', title: 'Secondary Latex Backing Cure & Adhesion', category: 'BACKING', standard: 'High flex adhesion, zero chalking', status: 'PASS', remarks: 'Latex compound fully cured' },
        { id: 'c6', title: 'Edge Binding & Serging Stitch Neatness', category: 'FINISHING', standard: 'Continuous thread, zero skips', status: 'PASS', remarks: 'Double-edge serging neat' },
        { id: 'c7', title: 'Moisture Content Meter Reading', category: 'FINISHING', standard: 'Must be strictly < 12.0%', status: 'PASS', remarks: 'Tested 8.6% RH safe for container transit' },
        { id: 'c8', title: 'Metal & Foreign Needle Detection Scan', category: 'FINISHING', standard: 'Pass handheld/tunnel detector', status: 'PASS', remarks: '0 needle alerts detected' },
        { id: 'c9', title: 'Pallet Waterproof Shrink Wrapping', category: 'PACKAGING', standard: '200 Gauge UV wrap + Top hood', status: 'PASS', remarks: 'Triple heat-shrink layer sealed' },
        { id: 'c10', title: 'Heavy Cross Strapping & Corner Guards', category: 'PACKAGING', standard: '4 corner rigid guards + 4 straps', status: 'PASS', remarks: 'High tension plastic strapping ok' },
        { id: 'c11', title: 'Shipping Marks & Barcode Scan: F4C Austria', category: 'LABELING', standard: 'Marks, PO, SKU, Barcode 100% legible', status: 'PASS', remarks: 'Barcode scanned and verified' }
      ],
      photos: [
        { id: 'p1', caption: 'Full Rug Face & Pile Texture Check', url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80', tag: 'FACE', uploadedAt: new Date().toISOString() },
        { id: 'p2', caption: 'Latex Backing & Edge Serging Examination', url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80', tag: 'BACKING', uploadedAt: new Date().toISOString() },
        { id: 'p3', caption: 'Finished Pallet with Heavy Wrap & Corner Protectors', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', tag: 'PALLET', uploadedAt: new Date().toISOString() }
      ]
    };
  }

  // Handle status toggle for check items
  const handleCheckStatusChange = (checkId: string, newStatus: 'PASS' | 'MINOR' | 'MAJOR' | 'NA') => {
    if (!adminMode) return;
    setFormData(prev => {
      const updatedChecks = prev.checks.map(item => {
        if (item.id === checkId) {
          return { ...item, status: newStatus };
        }
        return item;
      });

      // Recalculate defects
      const minor = updatedChecks.filter(c => c.status === 'MINOR').length;
      const major = updatedChecks.filter(c => c.status === 'MAJOR').length;

      let grade: 'PASS' | 'CONDITIONAL_PASS' | 'REWORK_REQUIRED' | 'FAIL' = 'PASS';
      if (major > 1) {
        grade = 'FAIL';
      } else if (major === 1) {
        grade = 'REWORK_REQUIRED';
      } else if (minor > 2) {
        grade = 'CONDITIONAL_PASS';
      }

      return {
        ...prev,
        checks: updatedChecks,
        minorDefectsCount: minor,
        majorDefectsCount: major,
        overallGrade: grade
      };
    });
  };

  const handleCheckRemarkChange = (checkId: string, remarks: string) => {
    if (!adminMode) return;
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.map(c => c.id === checkId ? { ...c, remarks } : c)
    }));
  };

  const handleSaveReport = async () => {
    if (!adminMode) return;
    try {
      setIsSaving(true);
      await saveQcInspectionToFirestore({
        ...formData,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccessMsg('QC Inspection report & certificate saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save QC report:', err);
      alert('Error saving QC report. Please check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // Add photo via URL or file
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoTag, setNewPhotoTag] = useState<'FACE' | 'BACKING' | 'BINDING' | 'PALLET' | 'LABEL'>('PALLET');

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const newP: QcInspectionPhoto = {
      id: `p_${Date.now()}`,
      caption: newPhotoCaption.trim() || `${newPhotoTag} Inspection Photo`,
      url: newPhotoUrl.trim(),
      tag: newPhotoTag,
      uploadedAt: new Date().toISOString()
    };
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, newP]
    }));
    setNewPhotoUrl('');
    setNewPhotoCaption('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newP: QcInspectionPhoto = {
          id: `p_${Date.now()}`,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          url: reader.result,
          tag: newPhotoTag,
          uploadedAt: new Date().toISOString()
        };
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, newP]
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!adminMode) return;
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Digital QC & Pre-Shipment Inspection Studio</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                    AQL 2.5 Live
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Rug pile & dimensional audit, pallet wrapping checklist & official Export Quality Certificate
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenBuyerPortal && (
              <button
                onClick={() => onOpenBuyerPortal(activePo)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm"
                title="View in Buyer Live Tracking Portal"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buyer Portal View</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PO Selector Bar & Action Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Select PO:</span>
            {productionData.map(poItem => (
              <button
                key={poItem.po}
                onClick={() => setActivePo(poItem.po)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                  activePo === poItem.po
                    ? 'bg-[#E4002B] text-white shadow-sm ring-2 ring-rose-300'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                PO #{poItem.po}
                {qcReports.some(r => r.poNumber === poItem.po && r.overallGrade === 'PASS') && (
                  <span className="ml-1.5 text-[10px] text-emerald-300">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Inspection Checklist
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'photos' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Pallet Photos ({formData.photos.length})
            </button>
            <button
              onClick={() => setActiveTab('certificate')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'certificate' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>3. QC Certificate</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-emerald-800 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 text-xs">✕</button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          
          {/* TAB 1: INSPECTION CHECKLIST & AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-5 max-w-5xl mx-auto">
              
              {/* Summary Scorecard Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Verdict</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                      formData.overallGrade === 'PASS' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : formData.overallGrade === 'CONDITIONAL_PASS'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {formData.overallGrade.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Moisture Content</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black font-mono text-slate-900">{formData.moisturePercent}%</span>
                    <span className="text-[11px] text-emerald-600 font-bold">(Target &lt; 12.0%)</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sampling AQL Standard</span>
                  <div className="mt-1">
                    <span className="text-xs font-black text-slate-800">{formData.samplePiecesChecked} / {formData.totalLotPieces} Rugs</span>
                    <p className="text-[10px] text-slate-500">ISO 2859-1 Level II</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pallet Packaging</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formData.palletCondition}
                    </span>
                    <span className="text-[10px] text-slate-500">Strapped & Wrapped</span>
                  </div>
                </div>
              </div>

              {/* Inspector Meta Inputs (Admin Editable) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspection Audit Metadata</span>
                  </h3>
                  {!adminMode && (
                    <span className="text-[11px] text-slate-500 italic">Admin mode required to edit fields</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Lead Inspector Name</label>
                    <input
                      type="text"
                      disabled={!adminMode}
                      value={formData.inspectorName}
                      onChange={e => setFormData({ ...formData, inspectorName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Inspection Date</label>
                    <input
                      type="date"
                      disabled={!adminMode}
                      value={formData.inspectionDate}
                      onChange={e => setFormData({ ...formData, inspectionDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Factory Quality Head / Signatory</label>
                    <input
                      type="text"
                      disabled={!adminMode}
                      value={formData.verifiedBy}
                      onChange={e => setFormData({ ...formData, verifiedBy: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Moisture Meter Reading (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!adminMode}
                      value={formData.moisturePercent}
                      onChange={e => setFormData({ ...formData, moisturePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Avg Pile Height (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={!adminMode}
                      value={formData.pileHeightMm}
                      onChange={e => setFormData({ ...formData, pileHeightMm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Certificate #</label>
                    <input
                      type="text"
                      disabled={!adminMode}
                      value={formData.certificateNo}
                      onChange={e => setFormData({ ...formData, certificateNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Checklist Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider">11-Point Rug & Pallet Quality Checklist</span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    Defects: Minor ({formData.minorDefectsCount}) | Major ({formData.majorDefectsCount})
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {formData.checks.map((chk, idx) => (
                    <div key={chk.id} className="p-3.5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-800">{chk.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {chk.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-7">
                          Standard: <span className="font-semibold text-slate-700">{chk.standard}</span>
                        </p>
                        {adminMode ? (
                          <input
                            type="text"
                            placeholder="Add specific inspection observation or measurement..."
                            value={chk.remarks || ''}
                            onChange={e => handleCheckRemarkChange(chk.id, e.target.value)}
                            className="mt-1.5 ml-7 w-[90%] text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        ) : (
                          chk.remarks && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1 pl-7 italic">
                              Obs: {chk.remarks}
                            </p>
                          )
                        )}
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCheckStatusChange(chk.id, 'PASS')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            chk.status === 'PASS'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCheckStatusChange(chk.id, 'MINOR')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            chk.status === 'MINOR'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Minor</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCheckStatusChange(chk.id, 'MAJOR')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            chk.status === 'MAJOR'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Major</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inspector Remarks Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Official Inspector Final Remarks & Pallet Release Statement
                </label>
                <textarea
                  rows={3}
                  disabled={!adminMode}
                  value={formData.inspectorRemarks}
                  onChange={e => setFormData({ ...formData, inspectorRemarks: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 font-medium"
                />
              </div>

              {/* Bottom Actions */}
              {adminMode && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleSaveReport}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving to Firestore...' : 'Save & Publish QC Audit'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PALLET & RUG PHOTOS */}
          {activeTab === 'photos' && (
            <div className="space-y-5 max-w-5xl mx-auto">
              
              {/* Photo Upload Box (Admin Mode) */}
              {adminMode && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Add Live Inspection / Pallet Proof Photo</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Image URL (or select file below)..."
                        value={newPhotoUrl}
                        onChange={e => setNewPhotoUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <select
                        value={newPhotoTag}
                        onChange={e => setNewPhotoTag(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="PALLET">Pallet Packaging</option>
                        <option value="FACE">Rug Face & Pile</option>
                        <option value="BACKING">Latex Backing</option>
                        <option value="BINDING">Edge Serging</option>
                        <option value="LABEL">Shipping Label / Barcode</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddPhoto}
                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                      >
                        Add URL
                      </button>
                      <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1">
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {formData.photos.map(photo => (
                  <div key={photo.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col group">
                    <div className="relative aspect-4/3 bg-slate-900 overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full">
                        {photo.tag}
                      </span>
                      {adminMode && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition opacity-0 group-hover:opacity-100"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-1">
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">{photo.caption}</p>
                      <span className="text-[10px] text-slate-400 mt-2">
                        {new Date(photo.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {formData.photos.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                  No inspection photos attached yet. Add pallet wrap and rug face proofs above.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OFFICIAL PRINTABLE / PDF QC CERTIFICATE */}
          {activeTab === 'certificate' && (
            <div className="max-w-4xl mx-auto space-y-4">
              
              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Certificate of Quality & Pre-Shipment Inspection (Official)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintCertificate}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  {adminMode && (
                    <button
                      onClick={handleSaveReport}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Record</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Printable Document Box */}
              <div 
                ref={printRef}
                className="bg-white p-8 sm:p-10 rounded-2xl border-2 border-slate-800 shadow-lg text-slate-900 font-sans print:border-none print:shadow-none print:p-0"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-emerald-700 tracking-widest uppercase">
                      FOUR CORNERS CARPETS — EXPORT QUALITY ASSURANCE DIVISION
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                      CERTIFICATE OF QUALITY & INSPECTION
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                      Compliant with ISO 2859-1 (AQL 2.5 General Inspection Level II) for International Export
                    </p>
                  </div>

                  <div className="text-right sm:text-right shrink-0">
                    <div className="inline-block px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs rounded-md uppercase tracking-wider">
                      ★ QC VERIFIED: PASS
                    </div>
                    <p className="text-[11px] font-mono font-bold text-slate-600 mt-1.5">
                      CERTIFICATE NO: <span className="text-slate-900">{formData.certificateNo}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      DATE: {formData.inspectionDate}
                    </p>
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Buyer / Consignee:</span>
                    <span className="font-black text-slate-900">{formData.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Purchase Order:</span>
                    <span className="font-black font-mono text-slate-900">PO #{formData.poNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Lot Size:</span>
                    <span className="font-black text-slate-900">{formData.totalLotPieces} Rug Pieces</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Inspected Sample:</span>
                    <span className="font-black text-slate-900">{formData.samplePiecesChecked} Pieces Random</span>
                  </div>
                </div>

                {/* Technical Parameters */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-3">
                    Verified Physical & Laboratory Parameters
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Moisture Meter:</span>
                      <span className="text-base font-black text-emerald-700 font-mono">{formData.moisturePercent}% RH</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Ceiling: Max 12.0%</span>
                    </div>

                    <div className="p-3 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Average Pile Height:</span>
                      <span className="text-base font-black text-slate-900 font-mono">{formData.pileHeightMm} mm</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Tolerance ±1mm</span>
                    </div>

                    <div className="p-3 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Color Match Grade:</span>
                      <span className="text-base font-black text-slate-900 font-mono">Grade 4-5</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Standard D65 Light</span>
                    </div>

                    <div className="p-3 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Pallet Packing & Wrap:</span>
                      <span className="text-base font-black text-emerald-700">100% SECURE</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">200 Gauge Poly + Strapped</span>
                    </div>
                  </div>
                </div>

                {/* Audit Checklist Summary Table */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                    Quality Inspection Checkpoints Summary
                  </h3>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-1.5 px-2">Checkpoint</th>
                        <th className="py-1.5 px-2">Category</th>
                        <th className="py-1.5 px-2">Standard Spec</th>
                        <th className="py-1.5 px-2 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.checks.map((chk) => (
                        <tr key={chk.id} className="py-1">
                          <td className="py-1 px-2 font-medium text-slate-800">{chk.title}</td>
                          <td className="py-1 px-2 text-slate-500">{chk.category}</td>
                          <td className="py-1 px-2 text-slate-600 italic">{chk.standard}</td>
                          <td className="py-1 px-2 text-right font-black text-emerald-700">
                            {chk.status === 'PASS' ? '✓ PASS' : chk.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inspector Statement */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl mb-8">
                  <p className="text-xs text-emerald-950 leading-relaxed italic">
                    &ldquo;{formData.inspectorRemarks}&rdquo;
                  </p>
                </div>

                {/* Signatures & Seal */}
                <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <div className="h-14 flex items-end">
                      <span className="font-serif italic text-base text-slate-800">{formData.inspectorName}</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">Chief Quality Inspector</p>
                      <p className="text-[11px] text-slate-500">Inspection & Audit Bureau</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="h-14 flex items-end justify-end">
                      <div className="w-20 h-12 border-2 border-dashed border-emerald-600 rounded-lg flex items-center justify-center text-[10px] font-black text-emerald-800 uppercase tracking-tighter transform -rotate-3">
                        FCC FACTORY SEAL
                      </div>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-900">{formData.verifiedBy}</p>
                      <p className="text-[11px] text-slate-500">Authorized Factory Signatory</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

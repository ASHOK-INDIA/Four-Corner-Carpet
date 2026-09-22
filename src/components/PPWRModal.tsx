import React, { useState } from 'react';
import { Leaf, X, FileText, FlaskConical, FileSpreadsheet, Download, Trash2, CloudUpload, Lock, CheckCircle2 } from 'lucide-react';
import { PPWRFilesStore, PPWRFile, PurchaseOrder } from '../types';
import { PageFlipModal } from './PageFlipModal';

interface PPWRModalProps {
  isOpen: boolean;
  onClose: () => void;
  ppwrFilesStore: PPWRFilesStore;
  adminMode: boolean;
  productionData: PurchaseOrder[];
  onUploadFile: (category: keyof PPWRFilesStore, file: PPWRFile) => void;
  onDeleteFile: (category: keyof PPWRFilesStore, fileId: string) => void;
}

export const PPWRModal: React.FC<PPWRModalProps> = ({
  isOpen,
  onClose,
  ppwrFilesStore,
  adminMode,
  productionData,
  onUploadFile,
  onDeleteFile,
}) => {
  const [activeTab, setActiveTab] = useState<keyof PPWRFilesStore>('declaration');
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [uploadPo, setUploadPo] = useState<string>(productionData[0]?.po || '');
  const [uploadName, setUploadName] = useState<string>('');
  const [uploadType, setUploadType] = useState<'PDF' | 'EXCEL'>('PDF');
  const [uploadSize, setUploadSize] = useState<string>('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const currentFiles = ppwrFilesStore[activeTab] || [];

  const handleDownload = (fileName: string) => {
    setDownloadNotice(`Downloading "${fileName}". Synchronized with EU PPWR compliance repository.`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadName(file.name);
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        setUploadType('EXCEL');
      } else {
        setUploadType('PDF');
      }
      const sizeStr =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      setUploadSize(sizeStr);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = uploadName.trim();
    if (!name) {
      alert('Please enter a document name or choose a file.');
      return;
    }
    if (uploadType === 'PDF' && !name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    if (uploadType === 'EXCEL' && !name.toLowerCase().endsWith('.xlsx') && !name.toLowerCase().endsWith('.xls')) {
      name += '.xlsx';
    }

    const assignedPo = uploadPo.trim() || (productionData[0]?.po ?? 'General');

    const newFile: PPWRFile = {
      id: `DOC_${Date.now()}`,
      name: name,
      type: uploadType,
      date: new Date().toISOString().split('T')[0],
      size: uploadSize.trim() || '1.0 MB',
      po: assignedPo,
    };

    onUploadFile(activeTab, newFile);
    setShowUploadDialog(false);
    setUploadName('');
    setUploadSize('');
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl" id="ppwrModal">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 font-mono">EU PPWR Menu & Compliance Management</h2>
            <p className="text-xs text-slate-500 font-mono">
              Packaging & Packaging Waste Regulation Compliance Suite
            </p>
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

      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-white text-slate-700">
        {downloadNotice && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        )}

        {/* 3 PPWR Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Declaration */}
          <div
            id="tabCardDeclaration"
            onClick={() => setActiveTab('declaration')}
            className={`cursor-pointer bg-transparent p-4 rounded-xl transition hover:border-amber-500/60 ${
              activeTab === 'declaration' ? 'border-2 border-amber-500 bg-amber-50/40 ring-1 ring-amber-400/50' : 'border border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <FileText className="w-4 h-4" />
              </span>
              <span
                id="badgeDecStatus"
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  activeTab === 'declaration' ? 'bg-amber-500/20 text-amber-800 border border-amber-500/40' : 'bg-slate-100 text-slate-500 font-bold border border-slate-200'
                }`}
              >
                {activeTab === 'declaration' ? 'Active' : `${ppwrFilesStore.declaration?.length || 0} docs`}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">1. Declaration</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Official conformity certificates, eco-compliance statements & document uploads.
            </p>
          </div>

          {/* 2. Test Report */}
          <div
            id="tabCardTestReport"
            onClick={() => setActiveTab('testReport')}
            className={`cursor-pointer bg-transparent p-4 rounded-xl transition hover:border-purple-500/60 ${
              activeTab === 'testReport' ? 'border-2 border-purple-500 bg-purple-50/40 ring-1 ring-purple-400/50' : 'border border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                <FlaskConical className="w-4 h-4" />
              </span>
              <span
                id="badgeTestStatus"
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeTab === 'testReport'
                    ? 'bg-purple-500/20 text-purple-800 font-bold border border-purple-500/40'
                    : 'bg-slate-100 text-slate-500 font-bold border border-slate-200'
                }`}
              >
                {activeTab === 'testReport' ? 'Active' : `${ppwrFilesStore.testReport?.length || 0} docs`}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">2. Test Report</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Laboratory testing reports, heavy metal analysis, and recyclability test files.
            </p>
          </div>

          {/* 3. Technical Data Sheet */}
          <div
            id="tabCardTechnicalDataSheet"
            onClick={() => setActiveTab('technicalDataSheet')}
            className={`cursor-pointer bg-transparent p-4 rounded-xl transition hover:border-indigo-500/60 ${
              activeTab === 'technicalDataSheet'
                ? 'border-2 border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/50'
                : 'border border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span
                id="badgeTechStatus"
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeTab === 'technicalDataSheet'
                    ? 'bg-indigo-500/20 text-indigo-800 font-bold border border-indigo-500/40'
                    : 'bg-slate-100 text-slate-500 font-bold border border-slate-200'
                }`}
              >
                {activeTab === 'technicalDataSheet' ? 'Active' : `${ppwrFilesStore.technicalDataSheet?.length || 0} docs`}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">3. Technical Data Sheet</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Packaging specifications, weight ratios, dimensions & material composition sheets.
            </p>
          </div>
        </div>

        {/* Active Tab Content & Files Table */}
        <div id="ppwrTabContent" className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-mono">
                {activeTab === 'declaration' && 'Declaration of Conformity (EU Articles)'}
                {activeTab === 'testReport' && 'Laboratory Test Reports'}
                {activeTab === 'technicalDataSheet' && 'Technical Data Sheets (TDS)'}
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                {activeTab === 'declaration' &&
                  'Upload official EU packaging conformity certificates and legal declarations (.pdf, .xlsx).'}
                {activeTab === 'testReport' &&
                  'Upload laboratory, heavy metal, and packaging recyclability test reports (.pdf, .xlsx).'}
                {activeTab === 'technicalDataSheet' &&
                  'Upload material composition specs, dimension charts, and empty space calculation sheets (.pdf, .xlsx).'}
              </p>
            </div>
            <div>
              {adminMode ? (
                <button
                  id="uploadDocBtn"
                  onClick={() => {
                    setUploadPo(productionData[0]?.po || '');
                    setShowUploadDialog(true);
                  }}
                  className="px-3.5 py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer font-mono border border-transparent"
                >
                  <CloudUpload className="w-4 h-4 text-white" /> Upload Excel / PDF
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-flex items-center gap-1 shadow-sm">
                  <Lock className="w-3 h-3 text-slate-400" /> Admin mode required to upload files
                </span>
              )}
            </div>
          </div>

          {/* Files Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-xs font-mono">
                <tr>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Associated PO</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Upload Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 text-xs italic font-mono bg-white">
                      No documents uploaded in this category yet.
                    </td>
                  </tr>
                ) : (
                  currentFiles.map((file) => (
                    <tr key={file.id} className="text-xs hover:bg-slate-50 transition bg-white">
                      <td className="p-3 font-mono font-bold text-slate-800 flex items-center gap-2">
                        {file.type === 'PDF' ? (
                          <FileText className="w-4 h-4 text-rose-500" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>{file.name}</span>
                      </td>
                      <td className="p-3 font-mono text-[#EF3340] font-extrabold">{file.po || 'General'}</td>
                      <td className="p-3 text-slate-500 font-mono">{file.size}</td>
                      <td className="p-3 text-slate-500 font-mono">{file.date}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(file.name)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer font-mono shadow-sm"
                            title="Download File"
                          >
                            <Download className="w-3 h-3 text-[#E4002B]" /> Download
                          </button>
                          {adminMode && (
                            <button
                              onClick={() => onDeleteFile(activeTab, file.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-[10px] font-bold transition cursor-pointer font-mono"
                              title="Delete File"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>PPWR Regulation Standard (Excel & PDF Support)</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer font-mono border border-slate-200"
        >
          Close Menu
        </button>
      </div>

      {/* Upload Dialog Sub-Modal */}
      {showUploadDialog && (
        <div className="fixed top-[64px] inset-x-0 bottom-0 z-60 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-mono">
                <CloudUpload className="w-4 h-4 text-[#E4002B]" /> Upload Document ({activeTab.toUpperCase()})
              </h2>
              <button
                onClick={() => setShowUploadDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 font-mono">Associated Purchase Order</label>
                {productionData.length > 0 ? (
                  <select
                    value={uploadPo}
                    onChange={(e) => setUploadPo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 cursor-pointer"
                  >
                    {productionData.map((i) => (
                      <option key={i.po} value={i.po} className="bg-white text-slate-800">
                        {i.po} ({i.appRef})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={uploadPo}
                    onChange={(e) => setUploadPo(e.target.value)}
                    placeholder="Enter PO Number e.g. PO-101"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 font-mono">Document Name / Title *</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Enter Document Title"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 font-mono">File Format / Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as 'PDF' | 'EXCEL')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer font-mono"
                >
                  <option value="PDF" className="bg-white text-slate-800">PDF Document (.pdf)</option>
                  <option value="EXCEL" className="bg-white text-slate-800">Excel Spreadsheet (.xlsx / .xls)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 font-mono">File Attachment</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-[#E4002B] hover:file:bg-rose-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadDialog(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer font-mono border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#EF3340] hover:bg-rose-600 text-white rounded-xl transition shadow-md cursor-pointer font-mono"
                >
                  Upload & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageFlipModal>
  );
};

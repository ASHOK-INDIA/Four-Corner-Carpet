import React, { useState } from 'react';
import { PPWRFilesStore, PPWRFile } from '../types';
import {
  X,
  FileText,
  Upload,
  Trash2,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface PPWRModalProps {
  store: PPWRFilesStore;
  onClose: () => void;
  onAddFile: (category: keyof PPWRFilesStore, file: PPWRFile) => void;
  onDeleteFile: (category: keyof PPWRFilesStore, id: string) => void;
}

export const PPWRModal: React.FC<PPWRModalProps> = ({
  store,
  onClose,
  onAddFile,
  onDeleteFile,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<keyof PPWRFilesStore>('certifications');
  const [isUploading, setIsUploading] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const fileData: PPWRFile = {
      id: `ppwr_${Date.now()}`,
      name: newFileName,
      uploadDate: new Date().toISOString().split('T')[0],
      size: '1.2 MB',
      status: 'Verified',
      type: 'PDF',
    };

    onAddFile(selectedCategory, fileData);
    setNewFileName('');
    setIsUploading(false);
  };

  const categories: { key: keyof PPWRFilesStore; label: string; description: string }[] = [
    {
      key: 'certifications',
      label: 'Packaging Certifications',
      description: 'GRS, FSC, OEKO-TEX, and biodegradable polybag certificates',
    },
    {
      key: 'declarations',
      label: 'Supplier Declarations',
      description: 'Recycled content % and heavy-metal free compliance statements',
    },
    {
      key: 'labReports',
      label: 'Lab Test Reports',
      description: 'TUV / SGS chemical test reports for REACH & EU PPWR packaging',
    },
    {
      key: 'recycledContent',
      label: 'Recycled Content Traceability',
      description: 'Post-consumer recycled (PCR) resin invoices & audit trails',
    },
  ];

  const currentFiles = store[selectedCategory] || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold">EU PPWR Compliance Vault</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Packaging & Packaging Waste Regulation (EU 2024/1857) audit-ready documents
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-72 bg-slate-50 border-r border-slate-200 p-4 space-y-2 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-sm">{cat.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{cat.description}</div>
              </button>
            ))}
          </div>

          {/* Files List & Actions */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {categories.find((c) => c.key === selectedCategory)?.label}
              </h3>
              <button
                onClick={() => setIsUploading(!isUploading)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>

            {isUploading && (
              <form onSubmit={handleAddFile} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Title / File Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="E.g., EU_PPWR_GRS_Polybag_Certificate_2026.pdf"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsUploading(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Save Document</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3 flex-1">
              {currentFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No documents uploaded in this category</p>
                  <p className="text-xs text-slate-400 mt-1">Upload audit reports and declarations for compliance.</p>
                </div>
              ) : (
                currentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{file.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Uploaded: {file.uploadDate} • Size: {file.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          file.status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {file.status}
                      </span>
                      <button
                        onClick={() => onDeleteFile(selectedCategory, file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

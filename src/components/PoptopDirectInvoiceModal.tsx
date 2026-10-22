import React, { useState, useRef } from 'react';
import { WindowFrame } from './WindowFrame';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface PoptopDirectInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  onMinimize: () => void;
  isMaximized: boolean;
  onMaximize: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const PoptopDirectInvoiceModal: React.FC<PoptopDirectInvoiceModalProps> = ({
  isOpen,
  onClose,
  isMinimized,
  onMinimize,
  isMaximized,
  onMaximize,
  zIndex,
  onFocus,
}) => {
  // Sender and Receiver state with exact default values requested by user
  const [senderText, setSenderText] = useState<string>(
    'FOUR CORNER CARPETS:\nWARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401,\nUTTAR PRADESH, INDIA'
  );
  const [receiverText, setReceiverText] = useState<string>(
    'POPTOP:\nMargaretenstraße 121/11,\n1050 Vienna, Austria'
  );

  const [documentTitle, setDocumentTitle] = useState<string>('SHIPPING ADDRESS DECLARATION');
  const [refNumber, setRefNumber] = useState<string>('FCC-POP-2026-001');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadPDF = async () => {
    if (isGenerating || !sheetRef.current) return;
    setIsGenerating(true);
    showToast('बड़ा फैंसी एड्रेस PDF जनरेट हो रहा है...');

    try {
      const element = sheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Poptop_Direct_Sender_Receiver_Address_${refNumber}.pdf`);
      showToast('PDF सफलतापूर्वक डाउनलोड हो गया!');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('PDF जनरेट करने में त्रुटि हुई।');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <WindowFrame
      title="Poptop Direct Invoice (Big Sender & Receiver Address Studio)"
      icon={<span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>}
      isOpen={isOpen}
      onClose={onClose}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      isMaximized={isMaximized}
      onMaximize={onMaximize}
      zIndex={zIndex}
      onFocus={onFocus}
      initialWidth="w-[96vw]"
      initialHeight="w-[92vh]"
    >
      <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border border-indigo-400/40 animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Top Control Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-mono font-bold">
              📌 Big Address Studio (Sender & Receiver Only)
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">
              Full-Page Fancy Typography for Direct Export & Shipping
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isGenerating ? 'Generating Big PDF...' : '📥 Download Big Address PDF'}</span>
            </button>
          </div>
        </div>

        {/* Main Split Layout: Editor Sidebar & Full-Page Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Editable Configuration */}
          <div className="lg:col-span-4 bg-slate-900/80 border-r border-slate-800 p-4 overflow-y-auto space-y-4 text-xs">
            <div className="text-sm font-black text-indigo-300 border-b border-slate-800 pb-2">
              ✏️ Edit Addresses & Titles
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Document Title:</label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Reference No:</label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            {/* FROM (Sender) Editor */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-black text-indigo-400 uppercase tracking-wider">
                FROM (Sender Address):
              </label>
              <textarea
                rows={4}
                value={senderText}
                onChange={(e) => setSenderText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-serif text-xs leading-relaxed focus:border-indigo-500 outline-none resize-none font-bold"
              />
            </div>

            {/* TO (Receiver) Editor */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-black text-violet-400 uppercase tracking-wider">
                TO (Receiver Address):
              </label>
              <textarea
                rows={4}
                value={receiverText}
                onChange={(e) => setReceiverText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-serif text-xs leading-relaxed focus:border-violet-500 outline-none resize-none font-bold"
              />
            </div>

            <div className="text-[11px] text-slate-400 bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/40">
              💡 <strong>Note:</strong> यह मॉड्यूल विशेष रूप से बड़े और स्पष्ट अक्षरों में Sender और Receiver के पते को पूरे पृष्ठ पर दिखाने के लिए बनाया गया है।
            </div>
          </div>

          {/* Right Column: Full-Page Big Fancy Address Preview */}
          <div className="lg:col-span-8 bg-slate-950 p-4 sm:p-8 overflow-y-auto flex justify-center items-center">
            <div
              ref={sheetRef}
              className="bg-white text-slate-900 w-full max-w-[210mm] p-10 sm:p-16 shadow-2xl rounded-none border-4 border-slate-900 font-serif flex flex-col justify-between"
              style={{ minHeight: '297mm' }}
            >
              {/* Header Banner (Clean Title Only) */}
              <div className="border-b-4 border-slate-900 pb-6 text-center space-y-2">
                <div className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-slate-900">
                  {documentTitle}
                </div>
                <div className="text-xs font-mono text-slate-600 bg-slate-100 inline-block px-4 py-1 rounded-full border border-slate-300 font-bold">
                  REF: {refNumber} | DATE: {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Central Big Addresses Section */}
              <div className="my-auto space-y-12 py-8">
                {/* FROM BOX */}
                <div className="bg-slate-50 border-4 border-slate-900 rounded-2xl p-8 sm:p-12 shadow-lg relative">
                  <div className="absolute -top-4 left-8 bg-slate-900 text-white text-xs font-mono px-4 py-1 rounded-full font-extrabold uppercase tracking-widest shadow-md">
                    FROM
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-slate-900 leading-snug tracking-wide whitespace-pre-line mt-2">
                    {senderText}
                  </div>
                </div>

                {/* TO BOX */}
                <div className="bg-indigo-50/70 border-4 border-indigo-900 rounded-2xl p-8 sm:p-12 shadow-lg relative">
                  <div className="absolute -top-4 left-8 bg-indigo-900 text-white text-xs font-mono px-4 py-1 rounded-full font-extrabold uppercase tracking-widest shadow-md">
                    TO
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-indigo-950 leading-snug tracking-wide whitespace-pre-line mt-2">
                    {receiverText}
                  </div>
                </div>
              </div>

              {/* Clean Bottom Line */}
              <div className="border-t-4 border-slate-900 pt-6 text-center text-xs font-mono text-slate-600 font-bold">
                SHIPPING & ADDRESS IDENTIFICATION SHEET
              </div>
            </div>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
};

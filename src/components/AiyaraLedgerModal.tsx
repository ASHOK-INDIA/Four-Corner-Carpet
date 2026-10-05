import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Printer, Trash2, Edit2, BookOpen, Search, Filter, 
  ArrowUpRight, ArrowDownLeft, Wallet, Building2, Stamp, Check, 
  RotateCcw, Image as ImageIcon, Download, FileSpreadsheet, Loader2 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LedgerEntry, PurchaseOrder } from '../types';
import { subscribeLedgerEntries, saveLedgerEntryToFirestore, deleteLedgerEntryFromFirestore } from '../lib/firestoreService';

interface AiyaraLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: PurchaseOrder[];
  adminMode: boolean;
}

const DEFAULT_STAMP_URL = 'https://i.postimg.cc/tJynktRD/f4C-stamp.png';
const DEFAULT_LOGO_URL = 'https://i.postimg.cc/wxbwW1Y7/logo-F4C.png';

// Helper to convert number to words in Indian Currency format
function convertNumberToWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero only';
  
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : 'and ' + numToWords(n % 100));
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 === 0 ? '' : numToWords(n % 1000));
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 === 0 ? '' : numToWords(n % 100000));
    return numToWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 === 0 ? '' : numToWords(n % 10000000));
  }

  const rupees = Math.floor(Math.abs(num));
  const paisa = Math.round((Math.abs(num) - rupees) * 100);

  let result = numToWords(rupees).trim();
  if (result) result += '';
  if (paisa > 0) {
    result += ' and ' + numToWords(paisa).trim() + ' Paisa';
  }
  return result + ' only';
}

export const AiyaraLedgerModal: React.FC<AiyaraLedgerModalProps> = ({
  isOpen,
  onClose,
  productionData,
  adminMode,
}) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  
  // Stamp & Logo configuration state
  const [stampUrl, setStampUrl] = useState<string>(() => {
    return localStorage.getItem('f4c_ledger_stamp_url') || DEFAULT_STAMP_URL;
  });
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('f4c_ledger_logo_url') || DEFAULT_LOGO_URL;
  });
  const [showStamp, setShowStamp] = useState<boolean>(() => {
    const saved = localStorage.getItem('f4c_ledger_show_stamp');
    return saved !== null ? saved === 'true' : true;
  });

  // Stamp settings modal state
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);
  const [tempStampUrl, setTempStampUrl] = useState<string>(stampUrl);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>(logoUrl);
  const [tempShowStamp, setTempShowStamp] = useState<boolean>(showStamp);
  const [stampSavedNotice, setStampSavedNotice] = useState<boolean>(false);

  // Filters & Search
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [selectedPartyType, setSelectedPartyType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Add / Edit Form Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState<string>(`VCH-${Math.floor(100 + Math.random() * 900)}`);
  const [partyName, setPartyName] = useState<string>('AIYARA TEXTILE MANUFACTURING PRIVATE LIMITED');
  const [partyType, setPartyType] = useState<LedgerEntry['partyType']>('SUPPLIER');
  const [transactionType, setTransactionType] = useState<LedgerEntry['transactionType']>('CREDIT');
  const [particulars, setParticulars] = useState<string>('Advance by RTGS');
  const [poReference, setPoReference] = useState<string>('PO# 1123966');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<LedgerEntry['paymentMode']>('BANK_TRANSFER');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setIsSyncing(true);
    const unsub = subscribeLedgerEntries(
      (data) => {
        setLedgerEntries(data);
        setIsSyncing(false);
      },
      (err) => {
        console.warn('Ledger entries subscription error:', err);
        setIsSyncing(false);
      }
    );
    return () => unsub();
  }, [isOpen]);

  // Unique party names list for filtering
  const partiesList = useMemo(() => {
    const set = new Set<string>();
    ledgerEntries.forEach(e => {
      if (e.partyName) set.add(e.partyName);
    });
    return Array.from(set).sort();
  }, [ledgerEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter(entry => {
      if (selectedParty !== 'ALL' && entry.partyName !== selectedParty) return false;
      if (selectedPartyType !== 'ALL' && entry.partyType !== selectedPartyType) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches = 
          entry.partyName.toLowerCase().includes(s) ||
          entry.particulars.toLowerCase().includes(s) ||
          entry.voucherNo.toLowerCase().includes(s) ||
          (entry.poReference && entry.poReference.toLowerCase().includes(s)) ||
          (entry.invoiceNo && entry.invoiceNo.toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [ledgerEntries, selectedParty, selectedPartyType, searchTerm]);

  // Calculations: Total Debit & Total Credit & Closing Balance
  const { totalDebit, totalCredit, closingBalance } = useMemo(() => {
    let dr = 0;
    let cr = 0;
    filteredEntries.forEach(e => {
      if (e.transactionType === 'DEBIT') dr += Number(e.amount) || 0;
      else cr += Number(e.amount) || 0;
    });
    const bal = Math.abs(dr - cr);
    return {
      totalDebit: dr,
      totalCredit: cr,
      closingBalance: bal
    };
  }, [filteredEntries]);

  const handleOpenAddModal = () => {
    setEditingEntryId(null);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setVoucherNo(`VCH-${Math.floor(100 + Math.random() * 900)}`);
    setPartyName('AIYARA TEXTILE MANUFACTURING PRIVATE LIMITED');
    setPartyType('SUPPLIER');
    setTransactionType('CREDIT');
    setParticulars('Advance by RTGS');
    setPoReference('PO# ');
    setInvoiceNo('');
    setAmount(0);
    setPaymentMode('BANK_TRANSFER');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.date);
    setVoucherNo(entry.voucherNo);
    setPartyName(entry.partyName);
    setPartyType(entry.partyType);
    setTransactionType(entry.transactionType);
    setParticulars(entry.particulars);
    setPoReference(entry.poReference || '');
    setInvoiceNo(entry.invoiceNo || '');
    setAmount(entry.amount);
    setPaymentMode(entry.paymentMode || 'BANK_TRANSFER');
    setNotes(entry.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || amount <= 0) {
      alert('Please enter a valid party name and amount.');
      return;
    }

    const entryToSave: LedgerEntry = {
      id: editingEntryId || `led_${Date.now()}`,
      date: entryDate,
      voucherNo: voucherNo.trim() || `VCH-${Math.floor(100 + Math.random() * 900)}`,
      partyName: partyName.trim(),
      partyType,
      transactionType,
      particulars: particulars.trim() || `${transactionType === 'DEBIT' ? 'Invoice' : 'Advance by RTGS'}`,
      poReference: poReference.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      amount: Number(amount),
      paymentMode,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      await saveLedgerEntryToFirestore(entryToSave);
      setIsAddModalOpen(false);
      setEditingEntryId(null);
    } catch (err) {
      console.error('Save ledger entry error:', err);
      alert('Failed to save ledger entry.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ledger transaction?')) return;
    try {
      await deleteLedgerEntryFromFirestore(id);
    } catch (err) {
      console.error('Delete ledger entry error:', err);
      alert('Failed to delete transaction.');
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Bulletproof print function using isolated hidden iframe + fallback
  const handlePrint = () => {
    const printArea = document.getElementById('printable-ledger-sheet');
    if (printArea) {
      try {
        let printIframe = document.getElementById('ledger-print-isolated-frame') as HTMLIFrameElement | null;
        if (!printIframe) {
          printIframe = document.createElement('iframe');
          printIframe.id = 'ledger-print-isolated-frame';
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0px';
          printIframe.style.height = '0px';
          printIframe.style.border = 'none';
          printIframe.style.visibility = 'hidden';
          document.body.appendChild(printIframe);
        }

        const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Ledger Statement - Four Corners Carpets</title>
                <meta charset="utf-8" />
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 6mm 8mm;
                  }
                  body {
                    font-family: system-ui, -apple-system, sans-serif;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    margin: 0;
                    padding: 8px;
                  }
                  .print\\:hidden, button {
                    display: none !important;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                  }
                </style>
              </head>
              <body>
                <div>
                  ${printArea.innerHTML}
                </div>
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.focus();
                      window.print();
                    }, 400);
                  };
                </script>
              </body>
            </html>
          `);
          iframeDoc.close();
          return;
        }
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
      }
    }

    // Direct fallback
    window.print();
  };

  // Direct Vector PDF generation & Instant Download using jsPDF + autoTable
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header: Four Corners Carpets
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('FOUR CORNERS CARPETS', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text('Danish : +91 70076 01170 | WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA', 14, 24);

      // Top Right: GSTIN & Badge
      doc.setFillColor(228, 0, 43); // #E4002B
      doc.roundedRect(138, 11, 58, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('OFFICIAL ACCOUNT LEDGER', 141, 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('GSTIN: 09AJTPD8099G1ZH', 138, 24);

      // Horizontal separator line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(14, 28, 196, 28);

      // Statement Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('STATEMENT FOR / PARTY ACCOUNT:', 14, 34);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const partyTitle = selectedParty === 'ALL' ? 'AIYARA TEXTILE MANUFACTURING PRIVATE LIMITED' : selectedParty;
      doc.text(partyTitle, 14, 39);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Account Type: ${selectedPartyType === 'ALL' ? 'Supplier / Manufacturer' : selectedPartyType}`, 14, 44);
      doc.text('Address: 706, IVY BUILDING-A, PARK CITY, SILVASSA - 396230, DADRA & NAGAR HAVELI', 14, 49);

      // Right info: Currency
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('CURRENCY:', 138, 34);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('INR (Rs.)', 138, 39);

      // Table body preparation
      let runningBalance = 0;
      const tableData = filteredEntries.map((entry) => {
        const dr = entry.transactionType === 'DEBIT' ? Number(entry.amount) : 0;
        const cr = entry.transactionType === 'CREDIT' ? Number(entry.amount) : 0;
        runningBalance += (dr - cr);

        return [
          entry.date,
          `${entry.particulars}\nVoucher: ${entry.voucherNo}`,
          entry.poReference || entry.invoiceNo || '-',
          dr > 0 ? dr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
          cr > 0 ? cr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
          `${Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${runningBalance >= 0 ? 'Dr' : 'Cr'}`
        ];
      });

      // Append Total Row
      tableData.push([
        '',
        'TOTAL',
        '',
        totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '-'
      ]);

      autoTable(doc, {
        startY: 53,
        head: [['Date', 'Particulars & Voucher', 'Ref #', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [193, 154, 107], // Classic tan color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
          cellPadding: 2.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'left' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 26, halign: 'left' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

      // Closing Balance Box
      const finalY = (doc as any).lastAutoTable.finalY + 4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.roundedRect(14, finalY, 182, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Closing Balance :', 18, finalY + 6);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(convertNumberToWords(closingBalance), 48, finalY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(228, 0, 43);
      const balanceStr = `Rs. ${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(balanceStr, 192 - doc.getTextWidth(balanceStr), finalY + 9);

      // Signatory & Stamp Block
      const signY = finalY + 22;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('For FOUR CORNERS CARPETS', 138, signY);

      if (showStamp && stampUrl) {
        try {
          doc.addImage(stampUrl, 'PNG', 144, signY + 2, 28, 16);
        } catch {
          // Cross-origin image bypass
        }
      }

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(138, signY + 20, 192, signY + 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('AUTHORIZED SIGNATORY', 138, signY + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Four Corners Carpets', 138, signY + 28);

      // Bottom footer note
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Computer generated official corporate statement | Maryadpatti, Bhadohi, India.', 14, signY + 28);

      const fileName = `Four_Corners_Carpets_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF download encountered an issue, opening print dialog instead.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export Ledger to Excel (.xlsx)
  const handleExportExcel = () => {
    let runningBalance = 0;
    const rows = filteredEntries.map((e) => {
      const dr = e.transactionType === 'DEBIT' ? Number(e.amount) : 0;
      const cr = e.transactionType === 'CREDIT' ? Number(e.amount) : 0;
      runningBalance += (dr - cr);
      return {
        'Date': e.date,
        'Particulars': e.particulars,
        'Voucher No': e.voucherNo,
        'Party Name': e.partyName,
        'Ref #': e.poReference || e.invoiceNo || '-',
        'Debit Amount (INR)': dr > 0 ? dr : 0,
        'Credit Amount (INR)': cr > 0 ? cr : 0,
        'Running Balance (INR)': Math.abs(runningBalance),
        'Dr / Cr': runningBalance >= 0 ? 'Dr' : 'Cr',
        'Payment Mode': e.paymentMode || 'BANK_TRANSFER'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Statement');
    XLSX.writeFile(workbook, `Four_Corners_Carpets_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSaveStampSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = tempStampUrl.trim();
    setStampUrl(trimmedUrl);
    setShowStamp(tempShowStamp);
    localStorage.setItem('f4c_ledger_stamp_url', trimmedUrl);
    localStorage.setItem('f4c_ledger_show_stamp', String(tempShowStamp));
    setStampSavedNotice(true);
    setTimeout(() => {
      setStampSavedNotice(false);
      setIsStampModalOpen(false);
    }, 700);
  };

  const handleResetDefaultStamp = () => {
    setTempStampUrl(DEFAULT_STAMP_URL);
    setTempShowStamp(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 overflow-y-auto printable-ledger-wrapper print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print:block">
      {/* Embedded Print CSS to force 1 Single Page ledger print */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide the entire background app */
          body > * {
            visibility: hidden !important;
          }
          /* Ensure printable ledger wrapper and all children are visible */
          .printable-ledger-wrapper,
          .printable-ledger-wrapper * {
            visibility: visible !important;
          }
          .printable-ledger-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
            display: block !important;
            overflow: visible !important;
          }
          .printable-ledger-card {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-ledger-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          .print\\:hidden, .no-print, button {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn border border-slate-200 printable-ledger-card print:border-none print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#E4002B] to-rose-700 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold font-sans tracking-wide">Aiyara Corporate Ledger &amp; Statement Suite</h2>
              <p className="text-xs text-rose-100 font-medium">Professional Account Book with Real-Time Firestore Sync &amp; Editing</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setTempStampUrl(stampUrl);
                setTempShowStamp(showStamp);
                setIsStampModalOpen(true);
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-xs"
              title="Configure Stamp Image URL"
            >
              <Stamp className="w-4 h-4 text-amber-300" />
              <span>Stamp URL</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white text-[#E4002B] rounded-xl text-xs font-black hover:bg-rose-50 transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Print Official Ledger Statement (Browser Print)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-rose-900/80 hover:bg-rose-900 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer border border-rose-300/40 disabled:opacity-50"
              title="Download High-Resolution Vector PDF File"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer border border-emerald-400"
              title="Export Ledger Transactions to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {adminMode && (
              <button
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 bg-amber-400 text-slate-950 rounded-xl text-xs font-black hover:bg-amber-300 transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Party:</span>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Parties ({partiesList.length})</option>
                {partiesList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedPartyType}
                onChange={(e) => setSelectedPartyType(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="BUYER">Buyer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="ARTISAN">Artisan / Weaver</option>
                <option value="TRANSPORTER">Transporter</option>
                <option value="BANK">Bank</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="relative flex items-center min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search description, Ref #, PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4002B]/30"
            />
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-3 bg-slate-100/70 border-b border-slate-200 shrink-0 print:hidden">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Debit</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">₹ {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Credit</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">₹ {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Net Outstanding Balance</p>
              <p className="text-base font-black text-[#E4002B] font-mono mt-0.5">₹ {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Printable Official Statement Section */}
        <div id="printable-ledger-sheet" className="printable-ledger-area flex-1 overflow-y-auto p-6 md:p-8 bg-white print:p-0 print:overflow-visible">
          
          {/* Header Block matching exact PDF attachment */}
          <div className="border-2 border-amber-800 rounded-t-2xl overflow-hidden shadow-xl bg-white">
            <div className="bg-gradient-to-r from-amber-700 via-[#C19A6B] to-amber-800 p-5 md:p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-amber-900 gap-4">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="bg-white p-2.5 rounded-xl shadow-md border border-amber-800">
                    <img 
                      src={logoUrl} 
                      alt="Four Corners Carpets Logo" 
                      className="h-10 md:h-12 w-auto object-contain select-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-sans">
                    Four Corners Carpets
                  </h1>
                  <p className="text-[11px] font-medium text-amber-100 mt-0.5 tracking-wide">
                    Danish : +91 70076 01170 | WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA
                  </p>
                </div>
              </div>
              <div className="text-left md:text-right bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/30 shadow-inner flex flex-col items-start md:items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-100 text-black font-black text-[11px] rounded uppercase tracking-wider shadow-sm">LEDGER</span>
                  <span className="inline-block bg-[#E4002B] text-white px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold tracking-wider uppercase shadow-sm">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-amber-100 mt-1">
                  GSTIN: <span className="font-black text-white">09AJTPD8099G1ZH</span>
                </p>
              </div>
            </div>

            {/* Statement Subject & Party Info */}
            <div className="p-5 bg-gradient-to-b from-amber-50/50 to-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-black text-[#E4002B] uppercase tracking-wider block mb-1">Statement For / Party Account</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5 uppercase tracking-tight">
                  {selectedParty === 'ALL' ? 'AIYARA TEXTILE MANUFACTURING PRIVATE LIMITED' : selectedParty}
                </p>
                <p className="text-slate-600 text-xs mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Account Type: <b className="text-slate-900">{selectedPartyType === 'ALL' ? 'Supplier / Manufacturer' : selectedPartyType}</b>
                </p>
                <p className="text-slate-500 text-[11px] mt-1.5 font-mono leading-relaxed border-t border-amber-100 pt-1.5">
                  Address: <b className="text-slate-700">706, IVY BUILDING-A, PARK CITY, SILVASSA - 396230, DADRA & NAGAR HAVELI</b>
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs md:text-right flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Currency & Standard</span>
                <p className="text-slate-900 text-xs font-mono font-extrabold">
                  Base Currency: <span className="text-[#E4002B]">INR (₹)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Table matching exact Ledger format */}
          <div className="border-x-2 border-amber-800 overflow-x-auto shadow-md">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-amber-700 via-[#C19A6B] to-amber-800 text-white font-black text-xs uppercase tracking-wider border-b-2 border-amber-900">
                  <th className="p-3.5 border-r border-amber-500/30 w-28">Date</th>
                  <th className="p-3.5 border-r border-amber-500/30">Particulars</th>
                  <th className="p-3.5 border-r border-amber-500/30 w-32">Ref #</th>
                  <th className="p-3.5 border-r border-amber-500/30 text-right w-36">Debit Amount (₹)</th>
                  <th className="p-3.5 border-r border-amber-500/30 text-right w-36">Credit Amount (₹)</th>
                  <th className="p-3.5 text-right w-36">Balance (₹)</th>
                  {adminMode && <th className="p-3.5 text-center w-24 print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(() => {
                  let runningBalance = 0;
                  return filteredEntries.map((entry, index) => {
                    const dr = entry.transactionType === 'DEBIT' ? Number(entry.amount) : 0;
                    const cr = entry.transactionType === 'CREDIT' ? Number(entry.amount) : 0;
                    runningBalance += (dr - cr);

                    return (
                      <tr key={entry.id} className="hover:bg-amber-50/50 even:bg-slate-50/70 transition font-medium">
                        <td className="p-3.5 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="p-3.5 border-r border-slate-200">
                          <div className="font-bold text-slate-950">{entry.particulars}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Voucher: {entry.voucherNo} | Mode: {entry.paymentMode || 'BANK_TRANSFER'}
                          </div>
                        </td>
                        <td className="p-3.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                          {entry.poReference || entry.invoiceNo || '-'}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-right font-mono text-slate-900 font-bold">
                          {dr > 0 ? `₹ ${dr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-right font-mono text-slate-900 font-bold">
                          {cr > 0 ? `₹ ${cr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 bg-slate-100/60">
                          ₹ {Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] ml-1 text-slate-500 font-sans">{runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                        </td>
                        {adminMode && (
                          <td className="p-3.5 text-center print:hidden">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenEditModal(entry)}
                                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition cursor-pointer shadow-xs"
                                title="Edit Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer shadow-xs"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })()}

                {/* Total Row */}
                <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-900">
                  <td colSpan={3} className="p-3.5 border-r border-slate-200 text-right uppercase tracking-wider">Total</td>
                  <td className="p-3.5 border-r border-slate-200 text-right font-mono text-slate-900">
                    ₹ {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 border-r border-slate-200 text-right font-mono text-slate-900">
                    ₹ {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-900 bg-slate-200/50">
                    -
                  </td>
                  {adminMode && <td className="print:hidden"></td>}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Closing Balance Box */}
          <div className="border-x-2 border-b-2 border-amber-800 p-5 bg-white text-black flex items-center justify-between font-sans rounded-b-2xl shadow-lg">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#E4002B]">Final Balance Summary</span>
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-black text-black uppercase tracking-wider">Closing Balance :</span>
                <span className="font-extrabold text-slate-700 italic">{convertNumberToWords(closingBalance)}</span>
              </div>
            </div>
            <div className="font-mono font-black text-lg md:text-xl bg-amber-50 px-4 py-2 rounded-xl border border-amber-300 text-black shadow-inner">
              ₹ {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Stamp & Sign Block for Preview & Print */}
          <div className="mt-8 flex justify-between items-end text-xs pt-4 border-t-2 border-slate-900 break-inside-avoid">
            <div className="text-slate-600 font-sans text-[10px] space-y-1">
              <p className="font-black text-slate-900">Computer generated official corporate statement.</p>
              {adminMode && (
                <div className="pt-1.5 print:hidden flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTempStampUrl(stampUrl);
                      setTempShowStamp(showStamp);
                      setIsStampModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#E4002B] hover:text-rose-800 flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md border border-rose-200 transition"
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    <span>Change / Edit Stamp URL</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-center font-sans space-y-1 relative min-w-[220px]">
              <div className="border-b-2 border-slate-900 pb-0.5 font-black text-slate-900 uppercase tracking-wider text-[10.5px]">
                For FOUR CORNERS CARPETS
              </div>

              {/* Official Stamp Image with Fallback */}
              {showStamp && stampUrl ? (
                <div className="py-1 flex justify-center items-center relative">
                  <img 
                    src={stampUrl} 
                    alt="Four Corners Carpets Official Stamp" 
                    className="h-16 max-h-20 w-auto object-contain mix-blend-multiply drop-shadow-sm select-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="h-12 flex items-center justify-center text-slate-400 text-[10px] italic">
                  [ Stamp Hidden / None ]
                </div>
              )}

              <div className="h-8"></div>
              <div className="border-t-2 border-slate-900 pt-1">
                <p className="font-black text-black uppercase tracking-wider text-xs">Authorized Signatory</p>
                <p className="text-[10px] text-slate-600 font-medium">Four Corners Carpets</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
            <span>Showing <b>{filteredEntries.length}</b> transactions in professional corporate format</span>
            {stampUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" /> Stamp Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              title="Print via Browser"
            >
              <Printer className="w-3.5 h-3.5 text-[#E4002B]" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Download PDF File directly"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer shadow-xs"
            >
              Close Ledger
            </button>
          </div>
        </div>

      </div>

      {/* Stamp URL & Signature Configuration Modal */}
      {isStampModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-slate-300">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold font-sans">
                  Ledger Official Stamp &amp; Seal Configuration
                </h3>
              </div>
              <button 
                onClick={() => setIsStampModalOpen(false)} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStampSettings} className="p-6 space-y-4 text-xs font-sans">
              {/* Stamp URL Input */}
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  Stamp Image URL (PNG with transparent background recommended)
                </label>
                <input
                  type="url"
                  value={tempStampUrl}
                  onChange={(e) => setTempStampUrl(e.target.value)}
                  placeholder="https://example.com/stamp.png"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Default: Four Corners Official Stamp</span>
                  <button
                    type="button"
                    onClick={handleResetDefaultStamp}
                    className="text-[#E4002B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default Stamp</span>
                  </button>
                </div>
              </div>

              {/* Live Stamp Image Preview */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Live Stamp Preview:</label>
                <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden">
                  {tempStampUrl ? (
                    <img
                      src={tempStampUrl}
                      alt="Stamp Preview"
                      className="max-h-24 w-auto object-contain mix-blend-multiply drop-shadow-sm select-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).alt = 'Invalid image URL';
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 text-xs italic flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>No stamp URL provided</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo URL Input */}
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  Company Logo Image URL
                </label>
                <input
                  type="url"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                />
              </div>

              {/* Live Logo Preview */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Live Logo Preview:</label>
                <div className="h-20 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden">
                  {tempLogoUrl ? (
                    <img
                      src={tempLogoUrl}
                      alt="Logo Preview"
                      className="max-h-14 w-auto object-contain select-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).alt = 'Invalid logo URL';
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 text-xs italic flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>No logo URL provided</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Show Stamp Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tempShowStamp}
                  onChange={(e) => setTempShowStamp(e.target.checked)}
                  className="w-4 h-4 text-[#E4002B] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-slate-900 block">Show Stamp on Statement &amp; Prints</span>
                  <span className="text-[11px] text-slate-500">Uncheck to print without company seal stamp</span>
                </div>
              </label>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStampModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E4002B] text-white rounded-xl font-extrabold hover:bg-rose-700 transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {stampSavedNotice ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save &amp; Apply Stamp</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Ledger Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fadeIn border border-slate-300">
            <div className="bg-gradient-to-r from-[#E4002B] to-rose-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold font-sans">
                {editingEntryId ? 'Edit Ledger Transaction' : 'Add New Ledger Transaction'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    placeholder="DD-MM-YYYY"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Voucher Number</label>
                  <input
                    type="text"
                    required
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Party Name</label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Party Category</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-bold cursor-pointer"
                  >
                    <option value="SUPPLIER">Supplier</option>
                    <option value="BUYER">Buyer</option>
                    <option value="ARTISAN">Artisan / Weaver</option>
                    <option value="TRANSPORTER">Transporter</option>
                    <option value="BANK">Bank</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-black text-rose-600 cursor-pointer"
                  >
                    <option value="CREDIT">CREDIT (Payment / Advance)</option>
                    <option value="DEBIT">DEBIT (Invoice / Due)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-extrabold text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advance by RTGS"
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#E4002B]/30 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. PO# 1123966"
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#E4002B]/30 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E4002B] text-white rounded-xl font-extrabold hover:bg-rose-700 transition shadow-md cursor-pointer"
                >
                  {editingEntryId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

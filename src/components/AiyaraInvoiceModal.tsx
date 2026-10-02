import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Plus, 
  Trash2, 
  Pencil, 
  Save, 
  FileText, 
  ShieldCheck, 
  Search, 
  FileSpreadsheet, 
  Upload, 
  Loader2, 
  FolderOpen,
  Check,
  Building2,
  Calendar,
  Hash,
  Sparkles,
  Percent,
  CreditCard,
  UserCheck,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { AiyaraInvoice, AiyaraLineItem, PurchaseOrder } from '../types';

// Setup pdfjs worker in browser
if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjsLib) {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF Worker initialization:', e);
  }
}
import { 
  subscribeAiyaraInvoices, 
  saveAiyaraInvoiceToFirestore, 
  deleteAiyaraInvoiceFromFirestore,
  DEFAULT_AIYARA_INVOICES
} from '../lib/firestoreService';

interface AiyaraInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
  productionData?: PurchaseOrder[];
}

export const AiyaraInvoiceModal: React.FC<AiyaraInvoiceModalProps> = ({
  isOpen,
  onClose,
  adminMode,
  productionData = []
}) => {
  const [invoices, setInvoices] = useState<AiyaraInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<AiyaraInvoice | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Editable Form State (complete copy of active invoice)
  const [editForm, setEditForm] = useState<AiyaraInvoice | null>(null);

  // In-app Delete Confirmation & Notification States (No window.confirm/alert)
  const [deleteTarget, setDeleteTarget] = useState<AiyaraInvoice | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Upload States & Refs
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to real-time Firestore invoices (Only uploaded or user-saved records)
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeAiyaraInvoices(
      (data) => {
        setInvoices(data);
        if (data.length > 0) {
          // If no invoice selected or previous selection deleted, pick first
          setSelectedInvoice((prev) => {
            const exists = data.find((i) => i.id === prev?.id);
            const current = exists || data[0];
            setEditForm(JSON.parse(JSON.stringify(current)));
            return current;
          });
        } else {
          setSelectedInvoice(null);
          setEditForm(null);
          setIsEditing(false);
        }
      },
      (err) => {
        console.error('Error fetching Aiyara invoices:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Access check: Only Admin can view Aiyara Invoice Module
  if (!adminMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 border border-rose-200">
          <div className="w-16 h-16 bg-rose-100 text-[#E4002B] rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Admin Access Required</h2>
          <p className="text-xs text-slate-600">
            Aiyara INVOICE module is exclusively visible to Administrators. Please unlock Admin mode in the top navigation bar to access this module.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
          >
            Close Module
          </button>
        </div>
      </div>
    );
  }

  // Format INR Currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Auto calculate total sq.m based on size string (e.g. "300x400" cm -> 12 sq.m per pc, "8x10" ft -> 7.43 sq.m per pc)
  const calculateSqMeters = (sizesCm: string, qtyPcs: number): number => {
    if (!sizesCm) return 0;
    try {
      const clean = sizesCm.toLowerCase().replace(/['"’”]/g, '').trim();
      const match = clean.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|by|-)\s*(\d+(?:\.\d+)?)/);
      if (match) {
        const w = parseFloat(match[1]);
        const h = parseFloat(match[2]);
        if (w <= 0 || h <= 0) return 0;

        const isExplicitFeet = clean.includes('ft') || clean.includes('feet') || sizesCm.includes("'");
        const isExplicitInches = clean.includes('in') || clean.includes('inch') || sizesCm.includes('"');
        const isExplicitCm = clean.includes('cm');

        let sqMeterPerPc = 0;
        if (isExplicitFeet || (!isExplicitCm && !isExplicitInches && w <= 30 && h <= 30)) {
          // Dimensions in feet (e.g. 8x10 ft -> 80 sq.ft = 7.432 sq.m)
          sqMeterPerPc = (w * h) * 0.092903;
        } else if (isExplicitInches || (!isExplicitCm && w <= 200 && h <= 200 && (clean.includes('in') || (w > 30 && w <= 144 && h > 30 && h <= 180 && !clean.includes('cm'))))) {
          // Dimensions in inches (e.g. 96x120 in)
          sqMeterPerPc = (w * 0.0254) * (h * 0.0254);
        } else {
          // Dimensions in centimeters (e.g. 250x350 -> 2.5m x 3.5m = 8.75 sq.m)
          const wMeter = w > 20 ? w / 100 : w;
          const hMeter = h > 20 ? h / 100 : h;
          sqMeterPerPc = wMeter * hMeter;
        }

        const total = sqMeterPerPc * (qtyPcs > 0 ? qtyPcs : 1);
        return parseFloat(total.toFixed(2));
      }
    } catch (e) {
      console.warn('Error calculating sq meters for size:', sizesCm, e);
    }
    return 0;
  };

  // Recalculate totals for editForm
  const updateFormTotals = (updatedItems: AiyaraLineItem[], customIgst?: number, customAdvance?: number) => {
    const totalPcs = updatedItems.reduce((acc, item) => acc + (Number(item.qtyPcs) || 0), 0);
    const totalSqMeter = updatedItems.reduce((acc, item) => acc + (Number(item.totalSqMeter) || 0), 0);
    const subTotal = updatedItems.reduce((acc, item) => acc + (Number(item.totalAmount) || 0), 0);

    const igstPercent = customIgst !== undefined ? customIgst : (editForm?.igstPercent ?? 5);
    const igstAmount = parseFloat(((subTotal * igstPercent) / 100).toFixed(2));
    const advancePercent = customAdvance !== undefined ? customAdvance : (editForm?.advancePercent ?? 25);
    
    // Total Amount = Sub Total + IGST
    const totalAmount = parseFloat((subTotal + igstAmount).toFixed(2));
    const advanceAmount = parseFloat(((subTotal * advancePercent) / 100).toFixed(2));

    setEditForm((prev) => prev ? ({
      ...prev,
      items: updatedItems,
      totalPcs,
      totalSqMeter: parseFloat(totalSqMeter.toFixed(2)),
      subTotal: parseFloat(subTotal.toFixed(2)),
      igstPercent,
      igstAmount,
      advancePercent,
      advanceAmount,
      totalAmount
    }) : null);
  };

  // Handle line item change
  const handleItemChange = (index: number, field: keyof AiyaraLineItem, value: any) => {
    if (!editForm) return;
    const newItems = [...editForm.items];
    const currentItem = { ...newItems[index] };

    (currentItem as any)[field] = value;

    // Recalculate sq.meter and total amount if size, qty, or price changed
    if (field === 'sizesCm' || field === 'qtyPcs') {
      const calculatedSqM = calculateSqMeters(currentItem.sizesCm, Number(currentItem.qtyPcs) || 0);
      if (calculatedSqM > 0) {
        currentItem.totalSqMeter = calculatedSqM;
      }
    }

    // Calculate total amount = totalSqMeter * sqMtrPrice
    const sqM = Number(currentItem.totalSqMeter) || 0;
    const price = Number(currentItem.sqMtrPrice) || 0;
    currentItem.totalAmount = parseFloat((sqM * price).toFixed(2));

    newItems[index] = currentItem;
    updateFormTotals(newItems);
  };

  // Add new row
  const handleAddLineItem = () => {
    if (!editForm) return;
    const newItem: AiyaraLineItem = {
      id: `item-${Date.now()}-${editForm.items.length + 1}`,
      itemNo: `3919${20 + editForm.items.length}`,
      description: 'New Wool Rug Design',
      specification: '100% Wool',
      productCode: 'Tufted',
      sizesCm: '250x350',
      qtyPcs: 1,
      totalSqMeter: 8.75,
      sqMtrPrice: 1050,
      totalAmount: 9187.50
    };
    const updated = [...editForm.items, newItem];
    updateFormTotals(updated);
  };

  // Remove row
  const handleRemoveLineItem = (index: number) => {
    if (!editForm) return;
    if (editForm.items.length === 1) {
      alert('An invoice must have at least one line item.');
      return;
    }
    const updated = editForm.items.filter((_, i) => i !== index);
    updateFormTotals(updated);
  };

  // Save invoice to Firestore
  const handleSaveInvoice = async () => {
    if (!editForm) return;
    try {
      setIsSaving(true);
      await saveAiyaraInvoiceToFirestore(editForm);
      setSelectedInvoice(editForm);
      setIsEditing(false);
      setToastMessage({ type: 'success', text: `Invoice ${editForm.invoiceNo} saved successfully!` });
    } catch (err) {
      console.error('Error saving invoice:', err);
      setToastMessage({ type: 'error', text: 'Failed to save invoice to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Prompt delete dialog
  const handlePromptDelete = (invoice: AiyaraInvoice, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDeleteTarget(invoice);
  };

  // Confirm delete single invoice
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const label = deleteTarget.invoiceNo || deleteTarget.poTitle || 'PO';
    
    try {
      setIsDeleting(true);
      // Optimistic UI state update immediately
      const remaining = invoices.filter(i => i.id !== targetId);
      setInvoices(remaining);
      
      if (selectedInvoice?.id === targetId) {
        const next = remaining[0] || null;
        setSelectedInvoice(next);
        setEditForm(next ? JSON.parse(JSON.stringify(next)) : null);
        setIsEditing(false);
      }
      
      setDeleteTarget(null);
      await deleteAiyaraInvoiceFromFirestore(targetId);
      setToastMessage({ type: 'success', text: `${label} was removed successfully.` });
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setToastMessage({ type: 'error', text: `Failed to remove ${label}.` });
    } finally {
      setIsDeleting(false);
    }
  };

  // Prompt clear all dialog
  const handlePromptClearAll = () => {
    if (invoices.length === 0) return;
    setIsClearAllModalOpen(true);
  };

  // Confirm clear all invoices
  const handleConfirmClearAll = async () => {
    try {
      setIsDeleting(true);
      const toDelete = [...invoices];
      // Optimistically clear local state
      setInvoices([]);
      setSelectedInvoice(null);
      setEditForm(null);
      setIsEditing(false);
      setIsClearAllModalOpen(false);

      for (const inv of toDelete) {
        await deleteAiyaraInvoiceFromFirestore(inv.id);
      }
      setToastMessage({ type: 'success', text: 'All invoices have been removed.' });
    } catch (err) {
      console.error('Error clearing invoices:', err);
      setToastMessage({ type: 'error', text: 'Failed to clear all invoices.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // File Upload Handler (PDF, Image, Excel, CSV) -> Auto-generates Aiyara Invoice from REAL data
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('Reading file and extracting document structure...');

      const fileName = file.name.toLowerCase();

      // Read file as ArrayBuffer and Base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const mimeType = file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : fileName.endsWith('.csv') ? 'text/csv' : 'image/jpeg');

      let detectedPoNumber = '';
      let detectedDate = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
      let detectedBuyerName = '';
      let detectedSupplierName = '';
      let detectedNotes = '';
      let extractedItems: AiyaraLineItem[] = [];

      const filePoMatch = file.name.match(/(?:po|order|inv)[_\s#-]*(\d+)/i) || file.name.match(/(\d{5,8})/);
      if (filePoMatch) {
        detectedPoNumber = filePoMatch[1];
      }

      // FIRST: Attempt High-Precision AI Extraction for PDF and Image files (or Excel fallback)
      if (fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
        setUploadStatus('Scanning document with AI to extract ALL items across all pages...');
        try {
          const apiRes = await fetch('/api/extract-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, mimeType, fileName: file.name })
          });

          if (apiRes.ok) {
            const apiData = await apiRes.json().catch(() => ({}));
            if (apiData.success && apiData.text) {
              const cleanedJson = apiData.text.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanedJson);
              if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                detectedPoNumber = parsed.poNumber || detectedPoNumber;
                detectedDate = parsed.date || detectedDate;
                detectedBuyerName = parsed.buyerName || detectedBuyerName;
                detectedSupplierName = parsed.supplierName || detectedSupplierName;
                detectedNotes = parsed.notes || detectedNotes;
                extractedItems = parsed.items.map((it: any, idx: number) => {
                  const sizesCm = String(it.sizesCm || '').trim();
                  const qtyPcs = Number(it.qtyPcs) || 1;
                  const calculatedSqM = calculateSqMeters(sizesCm, qtyPcs);
                  const totalSqMeter = it.totalSqMeter ? Number(it.totalSqMeter) : calculatedSqM;
                  const sqMtrPrice = Number(it.sqMtrPrice) || (it.totalAmount && totalSqMeter > 0 ? parseFloat((it.totalAmount / totalSqMeter).toFixed(2)) : 0);
                  const totalAmount = it.totalAmount ? Number(it.totalAmount) : parseFloat((totalSqMeter * sqMtrPrice).toFixed(2));
                  return {
                    id: `ai-item-${Date.now()}-${idx}`,
                    itemNo: String(it.itemNo || `${idx + 1}`),
                    description: String(it.description || `Design ${idx + 1}`),
                    specification: String(it.specification || '100% Wool'),
                    productCode: String(it.productCode || 'Tufted'),
                    sizesCm,
                    qtyPcs,
                    totalSqMeter: parseFloat((totalSqMeter || 0).toFixed(2)),
                    sqMtrPrice,
                    totalAmount
                  };
                });
              } else {
                console.log('AI returned 0 items. Parsed structure:', parsed);
              }
            }
          }
        } catch (aiErr) {
          console.warn('Server AI extraction fallback:', aiErr);
        }
      }

      // SECOND: If Excel or CSV file OR if AI returned 0 items for PDF/spreadsheet, use client-side table engines
      if (extractedItems.length === 0 && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv'))) {
        setUploadStatus('Parsing spreadsheet tables & all line items...');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          let headerRowIdx = -1;
          let colItemNo = -1;
          let colDesc = -1;
          let colSpec = -1;
          let colCode = -1;
          let colSize = -1;
          let colQty = -1;
          let colSqM = -1;
          let colPrice = -1;
          let colTotal = -1;

          for (let r = 0; r < Math.min(rawRows.length, 50); r++) {
            const row = rawRows[r] || [];
            const rowText = row.map(c => String(c || '').trim()).join(' ');
            const rowTextLower = rowText.toLowerCase();

            if (!detectedPoNumber) {
              const poMatch = rowText.match(/(?:po\s*#?|order\s*#?|p\.o\.?\s*#?)\s*[:.-]?\s*([0-9a-zA-Z\-_/]+)/i);
              if (poMatch && poMatch[1].length >= 3) {
                detectedPoNumber = poMatch[1].replace(/[^a-zA-Z0-9\-_/]/g, '');
              }
            }

            const dateMatch = rowText.match(/(\d{1,2}[-/.](?:\d{1,2}|[a-zA-Z]{3})[-/.](?:\d{2,4}))/);
            if (dateMatch && !detectedDate) {
              detectedDate = dateMatch[1].replace(/\//g, '-');
            }

            if (rowTextLower.includes('buyer') || rowTextLower.includes('company') || rowTextLower.includes('customer') || rowTextLower.includes('m/s')) {
              const parts = rowText.split(/[:–-]/);
              if (parts.length > 1 && parts[1].trim().length > 3) {
                detectedBuyerName = parts[1].trim();
              }
            }

            if (rowTextLower.includes('supplier') || rowTextLower.includes('seller') || rowTextLower.includes('exporter')) {
              const parts = rowText.split(/[:–-]/);
              if (parts.length > 1 && parts[1].trim().length > 3) {
                detectedSupplierName = parts[1].trim();
              }
            }

            let matchedCols = 0;
            for (let c = 0; c < row.length; c++) {
              const cellVal = String(row[c] || '').toLowerCase().trim();
              if (!cellVal) continue;

              if (cellVal.includes('item') || cellVal.includes('art') || cellVal.includes('sku') || cellVal.includes('batch') || cellVal === '#' || cellVal.includes('s.no') || cellVal.includes('sr') || cellVal.includes('no.')) {
                colItemNo = c;
                matchedCols++;
              } else if (cellVal.includes('desc') || cellVal.includes('design') || cellVal.includes('particular') || cellVal.includes('product') || cellVal.includes('rug name') || cellVal.includes('name') || cellVal.includes('art')) {
                colDesc = c;
                matchedCols++;
              } else if (cellVal.includes('spec') || cellVal.includes('quality') || cellVal.includes('material') || cellVal.includes('composition') || cellVal.includes('yarn') || cellVal.includes('type')) {
                colSpec = c;
                matchedCols++;
              } else if (cellVal.includes('code') || cellVal.includes('weave') || cellVal.includes('construction') || cellVal.includes('technique') || cellVal.includes('type')) {
                colCode = c;
                matchedCols++;
              } else if (cellVal.includes('size') || cellVal.includes('dimension') || cellVal.includes('measurement') || cellVal.includes('cm') || cellVal.includes('ft') || cellVal.includes('wxl') || cellVal.includes('dim')) {
                colSize = c;
                matchedCols++;
              } else if (cellVal.includes('qty') || cellVal.includes('quantity') || cellVal.includes('pcs') || cellVal.includes('units') || cellVal.includes('order qty') || cellVal.includes('no. of')) {
                colQty = c;
                matchedCols++;
              } else if (cellVal.includes('sq') || cellVal.includes('meter') || cellVal.includes('sqm') || cellVal.includes('area') || cellVal.includes('sq.mtr')) {
                colSqM = c;
                matchedCols++;
              } else if (cellVal.includes('price') || cellVal.includes('rate') || cellVal.includes('sq mtr price') || cellVal.includes('unit price') || cellVal.includes('rate/sq') || cellVal.includes('value')) {
                colPrice = c;
                matchedCols++;
              } else if (cellVal.includes('total') || cellVal.includes('amount') || cellVal.includes('value') || cellVal.includes('line total')) {
                colTotal = c;
                matchedCols++;
              }
            }

            if (matchedCols >= 2) {
              headerRowIdx = r;
              break;
            }
          }

          if (headerRowIdx === -1) {
            headerRowIdx = 0;
            colItemNo = 0;
            colDesc = 1;
            colSpec = 2;
            colCode = 3;
            colSize = 4;
            colQty = 5;
            colSqM = 6;
            colPrice = 7;
            colTotal = 8;
          }

          // Scan ALL rows below header. DO NOT break on subtotal/summary lines; skip them with continue
          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase().trim();
            if (!rowStr) continue;

            // If it's a summary row, extract remarks/terms and continue scanning remaining items
            if (rowStr.includes('total pcs') || rowStr.includes('sub total') || rowStr.includes('grand total') || rowStr.includes('balance payment') || rowStr.includes('terms of delivery') || rowStr.includes('total amount')) {
              if (rowStr.includes('terms') || rowStr.includes('advance') || rowStr.includes('payment')) {
                detectedNotes += ' ' + rowStr;
              }
              continue; // Continue scanning; do not terminate loop
            }

            const rawItemNo = colItemNo >= 0 ? String(row[colItemNo] || '').trim() : '';
            const rawDesc = colDesc >= 0 ? String(row[colDesc] || '').trim() : '';
            const rawSpec = colSpec >= 0 ? String(row[colSpec] || '').trim() : '';
            const rawCode = colCode >= 0 ? String(row[colCode] || '').trim() : '';
            const rawSize = colSize >= 0 ? String(row[colSize] || '').trim() : '';
            const rawQty = colQty >= 0 ? Number(row[colQty]) || 0 : 0;
            const rawPrice = colPrice >= 0 ? Number(row[colPrice]) || 0 : 0;
            const rawSqM = colSqM >= 0 ? Number(row[colSqM]) || 0 : 0;
            const rawTotal = colTotal >= 0 ? Number(row[colTotal]) || 0 : 0;

            if (rawItemNo || rawDesc || rawSize || rawQty > 0 || rawPrice > 0 || rawTotal > 0) {
              // Ignore purely textual disclaimer or header rows
              if (/^(page|note|signature|terms|bank|date|buyer|seller|exporter|gstin)/i.test(rawDesc || rawItemNo)) {
                continue;
              }

              const calculatedSqM = calculateSqMeters(rawSize, rawQty || 1);
              const totalSqMeter = rawSqM > 0 ? rawSqM : calculatedSqM;
              const sqMtrPrice = rawPrice > 0 ? rawPrice : (rawTotal > 0 && totalSqMeter > 0 ? parseFloat((rawTotal / totalSqMeter).toFixed(2)) : 0);
              const totalAmount = rawTotal > 0 ? rawTotal : parseFloat((totalSqMeter * sqMtrPrice).toFixed(2));

              extractedItems.push({
                id: `item-${Date.now()}-${sheetName}-${i}`,
                itemNo: rawItemNo || `${extractedItems.length + 1}`,
                description: rawDesc || `Item ${extractedItems.length + 1}`,
                specification: rawSpec || '100% Wool',
                productCode: rawCode || 'Tufted',
                sizesCm: rawSize || '250x350',
                qtyPcs: rawQty || 1,
                totalSqMeter: parseFloat((totalSqMeter || 8.75).toFixed(2)),
                sqMtrPrice: sqMtrPrice || 1050,
                totalAmount: totalAmount || (totalSqMeter ? parseFloat((totalSqMeter * 1050).toFixed(2)) : 9187.50)
              });
            }
          }
        }
      }

      // THIRD: If PDF file and AI was offline or returned 0 items, run multi-page PDF.js text extractor
      if (extractedItems.length === 0 && fileName.endsWith('.pdf')) {
        setUploadStatus('Extracting document tables and text across all PDF pages...');
        try {
          console.log('Starting PDF text extraction:', file.name);
          const loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdfDoc = await loadingTask.promise;
          const pdfLines: string[] = [];
          console.log('PDF pages:', pdfDoc.numPages);

          for (let p = 1; p <= pdfDoc.numPages; p++) {
            const page = await pdfDoc.getPage(p);
            const textContent = await page.getTextContent();
            const items = textContent.items as any[];
            console.log(`Page ${p} items found:`, items.length);

            const yMap = new Map<number, { x: number; text: string }[]>();
            for (const it of items) {
              if (!it.str || !it.str.trim()) continue;
              const yBucket = Math.round(it.transform[5] / 4) * 4;
              if (!yMap.has(yBucket)) yMap.set(yBucket, []);
              yMap.get(yBucket)!.push({ x: it.transform[4], text: it.str });
            }

            const sortedYs = Array.from(yMap.keys()).sort((a, b) => b - a);
            for (const y of sortedYs) {
              const sortedRow = yMap.get(y)!.sort((a, b) => a.x - b.x);
              const line = sortedRow.map(r => r.text.trim()).filter(Boolean).join('   ');
              if (line) pdfLines.push(line);
            }
          }

          for (let i = 0; i < pdfLines.length; i++) {
            const line = pdfLines[i];
            const lineLower = line.toLowerCase();

            if (!detectedPoNumber) {
              const poMatch = line.match(/(?:po\s*#?|order\s*#?|p\.o\.?\s*#?)\s*[:.-]?\s*([0-9a-zA-Z\-_/]+)/i);
              if (poMatch && poMatch[1].length >= 3) {
                detectedPoNumber = poMatch[1].replace(/[^a-zA-Z0-9\-_/]/g, '');
              }
            }

            const dateMatch = line.match(/(\d{1,2}[-/.](?:\d{1,2}|[a-zA-Z]{3})[-/.](?:\d{2,4}))/);
            if (dateMatch && !detectedDate) {
              detectedDate = dateMatch[1].replace(/\//g, '-');
            }

            if (lineLower.includes('buyer') || lineLower.includes('consignee') || lineLower.includes('customer') || lineLower.includes('m/s')) {
              const parts = line.split(/[:–-]/);
              if (parts.length > 1 && parts[1].trim().length > 3) {
                detectedBuyerName = parts[1].trim();
              }
            }

            if (lineLower.includes('terms') || lineLower.includes('advance') || lineLower.includes('payment') || lineLower.includes('delivery')) {
              if (!lineLower.includes('item') && !lineLower.includes('description')) {
                detectedNotes += ' ' + line;
              }
            }

            // Check if line contains rug/furniture dimensions or size numbers
            const sizeMatch = line.match(/(\d+(?:\.\d+)?\s*(?:x|\*|by|-)\s*\d+(?:\.\d+)?(?:\s*(?:cm|ft|in))?)/i);
            
            // Only proceed if it looks like an item line
            const hasQty = /\b\d+\s*(?:pcs|units|qty)\b/i.test(line) || /\d+/.test(line);
            
            if (sizeMatch || hasQty) {
              const rawSize = sizeMatch ? sizeMatch[1].trim() : 'N/A';
              const tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean);

              const lineWithoutSize = line.replace(sizeMatch ? sizeMatch[0] : '', ' ');
              const numbers = lineWithoutSize.match(/\b\d+(?:\.\d+)?\b/g)?.map(Number) || [];

              const textWords = tokens.filter(t => isNaN(Number(t)) && !t.includes(rawSize));
              let desc = textWords[0] || `Rug Item ${extractedItems.length + 1}`;
              let spec = textWords.find(w => /wool|cotton|viscose|poly|jute/i.test(w)) || '100% Wool';
              let code = textWords.find(w => /tufted|woven|knotted|flatweave/i.test(w)) || 'Tufted';
              let itemNo = tokens.find(t => /^\d{5,8}$|^[A-Z0-9]{3,10}$/.test(t) && t !== rawSize) || `${extractedItems.length + 1}`;

              let qty = 1;
              let sqM = 0;
              let price = 0;
              let total = 0;

              for (const n of numbers) {
                if (n >= 1 && n <= 100 && Number.isInteger(n) && qty === 1) {
                  qty = n;
                } else if (n > 0 && n <= 200 && sqM === 0) {
                  sqM = n;
                } else if (n >= 300 && n <= 20000 && price === 0) {
                  price = n;
                } else if (n > 1000 && total === 0) {
                  total = n;
                }
              }

              const calculatedSqM = calculateSqMeters(rawSize, qty);
              const totalSqMeter = sqM > 0 ? sqM : calculatedSqM;
              const sqMtrPrice = price > 0 ? price : (total > 0 && totalSqMeter > 0 ? parseFloat((total / totalSqMeter).toFixed(2)) : 1050);
              const totalAmount = total > 0 ? total : parseFloat((totalSqMeter * sqMtrPrice).toFixed(2));

              extractedItems.push({
                id: `pdf-item-${Date.now()}-${extractedItems.length + 1}`,
                itemNo: String(itemNo),
                description: desc,
                specification: spec,
                productCode: code,
                sizesCm: rawSize,
                qtyPcs: qty,
                totalSqMeter: parseFloat((totalSqMeter || 0).toFixed(2)),
                sqMtrPrice,
                totalAmount
              });
            }
          }
        } catch (pdfErr) {
          console.warn('PDF.js text parsing error:', pdfErr);
        }
      }

      // If document was completely empty or scanned image without text/AI, initialize editable row
      if (extractedItems.length === 0) {
        extractedItems = [
          {
            id: `item-${Date.now()}`,
            itemNo: detectedPoNumber || '391912',
            description: file.name.replace(/\.[^/.]+$/, ''),
            specification: '100% Wool',
            productCode: 'Tufted',
            sizesCm: '250x350',
            qtyPcs: 1,
            totalSqMeter: 8.75,
            sqMtrPrice: 1050,
            totalAmount: 9187.50
          }
        ];
      }

      const template = DEFAULT_AIYARA_INVOICES[0] || {
        supplierName: 'FOUR CORNERS CARPETS',
        supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
        supplierGstin: '09AJTPD8099G1ZH',
        supplierContact: '8188887223',
        supplierAttention: 'Mr. Danish',
        supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
        supplierIfsc: 'AXISINBBA04',
        buyerName: 'Aiyara Textile Manufacturing PVT LTD',
        buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
        buyerGstin: '26AAVCA3353L1Z6',
        buyerPhone: '9173722468',
        buyerEmail: 'sale@aiyaratextile.in',
        buyerAttention: 'Mr. Om Prakash',
        igstPercent: 5,
        advancePercent: 25,
        notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.'
      };

      const finalPoNumber = detectedPoNumber || file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\-_/]/g, '') || `PO-${Date.now()}`;
      const newInvoice: AiyaraInvoice = {
        ...JSON.parse(JSON.stringify(template)),
        id: `aiyara_inv_${Date.now()}`,
        invoiceNo: `PO # ${finalPoNumber}`,
        poNumber: finalPoNumber,
        poTitle: `PO # ${finalPoNumber} (${file.name})`,
        date: detectedDate,
        buyerName: detectedBuyerName || template.buyerName,
        supplierName: detectedSupplierName || template.supplierName,
        notes: (detectedNotes && detectedNotes.trim()) ? detectedNotes.trim() : (template.notes || '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.'),
        items: extractedItems,
        createdAt: new Date().toISOString()
      };

      const totalPcs = newInvoice.items.reduce((acc, it) => acc + (it.qtyPcs || 0), 0);
      const totalSqMeter = parseFloat(newInvoice.items.reduce((acc, it) => acc + (it.totalSqMeter || 0), 0).toFixed(2));
      const subTotal = parseFloat(newInvoice.items.reduce((acc, it) => acc + (it.totalAmount || 0), 0).toFixed(2));
      const igstAmount = parseFloat(((subTotal * (newInvoice.igstPercent || 5)) / 100).toFixed(2));
      const totalAmount = parseFloat((subTotal + igstAmount).toFixed(2));
      const advanceAmount = parseFloat(((subTotal * (newInvoice.advancePercent || 25)) / 100).toFixed(2));

      newInvoice.totalPcs = totalPcs;
      newInvoice.totalSqMeter = totalSqMeter;
      newInvoice.subTotal = subTotal;
      newInvoice.igstAmount = igstAmount;
      newInvoice.totalAmount = totalAmount;
      newInvoice.advanceAmount = advanceAmount;

      await saveAiyaraInvoiceToFirestore(newInvoice);
      setSelectedInvoice(newInvoice);
      setEditForm(newInvoice);
      setIsEditing(false);
      setToastMessage({ type: 'success', text: `Extracted all ${newInvoice.items.length} line items from ${file.name} successfully!` });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
      console.error('File upload error:', err);
      setToastMessage({ type: 'error', text: err?.message || 'Failed to upload file.' });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Convert System Purchase Order into Aiyara Invoice
  const handleImportSystemPo = async (po: PurchaseOrder) => {
    try {
      const template = DEFAULT_AIYARA_INVOICES[0] || {
        supplierName: 'FOUR CORNERS CARPETS',
        supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
        supplierGstin: '09AJTPD8099G1ZH',
        supplierContact: '8188887223',
        supplierAttention: 'Mr. Danish',
        supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
        supplierIfsc: 'AXISINBBA04',
        buyerName: 'Aiyara Textile Manufacturing PVT LTD',
        buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
        buyerGstin: '26AAVCA3353L1Z6',
        buyerPhone: '9173722468',
        buyerEmail: 'sale@aiyaratextile.in',
        buyerAttention: 'Mr. Om Prakash',
        igstPercent: 5,
        advancePercent: 25,
        notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.'
      };

      const itemsFromPo: AiyaraLineItem[] = po.designs.map((d, idx) => {
        const sizesCm = d.size || '250x350';
        const qtyPcs = Number(d.qty) || 1;
        const totalSqMeter = calculateSqMeters(sizesCm, qtyPcs) || 8.75;
        const sqMtrPrice = 1050;
        const totalAmount = parseFloat((totalSqMeter * sqMtrPrice).toFixed(2));

        return {
          id: `po-item-${Date.now()}-${idx}`,
          itemNo: d.batch || `3919${20 + idx}`,
          description: d.name || 'Wool Rug Design',
          specification: '100% Wool',
          productCode: 'Tufted',
          sizesCm,
          qtyPcs,
          totalSqMeter,
          sqMtrPrice,
          totalAmount
        };
      });

      const newInvoice: AiyaraInvoice = {
        ...JSON.parse(JSON.stringify(template)),
        id: `aiyara_inv_${Date.now()}`,
        invoiceNo: `PO # ${po.po}`,
        poNumber: po.po,
        poTitle: `PO # ${po.po} - ${po.appRef || 'Client Order'}`,
        date: po.estDate || new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
        items: itemsFromPo.length > 0 ? itemsFromPo : [
          {
            id: `item-${Date.now()}`,
            itemNo: '391912',
            description: 'Custom Wool Rug',
            specification: '100% Wool',
            productCode: 'Tufted',
            sizesCm: '250x350',
            qtyPcs: 1,
            totalSqMeter: 8.75,
            sqMtrPrice: 1050,
            totalAmount: 9187.50
          }
        ],
        notes: po.notes || template.notes,
        createdAt: new Date().toISOString()
      };

      // Calculate totals
      const items = newInvoice.items;
      newInvoice.totalPcs = items.reduce((acc, it) => acc + (it.qtyPcs || 0), 0);
      newInvoice.totalSqMeter = parseFloat(items.reduce((acc, it) => acc + (it.totalSqMeter || 0), 0).toFixed(2));
      newInvoice.subTotal = parseFloat(items.reduce((acc, it) => acc + (it.totalAmount || 0), 0).toFixed(2));
      newInvoice.igstAmount = parseFloat(((newInvoice.subTotal * 5) / 100).toFixed(2));
      newInvoice.totalAmount = parseFloat((newInvoice.subTotal + newInvoice.igstAmount).toFixed(2));
      newInvoice.advanceAmount = parseFloat(((newInvoice.subTotal * 25) / 100).toFixed(2));

      await saveAiyaraInvoiceToFirestore(newInvoice);
      setSelectedInvoice(newInvoice);
      setEditForm(newInvoice);
      setIsEditing(false);
      alert(`Aiyara Invoice generated from Purchase Order ${po.po}!`);
    } catch (err) {
      console.error('Import PO error:', err);
      alert('Failed to convert Purchase Order to Invoice.');
    }
  };

  // Create new blank or template invoice
  const handleCreateNewInvoice = () => {
    const template = DEFAULT_AIYARA_INVOICES[0] || {
      supplierName: 'FOUR CORNERS CARPETS',
      supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
      supplierGstin: '09AJTPD8099G1ZH',
      supplierContact: '8188887223',
      supplierAttention: 'Mr. Danish',
      supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
      supplierIfsc: 'AXISINBBA04',
      buyerName: 'Aiyara Textile Manufacturing PVT LTD',
      buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
      buyerGstin: '26AAVCA3353L1Z6',
      buyerPhone: '9173722468',
      buyerEmail: 'sale@aiyaratextile.in',
      buyerAttention: 'Mr. Om Prakash',
      igstPercent: 5,
      advancePercent: 25,
      notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.'
    };

    const randomPo = Math.floor(100000 + Math.random() * 900000).toString();
    const newInv: AiyaraInvoice = {
      ...JSON.parse(JSON.stringify(template)),
      id: `aiyara_inv_${Date.now()}`,
      invoiceNo: `PO # ${randomPo}`,
      poNumber: randomPo,
      poTitle: `PO # ${randomPo} - New Order`,
      date: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
      items: [
        {
          id: `item-${Date.now()}`,
          itemNo: '391912',
          description: 'Checks Wool rug Gray',
          specification: '100% Wool',
          productCode: 'Tufted',
          sizesCm: '300x400',
          qtyPcs: 5,
          totalSqMeter: 60,
          sqMtrPrice: 1096,
          totalAmount: 65760
        }
      ],
      totalPcs: 5,
      totalSqMeter: 60,
      subTotal: 65760,
      igstPercent: 5,
      igstAmount: 3288,
      advancePercent: 25,
      advanceAmount: 16440,
      totalAmount: 69048,
      notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
      createdAt: new Date().toISOString()
    };
    setSelectedInvoice(newInv);
    setEditForm(newInv);
    setIsEditing(true);
  };

  // Trigger Print or PDF Download View via dedicated print window
  const handlePrintInvoice = () => {
    const printContent = document.getElementById('printable-invoice-content');
    if (!printContent) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Aiyara Invoice - ${isEditing ? editForm.invoiceNo : (selectedInvoice?.invoiceNo || 'Document')}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; background: #fff; color: #0f172a; }
            input, textarea { border: none !important; background: transparent !important; outline: none !important; resize: none !important; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.focus();
              window.print();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export Active Invoice to Excel File (.xlsx)
  const handleExportExcel = () => {
    const active = isEditing ? editForm : selectedInvoice;
    if (!active) return;

    const sheetData: any[][] = [
      ["PERFORMA INVOICE"],
      ["FOUR CORNERS CARPETS"],
      [],
      ["SUPPLIER DETAILS", "", "", "", "BUYER DETAILS"],
      ["Date:", active.date, "", "", "Company Name:", active.buyerName],
      ["Company Name:", active.supplierName, "", "", "Address:", active.buyerAddress],
      ["Address:", active.supplierAddress, "", "", "GSTIN:", active.buyerGstin],
      ["GSTIN:", active.supplierGstin, "", "", "Phone:", active.buyerPhone],
      ["Contact:", active.supplierContact, "", "", "Email:", active.buyerEmail],
      ["Attention:", active.supplierAttention, "", "", "Attention:", active.buyerAttention],
      ["Bank Details:", active.supplierBankDetails],
      ["IFSC Code:", active.supplierIfsc],
      [],
      [active.poTitle || 'PO DETAILS', active.invoiceNo],
      [],
      ["ITEM #", "DESCRIPTION OF ITEM", "SPECIFICATION", "PRODUCT CODE", "SIZES In cm", "QTY IN pcs", "TOTAL IN METER", "SQ MTR PRICE (INR)", "TOTAL (INR)"]
    ];

    // Add line items
    active.items.forEach((item) => {
      sheetData.push([
        item.itemNo,
        item.description,
        item.specification,
        item.productCode,
        item.sizesCm,
        item.qtyPcs,
        item.totalSqMeter,
        item.sqMtrPrice,
        item.totalAmount
      ]);
    });

    // Add summary rows
    sheetData.push([]);
    sheetData.push(["", "", "", "", "TOTAL PCS:", active.totalPcs, "TOTAL SQ MTR:", active.totalSqMeter]);
    sheetData.push(["", "", "", "", "", "", "", "Sub Total:", active.subTotal]);
    sheetData.push(["", "", "", "", "", "", "", `IGST ${active.igstPercent}%:`, active.igstAmount]);
    sheetData.push(["", "", "", "", "", "", "", `${active.advancePercent}% Advance:`, active.advanceAmount]);
    sheetData.push(["", "", "", "", "", "", "", "Total Amount:", active.totalAmount]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");

    const safeName = (active.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Aiyara_Invoice_${safeName}.xlsx`);
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.poTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDoc = isEditing ? editForm : selectedInvoice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/70 backdrop-blur-md">
      {/* Container */}
      <div className="relative w-full h-full md:max-w-7xl md:h-[92vh] bg-white md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* Top Crimson Admin Header */}
        <div className="bg-gradient-to-r from-[#B91C1C] via-[#E4002B] to-[#B91C1C] px-4 md:px-6 py-3 text-white flex flex-wrap items-center justify-between shrink-0 shadow-md print:hidden gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm md:text-base tracking-wide uppercase">
                  Aiyara INVOICE Module
                </h2>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider">
                  ADMIN
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Fully Editable
                </span>
              </div>
              <p className="text-[11px] text-red-100 font-sans">
                Official Performa Invoice Generator &amp; Archive • Only Uploaded &amp; Created POs are kept
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden File Input for PDF, Image, Excel, CSV */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
              className="hidden"
            />

            {/* Upload PO / Invoice File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-amber-300"
              title="Upload Purchase Order / Invoice File (PDF, Image, Excel, CSV) to Auto-Generate Invoice"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>{uploadStatus || 'Processing...'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-slate-950" />
                  <span>Upload PO File</span>
                </>
              )}
            </button>

            {/* Import System PO Dropdown (If POs exist in system) */}
            {productionData.length > 0 && (
              <div className="relative group hidden md:block">
                <select
                  onChange={(e) => {
                    const po = productionData.find(p => p.po === e.target.value);
                    if (po) {
                      handleImportSystemPo(po);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer font-mono"
                >
                  <option value="" disabled className="text-slate-900 font-sans">
                    📥 Convert System PO...
                  </option>
                  {productionData.map((po) => (
                    <option key={po.po} value={po.po} className="text-slate-900 font-mono">
                      PO #{po.po} ({po.appRef || 'Client Order'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Create New Invoice Button */}
            <button
              onClick={handleCreateNewInvoice}
              className="px-3 py-1.5 bg-white text-[#E4002B] hover:bg-slate-100 font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#E4002B]" />
              <span>Create Invoice</span>
            </button>

            {/* Download Excel Button */}
            {activeDoc && (
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-emerald-500"
                title="Export Active Invoice to Microsoft Excel File (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}

            {/* Print Button */}
            {activeDoc && (
              <button
                onClick={handlePrintInvoice}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}

            {/* Download PDF Button */}
            {activeDoc && (
              <button
                onClick={handlePrintInvoice}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-amber-300"
                title="Download Invoice as PDF (Save as PDF)"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Download PDF</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          
          {/* LEFT SIDEBAR: Invoice List Selector */}
          <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 print:hidden">
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search uploaded PO or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4002B]"
                />
              </div>

              {invoices.length > 0 && (
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-bold text-slate-500 font-mono">
                    Total POs: <strong className="text-slate-900">{invoices.length}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handlePromptClearAll}
                    className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Remove all uploaded invoices"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 bg-rose-50 text-[#E4002B] rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase font-mono">No Uploaded POs Yet</h4>
                  <p className="text-[11px] text-slate-500">
                    Dummy POs removed. Click "Upload PO File" or "Create Invoice" above to add your purchase order.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm w-full"
                  >
                    Upload PO File
                  </button>
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setEditForm(JSON.parse(JSON.stringify(inv)));
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                      selectedInvoice?.id === inv.id
                        ? 'bg-rose-50 border-[#E4002B] ring-1 ring-[#E4002B] shadow-sm'
                        : 'bg-white hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[#E4002B]">
                        {inv.invoiceNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {inv.date}
                      </span>
                    </div>

                    <p className="text-xs font-black text-slate-800 mt-1 truncate">
                      {inv.buyerName || 'Buyer Company'}
                    </p>

                    {inv.poTitle && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                        {inv.poTitle}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                      <span>Pcs: {inv.totalPcs || 0} | Sq.m: {inv.totalSqMeter || 0}</span>
                      <span className="font-bold text-emerald-700">{formatINR(inv.totalAmount || 0)}</span>
                    </div>

                    {/* Prominent Delete PO Button */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => handlePromptDelete(inv, e)}
                        className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Remove this Purchase Order"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove PO</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT VIEWER & EDITOR */}
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-3 md:p-6 bg-slate-200 print:bg-white print:p-0">
            
            {activeDoc && editForm ? (
              <div className="max-w-4xl mx-auto w-full space-y-4">
                
                {/* Mode Switcher Bar */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-300 flex flex-wrap items-center justify-between print:hidden gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      Active PO: <strong className="text-[#E4002B]">{activeDoc.invoiceNo}</strong>
                    </span>
                    {isEditing ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-lg uppercase">
                        Editing Mode Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold rounded-lg uppercase">
                        Preview Mode
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveInvoice}
                          disabled={isSaving}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (selectedInvoice) {
                              setEditForm(JSON.parse(JSON.stringify(selectedInvoice)));
                            }
                            setIsEditing(false);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 bg-[#E4002B] hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit All Fields &amp; Items</span>
                      </button>
                    )}

                    {/* Dedicated Remove PO Button */}
                    <button
                      type="button"
                      onClick={() => handlePromptDelete(activeDoc)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Permanently remove this Purchase Order"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Remove PO</span>
                    </button>
                  </div>
                </div>

                {/* Embedded Print CSS to force 1 Single Page layout */}
                <style>{`
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 3mm 5mm !important;
                    }
                    html, body {
                      height: 100% !important;
                      overflow: hidden !important;
                      background: #ffffff !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .print\\:hidden {
                      display: none !important;
                    }
                    .printable-invoice-page {
                      width: 100% !important;
                      max-width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                      page-break-before: avoid !important;
                      page-break-after: avoid !important;
                    }
                    .printable-invoice-page * {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }
                  }
                `}</style>

                {/* EDITABLE FORM OR PDF-EXACT DOCUMENT VIEW */}
                <div id="printable-invoice-content" className="printable-invoice-page bg-white p-4 sm:p-8 rounded-2xl shadow-2xl border border-slate-300 font-sans text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none">
                  
                  {/* Title Bar with Top Logo */}
                  <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-900 pb-2 mb-3 gap-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src="https://i.postimg.cc/wxbwW1Y7/logo-F4C.png" 
                        alt="FOUR CORNERS CARPETS Logo" 
                        className="h-10 md:h-12 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-center sm:text-right">
                      <h1 className="text-lg md:text-xl font-black uppercase tracking-widest text-slate-900 font-serif">
                        Performa Invoice
                      </h1>
                      <span className="text-[11px] font-bold font-mono text-[#E4002B]">
                        FOUR CORNERS CARPETS
                      </span>
                    </div>
                  </div>

                  {/* Supplier & Buyer Header Table */}
                  <div className="border-2 border-slate-900 text-[10.5px] mb-3 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                    
                    {/* Left: Supplier Details (Four Corners Carpets) */}
                    <div className="p-3 space-y-1.5 bg-slate-50/50">
                      <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-1">
                        <span className="uppercase text-slate-900 font-black">Supplier Details</span>
                        <div className="flex items-center gap-1">
                          <span>Date:</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              placeholder="DD-MM-YYYY"
                              className="w-28 px-1.5 py-0.5 border border-rose-300 rounded font-mono text-[10.5px] bg-white text-slate-900 font-bold"
                            />
                          ) : (
                            <span className="font-mono font-bold">{activeDoc.date}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">COMPANY NAME: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.supplierName}
                            onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })}
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-900 mt-0.5"
                          />
                        ) : (
                          <strong className="text-xs uppercase block font-black text-slate-900">{activeDoc.supplierName}</strong>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">ADDRESS: </span>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editForm.supplierAddress}
                            onChange={(e) => setEditForm({ ...editForm, supplierAddress: e.target.value })}
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[10px] bg-white text-slate-900 mt-0.5"
                          />
                        ) : (
                          <span className="block text-[10px] uppercase leading-relaxed">{activeDoc.supplierAddress}</span>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="font-bold">GSTIN: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierGstin}
                              onChange={(e) => setEditForm({ ...editForm, supplierGstin: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierGstin}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">Contact: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierContact}
                              onChange={(e) => setEditForm({ ...editForm, supplierContact: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierContact}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 text-[10.5px]">
                        <span className="font-bold">ATTENTION: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.supplierAttention}
                            onChange={(e) => setEditForm({ ...editForm, supplierAttention: e.target.value })}
                            className="w-full px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white mt-0.5"
                          />
                        ) : (
                          <span>{activeDoc.supplierAttention}</span>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-300 text-[10px] bg-amber-50/70 p-2 rounded border border-amber-200 space-y-1">
                        <span className="font-bold block text-slate-900 uppercase tracking-wider text-[9.5px]">Bank Details:</span>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editForm.supplierBankDetails}
                              onChange={(e) => setEditForm({ ...editForm, supplierBankDetails: e.target.value })}
                              placeholder="Bank Name, Branch, Account #"
                              className="w-full px-1.5 py-0.5 border border-amber-300 rounded text-[10px] bg-white"
                            />
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="font-bold">IFSC:</span>
                              <input
                                type="text"
                                value={editForm.supplierIfsc}
                                onChange={(e) => setEditForm({ ...editForm, supplierIfsc: e.target.value })}
                                placeholder="IFSC Code"
                                className="w-full px-1.5 py-0.5 border border-amber-300 rounded font-mono text-[10px] bg-white font-bold"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <span>{activeDoc.supplierBankDetails}</span>
                            <span className="block font-mono font-bold text-[#E4002B]">IFSC: {activeDoc.supplierIfsc}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Buyer Details (Aiyara Textile Manufacturing PVT LTD) */}
                    <div className="p-3 space-y-1.5 bg-white">
                      <div className="font-bold border-b border-slate-300 pb-1 mb-1 text-slate-900 uppercase">
                        BUYER / CUSTOMER DETAILS
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">COMPANY NAME: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.buyerName}
                            onChange={(e) => setEditForm({ ...editForm, buyerName: e.target.value })}
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded font-black text-xs bg-white text-slate-900 mt-0.5"
                          />
                        ) : (
                          <strong className="text-xs uppercase block text-[#E4002B] font-black">
                            {activeDoc.buyerName}
                          </strong>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">Address: </span>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editForm.buyerAddress}
                            onChange={(e) => setEditForm({ ...editForm, buyerAddress: e.target.value })}
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[10px] bg-white text-slate-900 mt-0.5"
                          />
                        ) : (
                          <span className="block text-[10px] uppercase leading-relaxed">{activeDoc.buyerAddress}</span>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="font-bold">GSTIN: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.buyerGstin}
                              onChange={(e) => setEditForm({ ...editForm, buyerGstin: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.buyerGstin}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">Phone: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.buyerPhone}
                              onChange={(e) => setEditForm({ ...editForm, buyerPhone: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.buyerPhone}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 text-[10.5px]">
                        <span className="font-bold">EMAIL: </span>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.buyerEmail}
                            onChange={(e) => setEditForm({ ...editForm, buyerEmail: e.target.value })}
                            className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white mt-0.5"
                          />
                        ) : (
                          <span className="font-mono">{activeDoc.buyerEmail}</span>
                        )}
                      </div>

                      <div className="pt-1 text-[10.5px]">
                        <span className="font-bold">ATTENTION: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.buyerAttention}
                            onChange={(e) => setEditForm({ ...editForm, buyerAttention: e.target.value })}
                            className="w-full px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white mt-0.5"
                          />
                        ) : (
                          <span>{activeDoc.buyerAttention}</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Yellow / Crimson PO Title Bar */}
                  <div className="bg-amber-300 text-slate-950 font-black text-center py-1.5 px-4 rounded border-2 border-slate-900 text-xs tracking-wider uppercase mb-3 flex flex-wrap items-center justify-between gap-2">
                    {isEditing ? (
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-800">PO Title:</span>
                          <input
                            type="text"
                            value={editForm.poTitle || ''}
                            onChange={(e) => setEditForm({ ...editForm, poTitle: e.target.value })}
                            placeholder="Enter PO Title..."
                            className="px-2 py-0.5 border border-slate-900 rounded font-bold text-xs bg-white text-slate-950"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-800">Invoice/PO #:</span>
                          <input
                            type="text"
                            value={editForm.invoiceNo}
                            onChange={(e) => setEditForm({ ...editForm, invoiceNo: e.target.value, poNumber: e.target.value.replace(/[^0-9]/g, '') || editForm.poNumber })}
                            className="px-2 py-0.5 border border-slate-900 rounded font-mono font-bold text-xs bg-white text-slate-950 w-36"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span>{activeDoc.poTitle || 'PO DETAILS'}</span>
                        <span className="font-mono">{activeDoc.invoiceNo}</span>
                      </>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div className="border-2 border-slate-900 rounded overflow-hidden mb-4">
                    <table className="w-full text-left text-[10.5px] border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-extrabold border-b-2 border-slate-900 text-center uppercase tracking-wider font-mono">
                          <th className="p-1.5 border-r border-slate-900">ITEM #</th>
                          <th className="p-1.5 border-r border-slate-900 text-left">DESCRIPTION OF ITEM</th>
                          <th className="p-1.5 border-r border-slate-900">SPECIFICATION</th>
                          <th className="p-1.5 border-r border-slate-900">PRODUCT CODE</th>
                          <th className="p-1.5 border-r border-slate-900">SIZES In cm</th>
                          <th className="p-1.5 border-r border-slate-900 w-12">QTY pcs</th>
                          <th className="p-1.5 border-r border-slate-900">TOTAL METER</th>
                          <th className="p-1.5 border-r border-slate-900 text-right">SQ MTR PRICE</th>
                          <th className="p-1.5 text-right">TOTAL</th>
                          {isEditing && <th className="p-1.5 print:hidden w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y border-slate-900 text-slate-900 font-sans">
                        {editForm.items.map((item, idx) => (
                          <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            {/* Item # */}
                            <td className="p-1.5 border-r border-slate-900 font-mono font-bold text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.itemNo}
                                  onChange={(e) => handleItemChange(idx, 'itemNo', e.target.value)}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.itemNo
                              )}
                            </td>

                            {/* Description */}
                            <td className="p-1.5 border-r border-slate-900 font-medium">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                  className="w-full px-1.5 py-0.5 border border-slate-300 rounded font-sans text-[10px] bg-white"
                                />
                              ) : (
                                item.description
                              )}
                            </td>

                            {/* Specification */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono text-[10px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.specification}
                                  onChange={(e) => handleItemChange(idx, 'specification', e.target.value)}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.specification
                              )}
                            </td>

                            {/* Product Code */}
                            <td className="p-1.5 border-r border-slate-900 text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.productCode}
                                  onChange={(e) => handleItemChange(idx, 'productCode', e.target.value)}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white"
                                />
                              ) : (
                                item.productCode
                              )}
                            </td>

                            {/* Sizes In CM */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.sizesCm}
                                  onChange={(e) => handleItemChange(idx, 'sizesCm', e.target.value)}
                                  placeholder="250x350"
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.sizesCm
                              )}
                            </td>

                            {/* QTY in Pcs */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qtyPcs}
                                  onChange={(e) => handleItemChange(idx, 'qtyPcs', Number(e.target.value))}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.qtyPcs
                              )}
                            </td>

                            {/* Total in Meter */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-700">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.totalSqMeter}
                                  onChange={(e) => handleItemChange(idx, 'totalSqMeter', Number(e.target.value))}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.totalSqMeter
                              )}
                            </td>

                            {/* Sq Mtr Price */}
                            <td className="p-1.5 border-r border-slate-900 text-right font-mono font-bold">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.sqMtrPrice}
                                  onChange={(e) => handleItemChange(idx, 'sqMtrPrice', Number(e.target.value))}
                                  className="w-full text-right px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                `₹ ${item.sqMtrPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              )}
                            </td>

                            {/* Total */}
                            <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">
                              {`₹ ${item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </td>

                            {/* Remove row button */}
                            {isEditing && (
                              <td className="p-1 text-center print:hidden">
                                <button
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                  title="Remove Line Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Add Line Item Button in Edit Mode */}
                    {isEditing && (
                      <div className="p-2 bg-slate-100 border-t border-slate-900 flex justify-center print:hidden">
                        <button
                          onClick={handleAddLineItem}
                          className="px-3 py-1 bg-[#E4002B] text-white font-bold text-xs rounded-lg hover:bg-rose-700 transition flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Line Item Row</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Totals Box */}
                  <div className="border-2 border-slate-900 rounded p-3 bg-slate-50 flex flex-col md:flex-row items-end md:items-center justify-between gap-4 text-xs">
                    
                    {/* Left: Total Pcs & Total Sq Meters */}
                    <div className="flex items-center space-x-6 border-b md:border-b-0 md:border-r border-slate-300 pr-6 pb-2 md:pb-0 w-full md:w-auto justify-between md:justify-start">
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">Total Pcs</span>
                        <strong className="text-sm font-mono font-black text-slate-900">{editForm.totalPcs}</strong>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">Total Sq Meter</span>
                        <strong className="text-sm font-mono font-black text-slate-900">{editForm.totalSqMeter}</strong>
                      </div>
                    </div>

                    {/* Right: Sub Total, IGST, Advance, Total Amount */}
                    <div className="w-full md:w-80 space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-200">
                        <span className="font-bold text-slate-700">Sub Total</span>
                        <span className="font-extrabold">{formatINR(editForm.subTotal)}</span>
                      </div>

                      <div className="flex items-center justify-between py-0.5 border-b border-slate-200 text-slate-800">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">IGST</span>
                          {isEditing ? (
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editForm.igstPercent}
                                onChange={(e) => updateFormTotals(editForm.items, Number(e.target.value), editForm.advancePercent)}
                                className="w-12 px-1 py-0.2 border border-slate-300 rounded text-center text-[10px] font-bold bg-white"
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            <span>{editForm.igstPercent}%</span>
                          )}
                        </div>
                        <span className="font-extrabold">{formatINR(editForm.igstAmount)}</span>
                      </div>

                      <div className="flex items-center justify-between py-0.5 border-b border-slate-200 text-amber-800 bg-amber-50 px-1 rounded">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Advance</span>
                          {isEditing ? (
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editForm.advancePercent}
                                onChange={(e) => updateFormTotals(editForm.items, editForm.igstPercent, Number(e.target.value))}
                                className="w-12 px-1 py-0.2 border border-amber-300 rounded text-center text-[10px] font-bold bg-white"
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            <span>{editForm.advancePercent}%</span>
                          )}
                        </div>
                        <span className="font-extrabold">{formatINR(editForm.advanceAmount)}</span>
                      </div>

                      <div className="flex justify-between py-1 bg-slate-900 text-white px-2 rounded font-black text-xs">
                        <span>Total Amount</span>
                        <span>{formatINR(editForm.totalAmount)}</span>
                      </div>
                    </div>

                  </div>

                  {/* Terms & Conditions / Delivery Notes */}
                  <div className="mt-4 p-2.5 rounded border border-slate-200 bg-slate-50 text-[10.5px]">
                    <div className="font-extrabold text-slate-900 uppercase tracking-wide mb-1">
                      Terms of Delivery and Payment:
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Enter terms of delivery, payment advance and settlement schedule..."
                        className="w-full p-1.5 border border-slate-300 rounded text-[10px] bg-white text-slate-900 font-sans"
                      />
                    ) : (
                      <p className="text-[10px] leading-relaxed text-slate-700 font-medium">
                        {activeDoc.notes || '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.'}
                      </p>
                    )}
                  </div>

                  {/* Owner Signature Block */}
                  <div className="mt-6 flex justify-end items-end text-xs pt-3 border-t border-slate-300 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                    <div className="text-center font-sans space-y-0.5 relative min-w-[190px]">
                      <div className="border-b-2 border-slate-900 pb-0.5 font-bold text-slate-900 uppercase tracking-wider text-[10.5px]">
                        For FOUR CORNERS CARPETS
                      </div>

                      {/* Stamp Image */}
                      <div className="py-0.5 flex justify-center items-center">
                        <img 
                          src="https://i.postimg.cc/tJynktRD/f4C-stamp.png" 
                          alt="Four Corners Carpets Official Stamp" 
                          className="h-14 max-h-16 w-auto object-contain mix-blend-multiply drop-shadow-sm select-none"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="font-mono text-[10px] font-bold text-slate-700">
                        SIGNATURE OF OWNER / PROPRIETOR
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-24 px-4 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-[#E4002B] rounded-3xl flex items-center justify-center mx-auto border border-rose-200">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider font-mono">
                  No Invoices Available
                </h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  All dummy purchase orders have been removed. Upload a PO file (PDF, Excel, Image, CSV) or create a new invoice to manage your export performa invoices.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload PO File</span>
                  </button>
                  <button
                    onClick={handleCreateNewInvoice}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Invoice</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[60] animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold font-mono text-white ${
            toastMessage.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-[#E4002B] border border-rose-500'
          }`}>
            {toastMessage.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* In-App Single PO Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-200">
            <div className="w-12 h-12 bg-rose-100 text-[#E4002B] rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 font-mono uppercase">
                Confirm PO Removal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-[#E4002B]">{deleteTarget.invoiceNo || deleteTarget.poTitle || 'this PO'}</strong> ({deleteTarget.buyerName || 'Client Order'})?
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Remove PO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Clear All POs Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-200">
            <div className="w-12 h-12 bg-rose-100 text-[#E4002B] rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 font-mono uppercase">
                Clear All POs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove all <strong className="text-[#E4002B]">{invoices.length} invoices / POs</strong> from the Aiyara Invoice Module?
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                All records will be permanently cleared from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing All...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All Invoices</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiyaraInvoiceModal;

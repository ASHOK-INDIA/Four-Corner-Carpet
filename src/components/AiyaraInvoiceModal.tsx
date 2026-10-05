import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Download,
  AlertTriangle,
  Globe,
  FileCheck,
  Layers,
  RefreshCw,
  Box,
  Calculator
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { AiyaraInvoice, AiyaraLineItem, PurchaseOrder, CargoItem } from '../types';

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
  DEFAULT_AIYARA_INVOICES,
  subscribeContainerItems
} from '../lib/firestoreService';

// Helper to convert currency amount to words (International export & standard invoice format)
export function convertAmountToWords(num: number, currencyStr?: string): string {
  if (isNaN(num) || num === 0) return 'Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let words = '';
  if (integerPart === 0) {
    words = 'Zero';
  } else {
    const billions = Math.floor(integerPart / 1000000000);
    const millions = Math.floor((integerPart % 1000000000) / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    const parts: string[] = [];
    if (billions > 0) parts.push(convertGroup(billions) + ' Billion');
    if (millions > 0) parts.push(convertGroup(millions) + ' Million');
    if (thousands > 0) parts.push(convertGroup(thousands) + ' Thousand');
    if (remainder > 0) parts.push(convertGroup(remainder));

    words = parts.join(' ');
  }

  const curr = (currencyStr || 'USD').toUpperCase();
  let majorUnit = 'US Dollars';
  let minorUnit = 'Cents';

  if (curr.includes('EUR') || curr.includes('€')) {
    majorUnit = 'Euros';
    minorUnit = 'Cents';
  } else if (curr.includes('INR') || curr.includes('₹')) {
    majorUnit = 'Rupees';
    minorUnit = 'Paise';
  } else if (curr.includes('GBP') || curr.includes('£')) {
    majorUnit = 'Pounds';
    minorUnit = 'Pence';
  }

  let finalStr = `${majorUnit} ${words}`.trim();
  if (decimalPart > 0) {
    finalStr += ` and ${convertGroup(decimalPart)} ${minorUnit}`;
  }
  return `${finalStr} Only`;
}

// Auto calculate total sq.m based on size string (e.g. "135x160" cm -> 2.16 sq.m/pc, "250x350" cm -> 8.75 sq.m/pc, "2x3" m -> 6.00 sq.m/pc, "8x10 ft" -> 7.43 sq.m/pc)
export const calculateSqMeters = (sizesCm: string, qtyPcs: number, invoiceType?: string): number => {
  if (!sizesCm) return 0;
  try {
    const clean = sizesCm.toLowerCase().replace(/['"’”]/g, '').trim();

    // Check round/circle dimensions (e.g. "150 round", "150 dia", "120 cm round", "150r")
    const roundMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:cm|m|mtr)?\s*(?:round|dia|diameter|circle|r\b)/i);
    if (roundMatch) {
      let d = parseFloat(roundMatch[1]);
      if (d > 0) {
        if (d >= 15) d = d / 100; // cm to meter
        const radius = d / 2;
        const sqMeterPerPc = Math.PI * radius * radius;
        return parseFloat((sqMeterPerPc * (qtyPcs > 0 ? qtyPcs : 1)).toFixed(2));
      }
    }

    // Match dimensions like "135x160", "135X160", "250*350", "8x10 ft", "1.4x2.0m", "2x3"
    const match = clean.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|by|-)\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const w = parseFloat(match[1]);
      const h = parseFloat(match[2]);
      if (w <= 0 || h <= 0) return 0;

      const isPoptop = (invoiceType || '').toUpperCase() === 'POPTOP' || clean.includes('poptop');
      const isExplicitFeet = clean.includes('ft') || clean.includes('feet') || sizesCm.includes("'");
      const isExplicitInches = clean.includes('in') || clean.includes('inch') || sizesCm.includes('"');
      const isExplicitMeters = clean.includes('mtr') || clean.includes('meter') || (clean.includes('m') && !clean.includes('cm'));

      let sqMeterPerPc = 0;

      if (isExplicitFeet) {
        // Explicit feet (e.g. 8x10 ft -> 80 sq.ft = 7.432 sq.m)
        sqMeterPerPc = (w * h) * 0.092903;
      } else if (isExplicitInches) {
        // Explicit inches (e.g. 36x60 in)
        sqMeterPerPc = (w * 0.0254) * (h * 0.0254);
      } else if (isExplicitMeters || (w <= 10 && h <= 10 && (match[1].includes('.') || match[2].includes('.')))) {
        // Explicit meters or decimal meters (e.g. 1.35x1.60 m -> 2.16 sq.m, 2.5x3.5 -> 8.75 sq.m)
        sqMeterPerPc = w * h;
      } else if (w >= 15 && h >= 15) {
        // Standard Centimeters (e.g. 135x160 -> 1.35m x 1.60m = 2.16 sq.m, 250x350 -> 2.5m x 3.5m = 8.75 sq.m, 140x200 -> 2.8 sq.m)
        sqMeterPerPc = (w / 100) * (h / 100);
      } else if (isPoptop) {
        // In Poptop (Austria / EU metric standard), small integers without units represent METERS (e.g. 2x3 -> 2m x 3m = 6.00 sq.m)
        sqMeterPerPc = w * h;
      } else if (w <= 12 && h <= 15 && Number.isInteger(w) && Number.isInteger(h)) {
        // Standard imperial carpet feet sizes (e.g. 3x5, 4x6, 5x8, 6x9, 8x10, 9x12)
        sqMeterPerPc = (w * h) * 0.092903;
      } else {
        // General fallback
        const wMeter = w >= 15 ? w / 100 : w;
        const hMeter = h >= 15 ? h / 100 : h;
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

  // Export Document Tabs (Commercial Invoice, Packing List, Certificate of Origin - REX Scheme)
  const [activeDocTab, setActiveDocTab] = useState<'COMMERCIAL' | 'PACKING_LIST' | 'REX_CERTIFICATE'>('COMMERCIAL');
  const [isMasterRecordsModalOpen, setIsMasterRecordsModalOpen] = useState<boolean>(false);

  // Master Consignee Record (Poptop GmbH)
  const [consigneeMaster, setConsigneeMaster] = useState({
    name: 'Poptop GmbH',
    address: 'Mühlbachgasse 18 B/4, 2514 Traiskirchen, Austria',
    phone: '+4367763155993',
    email: 'office@poptop.at',
    eoriVat: 'ATU78280315 / EORI: ATEORI100012345',
    attention: 'Ashok / Import Desk'
  });

  // Master Exporter Record (Four Corners Carpets)
  const [exporterMaster, setExporterMaster] = useState({
    name: 'FOUR CORNERS CARPETS',
    address: 'Main Road, Maryadpatti, Bhadohi - 221401, UP, INDIA',
    gstin: '09AABFF1234A1ZB',
    iecNo: 'AJTPD8099G',
    rexNo: 'INREX123456789',
    contact: '+91 94152 25800 / info@fourcornerscarpets.com',
    bankName: 'ICICI BANK LTD.',
    accountNo: '039005001234',
    ifsc: 'ICIC0000390',
    swiftCode: 'ICICINBBCTS',
    adCode: '6390001234567',
    branch: 'Bhadohi Branch, UP, India'
  });

  // Load saved masters from localStorage
  useEffect(() => {
    try {
      const savedConsignee = localStorage.getItem('f4c_consignee_master');
      if (savedConsignee) setConsigneeMaster(JSON.parse(savedConsignee));
      const savedExporter = localStorage.getItem('f4c_exporter_master');
      if (savedExporter) setExporterMaster(JSON.parse(savedExporter));
    } catch (e) {
      console.warn('Error loading master records from localStorage:', e);
    }
  }, []);

  // Save Master Records permanently
  const handleSaveMasterRecords = () => {
    try {
      localStorage.setItem('f4c_consignee_master', JSON.stringify(consigneeMaster));
      localStorage.setItem('f4c_exporter_master', JSON.stringify(exporterMaster));
      setIsMasterRecordsModalOpen(false);
      setToastMessage({ type: 'success', text: 'Consignee & Exporter Master Records saved permanently!' });
    } catch (e) {
      setToastMessage({ type: 'error', text: 'Failed to save Master Records.' });
    }
  };

  // Apply Master Records to active editing invoice
  const handleApplyMasterRecordsToForm = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      buyerName: consigneeMaster.name,
      buyerAddress: consigneeMaster.address,
      buyerPhone: consigneeMaster.phone,
      buyerEmail: consigneeMaster.email,
      buyerGstin: consigneeMaster.eoriVat.split('/')[0].trim(),
      buyerEoriVat: consigneeMaster.eoriVat,
      buyerAttention: consigneeMaster.attention,

      supplierName: exporterMaster.name,
      supplierAddress: exporterMaster.address,
      supplierGstin: exporterMaster.gstin,
      supplierContact: exporterMaster.contact,
      supplierBankDetails: `${exporterMaster.bankName}, A/C: ${exporterMaster.accountNo}`,
      supplierIfsc: exporterMaster.ifsc,
      supplierSwiftCode: exporterMaster.swiftCode,
      supplierAdCode: exporterMaster.adCode,
      supplierIecNo: exporterMaster.iecNo,
      supplierRexNo: exporterMaster.rexNo
    });
    setToastMessage({ type: 'success', text: 'Applied Consignee & Exporter Master Records to active document!' });
  };

  // Reset active invoice items to original PO defaults
  const handleResetToPoDefaults = () => {
    if (!matchingPo || !editForm) {
      setToastMessage({ type: 'error', text: 'No matching PO found to reset to defaults.' });
      return;
    }
    const newItems: AiyaraLineItem[] = matchingPo.designs.map((d, idx) => {
      const descLower = (d.name || '').toLowerCase();
      let hsn = '57050039';
      if (descLower.includes('tufted')) hsn = '57021000';
      else if (descLower.includes('knot')) hsn = '57011000';

      const qtyPcs = Number(d.qty) || 1;
      const calculatedSqM = calculateSqMeters(d.size, qtyPcs) || 8.75;
      const sqMtrPrice = 1050;
      const totalAmount = parseFloat((calculatedSqM * sqMtrPrice).toFixed(2));

      return {
        id: `item-po-${Date.now()}-${idx}`,
        itemNo: d.batch || `${idx + 1}`,
        description: d.name || `Design ${idx + 1}`,
        specification: '100% Wool Flatweave Carpet',
        productCode: 'Flatweave',
        palletDimension: '145x70x85',
        qtyPallet: 1,
        qtyPcs,
        totalSqMeter: calculatedSqM,
        sqMtrPrice,
        totalAmount,
        hsnCode: hsn,
        cartonBaleNo: `Bale #${idx + 1}`,
        rollNo: `R-${idx + 1}`,
        netWeightKg: Math.round(calculatedSqM * 2.5),
        grossWeightKg: Math.round(calculatedSqM * 2.8),
        cbmVolume: 0.863
      };
    });
    updateFormTotals(newItems);
    setToastMessage({ type: 'success', text: `Reset line items to original PO #${matchingPo.po} defaults!` });
  };

  // Real-time Container Cargo items subscription from 3D Container Stuffing (CBM Planner)
  const [containerCargoItems, setContainerCargoItems] = useState<CargoItem[]>([]);
  useEffect(() => {
    const unsub = subscribeContainerItems(
      (items) => setContainerCargoItems(items),
      (err) => console.warn('Container items subscription in invoice:', err)
    );
    return () => unsub();
  }, []);

  // Fetch & Sync CBM dimensions and volumes for all line items
  const handleFetchFromCbm = () => {
    if (!editForm) return;
    let updatedCount = 0;
    const updatedItems = editForm.items.map(item => {
      // 1. Try matching with Container Cargo Items in Firestore
      const match = containerCargoItems.find(c => 
        (c.name && item.description && item.description.toLowerCase().includes(c.name.toLowerCase())) ||
        (c.name && item.productCode && item.productCode.toLowerCase().includes(c.name.toLowerCase())) ||
        (c.name && item.itemNo && item.itemNo.toLowerCase().includes(c.name.toLowerCase()))
      ) || (containerCargoItems.length === 1 ? containerCargoItems[0] : null);

      if (match) {
        updatedCount++;
        const palletDim = `${match.lengthCm}x${match.widthCm}x${match.heightCm}`;
        const palletCount = Number(item.qtyPallet) || 1;
        const singleCbm = (match.lengthCm * match.widthCm * match.heightCm) / 1000000;
        const totalCbm = parseFloat((singleCbm * palletCount).toFixed(3));
        return {
          ...item,
          palletDimension: palletDim,
          weightKg: match.weightKg ? Math.round(match.weightKg) : item.weightKg,
          cbmVolume: totalCbm
        };
      } else {
        // 2. Auto-compute from existing palletDimension or fallback
        const computed = calculateLineItemCbm(item);
        if (computed > 0) {
          updatedCount++;
          return {
            ...item,
            palletDimension: item.palletDimension || '145x70x85',
            cbmVolume: computed
          };
        }
      }
      return item;
    });
    updateFormTotals(updatedItems);
    setToastMessage({ type: 'success', text: `CBM data fetched & recalculated for ${updatedCount} item(s)!` });
  };

  // New comparison hooks
  const [selectedComparisonPo, setSelectedComparisonPo] = useState<string>('');

  const activeDoc = isEditing ? editForm : selectedInvoice;

  // Find matching PO from productionData or fallback to manually selected comparison PO
  const matchingPo = useMemo(() => {
    if (!activeDoc) return null;
    if (selectedComparisonPo) {
      return productionData.find(p => p.po === selectedComparisonPo) || null;
    }
    // Auto-detect matching PO
    return productionData.find(p => {
      if (!p || !p.po) return false;
      const pPo = String(p.po).trim().toLowerCase();
      const activePo = String(activeDoc.poNumber || '').trim().toLowerCase();
      const activeTitle = String(activeDoc.poTitle || '').trim().toLowerCase();
      const activeInv = String(activeDoc.invoiceNo || '').trim().toLowerCase();
      return (activePo && (activePo === pPo || activePo.includes(pPo) || pPo.includes(activePo))) ||
             (activeTitle && activeTitle.includes(pPo)) ||
             (activeInv && activeInv.includes(pPo));
    }) || productionData[0] || null;
  }, [activeDoc, selectedComparisonPo, productionData]);

  // Total pcs in the matched Purchase Order
  const poTotalQty = useMemo(() => {
    if (!matchingPo || !matchingPo.designs) return 0;
    return matchingPo.designs.reduce((acc, d) => acc + (Number(d.qty) || 0), 0);
  }, [matchingPo]);

  // Compare each line item with PO designs
  const getPoItemComparison = (item: AiyaraLineItem, idx: number) => {
    if (!matchingPo || !matchingPo.designs || matchingPo.designs.length === 0) {
      return null;
    }

    const itemNoClean = String(item.itemNo || '').trim().toLowerCase();
    
    // 1. Try matching by batch/itemNo
    let matchedDesign = matchingPo.designs.find(d => {
      const batchClean = String(d.batch || '').trim().toLowerCase();
      return batchClean && (batchClean === itemNoClean || batchClean.includes(itemNoClean) || itemNoClean.includes(batchClean));
    });

    // 2. Try matching by sizesCm
    if (!matchedDesign && item.sizesCm) {
      const sizeClean = item.sizesCm.replace(/\s+/g, '').toLowerCase();
      matchedDesign = matchingPo.designs.find(d => {
        const dSizeClean = (d.size || '').replace(/\s+/g, '').toLowerCase();
        return dSizeClean && (dSizeClean === sizeClean || sizeClean.includes(dSizeClean) || dSizeClean.includes(sizeClean));
      });
    }

    // 3. Try matching by description
    if (!matchedDesign && item.description) {
      const descClean = item.description.toLowerCase();
      matchedDesign = matchingPo.designs.find(d => {
        const dNameClean = (d.name || '').toLowerCase();
        return dNameClean && (descClean.includes(dNameClean) || dNameClean.includes(descClean));
      });
    }

    // 4. Fallback to index if within range
    if (!matchedDesign && matchingPo.designs[idx]) {
      matchedDesign = matchingPo.designs[idx];
    }

    const poQty = matchedDesign ? Number(matchedDesign.qty) || 0 : 0;
    const scannedQty = Number(item.qtyPcs) || 0;
    const extraQty = scannedQty - poQty;
    const isExtra = extraQty > 0;

    return {
      matchedDesign,
      poQty,
      scannedQty,
      extraQty,
      isExtra
    };
  };

  // Calculate total extra pcs across all line items
  const totalExtraPcs = useMemo(() => {
    if (!editForm || !matchingPo) return 0;
    return editForm.items.reduce((acc, item, idx) => {
      const comp = getPoItemComparison(item, idx);
      return acc + (comp && comp.isExtra ? comp.extraQty : 0);
    }, 0);
  }, [editForm, matchingPo]);

  // Subscribe to real-time Firestore invoices (Only uploaded or user-saved records)
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeAiyaraInvoices(
      (data) => {
        // Ensure missing sq.meter or totals have fallback values without overwriting user-saved meters
        const sanitized = data.map(inv => {
          let hasDiff = false;
          const fixedItems = inv.items.map(it => {
            if (!it.totalSqMeter || Number(it.totalSqMeter) <= 0) {
              const calculated = calculateSqMeters(it.sizesCm, Number(it.qtyPcs) || 1, inv.invoiceType);
              if (calculated > 0) {
                hasDiff = true;
                return { ...it, totalSqMeter: calculated };
              }
            }
            return it;
          });
          if (hasDiff) {
            const newTotSqM = parseFloat(fixedItems.reduce((s, it) => s + (Number(it.totalSqMeter) || 0), 0).toFixed(2));
            const updatedInv = { ...inv, items: fixedItems, totalSqMeter: newTotSqM };
            saveAiyaraInvoiceToFirestore(updatedInv).catch(() => {});
            return updatedInv;
          }
          return inv;
        });

        setInvoices(sanitized);
        if (sanitized.length > 0) {
          // If no invoice selected or previous selection deleted, pick first
          setSelectedInvoice((prev) => {
            const exists = sanitized.find((i) => i.id === prev?.id);
            const current = exists || sanitized[0];
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

  // Format Currency (USD $, EUR €, INR ₹)
  const formatCurrency = (val: number, customCurrency?: string) => {
    const isPoptop = (isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop');
    const curr = customCurrency || (isEditing ? editForm?.currency : activeDoc?.currency) || (isPoptop ? 'USD ($)' : 'USD ($)');
    const num = val || 0;

    if (isPoptop || curr.includes('USD') || curr.includes('$')) {
      return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (curr.includes('EUR') || curr.includes('€')) {
      return `€ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatINR = (val: number) => formatCurrency(val);

  // Auto calculate CBM for a line item based on pallet dimension, explicit cbmVolume, or dimensions
  const calculateLineItemCbm = (item: AiyaraLineItem): number => {
    if (item.cbmVolume !== undefined && Number(item.cbmVolume) > 0) {
      return Number(item.cbmVolume);
    }
    // Check palletDimension e.g. "145x70x85" (L x W x H in cm)
    if (item.palletDimension && item.palletDimension.trim()) {
      const clean = item.palletDimension.toLowerCase().replace(/cm/gi, '').trim();
      const parts = clean.split(/[x*×]/).map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);
      if (parts.length === 3) {
        const palletCount = Number(item.qtyPallet) || 1;
        const singlePalletCbm = (parts[0] * parts[1] * parts[2]) / 1000000;
        return parseFloat((singlePalletCbm * palletCount).toFixed(3));
      }
    }
    // Fallback based on totalSqMeter
    if (item.totalSqMeter && item.totalSqMeter > 0) {
      return parseFloat((item.totalSqMeter * 0.015).toFixed(3));
    }
    return 0;
  };

  // Recalculate totals for editForm (Supports Standard Sq.M vs Poptop Per Pcs & Pallet Charge)
  const updateFormTotals = (
    updatedItems: AiyaraLineItem[], 
    customIgst?: number, 
    customAdvance?: number,
    overrideType?: 'STANDARD' | 'POPTOP',
    customPalletCharge?: number,
    customTotalPallets?: number,
    customPcsPerPallet?: number
  ) => {
    const invType = overrideType ?? editForm?.invoiceType ?? (editForm?.buyerName?.toLowerCase().includes('poptop') ? 'POPTOP' : 'STANDARD');
    const isPoptop = invType === 'POPTOP';

    // Calculate line item amounts based on Poptop vs Standard mode and ensure accurate Sq.Meter
    const itemsWithTotals = updatedItems.map(item => {
      const pcs = Number(item.qtyPcs) || 1;
      const calculatedSqM = calculateSqMeters(item.sizesCm, pcs, invType);
      // Preserve manual totalSqMeter if provided and positive; otherwise use auto-calculated
      const sqM = (item.totalSqMeter !== undefined && Number(item.totalSqMeter) > 0)
        ? Number(item.totalSqMeter)
        : (calculatedSqM > 0 ? calculatedSqM : 0);

      let tot = 0;
      if (isPoptop) {
        // Price per PCS
        const pcPrice = item.pcsPrice !== undefined && item.pcsPrice > 0 ? Number(item.pcsPrice) : Number(item.sqMtrPrice) || 0;
        tot = parseFloat((pcs * pcPrice).toFixed(2));
        return { ...item, totalSqMeter: sqM, pcsPrice: pcPrice, totalAmount: tot };
      } else {
        // Price per Sq.Meter
        const mPrice = Number(item.sqMtrPrice) || 0;
        tot = parseFloat((sqM * mPrice).toFixed(2));
        return { ...item, totalSqMeter: sqM, totalAmount: tot };
      }
    });

    const totalPcs = itemsWithTotals.reduce((acc, item) => acc + (Number(item.qtyPcs) || 0), 0);
    const totalSqMeter = itemsWithTotals.reduce((acc, item) => acc + (Number(item.totalSqMeter) || 0), 0);
    const totalCbm = itemsWithTotals.reduce((acc, item) => acc + (calculateLineItemCbm(item) || 0), 0);

    const subTotal = itemsWithTotals.reduce((acc, item) => acc + (Number(item.totalAmount) || 0), 0);

    const sumItemPallets = itemsWithTotals.reduce((acc, item) => acc + (Number(item.qtyPallet) || 1), 0);
    const pcsPerPallet = customPcsPerPallet !== undefined ? customPcsPerPallet : (editForm?.pcsPerPallet ?? 10);
    const calculatedPallets = Math.ceil(totalPcs / (pcsPerPallet > 0 ? pcsPerPallet : 10)) || 1;
    const totalPallets = customTotalPallets !== undefined ? customTotalPallets : (isPoptop ? sumItemPallets : (editForm?.totalPallets ?? calculatedPallets));
    const perPalletCharge = customPalletCharge !== undefined ? customPalletCharge : (editForm?.perPalletCharge ?? (isPoptop ? 50 : 0));
    const palletChargeAmount = isPoptop ? parseFloat((totalPallets * perPalletCharge).toFixed(2)) : 0;

    const igstPercent = isPoptop ? 0 : (customIgst !== undefined ? customIgst : (editForm?.igstPercent ?? 5));
    const igstAmount = isPoptop ? 0 : parseFloat(((subTotal * igstPercent) / 100).toFixed(2));
    
    const advancePercent = customAdvance !== undefined ? customAdvance : (editForm?.advancePercent ?? 25);
    const advanceAmount = parseFloat(((subTotal * advancePercent) / 100).toFixed(2));

    // Total Amount = Sub Total + IGST (or Pallet Charge) - Advance
    const totalAmount = isPoptop
      ? parseFloat((subTotal + palletChargeAmount - advanceAmount).toFixed(2))
      : parseFloat((subTotal + igstAmount - advanceAmount).toFixed(2));

    setEditForm((prev) => prev ? ({
      ...prev,
      invoiceType: invType,
      priceMode: isPoptop ? 'PER_PCS' : 'PER_SQM',
      currency: prev.currency || 'USD ($)',
      perPalletCharge,
      totalPallets,
      pcsPerPallet,
      items: itemsWithTotals,
      totalPcs,
      totalSqMeter: parseFloat(totalSqMeter.toFixed(2)),
      totalCbm: parseFloat(totalCbm.toFixed(3)),
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
    const isPoptop = editForm.invoiceType === 'POPTOP' || editForm.buyerName?.toLowerCase().includes('poptop');
    const newItems = [...editForm.items];
    const currentItem = { ...newItems[index] };

    (currentItem as any)[field] = value;

    // Recalculate sq.meter if size or qty changed
    if (field === 'sizesCm' || field === 'qtyPcs') {
      const pcs = field === 'qtyPcs' ? (Number(value) || 1) : (Number(currentItem.qtyPcs) || 1);
      const sizeStr = field === 'sizesCm' ? String(value) : currentItem.sizesCm;
      const calculatedSqM = calculateSqMeters(sizeStr, pcs, editForm.invoiceType);
      if (calculatedSqM > 0) {
        currentItem.totalSqMeter = calculatedSqM;
      }
    }

    // Direct manual override of totalSqMeter
    if (field === 'totalSqMeter') {
      currentItem.totalSqMeter = Number(value) || 0;
    }

    if (field === 'palletDimension' || field === 'qtyPallet') {
      const computedCbm = calculateLineItemCbm(currentItem);
      if (computedCbm > 0) {
        currentItem.cbmVolume = computedCbm;
      }
    }

    if (isPoptop) {
      const pcs = Number(currentItem.qtyPcs) || 1;
      const pcPrice = currentItem.pcsPrice !== undefined && Number(currentItem.pcsPrice) > 0 ? Number(currentItem.pcsPrice) : Number(currentItem.sqMtrPrice) || 0;
      currentItem.pcsPrice = pcPrice;
      currentItem.totalAmount = parseFloat((pcs * pcPrice).toFixed(2));
    } else {
      const sqM = Number(currentItem.totalSqMeter) || 0;
      const price = Number(currentItem.sqMtrPrice) || 0;
      currentItem.totalAmount = parseFloat((sqM * price).toFixed(2));
    }

    newItems[index] = currentItem;
    updateFormTotals(newItems);
  };

  // Recalculate all items' sq.meters based on sizesCm and qtyPcs
  const handleRecalculateAllMeters = () => {
    if (!editForm) return;
    const invType = editForm.invoiceType ?? (editForm.buyerName?.toLowerCase().includes('poptop') ? 'POPTOP' : 'STANDARD');
    const recalculated = editForm.items.map(it => {
      const pcs = Number(it.qtyPcs) || 1;
      const sqM = calculateSqMeters(it.sizesCm, pcs, invType);
      return {
        ...it,
        totalSqMeter: sqM > 0 ? sqM : (Number(it.totalSqMeter) || 0)
      };
    });
    updateFormTotals(recalculated);
    setToastMessage({ type: 'success', text: `Recalculated square meters for ${recalculated.length} line items!` });
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
      palletDimension: '145x70x85',
      qtyPallet: 1,
      qtyPcs: 1,
      totalSqMeter: 8.75,
      sqMtrPrice: 1050,
      totalAmount: 9187.50,
      cbmVolume: 0.863
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

  // Create a dedicated Poptop GmbH Invoice (Per Pcs Pricing, Pallet Charges, No IGST, Simplified Consignee)
  const handleCreatePoptopInvoice = () => {
    const randomPo = Math.floor(100000 + Math.random() * 900000).toString();
    const newInv: AiyaraInvoice = {
      id: `poptop_inv_${Date.now()}`,
      invoiceNo: `PO # ${randomPo}`,
      poNumber: randomPo,
      poTitle: `Poptop GmbH Invoice #${randomPo}`,
      date: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
      
      invoiceType: 'POPTOP',
      priceMode: 'PER_PCS',
      perPalletCharge: 50,
      totalPallets: 1,
      pcsPerPallet: 10,

      supplierName: exporterMaster.name,
      supplierAddress: exporterMaster.address,
      supplierGstin: exporterMaster.gstin,
      supplierContact: exporterMaster.contact,
      supplierAttention: 'Exports Manager',
      supplierBankDetails: `${exporterMaster.bankName}, A/C: ${exporterMaster.accountNo}`,
      supplierIfsc: exporterMaster.ifsc,
      supplierSwiftCode: exporterMaster.swiftCode,
      supplierAdCode: exporterMaster.adCode,
      supplierIecNo: exporterMaster.iecNo,
      supplierRexNo: exporterMaster.rexNo,

      buyerName: consigneeMaster.name || 'Poptop GmbH',
      buyerAddress: consigneeMaster.address || 'Mühlbachgasse 18 B/4, 2514 Traiskirchen, Austria',
      buyerPhone: '', // Omitted for Poptop
      buyerGstin: '', // Omitted for Poptop
      buyerEoriVat: '', // Omitted for Poptop
      buyerEmail: '', // Omitted for Poptop
      buyerAttention: '', // Omitted for Poptop

      currency: 'USD ($)',
      portOfLoading: 'MUMBAI',
      portOfDischarge: 'Austria',
      countryOfOrigin: 'INDIA',
      countryOfDestination: 'Austria',

      // Shipping & Logistics Grid details
      preCarriedBy: 'BY TRUCK',
      placeOfReceiptByPreCarrier: 'BHADOHI',
      vesselFlightNo: 'BY SEA',
      shipmentFrom: 'MUMBAI',
      finalDestination: 'Austria',
      marksAndNos: 'Marks : F4C\nAustria',
      noAndKindOfPackages: '10 Pallet',

      items: [
        {
          id: `item-${Date.now()}-1`,
          itemNo: '391912',
          description: 'Handwoven Wool Flatweave Rug',
          specification: '100% Wool',
          productCode: 'Flatweave',
          sizesCm: '250x350',
          qtyPcs: 10,
          totalSqMeter: 87.5,
          sqMtrPrice: 120,
          pcsPrice: 1050,
          totalAmount: 10500, // 10 pcs * 1050 / pc
          hsnCode: '57050039',
          palletDimension: '145x70x85 cm',
          weightKg: 280
        }
      ],

      totalPcs: 10,
      totalSqMeter: 87.5,
      subTotal: 10500,
      igstPercent: 0,
      igstAmount: 0,
      advancePercent: 0,
      advanceAmount: 0,
      totalAmount: 10600, // 10500 + (2 pallets * 50 pallet charge)
      notes: 'Palletized export delivery. Payment against shipping documents.',
      createdAt: new Date().toISOString()
    };

    setSelectedInvoice(newInv);
    setEditForm(newInv);
    setIsEditing(true);
    setToastMessage({ type: 'success', text: 'Created dedicated Poptop Invoice template!' });
  };

  // Export Active Invoice to Excel File (.xlsx)
  const handleExportExcel = () => {
    const active = isEditing ? editForm : selectedInvoice;
    if (!active) return;

    const isExcelPoptop = active.invoiceType === 'POPTOP' || (active.buyerName || '').toLowerCase().includes('poptop');

    const sheetData: any[][] = [
      [(active.documentTitle || "PERFORMA / COMMERCIAL INVOICE").toUpperCase()],
      ["FOUR CORNERS CARPETS — EXPORT DEPT."],
      [],
      ["SUPPLIER DETAILS", "", "", "", "BUYER DETAILS"],
      ["Date:", active.date, "", "", "Company Name:", active.buyerName],
      ["Company Name:", active.supplierName, "", "", "Address:", active.buyerAddress],
      ["Address:", active.supplierAddress, "", "", isExcelPoptop ? "" : "EORI / VAT:", isExcelPoptop ? "" : (active.buyerEoriVat || active.buyerGstin)],
      ["GSTIN:", active.supplierGstin, "", "", isExcelPoptop ? "" : "Phone:", isExcelPoptop ? "" : active.buyerPhone],
      ["SWIFT:", active.supplierSwiftCode || exporterMaster.swiftCode, "", "", isExcelPoptop ? "" : "Email:", isExcelPoptop ? "" : active.buyerEmail],
      ["AD Code:", active.supplierAdCode || exporterMaster.adCode, "", "", isExcelPoptop ? "" : "Attention:", isExcelPoptop ? "" : active.buyerAttention],
      ["Bank Details:", active.supplierBankDetails],
      ["IFSC Code:", active.supplierIfsc],
      [],
      ["SHIPPING & TRANSPORT DETAILS"],
      ["Pre-Carried by:", active.preCarriedBy || "BY TRUCK", "", "", "Place of Receipt Pre-Carrier:", active.placeOfReceiptByPreCarrier || "BHADOHI"],
      ["Vessel/Flight No.:", active.vesselFlightNo || "BY SEA", "", "", "Shipment From:", active.shipmentFrom || active.portOfLoading || "MUMBAI"],
      ["Port of Discharge:", active.portOfDischarge || "Austria", "", "", "Final Destination:", active.finalDestination || active.countryOfDestination || "Austria"],
      ["Country of Goods:", active.countryOfOrigin || "INDIA", "", "", "Country of Final Destination:", active.countryOfDestination || "Austria"],
      ["Marks & Nos:", (active.marksAndNos || "Marks : F4C\nAustria").replace(/\n/g, ' / '), "", "", "No. and Kind of Packing:", active.noAndKindOfPackages || `${active.totalPallets || 10} Pallet`],
      [],
      [active.poTitle || 'PO DETAILS', active.invoiceNo],
      [],
      isExcelPoptop
        ? ["ITEM #", "HSN CODE", "DESCRIPTION OF ITEM", "SPECIFICATION", "PRODUCT CODE", "SIZES In cm", "PALLET DIMENSION", "WEIGHT (KG)", "CBM (m³)", "QTY OF PALLET", "RUG PCS", "TOTAL IN METER", "PRICE / PCS", "TOTAL AMOUNT"]
        : ["ITEM #", "HSN CODE", "DESCRIPTION OF ITEM", "SPECIFICATION", "PRODUCT CODE", "SIZES In cm", "PALLET DIMENSION", "WEIGHT (KG)", "CBM (m³)", "QTY IN pcs", "TOTAL IN METER", "SQ MTR PRICE", "TOTAL AMOUNT"]
    ];

    // Add line items
    active.items.forEach((item) => {
      const cbmVal = calculateLineItemCbm(item);
      if (isExcelPoptop) {
        sheetData.push([
          item.itemNo,
          item.hsnCode || '57050039',
          item.description,
          item.specification,
          item.productCode,
          item.sizesCm,
          item.palletDimension || '-',
          item.weightKg || 0,
          cbmVal.toFixed(3),
          item.qtyPallet || 1,
          item.qtyPcs,
          item.totalSqMeter,
          item.pcsPrice || item.sqMtrPrice,
          item.totalAmount
        ]);
      } else {
        sheetData.push([
          item.itemNo,
          item.hsnCode || '57050039',
          item.description,
          item.specification,
          item.productCode,
          item.sizesCm,
          item.palletDimension || '-',
          item.weightKg || 0,
          cbmVal.toFixed(3),
          item.qtyPcs,
          item.totalSqMeter,
          item.sqMtrPrice,
          item.totalAmount
        ]);
      }
    });

    const totalCbmExcel = (active.totalCbm || active.items.reduce((s, it) => s + calculateLineItemCbm(it), 0)).toFixed(3);

    // Add summary rows
    sheetData.push([]);
    if (isExcelPoptop) {
      sheetData.push(["", "", "", "", "", "TOTAL PALLETS:", active.totalPallets || 1, "TOTAL RUG PCS:", active.totalPcs, "TOTAL SQ MTR:", active.totalSqMeter, "TOTAL CBM:", `${totalCbmExcel} m³`]);
      sheetData.push(["", "", "", "", "", "", "", "", "", "Sub Total:", active.subTotal]);
      sheetData.push(["", "", "", "", "", "", "", "", "", "Sub Total in Words:", convertAmountToWords(active.subTotal, active.currency)]);
      sheetData.push(["", "", "", "", "", "", "", "", "", `Per Pallet Charge (${active.totalPallets || 1} Pallets @ $${active.perPalletCharge || 50}):`, (active.totalPallets || 1) * (active.perPalletCharge || 50)]);
      sheetData.push(["", "", "", "", "", "", "", "", "", `${active.advancePercent}% Advance:`, active.advanceAmount]);
      sheetData.push(["", "", "", "", "", "", "", "", "", "Total Amount:", active.totalAmount]);
      sheetData.push(["", "", "", "", "", "", "", "", "", "Total in Words:", convertAmountToWords(active.totalAmount, active.currency)]);
    } else {
      sheetData.push(["", "", "", "", "", "TOTAL PCS:", active.totalPcs, "TOTAL SQ MTR:", active.totalSqMeter, "TOTAL CBM:", `${totalCbmExcel} m³`]);
      sheetData.push(["", "", "", "", "", "", "", "", "Sub Total:", active.subTotal]);
      sheetData.push(["", "", "", "", "", "", "", "", "Sub Total in Words:", convertAmountToWords(active.subTotal, active.currency)]);
      sheetData.push(["", "", "", "", "", "", "", "", `IGST ${active.igstPercent}%:`, active.igstAmount]);
      sheetData.push(["", "", "", "", "", "", "", "", `${active.advancePercent}% Advance:`, active.advanceAmount]);
      sheetData.push(["", "", "", "", "", "", "", "", "Total Amount:", active.totalAmount]);
      sheetData.push(["", "", "", "", "", "", "", "", "Total in Words:", convertAmountToWords(active.totalAmount, active.currency)]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Commercial Invoice");

    const safeName = (active.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `F4C_Export_Invoice_${safeName}.xlsx`);
  };

  // Trigger Print / PDF Generation for 3 Main Export Documents (Commercial Invoice, Packing List, REX Certificate)
  const handlePrintDocument = (targetDocType?: 'COMMERCIAL' | 'PACKING_LIST' | 'REX_CERTIFICATE') => {
    const docType = targetDocType || activeDocTab;
    const active = isEditing ? editForm : selectedInvoice;
    if (!active) return;

    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    let docTitle = 'Commercial Invoice';
    if (docType === 'PACKING_LIST') docTitle = 'Detailed Packing List';
    if (docType === 'REX_CERTIFICATE') docTitle = 'Certificate of Origin (REX Scheme)';

    let contentHtml = '';

    if (docType === 'COMMERCIAL') {
      const isPrintPoptop = active.invoiceType === 'POPTOP' || (active.buyerName || '').toLowerCase().includes('poptop');

      contentHtml = `
        <div style="padding:15px; font-family: system-ui, sans-serif; color:#0f172a;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
            <div>
              <h1 style="margin:0; font-size:20px; font-weight:900; text-transform:uppercase;">${(active.documentTitle || 'Commercial Invoice').toUpperCase()}</h1>
              <p style="margin:2px 0 0 0; font-size:11px; font-weight:bold; color:#E4002B;">FOUR CORNERS CARPETS — INTERNATIONAL EXPORT INVOICE</p>
            </div>
            <div style="text-align:right; font-size:11px; font-family:monospace;">
              <p style="margin:0;"><strong>INVOICE NO:</strong> ${active.invoiceNo}</p>
              <p style="margin:2px 0 0 0;"><strong>DATE:</strong> ${active.date}</p>
              <p style="margin:2px 0 0 0;"><strong>CURRENCY:</strong> ${active.currency || 'EUR (€)'}</p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border:2px solid #000; padding:10px; margin-bottom:12px; font-size:10.5px;">
            <div>
              <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">EXPORTER / SUPPLIER</h3>
              <p style="margin:2px 0;"><strong>${active.supplierName}</strong></p>
              <p style="margin:2px 0;">${active.supplierAddress}</p>
              <p style="margin:2px 0;"><strong>GSTIN:</strong> ${active.supplierGstin} | <strong>IEC:</strong> ${active.supplierIecNo || exporterMaster.iecNo}</p>
              ${!isPrintPoptop ? `<p style="margin:2px 0;"><strong>REX NO:</strong> ${active.supplierRexNo || exporterMaster.rexNo}</p>` : ''}
              <p style="margin:2px 0;"><strong>SWIFT CODE:</strong> ${active.supplierSwiftCode || exporterMaster.swiftCode} ${!isPrintPoptop ? `| <strong>AD CODE:</strong> ${active.supplierAdCode || exporterMaster.adCode}` : ''}</p>
            </div>
            <div>
              <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">CONSIGNEE / BUYER</h3>
              <p style="margin:2px 0;"><strong style="color:#0f172a;">${active.buyerName}</strong></p>
              <p style="margin:2px 0;">${active.buyerAddress}</p>
              ${!isPrintPoptop ? `
                <p style="margin:2px 0;"><strong>TEL:</strong> ${active.buyerPhone}</p>
                <p style="margin:2px 0;"><strong>EORI / VAT:</strong> ${active.buyerEoriVat || active.buyerGstin}</p>
                <p style="margin:2px 0;"><strong>EMAIL:</strong> ${active.buyerEmail}</p>
                <p style="margin:2px 0;"><strong>ATTN:</strong> ${active.buyerAttention}</p>
              ` : ''}
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10px; font-family:Arial, Helvetica, sans-serif; border:1.5px solid #000;" border="1" cellpadding="5">
            <tbody>
              <tr>
                <td style="width:50%; text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Pre-Carried by</span>
                  <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.preCarriedBy || 'BY TRUCK'}</strong>
                </td>
                <td style="width:50%; text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Place of Receipt Pre-Carrier</span>
                  <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.placeOfReceiptByPreCarrier || 'BHADOHI'}</strong>
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Vessel/Flight No.</span>
                  <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.vesselFlightNo || 'BY SEA'}</strong>
                </td>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Shipment From</span>
                  <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.shipmentFrom || active.portOfLoading || 'MUMBAI'}</strong>
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Port of Discharge</span>
                  <strong style="font-size:11.5px; font-weight:bold;">${active.portOfDischarge || 'Austria'}</strong>
                </td>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Final Destination</span>
                  <strong style="font-size:11.5px; font-weight:bold;">${active.finalDestination || active.countryOfDestination || 'Austria'}</strong>
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Country of Goods</span>
                  <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.countryOfOrigin || 'INDIA'}</strong>
                </td>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                  <span style="font-size:10px; color:#475569; display:block;">Country of Final Destination</span>
                  <strong style="font-size:11.5px; font-weight:bold;">${active.countryOfDestination || 'Austria'}</strong>
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000; vertical-align:middle;">
                  <div style="font-size:11.5px; font-weight:bold; line-height:1.3;">${(active.marksAndNos || 'Marks : F4C\nAustria').replace(/\n/g, '<br/>')}</div>
                </td>
                <td style="text-align:center; padding:5px 8px; border:1px solid #000; vertical-align:middle;">
                  <span style="font-size:10px; color:#475569; display:block;">No. and Kind of Packing</span>
                  <strong style="font-size:12px; font-weight:bold;">${active.noAndKindOfPackages || `${active.totalPallets || 10} Pallet`}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5px; text-align:left;" border="1" cellpadding="4">
            <thead style="background:#0f172a; color:#fff; font-family:monospace; text-align:center;">
              <tr>
                <th>ITEM #</th>
                <th>HSN CODE</th>
                <th>DESCRIPTION OF GOODS</th>
                <th>SIZES (CM)</th>
                ${isPrintPoptop ? `
                  <th>QTY OF PALLET</th>
                  <th>RUG PCS</th>
                ` : `
                  <th>QTY (PCS)</th>
                `}
                <th>TOTAL M²</th>
                <th style="text-align:right;">${isPrintPoptop ? 'RATE / PCS' : 'RATE / M²'}</th>
                <th style="text-align:right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${active.items.map(it => {
                const itemRate = isPrintPoptop ? (it.pcsPrice !== undefined && it.pcsPrice > 0 ? it.pcsPrice : it.sqMtrPrice) : it.sqMtrPrice;
                return `
                <tr>
                  <td style="font-family:monospace; font-weight:bold; text-align:center;">${it.itemNo}</td>
                  <td style="font-family:monospace; font-weight:bold; text-align:center; color:#1e40af;">${it.hsnCode || '57050039'}</td>
                  <td>${it.description} (${it.specification || '100% Wool'})</td>
                  <td style="text-align:center; font-family:monospace;">${it.sizesCm}</td>
                  ${isPrintPoptop ? `
                    <td style="text-align:center; font-weight:bold;">${it.qtyPallet || 1} Pallet</td>
                    <td style="text-align:center; font-weight:bold;">${it.qtyPcs} pcs</td>
                  ` : `
                    <td style="text-align:center; font-weight:bold;">${it.qtyPcs}</td>
                  `}
                  <td style="text-align:center;">${it.totalSqMeter}</td>
                  <td style="text-align:right;">${itemRate}</td>
                  <td style="text-align:right; font-weight:bold;">${formatINR(it.totalAmount)}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:10px;">
            <div style="width:55%; background:#f8fafc; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:10px;">
              <p style="margin:0 0 3px 0;"><strong>BANK PAYMENT DETAILS:</strong></p>
              <p style="margin:2px 0;">BANK: ICICI BANK LTD | BRANCH: BHADOHI</p>
              <p style="margin:2px 0;">A/C NO: 039005001234 | IFSC: ICIC0000390</p>
              <p style="margin:2px 0;">SWIFT: ICICINBBCTS ${!isPrintPoptop ? '| AD CODE: 6390001234567' : ''}</p>
              <p style="margin:4px 0 0 0;"><strong>DELIVERY & PAYMENT TERMS:</strong> ${active.notes || 'Palletized delivery. Payment against shipping documents.'}</p>
            </div>
            <div style="width:40%; font-size:10.5px; font-family:monospace;">
              ${isPrintPoptop ? `
                <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>TOTAL PALLETS:</span><strong>${active.totalPallets || 1} Pallets</strong></div>
                <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>TOTAL RUG PCS:</span><strong>${active.totalPcs} pcs</strong></div>
              ` : `
                <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>TOTAL PCS:</span><strong>${active.totalPcs} pcs</strong></div>
              `}
              <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>TOTAL AREA:</span><strong>${active.totalSqMeter} m²</strong></div>
              <div style="display:flex; justify-content:space-between; padding:2px 0; color:#065f46;"><span>TOTAL CBM:</span><strong>${(active.totalCbm || active.items.reduce((s, it) => s + calculateLineItemCbm(it), 0)).toFixed(3)} m³</strong></div>
              <div style="display:flex; justify-content:space-between; padding:2px 0; border-top:1px solid #ccc;"><span>SUB TOTAL:</span><strong>${formatINR(active.subTotal)}</strong></div>
              <div style="font-size:9.5px; font-style:italic; color:#334155; padding:2px 0 4px 0; border-bottom:1px dashed #cbd5e1;"><strong>Sub Total in Words:</strong> ${convertAmountToWords(active.subTotal, active.currency)}</div>
              ${isPrintPoptop ? `
                <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>PER PALLET CHARGE (${active.totalPallets || 1} Pallets @ $${active.perPalletCharge || 50}/pallet):</span><strong>${formatINR((active.totalPallets || 1) * (active.perPalletCharge || 50))}</strong></div>
              ` : `
                <div style="display:flex; justify-content:space-between; padding:2px 0;"><span>IGST (${active.igstPercent}%):</span><strong>${formatINR(active.igstAmount)}</strong></div>
              `}
              <div style="display:flex; justify-content:space-between; padding:5px; background:#0f172a; color:#fff; font-size:12px; font-weight:bold; margin-top:4px;"><span>TOTAL AMOUNT:</span><span>${formatINR(active.totalAmount)}</span></div>
              <div style="font-size:9.5px; font-style:italic; color:#0f172a; padding:3px 2px; font-weight:bold;"><strong>Total in Words:</strong> ${convertAmountToWords(active.totalAmount, active.currency)}</div>
            </div>
          </div>

          <div style="margin-top:20px; display:flex; justify-content:flex-end; text-align:center;">
            <div style="min-width:180px; font-size:10px;">
              <p style="margin:0; font-weight:bold; border-bottom:1px solid #000; padding-bottom:2px;">FOR FOUR CORNERS CARPETS</p>
              <div style="padding:4px 0;"><img src="https://i.postimg.cc/tJynktRD/f4C-stamp.png" style="height:50px;" /></div>
              <p style="margin:0; font-family:monospace; font-size:9.5px;">AUTHORIZED SIGNATORY</p>
            </div>
          </div>
        </div>
      `;
    } else if (docType === 'PACKING_LIST') {
      const isPrintPoptop = active.invoiceType === 'POPTOP' || (active.buyerName || '').toLowerCase().includes('poptop');

      if (isPrintPoptop) {
        const totalCbmVal = (active.totalCbm || active.items.reduce((s, it) => s + calculateLineItemCbm(it), 0)).toFixed(3);
        contentHtml = `
          <div style="padding:15px; font-family: system-ui, sans-serif; color:#0f172a;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
              <div>
                <h1 style="margin:0; font-size:20px; font-weight:900; text-transform:uppercase;">PACKING LIST</h1>
                <p style="margin:2px 0 0 0; font-size:11px; font-weight:bold; color:#0f172a;">FOUR CORNERS CARPETS — EXPORT PACKING DEPT.</p>
              </div>
              <div style="text-align:right; font-size:11px; font-family:monospace;">
                <p style="margin:0;"><strong>INVOICE REF:</strong> ${active.invoiceNo}</p>
                <p style="margin:2px 0 0 0;"><strong>DATE:</strong> ${active.date}</p>
                <p style="margin:2px 0 0 0;"><strong>PO REF:</strong> ${active.poNumber}</p>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border:2px solid #000; padding:10px; margin-bottom:12px; font-size:10.5px;">
              <div>
                <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">EXPORTER / SHIPPER</h3>
                <p style="margin:2px 0;"><strong>${active.supplierName}</strong></p>
                <p style="margin:2px 0;">${active.supplierAddress}</p>
              </div>
              <div>
                <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">CONSIGNEE / RECEIVER</h3>
                <p style="margin:2px 0;"><strong style="color:#0f172a;">${active.buyerName}</strong></p>
                <p style="margin:2px 0;">${active.buyerAddress}</p>
              </div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10px; font-family:Arial, Helvetica, sans-serif; border:1.5px solid #000;" border="1" cellpadding="5">
              <tbody>
                <tr>
                  <td style="width:50%; text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Pre-Carried by</span>
                    <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.preCarriedBy || 'BY TRUCK'}</strong>
                  </td>
                  <td style="width:50%; text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Place of Receipt Pre-Carrier</span>
                    <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.placeOfReceiptByPreCarrier || 'BHADOHI'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Vessel/Flight No.</span>
                    <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.vesselFlightNo || 'BY SEA'}</strong>
                  </td>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Shipment From</span>
                    <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.shipmentFrom || active.portOfLoading || 'MUMBAI'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Port of Discharge</span>
                    <strong style="font-size:11.5px; font-weight:bold;">${active.portOfDischarge || 'Austria'}</strong>
                  </td>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Final Destination</span>
                    <strong style="font-size:11.5px; font-weight:bold;">${active.finalDestination || active.countryOfDestination || 'Austria'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Country of Goods</span>
                    <strong style="font-size:11.5px; text-transform:uppercase; font-family:monospace;">${active.countryOfOrigin || 'INDIA'}</strong>
                  </td>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000;">
                    <span style="font-size:10px; color:#475569; display:block;">Country of Final Destination</span>
                    <strong style="font-size:11.5px; font-weight:bold;">${active.countryOfDestination || 'Austria'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000; vertical-align:middle;">
                    <div style="font-size:11.5px; font-weight:bold; line-height:1.3;">${(active.marksAndNos || 'Marks : F4C\nAustria').replace(/\n/g, '<br/>')}</div>
                  </td>
                  <td style="text-align:center; padding:5px 8px; border:1px solid #000; vertical-align:middle;">
                    <span style="font-size:10px; color:#475569; display:block;">No. and Kind of Packing</span>
                    <strong style="font-size:12px; font-weight:bold;">${active.noAndKindOfPackages || `${active.totalPallets || 10} Pallet`}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5px; text-align:center;" border="1" cellpadding="5">
              <thead style="background:#0f172a; color:#fff; font-family:monospace;">
                <tr>
                  <th>ITEM #</th>
                  <th>DESCRIPTION OF GOODS</th>
                  <th>SPECIFICATION</th>
                  <th>PRODUCT CODE</th>
                  <th>SIZES (CM)</th>
                  <th>PALLET DIMENSION</th>
                  <th>WEIGHT (KG)</th>
                  <th>CBM (m³)</th>
                  <th>QTY OF PALLET</th>
                  <th>RUG PCS</th>
                  <th>TOTAL M²</th>
                </tr>
              </thead>
              <tbody>
                ${active.items.map((it) => `
                  <tr>
                    <td style="font-family:monospace; font-weight:bold;">${it.itemNo}</td>
                    <td style="text-align:left;">${it.description}</td>
                    <td>${it.specification || '-'}</td>
                    <td>${it.productCode || '-'}</td>
                    <td style="font-family:monospace;">${it.sizesCm}</td>
                    <td style="font-family:monospace;">${it.palletDimension || '-'}</td>
                    <td style="font-family:monospace;">${it.weightKg ? `${it.weightKg} kg` : '-'}</td>
                    <td style="font-family:monospace; font-weight:bold; color:#065f46;">${calculateLineItemCbm(it).toFixed(3)} m³</td>
                    <td style="font-weight:bold;">${it.qtyPallet || 1} Pallet</td>
                    <td style="font-weight:bold;">${it.qtyPcs} pcs</td>
                    <td>${it.totalSqMeter} m²</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot style="background:#f1f5f9; font-weight:bold; font-family:monospace;">
                <tr>
                  <td colspan="7" style="text-align:right;">TOTAL SHIPMENT SUMMARY:</td>
                  <td style="color:#065f46;">${totalCbmVal} m³</td>
                  <td>${active.totalPallets || 1} Pallets</td>
                  <td>${active.totalPcs} pcs</td>
                  <td>${active.totalSqMeter} m²</td>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
              <div style="font-size:10px; border:1px solid #ccc; padding:6px; border-radius:4px; background:#f8fafc; width:55%;">
                <p style="margin:0 0 2px 0;"><strong>PACKING INFORMATION:</strong></p>
                <p style="margin:1px 0;">• Pallet Count: ${active.totalPallets || 1} Pallet(s) | Total Rug Pcs: ${active.totalPcs} pcs | Total Volume: ${totalCbmVal} CBM (m³).</p>
                <p style="margin:1px 0;">• Standard Palletized Export Packing as per Invoice Specifications.</p>
              </div>
              <div style="text-align:center; min-width:180px; font-size:10.5px;">
                <p style="margin:0; font-weight:bold; border-bottom:1px solid #000; padding-bottom:2px;">FOR FOUR CORNERS CARPETS</p>
                <div style="padding:4px 0;"><img src="https://i.postimg.cc/tJynktRD/f4C-stamp.png" style="height:50px;" /></div>
                <p style="margin:0; font-family:monospace; font-size:9.5px;">AUTHORIZED SIGNATORY</p>
              </div>
            </div>
          </div>
        `;
      } else {
        const totalNetWeight = active.items.reduce((sum, it) => sum + (it.netWeightKg || Math.round((it.totalSqMeter || 0) * 2.5)), 0);
        const totalGrossWeight = active.items.reduce((sum, it) => sum + (it.grossWeightKg || Math.round((it.totalSqMeter || 0) * 2.8)), 0);
        const totalCbm = active.items.reduce((sum, it) => sum + (it.cbmVolume || parseFloat(((it.totalSqMeter || 0) * 0.015).toFixed(3))), 0);

        contentHtml = `
          <div style="padding:15px; font-family: system-ui, sans-serif; color:#0f172a;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
              <div>
                <h1 style="margin:0; font-size:20px; font-weight:900; text-transform:uppercase;">DETAILED PACKING LIST</h1>
                <p style="margin:2px 0 0 0; font-size:11px; font-weight:bold; color:#1e40af;">FOUR CORNERS CARPETS — EXPORT PACKING & WEIGHT DEPT.</p>
              </div>
              <div style="text-align:right; font-size:11px; font-family:monospace;">
                <p style="margin:0;"><strong>INVOICE REF:</strong> ${active.invoiceNo}</p>
                <p style="margin:2px 0 0 0;"><strong>DATE:</strong> ${active.date}</p>
                <p style="margin:2px 0 0 0;"><strong>PO REF:</strong> ${active.poNumber}</p>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border:2px solid #000; padding:10px; margin-bottom:12px; font-size:10.5px;">
              <div>
                <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">SHIPPER / EXPORTER</h3>
                <p style="margin:2px 0;"><strong>${active.supplierName}</strong></p>
                <p style="margin:2px 0;">${active.supplierAddress}</p>
              </div>
              <div>
                <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">CONSIGNEE / RECEIVER</h3>
                <p style="margin:2px 0;"><strong style="color:#1e40af;">${active.buyerName}</strong></p>
                <p style="margin:2px 0;">${active.buyerAddress}</p>
                ${!isPrintPoptop ? `<p style="margin:2px 0;"><strong>EORI / VAT:</strong> ${active.buyerEoriVat || active.buyerGstin}</p>` : ''}
              </div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5px; text-align:center;" border="1" cellpadding="5">
              <thead style="background:#1e3a8a; color:#fff; font-family:monospace;">
                <tr>
                  <th>BALE / CARTON #</th>
                  <th>ROLL #</th>
                  <th>DESCRIPTION OF GOODS</th>
                  <th>SIZES (CM)</th>
                  <th>QTY (PCS)</th>
                  <th>NET WEIGHT (KG)</th>
                  <th>GROSS WEIGHT (KG)</th>
                  <th>PALLET DIMENSIONS</th>
                  <th>VOLUME (CBM m³)</th>
                </tr>
              </thead>
              <tbody>
                ${active.items.map((it, idx) => {
                  const net = it.netWeightKg || Math.round((it.totalSqMeter || 0) * 2.5);
                  const gross = it.grossWeightKg || Math.round((it.totalSqMeter || 0) * 2.8);
                  const cbm = it.cbmVolume || parseFloat(((it.totalSqMeter || 0) * 0.015).toFixed(3));
                  return `
                    <tr>
                      <td style="font-family:monospace; font-weight:bold; background:#eff6ff;">${it.cartonBaleNo || `Bale #${idx + 1}`}</td>
                      <td style="font-family:monospace;">${it.rollNo || `R-${idx + 1}`}</td>
                      <td style="text-align:left;">${it.description}</td>
                      <td style="font-family:monospace;">${it.sizesCm}</td>
                      <td style="font-weight:bold;">${it.qtyPcs}</td>
                      <td>${net} kg</td>
                      <td>${gross} kg</td>
                      <td style="font-family:monospace;">${it.palletDimension || '145x70x85 cm'}</td>
                      <td style="font-family:monospace; font-weight:bold;">${cbm} m³</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot style="background:#f1f5f9; font-weight:bold; font-family:monospace;">
                <tr>
                  <td colspan="4" style="text-align:right;">TOTAL SHIPMENT SUMMARY:</td>
                  <td>${active.totalPcs} pcs</td>
                  <td>${totalNetWeight} kg</td>
                  <td>${totalGrossWeight} kg</td>
                  <td>-</td>
                  <td>${totalCbm.toFixed(3)} m³</td>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
              <div style="font-size:10px; border:1px solid #ccc; padding:6px; border-radius:4px; background:#f8fafc; width:50%;">
                <p style="margin:0 0 2px 0;"><strong>PACKING SPECIFICATIONS:</strong></p>
                <p style="margin:1px 0;">• Packed in heavy-duty HDPE waterproof rolls / bales with corner protection.</p>
                <p style="margin:1px 0;">• Palletized & shrink-wrapped for safe container transit to EU/Sweden ports.</p>
              </div>
              <div style="text-align:center; min-width:180px; font-size:10.5px;">
                <p style="margin:0; font-weight:bold; border-bottom:1px solid #000; padding-bottom:2px;">PACKING & DESPATCH DESK</p>
                <div style="padding:4px 0;"><img src="https://i.postimg.cc/tJynktRD/f4C-stamp.png" style="height:50px;" /></div>
                <p style="margin:0; font-family:monospace; font-size:9.5px;">AUTHORIZED SIGNATORY</p>
              </div>
            </div>
          </div>
        `;
      }
    } else if (docType === 'REX_CERTIFICATE') {
      const totalNetWeight = active.items.reduce((sum, it) => sum + (it.netWeightKg || Math.round((it.totalSqMeter || 0) * 2.5)), 0);
      const totalGrossWeight = active.items.reduce((sum, it) => sum + (it.grossWeightKg || Math.round((it.totalSqMeter || 0) * 2.8)), 0);

      contentHtml = `
        <div style="padding:15px; font-family: system-ui, sans-serif; color:#0f172a;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
            <div>
              <h1 style="margin:0; font-size:18px; font-weight:900; text-transform:uppercase; color:#d97706;">CERTIFICATE OF ORIGIN (REX SCHEME)</h1>
              <p style="margin:2px 0 0 0; font-size:10.5px; font-weight:bold; color:#000;">EU GSP & SWEDEN PREFERENTIAL TARIFF DECLARATION</p>
            </div>
            <div style="text-align:right; font-size:10.5px; font-family:monospace;">
              <p style="margin:0;"><strong>REX REG NO:</strong> ${exporterMaster.rexNo}</p>
              <p style="margin:2px 0 0 0;"><strong>INVOICE NO:</strong> ${active.invoiceNo}</p>
              <p style="margin:2px 0 0 0;"><strong>DATE:</strong> ${active.date}</p>
            </div>
          </div>

          <div style="background:#fef3c7; border:2px solid #b45309; padding:10px; border-radius:6px; margin-bottom:12px; font-size:10.5px; font-family:serif;">
            <h4 style="margin:0 0 4px 0; font-family:sans-serif; text-transform:uppercase; font-size:11px; color:#78350f;">STATEMENT ON ORIGIN (EU REGISTERED EXPORTER SYSTEM - REX)</h4>
            <p style="margin:0; line-height:1.4;">
              <em>"The exporter of the products covered by this document (Registered Exporter Number: <strong>${exporterMaster.rexNo}</strong>) declares that, except where otherwise clearly indicated, these products are of <strong>Indian preferential origin</strong> according to the rules of origin of the Generalized System of Preferences (GSP) of the European Union / REX Scheme for imports into <strong>Austria / Sweden / EU Member States</strong>."</em>
            </p>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border:1.5px solid #000; padding:8px; margin-bottom:12px; font-size:10.5px;">
            <div>
              <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">REGISTERED EXPORTER (INDIA)</h3>
              <p style="margin:2px 0;"><strong>${active.supplierName}</strong></p>
              <p style="margin:2px 0;">${active.supplierAddress}</p>
              <p style="margin:2px 0;"><strong>IEC NO:</strong> ${exporterMaster.iecNo} | <strong>GSTIN:</strong> ${active.supplierGstin}</p>
              <p style="margin:2px 0;"><strong>REX REGISTRATION:</strong> ${exporterMaster.rexNo}</p>
            </div>
            <div>
              <h3 style="margin:0 0 4px 0; text-transform:uppercase; font-size:11px; border-bottom:1px solid #ccc; font-weight:bold;">CONSIGNEE / IMPORTER (AUSTRIA / SWEDEN)</h3>
              <p style="margin:2px 0;"><strong style="color:#b45309;">${active.buyerName}</strong></p>
              <p style="margin:2px 0;">${active.buyerAddress}</p>
              <p style="margin:2px 0;"><strong>EORI NUMBER:</strong> ATEORI100012345 | <strong>VAT:</strong> ${active.buyerGstin}</p>
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5px; text-align:left;" border="1" cellpadding="5">
            <thead style="background:#78350f; color:#fff; font-family:monospace; text-align:center;">
              <tr>
                <th>ITEM #</th>
                <th>HSN CODE</th>
                <th>DESCRIPTION OF COVERED GOODS</th>
                <th>PREFERENTIAL ORIGIN</th>
                <th>TOTAL QTY</th>
                <th>NET WEIGHT</th>
                <th>GROSS WEIGHT</th>
              </tr>
            </thead>
            <tbody>
              ${active.items.map(it => `
                <tr>
                  <td style="font-family:monospace; font-weight:bold; text-align:center;">${it.itemNo}</td>
                  <td style="font-family:monospace; font-weight:bold; text-align:center; color:#b45309;">${it.hsnCode || '57050039'}</td>
                  <td>${it.description} — Handcrafted Carpets & Rugs</td>
                  <td style="font-weight:bold; text-align:center;">INDIA (GSP PREFERENTIAL)</td>
                  <td style="font-weight:bold; text-align:center;">${it.qtyPcs} pcs</td>
                  <td style="text-align:center;">${it.netWeightKg || Math.round((it.totalSqMeter || 0) * 2.5)} kg</td>
                  <td style="text-align:center;">${it.grossWeightKg || Math.round((it.totalSqMeter || 0) * 2.8)} kg</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot style="background:#fef3c7; font-weight:bold; font-family:monospace;">
              <tr>
                <td colspan="4" style="text-align:right;">TOTAL DECLARATION:</td>
                <td style="text-align:center;">${active.totalPcs} pcs</td>
                <td style="text-align:center;">${totalNetWeight} kg</td>
                <td style="text-align:center;">${totalGrossWeight} kg</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="font-size:10px; border:1px solid #ccc; padding:6px; border-radius:4px; width:50%; background:#f8fafc;">
              <p style="margin:0 0 2px 0;"><strong>DECLARATION PLACE & DATE:</strong></p>
              <p style="margin:1px 0;">PLACE OF ISSUE: BHADOHI, UTTAR PRADESH, INDIA</p>
              <p style="margin:1px 0;">DATE OF ISSUE: ${active.date}</p>
            </div>
            <div style="text-align:center; min-width:180px; font-size:10.5px;">
              <p style="margin:0; font-weight:bold; border-bottom:1px solid #000; padding-bottom:2px;">REGISTERED EXPORTER STAMP & SIGNATURE</p>
              <div style="padding:4px 0;"><img src="https://i.postimg.cc/tJynktRD/f4C-stamp.png" style="height:50px;" /></div>
              <p style="margin:0; font-family:monospace; font-size:9.5px;">AUTHORIZED PROPRIETOR</p>
            </div>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle} - ${active.invoiceNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 10px; background: #fff; color: #0f172a; }
          </style>
        </head>
        <body>
          ${contentHtml}
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

  const filteredInvoices = invoices.filter(inv => 
    (inv.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.poTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  Aiyara INVOICE &amp; DISPATCH Module
                </h2>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider">
                  ADMIN
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Fully Editable
                </span>
              </div>
              <p className="text-[11px] text-red-100 font-sans">
                Official Performa Invoice &amp; Dispatch Module • Real-Time PO Reconciliation &amp; Extra Pcs Highlighting
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

            {/* Master Records Modal Button */}
            <button
              onClick={() => setIsMasterRecordsModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border border-indigo-400"
              title="View/Edit Master Records for Consignee (Poptop GmbH) & Exporter (Four Corners Carpets)"
            >
              <Building2 className="w-3.5 h-3.5 text-white" />
              <span>Master Records</span>
            </button>

            {/* Create Poptop Invoice Button */}
            <button
              onClick={handleCreatePoptopInvoice}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border border-amber-300"
              title="Create Dedicated Poptop GmbH Invoice (Per Pcs & Pallet Charge Format)"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-amber-950" />
              <span>Poptop Invoice</span>
            </button>

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
                onClick={() => handlePrintDocument(activeDocTab)}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                title="Print Active Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}

            {/* Download PDF Button */}
            {activeDoc && (
              <button
                onClick={() => handlePrintDocument('COMMERCIAL')}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-amber-300"
                title="Download Commercial Invoice as PDF"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Invoice PDF</span>
              </button>
            )}

            {/* Download Packing List Button */}
            {activeDoc && (
              <button
                onClick={() => handlePrintDocument('PACKING_LIST')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-blue-500"
                title="Download Packing List as PDF"
              >
                <Box className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Packing List</span>
              </button>
            )}

            {/* Download Certificate of Origin Button */}
            {activeDoc && (
              <button
                onClick={() => handlePrintDocument('REX_CERTIFICATE')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-amber-400"
                title="Download Certificate of Origin (REX Scheme) as PDF"
              >
                <Globe className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">REX Certificate</span>
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
                
                {/* Export Document Tabs Switcher (1-Click Generation for Sweden / EU) */}
                <div className="bg-slate-900 text-white p-2 rounded-2xl shadow-md flex flex-wrap items-center justify-between print:hidden gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                    <button
                      onClick={() => setActiveDocTab('COMMERCIAL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        activeDocTab === 'COMMERCIAL'
                          ? 'bg-[#E4002B] text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>1. Commercial Invoice</span>
                    </button>

                    <button
                      onClick={() => setActiveDocTab('PACKING_LIST')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        activeDocTab === 'PACKING_LIST'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>2. Detailed Packing List</span>
                    </button>

                    <button
                      onClick={() => setActiveDocTab('REX_CERTIFICATE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        activeDocTab === 'REX_CERTIFICATE'
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>3. Certificate of Origin (REX Scheme)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing && matchingPo && (
                      <button
                        onClick={handleResetToPoDefaults}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Reset line items to original PO defaults"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset to PO Defaults</span>
                      </button>
                    )}

                    {isEditing && (
                      <button
                        onClick={handleApplyMasterRecordsToForm}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Fill Consignee (Poptop GmbH) & Exporter Master records"
                      >
                        <Building2 className="w-3 h-3" />
                        <span>Apply Masters</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode Switcher Bar */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-300 flex flex-wrap items-center justify-between print:hidden gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      Active PO: <strong className="text-slate-900">{activeDoc.invoiceNo}</strong>
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

                    {/* Invoice Format Selector (Standard vs Poptop) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing && editForm) {
                            updateFormTotals(editForm.items, 5, editForm.advancePercent, 'STANDARD');
                          } else if (activeDoc) {
                            const updated: AiyaraInvoice = { ...activeDoc, invoiceType: 'STANDARD', priceMode: 'PER_SQM' };
                            setSelectedInvoice(updated);
                            saveAiyaraInvoiceToFirestore(updated);
                          }
                          setToastMessage({ type: 'success', text: 'Switched to Standard Export Invoice Format.' });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg transition cursor-pointer ${
                          (isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) !== 'POPTOP'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing && editForm) {
                            updateFormTotals(editForm.items, 0, editForm.advancePercent, 'POPTOP');
                          } else if (activeDoc) {
                            const updated: AiyaraInvoice = { 
                              ...activeDoc, 
                              invoiceType: 'POPTOP', 
                              priceMode: 'PER_PCS', 
                              currency: 'USD ($)',
                              igstPercent: 0,
                              igstAmount: 0
                            };
                            setSelectedInvoice(updated);
                            saveAiyaraInvoiceToFirestore(updated);
                          }
                          setToastMessage({ type: 'success', text: 'Switched to Poptop Invoice Format (USD $, Price Per Pcs, Pallet Charges).' });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          (isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP'
                            ? 'bg-amber-400 text-slate-950 shadow-2xs'
                            : 'text-slate-600 hover:text-amber-700'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Poptop Format</span>
                      </button>
                    </div>

                    {/* Currency Selector (USD $, EUR €, INR ₹) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                      <span className="text-[10px] font-mono font-bold text-slate-600 pl-1">Currency:</span>
                      <select
                        value={(isEditing ? editForm?.currency : activeDoc?.currency) || 'USD ($)'}
                        onChange={(e) => {
                          const newCurr = e.target.value;
                          if (isEditing && editForm) {
                            setEditForm({ ...editForm, currency: newCurr });
                          } else if (activeDoc) {
                            const updated = { ...activeDoc, currency: newCurr };
                            setSelectedInvoice(updated);
                            saveAiyaraInvoiceToFirestore(updated);
                          }
                          setToastMessage({ type: 'success', text: `Currency changed to ${newCurr}` });
                        }}
                        className="text-[10px] font-bold font-mono bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 cursor-pointer focus:outline-none"
                      >
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="INR (₹)">INR (₹)</option>
                      </select>
                    </div>
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
                    <div className="text-center sm:text-right space-y-1">
                      <div className="flex flex-col items-center sm:items-end gap-1">
                        <div className="flex items-center gap-1.5 print:hidden">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Document Title:</span>
                          <select
                            value={['Performa Invoice', 'Tax Invoice', 'Commercial Invoice', 'Proforma Invoice'].includes((isEditing ? editForm?.documentTitle : activeDoc?.documentTitle) || 'Performa Invoice') ? ((isEditing ? editForm?.documentTitle : activeDoc?.documentTitle) || 'Performa Invoice') : 'Custom'}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val !== 'Custom') {
                                if (isEditing && editForm) {
                                  setEditForm({ ...editForm, documentTitle: val });
                                } else if (activeDoc) {
                                  const updated = { ...activeDoc, documentTitle: val };
                                  setSelectedInvoice(updated);
                                  await saveAiyaraInvoiceToFirestore(updated);
                                }
                                setToastMessage({ type: 'success', text: `Header Title set to ${val}` });
                              }
                            }}
                            className="px-2 py-0.5 border border-slate-300 rounded font-serif font-black text-xs bg-white text-slate-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="Performa Invoice">Performa Invoice</option>
                            <option value="Proforma Invoice">Proforma Invoice</option>
                            <option value="Tax Invoice">Tax Invoice</option>
                            <option value="Commercial Invoice">Commercial Invoice</option>
                            <option value="Custom">Custom Text...</option>
                          </select>
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.documentTitle || 'Performa Invoice'}
                            onChange={(e) => setEditForm({ ...editForm, documentTitle: e.target.value })}
                            placeholder="Header Title (e.g. Tax Invoice / Performa Invoice)"
                            className="px-2 py-0.5 border-2 border-slate-900 rounded font-serif font-black text-sm text-center sm:text-right uppercase tracking-wider bg-white text-slate-900 w-full sm:w-64 focus:outline-none"
                          />
                        ) : (
                          <h1 className="text-lg md:text-xl font-black uppercase tracking-widest text-slate-900 font-serif">
                            {activeDoc.documentTitle || 'Performa Invoice'}
                          </h1>
                        )}
                      </div>
                      <span className="text-[11px] font-bold font-mono text-slate-800 block">
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
                              value={editForm.supplierGstin || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierGstin: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierGstin}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">IEC: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierIecNo || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierIecNo: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierIecNo || 'AJTPD8099G'}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="font-bold">REX NO: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierRexNo || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierRexNo: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierRexNo || 'INREX123456789'}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">Contact: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierContact || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierContact: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierContact}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="font-bold">SWIFT: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierSwiftCode || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierSwiftCode: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierSwiftCode || 'ICICINBBCTS'}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">AD CODE: </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.supplierAdCode || ''}
                              onChange={(e) => setEditForm({ ...editForm, supplierAdCode: e.target.value })}
                              className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                            />
                          ) : (
                            <span className="font-mono">{activeDoc.supplierAdCode || '6390001234567'}</span>
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
                            <span className="block font-mono font-bold text-slate-900">IFSC: {activeDoc.supplierIfsc}</span>
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
                          <strong className="text-xs uppercase block text-slate-900 font-black">
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

                      {/* Consignee details conditional fields: Poptop format hides GST, EORI/VAT, Email, Phone, Attention */}
                      {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) ? null : (
                        <>
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
                        </>
                      )}
                    </div>

                  </div>

                  {/* Shipping & Transport Details Grid (Matching Export & Poptop Standards) */}
                  <div className="mb-4 border-2 border-slate-900 rounded-lg overflow-hidden shadow-xs bg-white">
                    <div className="bg-slate-900 text-white text-[11px] font-mono font-bold px-3 py-1.5 flex items-center justify-between uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        <span>Shipping & Transport Details</span>
                      </div>
                      <span className="text-[9.5px] text-slate-300 font-sans normal-case">Logistics & Customs Clearance Grid</span>
                    </div>

                    <div className="divide-y divide-slate-900 text-xs">
                      {/* Row 1: Pre-Carried by | Place of Receipt Pre-Carrier */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Pre-Carried by</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.preCarriedBy ?? 'BY TRUCK'}
                              onChange={(e) => setEditForm({ ...editForm, preCarriedBy: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs bg-white text-slate-950 uppercase"
                            />
                          ) : (
                            <strong className="font-mono text-slate-950 uppercase text-xs">
                              {activeDoc.preCarriedBy || 'BY TRUCK'}
                            </strong>
                          )}
                        </div>
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Place of Receipt Pre-Carrier</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.placeOfReceiptByPreCarrier ?? 'BHADOHI'}
                              onChange={(e) => setEditForm({ ...editForm, placeOfReceiptByPreCarrier: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs bg-white text-slate-950 uppercase"
                            />
                          ) : (
                            <strong className="font-mono text-slate-950 uppercase text-xs">
                              {activeDoc.placeOfReceiptByPreCarrier || 'BHADOHI'}
                            </strong>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Vessel/Flight No. | Shipment From */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Vessel/Flight No.</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.vesselFlightNo ?? 'BY SEA'}
                              onChange={(e) => setEditForm({ ...editForm, vesselFlightNo: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs bg-white text-slate-950 uppercase"
                            />
                          ) : (
                            <strong className="font-mono text-slate-950 uppercase text-xs">
                              {activeDoc.vesselFlightNo || 'BY SEA'}
                            </strong>
                          )}
                        </div>
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Shipment From</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.shipmentFrom ?? (editForm.portOfLoading || 'MUMBAI')}
                              onChange={(e) => setEditForm({ ...editForm, shipmentFrom: e.target.value, portOfLoading: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs bg-white text-slate-950 uppercase"
                            />
                          ) : (
                            <strong className="font-mono text-slate-950 uppercase text-xs">
                              {activeDoc.shipmentFrom || activeDoc.portOfLoading || 'MUMBAI'}
                            </strong>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Port of Discharge | Final Destination */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Port of Discharge</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.portOfDischarge ?? 'Austria'}
                              onChange={(e) => setEditForm({ ...editForm, portOfDischarge: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-950"
                            />
                          ) : (
                            <strong className="text-slate-950 text-xs">
                              {activeDoc.portOfDischarge || 'Austria'}
                            </strong>
                          )}
                        </div>
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Final Destination</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.finalDestination ?? (editForm.countryOfDestination || 'Austria')}
                              onChange={(e) => setEditForm({ ...editForm, finalDestination: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-950"
                            />
                          ) : (
                            <strong className="text-slate-950 text-xs">
                              {activeDoc.finalDestination || activeDoc.countryOfDestination || 'Austria'}
                            </strong>
                          )}
                        </div>
                      </div>

                      {/* Row 4: Country of Goods | Country of Final Destination */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Country of Goods</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.countryOfOrigin ?? 'INDIA'}
                              onChange={(e) => setEditForm({ ...editForm, countryOfOrigin: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs bg-white text-slate-950 uppercase"
                            />
                          ) : (
                            <strong className="font-mono text-slate-950 uppercase text-xs">
                              {activeDoc.countryOfOrigin || 'INDIA'}
                            </strong>
                          )}
                        </div>
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">Country of Final Destination</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.countryOfDestination ?? 'Austria'}
                              onChange={(e) => setEditForm({ ...editForm, countryOfDestination: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-950"
                            />
                          ) : (
                            <strong className="text-slate-950 text-xs">
                              {activeDoc.countryOfDestination || 'Austria'}
                            </strong>
                          )}
                        </div>
                      </div>

                      {/* Row 5: Marks & Nos | No. and Kind of Packing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          {isEditing ? (
                            <div className="w-full">
                              <span className="text-[10px] text-slate-600 block mb-0.5">Marks & Numbers</span>
                              <textarea
                                rows={2}
                                value={editForm.marksAndNos ?? 'Marks : F4C\nAustria'}
                                onChange={(e) => setEditForm({ ...editForm, marksAndNos: e.target.value })}
                                className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-950 font-mono"
                              />
                            </div>
                          ) : (
                            <div className="font-bold text-slate-950 text-xs whitespace-pre-line leading-tight">
                              {activeDoc.marksAndNos || 'Marks : F4C\nAustria'}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 text-center bg-white flex flex-col justify-center items-center">
                          <span className="text-[10px] text-slate-600 block mb-0.5">No. and Kind of Packing</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.noAndKindOfPackages ?? `${editForm.totalPallets || 10} Pallet`}
                              onChange={(e) => setEditForm({ ...editForm, noAndKindOfPackages: e.target.value })}
                              className="w-full text-center px-2 py-0.5 border border-slate-300 rounded font-bold text-xs bg-white text-slate-950"
                            />
                          ) : (
                            <strong className="text-slate-950 text-xs">
                              {activeDoc.noAndKindOfPackages || `${activeDoc.totalPallets || 10} Pallet`}
                            </strong>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yellow / Crimson PO Title Bar with PO Comparison Selector */}
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
                      <div className="flex items-center gap-2">
                        <span>{activeDoc.poTitle || 'PO DETAILS'}</span>
                        <span className="font-mono">{activeDoc.invoiceNo}</span>
                      </div>
                    )}

                    {/* PO Data Reconciliation Indicator, Meter Recalc & CBM Fetch */}
                    <div className="flex items-center gap-2 print:hidden">
                      {isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={handleRecalculateAllMeters}
                            className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-800 border border-blue-700 font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer shadow-sm transition"
                            title="Recalculate total square meters for all line items based on Sizes in CM & Qty"
                          >
                            <Calculator className="w-3 h-3 text-blue-700" />
                            <span>Recalc Meters</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleFetchFromCbm}
                            className="flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer shadow-sm transition"
                            title="Fetch & Calculate CBM data from Pallet Dimensions / Cargo"
                          >
                            <Box className="w-3 h-3 text-emerald-700" />
                            <span>Fetch CBM Data</span>
                          </button>
                        </>
                      )}
                      {productionData.length > 0 && (
                        <div className="flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded border border-slate-900 text-slate-900 text-[10px]">
                          <span className="font-mono font-bold text-slate-700">Compare PO:</span>
                          <select
                            value={selectedComparisonPo || matchingPo?.po || ''}
                            onChange={(e) => setSelectedComparisonPo(e.target.value)}
                            className="font-mono font-extrabold bg-transparent text-slate-950 cursor-pointer focus:outline-none"
                          >
                            {productionData.map(p => {
                              const pUnits = p.designs.reduce((s, d) => s + (Number(d.qty) || 0), 0);
                              return (
                                <option key={p.po} value={p.po}>
                                  PO #{p.po} ({pUnits} pcs)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
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
                          <th className="p-1.5 border-r border-slate-900">PALLET DIMENSION</th>
                          <th className="p-1.5 border-r border-slate-900">WEIGHT (Kg)</th>
                          <th className="p-1.5 border-r border-slate-900 w-20">CBM (m³)</th>
                          {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) ? (
                            <>
                              <th className="p-1.5 border-r border-slate-900 w-24">QTY OF PALLET</th>
                              <th className="p-1.5 border-r border-slate-900 w-20">RUG PCS</th>
                            </>
                          ) : (
                            <th className="p-1.5 border-r border-slate-900 w-24">QTY PCS</th>
                          )}
                          <th className="p-1.5 border-r border-slate-900">TOTAL METER</th>
                          <th className="p-1.5 border-r border-slate-900 text-right">
                            {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) ? 'PRICE / PCS' : 'SQ MTR PRICE'}
                          </th>
                          <th className="p-1.5 text-right">TOTAL</th>
                          {isEditing && <th className="p-1.5 print:hidden w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y border-slate-900 text-slate-900 font-sans">
                        {editForm.items.map((item, idx) => {
                          return (
                          <tr 
                            key={item.id || idx} 
                            className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                          >
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

                            {/* Pallet Dimension */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.palletDimension || ''}
                                  onChange={(e) => handleItemChange(idx, 'palletDimension', e.target.value)}
                                  placeholder="145x70x85"
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.palletDimension || '-'
                              )}
                            </td>

                            {/* Weight (Kg) */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={item.weightKg || ''}
                                  onChange={(e) => handleItemChange(idx, 'weightKg', Number(e.target.value))}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white"
                                />
                              ) : (
                                item.weightKg || '-'
                              )}
                            </td>

                            {/* CBM (m³) */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-900">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.001"
                                  value={item.cbmVolume !== undefined && item.cbmVolume > 0 ? item.cbmVolume : calculateLineItemCbm(item)}
                                  onChange={(e) => handleItemChange(idx, 'cbmVolume', Number(e.target.value))}
                                  className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] font-bold bg-white text-slate-900"
                                  title="CBM Volume (auto-calculated from Pallet Dimension)"
                                />
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-slate-800">
                                  {calculateLineItemCbm(item).toFixed(3)} m³
                                </span>
                              )}
                            </td>

                            {/* QTY of Pallet & Rug Pcs */}
                            {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) ? (
                              <>
                                {/* Qty of Pallet */}
                                <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-900">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.qtyPallet ?? 1}
                                      onChange={(e) => handleItemChange(idx, 'qtyPallet', Number(e.target.value))}
                                      className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] font-black bg-white text-slate-900"
                                      title="Number of Pallets"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-slate-900">
                                      {item.qtyPallet ?? 1} pallet
                                    </span>
                                  )}
                                </td>

                                {/* Rug Pcs */}
                                <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-900">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.qtyPcs}
                                      onChange={(e) => handleItemChange(idx, 'qtyPcs', Number(e.target.value))}
                                      className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] font-black bg-white text-slate-900"
                                      title="Total Rug Pieces"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-slate-900">
                                      {item.qtyPcs} pcs
                                    </span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-900">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qtyPcs}
                                    onChange={(e) => handleItemChange(idx, 'qtyPcs', Number(e.target.value))}
                                    className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] font-black bg-white text-slate-900"
                                  />
                                ) : (
                                  <span className="text-xs font-black text-slate-900">
                                    {item.qtyPcs} pcs
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Total in Meter */}
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-700">
                              {isEditing ? (
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.totalSqMeter}
                                    onChange={(e) => handleItemChange(idx, 'totalSqMeter', Number(e.target.value))}
                                    className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] font-bold bg-white text-slate-900"
                                    title="Total Square Meters for row"
                                  />
                                  {Number(item.qtyPcs) > 1 && (
                                    <span className="text-[8px] text-slate-500 font-normal">
                                      ({((Number(item.totalSqMeter) || 0) / (Number(item.qtyPcs) || 1)).toFixed(2)} m²/pc)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-slate-800">{item.totalSqMeter} m²</span>
                                  {Number(item.qtyPcs) > 1 && (
                                    <span className="text-[8px] text-slate-500 font-normal">
                                      ({((Number(item.totalSqMeter) || 0) / (Number(item.qtyPcs) || 1)).toFixed(2)} m²/pc)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Sq Mtr Price or Price / Pcs */}
                            <td className="p-1.5 border-r border-slate-900 text-right font-mono font-bold">
                              {(() => {
                                const isPoptop = (isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop');
                                const currentPrice = isPoptop ? (item.pcsPrice !== undefined && item.pcsPrice > 0 ? item.pcsPrice : item.sqMtrPrice) : item.sqMtrPrice;
                                return isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={currentPrice}
                                    onChange={(e) => handleItemChange(idx, isPoptop ? 'pcsPrice' : 'sqMtrPrice', Number(e.target.value))}
                                    className="w-full text-right px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px] bg-white font-bold text-slate-900"
                                  />
                                ) : (
                                  formatCurrency(currentPrice)
                                );
                              })()}
                            </td>

                            {/* Total */}
                            <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">
                              {formatCurrency(item.totalAmount)}
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
                          );
                        })}
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
                    
                    {/* Left: Total Pallets, Total Rug Pcs, Total Sq Meters & Total CBM */}
                    <div className="flex items-center space-x-6 border-b md:border-b-0 md:border-r border-slate-300 pr-6 pb-2 md:pb-0 w-full md:w-auto justify-between md:justify-start">
                      {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) && (
                        <div className="text-center">
                          <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">Total Pallets</span>
                          <strong className="text-sm font-mono font-black text-slate-900">
                            {(isEditing ? editForm.items.reduce((acc, it) => acc + (Number(it.qtyPallet) || 1), 0) : (activeDoc.totalPallets || 1))} Pallets
                          </strong>
                        </div>
                      )}
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">Total Rug Pcs</span>
                        <strong className="text-sm font-mono font-black text-slate-900">{(isEditing ? editForm.totalPcs : activeDoc.totalPcs)} pcs</strong>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">Total Sq Meter</span>
                        <strong className="text-sm font-mono font-black text-slate-900">{(isEditing ? editForm.totalSqMeter : activeDoc.totalSqMeter)} m²</strong>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] text-emerald-700 font-mono font-bold uppercase">Total CBM</span>
                        <strong className="text-sm font-mono font-black text-emerald-900">
                          {(isEditing
                            ? editForm.items.reduce((acc, it) => acc + calculateLineItemCbm(it), 0)
                            : (activeDoc.totalCbm || activeDoc.items.reduce((acc, it) => acc + calculateLineItemCbm(it), 0))
                          ).toFixed(3)} m³
                        </strong>
                      </div>
                    </div>

                    {/* Right: Sub Total, IGST / Pallet Charge, Advance, Total Amount */}
                    <div className="w-full md:w-88 space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-200">
                        <span className="font-bold text-slate-700">Sub Total</span>
                        <span className="font-extrabold">{formatINR(isEditing ? editForm.subTotal : activeDoc.subTotal)}</span>
                      </div>

                      {/* Sub Total Amount in Words */}
                      <div className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 font-sans leading-tight">
                        <span className="font-bold text-slate-500 uppercase text-[8.5px] tracking-wider block">Sub Total in Words:</span>
                        <span className="italic font-bold text-slate-800 break-words">
                          {convertAmountToWords(isEditing ? editForm.subTotal : activeDoc.subTotal, (isEditing ? editForm.currency : activeDoc.currency))}
                        </span>
                      </div>

                      {/* IGST or Per Pallet Charge depending on Poptop vs Standard */}
                      {((isEditing ? editForm?.invoiceType : activeDoc?.invoiceType) === 'POPTOP' || (activeDoc?.buyerName || '').toLowerCase().includes('poptop')) ? (
                        <div className="flex items-center justify-between py-0.5 border-b border-slate-200 text-slate-800">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900">Per Pallet Charge</span>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 font-mono">@ $</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.perPalletCharge ?? 50}
                                  onChange={(e) => updateFormTotals(editForm.items, 0, editForm.advancePercent, 'POPTOP', Number(e.target.value), editForm.totalPallets)}
                                  className="w-14 px-1 py-0.2 border border-slate-300 rounded text-center text-[10px] font-bold bg-white"
                                  title="Charge per Pallet"
                                />
                                <span className="text-[10px] text-slate-600 font-mono">/pallet</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">
                                ({(activeDoc.totalPallets || 1)} Pallets @ ${(activeDoc.perPalletCharge || 50)})
                              </span>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900">
                            {formatINR(((isEditing ? editForm.totalPallets : activeDoc.totalPallets) || 1) * ((isEditing ? editForm.perPalletCharge : activeDoc.perPalletCharge) || 50))}
                          </span>
                        </div>
                      ) : (
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
                              <span>{(isEditing ? editForm.igstPercent : activeDoc.igstPercent)}%</span>
                            )}
                          </div>
                          <span className="font-extrabold">{formatINR(isEditing ? editForm.igstAmount : activeDoc.igstAmount)}</span>
                        </div>
                      )}

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
                            <span>{(isEditing ? editForm.advancePercent : activeDoc.advancePercent)}%</span>
                          )}
                        </div>
                        <span className="font-extrabold">{formatINR(isEditing ? editForm.advanceAmount : activeDoc.advanceAmount)}</span>
                      </div>

                      <div className="flex justify-between py-1 bg-slate-900 text-white px-2 rounded font-black text-xs">
                        <span>Total Amount</span>
                        <span>{formatINR(isEditing ? editForm.totalAmount : activeDoc.totalAmount)}</span>
                      </div>

                      {/* Total Amount in Words */}
                      <div className="py-1 px-2 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-800 font-sans leading-tight mt-1">
                        <span className="font-bold text-slate-500 uppercase text-[8.5px] tracking-wider block">Total Amount in Words:</span>
                        <span className="italic font-extrabold text-slate-900 break-words">
                          {convertAmountToWords(isEditing ? editForm.totalAmount : activeDoc.totalAmount, (isEditing ? editForm.currency : activeDoc.currency))}
                        </span>
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

      {/* Master Records Configuration Modal */}
      {isMasterRecordsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 border border-slate-300 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2 text-indigo-700">
                <Building2 className="w-5 h-5" />
                <h3 className="text-base font-black uppercase font-mono tracking-wide text-slate-900">
                  Consignee &amp; Exporter Master Records
                </h3>
              </div>
              <button
                onClick={() => setIsMasterRecordsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Consignee Master (Poptop GmbH) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase font-mono text-[11px] text-indigo-800 flex items-center gap-1.5">
                  <span>🏢 Consignee Master (Austria / EU)</span>
                </h4>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Company Name:</label>
                  <input
                    type="text"
                    value={consigneeMaster.name}
                    onChange={(e) => setConsigneeMaster({ ...consigneeMaster, name: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Address:</label>
                  <textarea
                    rows={2}
                    value={consigneeMaster.address}
                    onChange={(e) => setConsigneeMaster({ ...consigneeMaster, address: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[10px] bg-white text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tel / Phone:</label>
                    <input
                      type="text"
                      value={consigneeMaster.phone}
                      onChange={(e) => setConsigneeMaster({ ...consigneeMaster, phone: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Email:</label>
                    <input
                      type="text"
                      value={consigneeMaster.email}
                      onChange={(e) => setConsigneeMaster({ ...consigneeMaster, email: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">EORI / VAT Number:</label>
                  <input
                    type="text"
                    value={consigneeMaster.eoriVat}
                    onChange={(e) => setConsigneeMaster({ ...consigneeMaster, eoriVat: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[10px] bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Attention / Contact Desk:</label>
                  <input
                    type="text"
                    value={consigneeMaster.attention}
                    onChange={(e) => setConsigneeMaster({ ...consigneeMaster, attention: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[10px] bg-white"
                  />
                </div>
              </div>

              {/* Exporter Master (Four Corners Carpets) */}
              <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase font-mono text-[11px] text-[#E4002B] flex items-center gap-1.5">
                  <span>📜 Exporter Master (Four Corners Carpets)</span>
                </h4>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Company Name:</label>
                  <input
                    type="text"
                    value={exporterMaster.name}
                    onChange={(e) => setExporterMaster({ ...exporterMaster, name: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Address:</label>
                  <textarea
                    rows={2}
                    value={exporterMaster.address}
                    onChange={(e) => setExporterMaster({ ...exporterMaster, address: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[10px] bg-white text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">GSTIN:</label>
                    <input
                      type="text"
                      value={exporterMaster.gstin}
                      onChange={(e) => setExporterMaster({ ...exporterMaster, gstin: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">IEC No:</label>
                    <input
                      type="text"
                      value={exporterMaster.iecNo}
                      onChange={(e) => setExporterMaster({ ...exporterMaster, iecNo: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">REX Scheme No:</label>
                    <input
                      type="text"
                      value={exporterMaster.rexNo}
                      onChange={(e) => setExporterMaster({ ...exporterMaster, rexNo: e.target.value })}
                      className="w-full px-1.5 py-1 border border-amber-300 rounded text-[10px] font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">SWIFT Code:</label>
                    <input
                      type="text"
                      value={exporterMaster.swiftCode}
                      onChange={(e) => setExporterMaster({ ...exporterMaster, swiftCode: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">AD Code:</label>
                    <input
                      type="text"
                      value={exporterMaster.adCode}
                      onChange={(e) => setExporterMaster({ ...exporterMaster, adCode: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Bank Name &amp; A/C:</label>
                    <input
                      type="text"
                      value={`${exporterMaster.bankName} ${exporterMaster.accountNo}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExporterMaster({ ...exporterMaster, bankName: val.split(' ')[0] || 'ICICI BANK LTD.', accountNo: val });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-300 rounded text-[10px] bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleApplyMasterRecordsToForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Apply to Current Form</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMasterRecordsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterRecords}
                  className="px-5 py-2 bg-[#E4002B] hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Masters Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiyaraInvoiceModal;

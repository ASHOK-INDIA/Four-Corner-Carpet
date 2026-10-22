import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { PurchaseOrder, PPWRFile, PPWRFilesStore, ForecastComment, CargoItem, SampleItem, ExportInvoice, WorkerSmsAlert, ManufacturerWorker, LedgerEntry, QcInspectionReport, VoiceRugItem } from '../types';

const PO_COLLECTION = 'purchase_orders';
const PPWR_COLLECTION = 'ppwr_files';
const COMMENTS_COLLECTION = 'forecast_comments';
const CARGO_COLLECTION = 'container_items';
const SAMPLE_ITEMS_COLLECTION = 'sample_items';
const EXPORT_INVOICES_COLLECTION = 'aiyara_invoices';
const WORKER_SMS_COLLECTION = 'worker_sms_alerts';
const WORKERS_COLLECTION = 'manufacturer_workers';
const LEDGER_COLLECTION = 'ledger_entries';
const QC_INSPECTIONS_COLLECTION = 'qc_inspections';
const LEADS_COLLECTION = 'generated_leads';
const VOICE_RUGS_COLLECTION = 'voice_rug_items';

/**
 * Save generated leads to Firestore
 */
export async function saveLeadsToFirestore(leads: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const lead of leads) {
      const leadRef = doc(collection(db, LEADS_COLLECTION), lead.id || `lead-${Date.now()}-${Math.random()}`);
      batch.set(leadRef, { ...lead, savedAt: new Date().toISOString() });
    }
    await batch.commit();
  } catch (error) {
    console.error('Error saving leads to Firestore:', error);
    throw error;
  }
}

/**
 * Fetch all saved leads from Firestore
 */
export async function fetchSavedLeadsFromFirestore(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching leads from Firestore:', error);
    return [];
  }
}

/**
 * Sanitize Firestore document IDs by replacing slashes or invalid characters
 */
function sanitizeDocId(id: string): string {
  return id.replace(/[\/\s#$[\]]/g, '_');
}

/**
 * Permanently purge any dummy or test PO documents from Firestore
 */
export async function purgeDummyPOsFromFirestore(): Promise<void> {
  try {
    const poSnap = await getDocs(collection(db, PO_COLLECTION));
    if (!poSnap.empty) {
      for (const docSnap of poSnap.docs) {
        const d = docSnap.data();
        const poNum = (d.po || docSnap.id).toLowerCase();
        const docId = docSnap.id.toLowerCase();
        if (
          poNum.includes('1001') ||
          poNum.includes('dummy') ||
          poNum.includes('sample') ||
          poNum.includes('test') ||
          docId.includes('1001') ||
          docId.includes('dummy') ||
          docId.includes('sample') ||
          docId.includes('test')
        ) {
          await deleteDoc(docSnap.ref);
        }
      }
    }
  } catch (e) {
    console.warn('Purge dummy POs error:', e);
  }
}

/**
 * Subscribe to real-time changes of Purchase Orders in Firestore.
 * Fetches and displays ONLY real records entered by Admin in the database.
 */
export function subscribePurchaseOrders(
  onUpdate: (data: PurchaseOrder[]) => void,
  onError?: (error: Error) => void
) {
  // Trigger async purge of legacy dummy POs
  purgeDummyPOsFromFirestore();

  const colRef = collection(db, PO_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const items: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const poNum = d.po || docSnap.id;
        
        // Exclude dummy/test POs
        const lowerPo = poNum.toLowerCase();
        const lowerDocId = docSnap.id.toLowerCase();
        if (
          lowerPo.includes('1001') ||
          lowerPo.includes('dummy') ||
          lowerPo.includes('sample') ||
          lowerPo.includes('test') ||
          lowerDocId.includes('1001') ||
          lowerDocId.includes('dummy') ||
          lowerDocId.includes('sample') ||
          lowerDocId.includes('test')
        ) {
          return;
        }

        items.push({
          po: poNum,
          appRef: d.appRef || '',
          estDate: d.estDate || '',
          notes: d.notes || '',
          shipmentMilestone: d.shipmentMilestone || '1. Packing',
          designs: Array.isArray(d.designs) ? d.designs : []
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Purchase Orders snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time changes of PPWR files in Firestore.
 * Fetches and displays ONLY documents entered by Admin.
 */
export function subscribePPWRFiles(
  onUpdate: (data: PPWRFilesStore) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, PPWR_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const store: PPWRFilesStore = {
        declaration: [],
        testReport: [],
        technicalDataSheet: []
      };
      if (snapshot.empty) {
        onUpdate(store);
        return;
      }
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const cat = d.category as keyof PPWRFilesStore;
        const file: PPWRFile = {
          id: docSnap.id,
          name: d.name || 'Untitled Document',
          type: d.type === 'EXCEL' ? 'EXCEL' : 'PDF',
          date: d.date || '',
          size: d.size || '',
          po: d.po || ''
        };
        if (store[cat]) {
          store[cat].push(file);
        }
      });
      onUpdate(store);
    },
    (err) => {
      console.error('Firestore PPWR files snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update an Admin-entered Purchase Order in Firestore
 */
export async function savePurchaseOrderToFirestore(po: PurchaseOrder): Promise<void> {
  const docId = sanitizeDocId(po.po);
  const docRef = doc(db, PO_COLLECTION, docId);
  await setDoc(docRef, {
    po: po.po,
    appRef: po.appRef,
    estDate: po.estDate,
    notes: po.notes || '',
    shipmentMilestone: po.shipmentMilestone || '1. Packing',
    designs: po.designs,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Update shipment milestone for a PO in Firestore
 */
export async function updateMilestoneInFirestore(poNumber: string, milestone: string): Promise<void> {
  const docId = sanitizeDocId(poNumber);
  const docRef = doc(db, PO_COLLECTION, docId);
  await setDoc(docRef, {
    shipmentMilestone: milestone,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Delete a Purchase Order from Firestore
 */
export async function deletePurchaseOrderFromFirestore(poNumber: string): Promise<void> {
  const docId = sanitizeDocId(poNumber);
  const docRef = doc(db, PO_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Save an Admin-uploaded PPWR Document in Firestore
 */
export async function savePPWRFileToFirestore(
  category: keyof PPWRFilesStore,
  file: PPWRFile
): Promise<void> {
  const docId = sanitizeDocId(file.id || `FILE_${Date.now()}`);
  const docRef = doc(db, PPWR_COLLECTION, docId);
  await setDoc(docRef, {
    id: docId,
    category: category,
    name: file.name,
    type: file.type,
    date: file.date,
    size: file.size,
    po: file.po,
    createdAt: new Date().toISOString()
  });
}

/**
 * Delete a PPWR Document from Firestore
 */
export async function deletePPWRFileFromFirestore(fileId: string): Promise<void> {
  const docId = sanitizeDocId(fileId);
  const docRef = doc(db, PPWR_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Clear all data from Firestore database
 */
export async function clearAllFirestoreData(): Promise<void> {
  // Clear all PO documents
  const poSnap = await getDocs(collection(db, PO_COLLECTION));
  if (!poSnap.empty) {
    const batch1 = writeBatch(db);
    poSnap.docs.forEach((d) => batch1.delete(d.ref));
    await batch1.commit();
  }

  // Clear all PPWR file documents
  const ppwrSnap = await getDocs(collection(db, PPWR_COLLECTION));
  if (!ppwrSnap.empty) {
    const batch2 = writeBatch(db);
    ppwrSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();
  }

  // Clear all forecast comments
  const commentsSnap = await getDocs(collection(db, COMMENTS_COLLECTION));
  if (!commentsSnap.empty) {
    const batch3 = writeBatch(db);
    commentsSnap.docs.forEach((d) => batch3.delete(d.ref));
    await batch3.commit();
  }

  // Clear all container items
  const cargoSnap = await getDocs(collection(db, CARGO_COLLECTION));
  if (!cargoSnap.empty) {
    const batch4 = writeBatch(db);
    cargoSnap.docs.forEach((d) => batch4.delete(d.ref));
    await batch4.commit();
  }
}

/**
 * Subscribe to real-time changes of Buyer Forecast Comments in Firestore
 */
export function subscribeForecastComments(
  onUpdate: (data: ForecastComment[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COMMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ForecastComment[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          text: d.text || '',
          createdAt: d.createdAt || ''
        });
      });
      // Sort chronologically descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Forecast Comments snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save a Buyer Forecast Comment in Firestore
 */
export async function saveForecastCommentToFirestore(text: string): Promise<void> {
  const id = `COMMENT_${Date.now()}`;
  const docRef = doc(db, COMMENTS_COLLECTION, id);
  await setDoc(docRef, {
    text: text,
    createdAt: new Date().toISOString()
  });
}

/**
 * Subscribe to real-time changes of Cargo Items in Firestore
 */
export function subscribeContainerItems(
  onUpdate: (data: CargoItem[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, CARGO_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CargoItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          name: d.name || 'Cargo Item',
          lengthCm: Number(d.lengthCm || 0),
          widthCm: Number(d.widthCm || 0),
          heightCm: Number(d.heightCm || 0),
          weightKg: Number(d.weightKg || 0),
          qty: Number(d.qty || 0),
          color: d.color || '#3B82F6',
          isCylinder: d.isCylinder ?? false,
          packageType: d.packageType || 'box',
          rugsPerPallet: d.rugsPerPallet ? Number(d.rugsPerPallet) : undefined
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Cargo Items snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a Cargo Item in Firestore
 */
export async function saveCargoItemToFirestore(item: CargoItem): Promise<void> {
  const docId = sanitizeDocId(item.id);
  const docRef = doc(db, CARGO_COLLECTION, docId);
  await setDoc(docRef, {
    id: item.id,
    name: item.name,
    lengthCm: item.lengthCm,
    widthCm: item.widthCm,
    heightCm: item.heightCm,
    weightKg: item.weightKg,
    qty: item.qty,
    color: item.color,
    isCylinder: item.isCylinder || false,
    packageType: item.packageType || 'box',
    ...(item.rugsPerPallet !== undefined && { rugsPerPallet: item.rugsPerPallet }),
    createdAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Delete a Cargo Item from Firestore
 */
export async function deleteCargoItemFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, CARGO_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to real-time changes of Sample Items in Firestore
 */
export function subscribeSampleItems(
  onUpdate: (data: SampleItem[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, SAMPLE_ITEMS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: SampleItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          title: d.title || 'Sample Item',
          imageUrl: d.imageUrl || '',
          description: d.description || '',
          createdAt: d.createdAt || new Date().toISOString()
        });
      });
      // Sort chronologically
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Sample Items snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a Sample Item in Firestore
 */
export async function saveSampleItemToFirestore(item: SampleItem): Promise<void> {
  const docId = sanitizeDocId(item.id);
  const docRef = doc(db, SAMPLE_ITEMS_COLLECTION, docId);
  await setDoc(docRef, {
    id: item.id,
    title: item.title,
    imageUrl: item.imageUrl,
    description: item.description || '',
    createdAt: item.createdAt || new Date().toISOString()
  }, { merge: true });
}

/**
 * Delete a Sample Item from Firestore
 */
export async function deleteSampleItemFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, SAMPLE_ITEMS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Default Export Invoice Templates from attached PDF
 */
export const UPDATED_PO_17_ITEMS_INVOICE: ExportInvoice = {
  id: 'aiyara-po-updated-17items',
  invoiceNo: 'PO # 1128405 (Updated 17 Items)',
  date: '13-10-2026',
  poNumber: '1128405',
  poTitle: 'Terra & Nordic Rugs PO (17 Items - 317 Pcs)',
  supplierName: 'FOUR CORNERS CARPETS',
  supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
  supplierGstin: '09AJTPD8099G1ZH',
  supplierContact: '8188887223',
  supplierAttention: 'Mr. Danish',
  supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
  supplierIfsc: 'AXISINBBA04',
  buyerName: 'Export Unit',
  buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
  buyerGstin: '26AAVCA3353L1Z6',
  buyerPhone: '9173722468',
  buyerEmail: 'sale@ourexport.in',
  buyerAttention: 'Mr. Om Prakash',
  currency: 'INR (₹)',
  invoiceType: 'Export',
  notes: '25 % Advance Paid Already & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
  items: [
    { id: 'item-up-1', itemNo: '458712', description: 'Terra Outdoor Rug Brown', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 150 cm', qtyPcs: 36, totalSqMeter: 40.5, sqMtrPrice: 1175, totalAmount: 47587.50 },
    { id: 'item-up-2', itemNo: '458713', description: 'Terra Outdoor Rug Brown', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 250 cm', qtyPcs: 36, totalSqMeter: 67.5, sqMtrPrice: 1175, totalAmount: 79312.50 },
    { id: 'item-up-3', itemNo: '458714', description: 'Terra Outdoor Rug Brown', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '180 x 270 cm', qtyPcs: 21, totalSqMeter: 102.06, sqMtrPrice: 1175, totalAmount: 119920.50 },
    { id: 'item-up-4', itemNo: '458715', description: 'Terra Outdoor Rug Green', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 150 cm', qtyPcs: 36, totalSqMeter: 40.5, sqMtrPrice: 1175, totalAmount: 47587.50 },
    { id: 'item-up-5', itemNo: '458716', description: 'Terra Outdoor Rug Green', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 250 cm', qtyPcs: 36, totalSqMeter: 67.5, sqMtrPrice: 1175, totalAmount: 79312.50 },
    { id: 'item-up-6', itemNo: '458717', description: 'Terra Outdoor Rug Green', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '180 x 270 cm', qtyPcs: 21, totalSqMeter: 102.06, sqMtrPrice: 1175, totalAmount: 119920.50 },
    { id: 'item-up-7', itemNo: '458718', description: 'Terra Outdoor Rug Beige', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 150 cm', qtyPcs: 36, totalSqMeter: 40.5, sqMtrPrice: 1175, totalAmount: 47587.50 },
    { id: 'item-up-8', itemNo: '458719', description: 'Terra Outdoor Rug Beige', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '75 x 250 cm', qtyPcs: 36, totalSqMeter: 67.5, sqMtrPrice: 1175, totalAmount: 79312.50 },
    { id: 'item-up-9', itemNo: '458720', description: 'Terra Outdoor Rug Beige', specification: '100% Pet Hand Woven', productCode: 'Hand Woven', sizesCm: '180 x 270 cm', qtyPcs: 21, totalSqMeter: 102.06, sqMtrPrice: 1175, totalAmount: 119920.50 },
    { id: 'item-up-10', itemNo: '391923', description: 'Nordic Plain Wool Rug Rust', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '250X350', qtyPcs: 4, totalSqMeter: 35, sqMtrPrice: 1033, totalAmount: 36155 },
    { id: 'item-up-11', itemNo: '391924', description: 'Nordic Plain Wool Rug Rust', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '300X400', qtyPcs: 4, totalSqMeter: 48, sqMtrPrice: 1033, totalAmount: 49584 },
    { id: 'item-up-12', itemNo: '391928', description: 'Nordic Plain Wool Rug Off-White', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '180X270', qtyPcs: 4, totalSqMeter: 19.44, sqMtrPrice: 1033, totalAmount: 20081.52 },
    { id: 'item-up-13', itemNo: '399793', description: 'Dotted Ullmatta', specification: '100% Wool Tufted', productCode: 'Natural', sizesCm: '60X90', qtyPcs: 4, totalSqMeter: 2.16, sqMtrPrice: 1033, totalAmount: 2231.28 },
    { id: 'item-up-14', itemNo: '439547', description: 'Nordic Plain Wool Rug Dark Brown', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '250X350', qtyPcs: 10, totalSqMeter: 87.5, sqMtrPrice: 1033, totalAmount: 90387.50 },
    { id: 'item-up-15', itemNo: '439548', description: 'Nordic Plain Wool Rug Dark Brown', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '300X400', qtyPcs: 4, totalSqMeter: 48, sqMtrPrice: 1033, totalAmount: 49584 },
    { id: 'item-up-16', itemNo: '439551', description: 'Nordic Plain Wool Rug Dusty Rose', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '300X400', qtyPcs: 4, totalSqMeter: 48, sqMtrPrice: 1033, totalAmount: 49584 },
    { id: 'item-up-17', itemNo: '421998', description: 'Nordic Plain Ullmatta Moss', specification: '100% Wool Tufted', productCode: 'Tufted', sizesCm: '250X350', qtyPcs: 4, totalSqMeter: 35, sqMtrPrice: 1033, totalAmount: 36155 }
  ],
  totalPcs: 317,
  totalSqMeter: 953.28,
  subTotal: 1074223.80,
  igstPercent: 5,
  igstAmount: 53711.19,
  advancePercent: 25,
  advanceAmount: 281983.75,
  totalAmount: 1127934.99,
  createdAt: '2026-10-13T10:30:00.000Z'
};

export const DEFAULT_EXPORT_INVOICES: ExportInvoice[] = [
  UPDATED_PO_17_ITEMS_INVOICE,
  {
    id: 'aiyara-po-1128405-1st',
    invoiceNo: 'PO # 1128405 (1st PO)',
    date: '17-07-2026',
    poNumber: '1128405',
    poTitle: '1st PO .....',
    supplierName: 'FOUR CORNERS CARPETS',
    supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
    supplierGstin: '09AJTPD8099G1ZH',
    supplierContact: '8188887223',
    supplierAttention: 'Mr. Danish',
    supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
    supplierIfsc: 'AXISINBBA04',
    buyerName: 'Export Unit',
    buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
    buyerGstin: '26AAVCA3353L1Z6',
    buyerPhone: '9173722468',
    buyerEmail: 'sale@ourexport.in',
    buyerAttention: 'Mr. Om Prakash',
    currency: 'INR (₹)',
    invoiceType: 'Export',
    notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
    items: [
      { id: 'item-1', itemNo: '391912', description: 'Checks Wool rug Gray', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 6, totalSqMeter: 72, sqMtrPrice: 1096, totalAmount: 78912 },
      { id: 'item-2', itemNo: '391920', description: 'Tulip Wool rug Dusty Pink', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 2, totalSqMeter: 17.5, sqMtrPrice: 1096, totalAmount: 19180 },
      { id: 'item-3', itemNo: '391921', description: 'Tulip Wool rug Dusty Pink', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 2, totalSqMeter: 24, sqMtrPrice: 1096, totalAmount: 26304 },
      { id: 'item-4', itemNo: '391923', description: 'Nordic Plain Wool rug Rust', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 8, totalSqMeter: 70, sqMtrPrice: 1096, totalAmount: 76720 },
      { id: 'item-5', itemNo: '391928', description: 'Nordic Plain Wool rug Off-White', specification: '100% Wool', productCode: 'Tufted', sizesCm: '180x270', qtyPcs: 6, totalSqMeter: 29.16, sqMtrPrice: 1033, totalAmount: 30122.28 },
      { id: 'item-6', itemNo: '391929', description: 'Nordic Plain Wool rug Off-White', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 2, totalSqMeter: 17.5, sqMtrPrice: 1033, totalAmount: 18077.50 },
      { id: 'item-7', itemNo: '391930', description: 'Nordic Plain Wool rug Off-White', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 8, totalSqMeter: 96, sqMtrPrice: 1033, totalAmount: 99168 },
      { id: 'item-8', itemNo: '399799', description: 'Shaggy Dark Beige', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '250x350', qtyPcs: 2, totalSqMeter: 17.5, sqMtrPrice: 1545, totalAmount: 27037.50 },
      { id: 'item-9', itemNo: '421987', description: 'Curve ullmatta', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '250x350', qtyPcs: 2, totalSqMeter: 17.5, sqMtrPrice: 1053, totalAmount: 18427.50 },
      { id: 'item-10', itemNo: '421988', description: 'Curve ullmatta', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '300x400', qtyPcs: 2, totalSqMeter: 24, sqMtrPrice: 1053, totalAmount: 25272 },
      { id: 'item-11', itemNo: '421999', description: 'Nordic Plain Ullmatta Moss', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '300x400', qtyPcs: 6, totalSqMeter: 72, sqMtrPrice: 1033, totalAmount: 74376 },
      { id: 'item-12', itemNo: '391924', description: 'Nordic Plain Wool Rug Rust', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '300x400', qtyPcs: 4, totalSqMeter: 48, sqMtrPrice: 1033, totalAmount: 49584 }
    ],
    totalPcs: 50,
    totalSqMeter: 505,
    subTotal: 543180.78,
    igstPercent: 5,
    igstAmount: 27159.04,
    advancePercent: 25,
    advanceAmount: 142584.75,
    totalAmount: 570339.82,
    createdAt: '2026-07-17T10:00:00.000Z'
  },
  {
    id: 'aiyara-po-1128405-2nd',
    invoiceNo: 'PO # 1128405 (2nd PO)',
    date: '17-07-2026',
    poNumber: '1128405',
    poTitle: 'Advance for below SKU PO # 1128405 2nd Po…',
    supplierName: 'FOUR CORNERS CARPETS',
    supplierAddress: 'WARD NO. 4 NEHARU NAGAR FATTUPUR NAI BAZAR, BHADOHI 221401, UTTAR PRADESH, INDIA',
    supplierGstin: '09AJTPD8099G1ZH',
    supplierContact: '8188887223',
    supplierAttention: 'Mr. Danish',
    supplierBankDetails: 'Axis Bank, Station Road., 922020057882560',
    supplierIfsc: 'AXISINBBA04',
    buyerName: 'Export Unit',
    buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
    buyerGstin: '26AAVCA3353L1Z6',
    buyerPhone: '9173722468',
    buyerEmail: 'sale@ourexport.in',
    buyerAttention: 'Mr. Om Prakash',
    currency: 'INR (₹)',
    invoiceType: 'Export',
    notes: '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
    items: [
      { id: 'item-201', itemNo: '454016', description: 'Field Wool Rug Natural', specification: '100% Wool', productCode: 'Hand Woven', sizesCm: '180x270', qtyPcs: 8, totalSqMeter: 39, sqMtrPrice: 1950, totalAmount: 75816 },
      { id: 'item-202', itemNo: '454017', description: 'Field Wool Rug Natural', specification: '100% Wool', productCode: 'Tufted', sizesCm: '200x300', qtyPcs: 10, totalSqMeter: 60, sqMtrPrice: 1950, totalAmount: 117000 },
      { id: 'item-203', itemNo: '454018', description: 'Loop Wool Rug Natural', specification: '100% Wool', productCode: 'Tufted', sizesCm: '180x270', qtyPcs: 8, totalSqMeter: 39, sqMtrPrice: 1850, totalAmount: 71928 },
      { id: 'item-204', itemNo: '454019', description: 'Loop Wool Rug Natural', specification: '100% Wool', productCode: 'Tufted', sizesCm: '200x300', qtyPcs: 10, totalSqMeter: 60, sqMtrPrice: 1850, totalAmount: 111000 },
      { id: 'item-205', itemNo: '454020', description: 'Nordic Plain Wool Rug Sage', specification: '100% Wool', productCode: 'Tufted', sizesCm: '180x270', qtyPcs: 8, totalSqMeter: 39, sqMtrPrice: 1055, totalAmount: 41018.40 },
      { id: 'item-206', itemNo: '454021', description: 'Nordic Plain Wool Rug Sage', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 10, totalSqMeter: 88, sqMtrPrice: 1055, totalAmount: 92312.50 },
      { id: 'item-207', itemNo: '454022', description: 'Nordic Plain Wool Rug Sage', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 5, totalSqMeter: 60, sqMtrPrice: 1055, totalAmount: 63300 },
      { id: 'item-208', itemNo: '454023', description: 'Nordic Plain Wool Rug Warm Sand', specification: '100% Wool', productCode: 'Tufted', sizesCm: '180x270', qtyPcs: 8, totalSqMeter: 39, sqMtrPrice: 1055, totalAmount: 41018.40 },
      { id: 'item-209', itemNo: '454024', description: 'Nordic Plain Wool Rug Warm Sand', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 10, totalSqMeter: 88, sqMtrPrice: 1055, totalAmount: 92312.50 },
      { id: 'item-210', itemNo: '454025', description: 'Nordic Plain Wool Rug Warm Sand', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 5, totalSqMeter: 60, sqMtrPrice: 1055, totalAmount: 63300 },
      { id: 'item-211', itemNo: '454026', description: 'Nordic Plain Wool Rug Dove', specification: '100% Wool', productCode: 'Tufted', sizesCm: '180x270', qtyPcs: 8, totalSqMeter: 39, sqMtrPrice: 1055, totalAmount: 41018.40 },
      { id: 'item-212', itemNo: '454027', description: 'Nordic Plain Wool Rug Dove', specification: '100% Wool', productCode: 'Tufted', sizesCm: '250x350', qtyPcs: 10, totalSqMeter: 88, sqMtrPrice: 1055, totalAmount: 92312.50 },
      { id: 'item-213', itemNo: '454028', description: 'Nordic Plain Wool Rug Dove', specification: '100% Wool', productCode: 'Tufted', sizesCm: '300x400', qtyPcs: 5, totalSqMeter: 60, sqMtrPrice: 1055, totalAmount: 63300 }
    ],
    totalPcs: 105,
    totalSqMeter: 757,
    subTotal: 965636.70,
    igstPercent: 5,
    igstAmount: 48281.84,
    advancePercent: 25,
    advanceAmount: 253479.63,
    totalAmount: 1013918.54,
    createdAt: '2026-07-17T11:00:00.000Z'
  }
];

/**
 * Purge dummy / template Export invoices from Firestore
 */
export async function purgeDummyExportInvoicesFromFirestore(): Promise<void> {
  try {
    const invSnap = await getDocs(collection(db, EXPORT_INVOICES_COLLECTION));
    if (!invSnap.empty) {
      for (const docSnap of invSnap.docs) {
        const docId = docSnap.id.toLowerCase();
        const d = docSnap.data();
        const invNo = (d.invoiceNo || '').toLowerCase();
        const poNum = (d.poNumber || '').toLowerCase();
        
        // Remove legacy dummy invoices
        if (
          docId === 'aiyara-po-1128405-1st' ||
          docId === 'aiyara-po-1128405-2nd' ||
          docId.includes('dummy') ||
          docId.includes('template') ||
          (invNo.includes('1128405') && !d.isUserUploaded && !d.updatedByUser)
        ) {
          await deleteDoc(docSnap.ref);
        }
      }
    }
  } catch (e) {
    console.warn('Purge dummy Export invoices error:', e);
  }
}

/**
 * Subscribe to real-time changes of Export Invoices in Firestore.
 * ONLY loads uploaded and user-saved invoices.
 */
export function subscribeExportInvoices(
  onUpdate: (data: ExportInvoice[]) => void,
  onError?: (error: Error) => void
) {
  // Purge any legacy dummy invoices on start
  purgeDummyExportInvoicesFromFirestore();

  const colRef = collection(db, EXPORT_INVOICES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const items: ExportInvoice[] = [];
      snapshot.forEach((docSnap) => {
        const docId = docSnap.id.toLowerCase();
        const d = docSnap.data() as ExportInvoice;
        const invNo = (d.invoiceNo || '').toLowerCase();

        // Skip dummy templates
        if (
          docId === 'aiyara-po-1128405-1st' ||
          docId === 'aiyara-po-1128405-2nd' ||
          docId.includes('dummy') ||
          docId.includes('template')
        ) {
          return;
        }

        items.push({
          ...d,
          id: docSnap.id
        });
      });
      // Sort by date or createdAt descending
      items.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Export Invoices snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update an Export Invoice in Firestore
 */
export async function saveExportInvoiceToFirestore(invoice: ExportInvoice): Promise<void> {
  const docId = sanitizeDocId(invoice.id || `aiyara_inv_${Date.now()}`);
  const docRef = doc(db, EXPORT_INVOICES_COLLECTION, docId);

  // Clean undefined values recursively and ensure robust defaults
  const cleanedItems = (invoice.items || []).map((item, idx) => ({
    id: item.id || `item-${Date.now()}-${idx}`,
    itemNo: item.itemNo ?? `${idx + 1}`,
    description: item.description ?? `Item ${idx + 1}`,
    specification: item.specification ?? '',
    productCode: item.productCode ?? '',
    sizesCm: item.sizesCm ?? '',
    qtyPallet: Number(item.qtyPallet ?? 1),
    qtyPcs: Number(item.qtyPcs) || 1,
    totalSqMeter: Number(item.totalSqMeter) || 0,
    sqMtrPrice: Number(item.sqMtrPrice) || 0,
    pcsPrice: Number(item.pcsPrice ?? 0),
    totalAmount: Number(item.totalAmount) || 0,
    palletDimension: item.palletDimension ?? '',
    cartonBaleNo: item.cartonBaleNo ?? `Bale ${idx + 1}`,
    rollNo: item.rollNo ?? `R-${idx + 1}`,
    netWeightKg: Number(item.netWeightKg ?? 0),
    grossWeightKg: Number(item.grossWeightKg ?? 0),
    cbmVolume: Number(item.cbmVolume ?? 0),
    hsnCode: item.hsnCode ?? '57050039',
    weightKg: Number(item.weightKg ?? 0),
  }));

  const cleanedInvoice = {
    id: docId,
    invoiceNo: invoice.invoiceNo ?? `PO # ${docId}`,
    poNumber: invoice.poNumber ?? '',
    poTitle: invoice.poTitle ?? '',
    documentTitle: invoice.documentTitle ?? 'Performa Invoice',
    date: invoice.date ?? new Date().toISOString().split('T')[0],
    supplierName: invoice.supplierName ?? 'FOUR CORNERS CARPETS',
    supplierAddress: invoice.supplierAddress ?? 'Main Road, Maryadpatti, Bhadohi - 221401, UP, INDIA',
    supplierGstin: invoice.supplierGstin ?? '09AABFF1234A1ZB',
    supplierContact: invoice.supplierContact ?? '+91 94152 25800',
    supplierAttention: invoice.supplierAttention ?? 'Exports Department',
    supplierBankDetails: invoice.supplierBankDetails ?? 'ICICI BANK LTD, A/C: 039005001234',
    supplierIfsc: invoice.supplierIfsc ?? 'ICIC0000390',
    supplierSwiftCode: invoice.supplierSwiftCode ?? 'ICICINBBCTS',
    supplierAdCode: invoice.supplierAdCode ?? '6390001234567',
    supplierIecNo: invoice.supplierIecNo ?? 'AJTPD8099G',
    supplierRexNo: invoice.supplierRexNo ?? 'INREX123456789',
    
    buyerName: invoice.buyerName ?? 'Poptop GmbH',
    buyerAddress: invoice.buyerAddress ?? 'Mühlbachgasse 18 B/4, 2514 Traiskirchen, Austria',
    buyerGstin: invoice.buyerGstin ?? 'ATU78280315',
    buyerEoriVat: invoice.buyerEoriVat ?? 'ATU78280315 / EORI: ATEORI100012345',
    buyerPhone: invoice.buyerPhone ?? '+4367763155993',
    buyerEmail: invoice.buyerEmail ?? 'office@poptop.at',
    buyerAttention: invoice.buyerAttention ?? 'Ashok / Import Desk',

    invoiceType: invoice.invoiceType ?? 'STANDARD',
    priceMode: invoice.priceMode ?? (invoice.invoiceType === 'POPTOP' ? 'PER_PCS' : 'PER_SQM'),
    perPalletCharge: Number(invoice.perPalletCharge ?? 0),
    totalPallets: Number(invoice.totalPallets ?? 0),
    pcsPerPallet: Number(invoice.pcsPerPallet ?? 10),

    currency: invoice.currency ?? (invoice.invoiceType === 'POPTOP' ? 'USD ($)' : 'USD ($)'),
    portOfLoading: invoice.portOfLoading ?? (invoice.invoiceType === 'POPTOP' ? 'MUMBAI' : 'Nhava Sheva / ICD Bhadohi'),
    portOfDischarge: invoice.portOfDischarge ?? (invoice.invoiceType === 'POPTOP' ? 'Austria' : 'Gothenburg / Hamburg / Vienna'),
    countryOfOrigin: invoice.countryOfOrigin ?? 'INDIA',
    countryOfDestination: invoice.countryOfDestination ?? (invoice.invoiceType === 'POPTOP' ? 'Austria' : 'SWEDEN / AUSTRIA / GERMANY'),
    termsOfPayment: invoice.termsOfPayment ?? '30 Days Net / L/C',
    termsOfDelivery: invoice.termsOfDelivery ?? 'FOB Nhava Sheva',

    // Shipping & Logistics Grid details
    preCarriedBy: invoice.preCarriedBy ?? 'BY TRUCK',
    placeOfReceiptByPreCarrier: invoice.placeOfReceiptByPreCarrier ?? 'BHADOHI',
    vesselFlightNo: invoice.vesselFlightNo ?? 'BY SEA',
    shipmentFrom: invoice.shipmentFrom ?? (invoice.invoiceType === 'POPTOP' ? 'MUMBAI' : (invoice.portOfLoading || 'MUMBAI')),
    finalDestination: invoice.finalDestination ?? (invoice.invoiceType === 'POPTOP' ? 'Austria' : (invoice.countryOfDestination || 'Austria')),
    marksAndNos: invoice.marksAndNos ?? 'Marks : F4C\nAustria',
    noAndKindOfPackages: invoice.noAndKindOfPackages ?? `${invoice.totalPallets || 10} Pallet`,

    igstPercent: Number(invoice.igstPercent ?? 5),
    igstAmount: Number(invoice.igstAmount ?? 0),
    advancePercent: Number(invoice.advancePercent ?? 25),
    advanceAmount: Number(invoice.advanceAmount ?? 0),
    subTotal: Number(invoice.subTotal ?? 0),
    totalPcs: Number(invoice.totalPcs ?? 0),
    totalSqMeter: Number(invoice.totalSqMeter ?? 0),
    totalNetWeightKg: Number(invoice.totalNetWeightKg ?? 0),
    totalGrossWeightKg: Number(invoice.totalGrossWeightKg ?? 0),
    totalCbm: Number(invoice.totalCbm ?? 0),
    totalAmount: Number(invoice.totalAmount ?? 0),
    notes: invoice.notes ?? '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
    items: cleanedItems,
    isUserUploaded: invoice.isUserUploaded ?? false,
    updatedByUser: true,
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(docRef, cleanedInvoice, { merge: true });
}

/**
 * Delete an Export Invoice from Firestore
 */
export async function deleteExportInvoiceFromFirestore(id: string): Promise<void> {
  try {
    const rawRef = doc(db, EXPORT_INVOICES_COLLECTION, id);
    await deleteDoc(rawRef);
  } catch (e) {
    console.warn('Direct deleteDoc failed:', e);
  }
  try {
    const docId = sanitizeDocId(id);
    if (docId !== id) {
      const docRef = doc(db, EXPORT_INVOICES_COLLECTION, docId);
      await deleteDoc(docRef);
    }
  } catch (e) {
    console.warn('Sanitized deleteDoc error:', e);
  }
}

// ==========================================
// WORKER SMS ALERTS & MANUFACTURER WORKERS
// ==========================================

export const DEFAULT_MANUFACTURER_WORKERS: ManufacturerWorker[] = [
  {
    id: 'wrk-1',
    name: 'Rameshwar Kumar',
    phone: '+91 98765 12345',
    role: 'Master Weaver & Tufting Lead',
    unit: 'Unit 1 - Bhadohi Weaving',
    activeOrdersCount: 3
  },
  {
    id: 'wrk-2',
    name: 'Suresh Chandra',
    phone: '+91 98123 45678',
    role: 'Yarn Dyeing Supervisor',
    unit: 'Colorway Dyeing Studio',
    activeOrdersCount: 2
  },
  {
    id: 'wrk-3',
    name: 'Mohammad Ansari',
    phone: '+91 97654 32109',
    role: 'Binding, Shearing & Washing Master',
    unit: 'Finishing & Washing Plant',
    activeOrdersCount: 4
  },
  {
    id: 'wrk-4',
    name: 'Pooja Sharma',
    phone: '+91 99887 76655',
    role: 'Final QA & EU Compliance Inspector',
    unit: 'Export QA Terminal A',
    activeOrdersCount: 1
  },
  {
    id: 'wrk-5',
    name: 'Vikram Singh',
    phone: '+91 91234 56789',
    role: 'Palletizing & Crate Packing Specialist',
    unit: 'Cargo Dispatch Dock',
    activeOrdersCount: 2
  }
];

export const DEFAULT_WORKER_SMS_ALERTS: WorkerSmsAlert[] = [
  {
    id: 'sms-1',
    poNumber: '1128405',
    workerName: 'Rameshwar Kumar',
    workerPhone: '+91 98765 12345',
    workerRole: 'Master Weaver & Tufting Lead',
    stage: 'Weaving & Tufting',
    message: 'URGENT: PO #1128405 Yarn batch approved. Please start weaving on Loom #4 immediately.',
    status: 'DELIVERED',
    sentAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    sentBy: 'Production Manager'
  },
  {
    id: 'sms-2',
    poNumber: '1128408',
    workerName: 'Suresh Chandra',
    workerPhone: '+91 98123 45678',
    workerRole: 'Yarn Dyeing Supervisor',
    stage: 'Yarn Dyeing',
    message: 'ALERT: PO #1128408 Pantone color #18-0201 TCX matched. Start wool dyeing batch for 120 Pcs.',
    status: 'DELIVERED',
    sentAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    sentBy: 'Admin'
  }
];

/**
 * Subscribe to real-time Worker SMS Alerts from Firestore
 */
export function subscribeWorkerSmsAlerts(
  onUpdate: (alerts: WorkerSmsAlert[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, WORKER_SMS_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default alerts if empty
        try {
          const batch = writeBatch(db);
          DEFAULT_WORKER_SMS_ALERTS.forEach((alert) => {
            const docRef = doc(db, WORKER_SMS_COLLECTION, alert.id);
            batch.set(docRef, alert);
          });
          await batch.commit();
        } catch (e) {
          console.warn('Could not seed default SMS alerts:', e);
        }
        onUpdate(DEFAULT_WORKER_SMS_ALERTS);
        return;
      }

      const items: WorkerSmsAlert[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as WorkerSmsAlert;
        items.push({
          ...d,
          id: docSnap.id
        });
      });
      items.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Worker SMS Alerts snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Worker SMS Alert to Firestore
 */
export async function saveWorkerSmsAlertToFirestore(alert: WorkerSmsAlert): Promise<void> {
  const docId = sanitizeDocId(alert.id || `sms_${Date.now()}`);
  const docRef = doc(db, WORKER_SMS_COLLECTION, docId);
  await setDoc(docRef, {
    ...alert,
    id: docId
  }, { merge: true });
}

/**
 * Delete Worker SMS Alert from Firestore
 */
export async function deleteWorkerSmsAlertFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, WORKER_SMS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to Manufacturer Workers from Firestore
 */
export function subscribeManufacturerWorkers(
  onUpdate: (workers: ManufacturerWorker[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, WORKERS_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const items: ManufacturerWorker[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as ManufacturerWorker;
        items.push({
          ...d,
          id: docSnap.id
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Manufacturer Workers snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Manufacturer Worker to Firestore
 */
export async function saveManufacturerWorkerToFirestore(worker: ManufacturerWorker): Promise<void> {
  const docId = sanitizeDocId(worker.id || `wrk_${Date.now()}`);
  const docRef = doc(db, WORKERS_COLLECTION, docId);
  await setDoc(docRef, {
    ...worker,
    id: docId
  }, { merge: true });
}

const DEFAULT_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'led-1',
    date: '21-01-2026',
    voucherNo: 'VCH-001',
    partyName: 'Export Unit',
    partyType: 'SUPPLIER',
    transactionType: 'CREDIT',
    particulars: 'Advance by RTGS',
    poReference: 'PO# 1123966',
    amount: 205045.59,
    paymentMode: 'BANK_TRANSFER',
    createdAt: new Date().toISOString()
  },
  {
    id: 'led-2',
    date: '06-03-2026',
    voucherNo: 'VCH-002',
    partyName: 'Export House MANUFACTURING PRIVATE LIMITED',
    partyType: 'SUPPLIER',
    transactionType: 'CREDIT',
    particulars: 'Advance by RTGS',
    poReference: 'PO# 1124286',
    amount: 195489.98,
    paymentMode: 'BANK_TRANSFER',
    createdAt: new Date().toISOString()
  },
  {
    id: 'led-3',
    date: '18-04-2026',
    voucherNo: 'VCH-003',
    partyName: 'Export House MANUFACTURING PRIVATE LIMITED',
    partyType: 'SUPPLIER',
    transactionType: 'CREDIT',
    particulars: 'Advance by RTGS',
    poReference: 'PO# 1125567',
    amount: 110107.74,
    paymentMode: 'BANK_TRANSFER',
    createdAt: new Date().toISOString()
  },
  {
    id: 'led-4',
    date: '26-03-2026',
    voucherNo: 'VCH-004',
    partyName: 'Export House MANUFACTURING PRIVATE LIMITED',
    partyType: 'SUPPLIER',
    transactionType: 'DEBIT',
    particulars: 'Invoice against Purchase Orders',
    poReference: 'PO # 1123966, PO# 1124286, PO # 1125567',
    amount: 2064184.16,
    paymentMode: 'CREDIT',
    createdAt: new Date().toISOString()
  },
  {
    id: 'led-5',
    date: '02-03-2026',
    voucherNo: 'VCH-005',
    partyName: 'Export House MANUFACTURING PRIVATE LIMITED',
    partyType: 'SUPPLIER',
    transactionType: 'DEBIT',
    particulars: 'Photosample development',
    poReference: 'Photosample',
    amount: 50175.00,
    paymentMode: 'BANK_TRANSFER',
    createdAt: new Date().toISOString()
  }
];


/**
 * Subscribe to Ledger Entries from Firestore
 */
export function subscribeLedgerEntries(
  onUpdate: (entries: LedgerEntry[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, LEDGER_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          DEFAULT_LEDGER_ENTRIES.forEach((entry) => {
            const docRef = doc(db, LEDGER_COLLECTION, entry.id);
            batch.set(docRef, entry);
          });
          await batch.commit();
        } catch (e) {
          console.warn('Could not seed default ledger entries:', e);
        }
        onUpdate(DEFAULT_LEDGER_ENTRIES);
        return;
      }

      const items: LedgerEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as LedgerEntry;
        items.push({
          ...d,
          id: docSnap.id
        });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore Ledger Entries snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Ledger Entry to Firestore
 */
export async function saveLedgerEntryToFirestore(entry: LedgerEntry): Promise<void> {
  const docId = sanitizeDocId(entry.id || `led_${Date.now()}`);
  const docRef = doc(db, LEDGER_COLLECTION, docId);
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(entry)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }
  cleanData.id = docId;
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Delete Ledger Entry from Firestore
 */
export async function deleteLedgerEntryFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, LEDGER_COLLECTION, docId);
  await deleteDoc(docRef);
}



export const DEFAULT_QC_REPORTS: QcInspectionReport[] = [
  {
    id: 'qc_poptop_1128405',
    poNumber: '1128405',
    buyerName: 'poptop Handels GmbH',
    inspectionDate: '2025-05-18',
    inspectorName: 'Sanjay Kumar (Senior QC Auditor)',
    inspectionStage: 'PRE_SHIPMENT',
    aqlStandard: 'AQL 2.5 Major / 4.0 Minor (ISO 2859-1)',
    totalLotPieces: 320,
    samplePiecesChecked: 32,
    moisturePercent: 8.4,
    pileHeightMm: 12.0,
    weightPerSqMtrGsm: 2450,
    overallGrade: 'PASS',
    minorDefectsCount: 1,
    majorDefectsCount: 0,
    criticalDefectsCount: 0,
    certificateNo: 'QC-FCC-2025-0589',
    verifiedBy: 'Ashok Maurya (Factory Quality Head)',
    inspectorRemarks: 'All 32 inspected rugs conform to poptop approved master samples. Zero shedding, perfect latex cure. Moisture 8.4% well below 12% ceiling. Pallets wrapped with 200 gauge polythene, heavy edge protectors, and desiccant gel bags.',
    palletCondition: 'EXCELLENT',
    cornerProtectorsPresent: true,
    strappingTensionOk: true,
    isLockedApproved: true,
    createdAt: '2025-05-18T14:30:00.000Z',
    checks: [
      { id: 'c1', title: 'Length & Width Tolerance', category: 'DIMENSIONS', standard: '±1.0% Max variance', status: 'PASS', remarks: '200x300cm actual: 200.2 x 299.8cm' },
      { id: 'c2', title: 'Corner Diagonal Squareness', category: 'DIMENSIONS', standard: 'Diagonal diff < 1.5 cm', status: 'PASS', remarks: '0.6 cm difference' },
      { id: 'c3', title: 'Pile Height & Density', category: 'WEAVE', standard: '12.0 mm ± 1 mm, dense tufting', status: 'PASS', remarks: 'Uniform 12.1 mm' },
      { id: 'c4', title: 'Color Shading vs Approved Master', category: 'COLOR', standard: 'Color Match Grade 4-5', status: 'PASS', remarks: '100% matched to master swatch' },
      { id: 'c5', title: 'Secondary Latex Backing Cure', category: 'BACKING', standard: 'High adhesion, zero chalking', status: 'PASS', remarks: 'Natural latex cured properly' },
      { id: 'c6', title: 'Edge Binding / Serging Stitches', category: 'FINISHING', standard: 'Heavy thread, zero skips', status: 'PASS', remarks: 'Neat double needle serging' },
      { id: 'c7', title: 'Moisture Content Meter Check', category: 'FINISHING', standard: 'Must be < 12.0%', status: 'PASS', remarks: '8.4% RH safe for container transit' },
      { id: 'c8', title: 'Foreign Debris & Needle Detection', category: 'FINISHING', standard: 'Metal detector scan pass', status: 'PASS', remarks: 'Clean and metal free' },
      { id: 'c9', title: 'Pallet Waterproof Shrink Wrapping', category: 'PACKAGING', standard: '200 Gauge UV wrap + Top cap', status: 'PASS', remarks: 'Waterproof pallet wrap complete' },
      { id: 'c10', title: 'Heavy Cross Strapping & Corner Guards', category: 'PACKAGING', standard: '4 corner rigid guards + 4 straps', status: 'PASS', remarks: 'High tension strap with corner protection' },
      { id: 'c11', title: 'Shipping Marks: F4C / Austria', category: 'LABELING', standard: 'Barcode, SKU, Gross/Net Weight', status: 'PASS', remarks: 'All labels clear and scannable' }
    ],
    photos: [
      { id: 'p1', caption: 'Full Rug Face & Pile Texture Check', url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80', tag: 'FACE', uploadedAt: '2025-05-18T14:15:00.000Z' },
      { id: 'p2', caption: 'Latex Backing & Edge Serging Examination', url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80', tag: 'BACKING', uploadedAt: '2025-05-18T14:18:00.000Z' },
      { id: 'p3', caption: 'Finished Pallet with Heavy Wrap & Corner Protectors', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', tag: 'PALLET', uploadedAt: '2025-05-18T14:22:00.000Z' }
    ]
  }
];

/**
 * Subscribe to QC Inspection Reports
 */
export function subscribeQcInspections(
  onUpdate: (reports: QcInspectionReport[]) => void,
  onError?: (error: Error) => void
): () => void {
  const collRef = collection(db, QC_INSPECTIONS_COLLECTION);
  return onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default report if empty
        try {
          const batch = writeBatch(db);
          DEFAULT_QC_REPORTS.forEach((report) => {
            const docRef = doc(db, QC_INSPECTIONS_COLLECTION, report.id);
            batch.set(docRef, report);
          });
          await batch.commit();
        } catch (e) {
          console.warn('Could not seed default QC reports:', e);
        }
        onUpdate(DEFAULT_QC_REPORTS);
        return;
      }

      const items: QcInspectionReport[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as QcInspectionReport;
        items.push({
          ...d,
          id: docSnap.id
        });
      });
      items.sort((a, b) => new Date(b.inspectionDate || b.createdAt).getTime() - new Date(a.inspectionDate || a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore QC snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save QC Inspection Report to Firestore
 */
export async function saveQcInspectionToFirestore(report: QcInspectionReport): Promise<void> {
  const docId = sanitizeDocId(report.id || `qc_${report.poNumber}_${Date.now()}`);
  const docRef = doc(db, QC_INSPECTIONS_COLLECTION, docId);
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(report)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }
  cleanData.id = docId;
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Delete QC Inspection Report from Firestore
 */
export async function deleteQcInspectionFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, QC_INSPECTIONS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to real-time changes of Voice Rug Gallery Items
 */
export function subscribeVoiceRugItems(
  onUpdate: (data: VoiceRugItem[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, VOICE_RUGS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const items: VoiceRugItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as VoiceRugItem),
          id: docSnap.id
        });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Voice Rug snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save single Voice Rug Item
 */
export async function saveVoiceRugItemToFirestore(item: VoiceRugItem): Promise<void> {
  const docId = sanitizeDocId(item.id || `voice_rug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const docRef = doc(db, VOICE_RUGS_COLLECTION, docId);
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(item)) {
    if (val !== undefined) cleanData[key] = val;
  }
  cleanData.id = docId;
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Save multiple Voice Rug Items in bulk batch
 */
export async function saveVoiceRugItemsBatchToFirestore(items: VoiceRugItem[]): Promise<void> {
  const batch = writeBatch(db);
  for (const item of items) {
    const docId = sanitizeDocId(item.id || `voice_rug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const docRef = doc(db, VOICE_RUGS_COLLECTION, docId);
    const cleanData: Record<string, any> = {};
    for (const [key, val] of Object.entries(item)) {
      if (val !== undefined) cleanData[key] = val;
    }
    cleanData.id = docId;
    batch.set(docRef, cleanData, { merge: true });
  }
  await batch.commit();
}

/**
 * Delete a Voice Rug Item
 */
export async function deleteVoiceRugItemFromFirestore(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const docRef = doc(db, VOICE_RUGS_COLLECTION, docId);
  await deleteDoc(docRef);
}

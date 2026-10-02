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
import { PurchaseOrder, PPWRFile, PPWRFilesStore, ForecastComment, CargoItem, SampleItem, AiyaraInvoice, WorkerSmsAlert, ManufacturerWorker } from '../types';

const PO_COLLECTION = 'purchase_orders';
const PPWR_COLLECTION = 'ppwr_files';
const COMMENTS_COLLECTION = 'forecast_comments';
const CARGO_COLLECTION = 'container_items';
const SAMPLE_ITEMS_COLLECTION = 'sample_items';
const AIYARA_INVOICES_COLLECTION = 'aiyara_invoices';
const WORKER_SMS_COLLECTION = 'worker_sms_alerts';
const WORKERS_COLLECTION = 'manufacturer_workers';

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
 * Default Aiyara Invoice Templates from attached PDF
 */
export const DEFAULT_AIYARA_INVOICES: AiyaraInvoice[] = [
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
    buyerName: 'Aiyara Textile Manufacturing PVT LTD',
    buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
    buyerGstin: '26AAVCA3353L1Z6',
    buyerPhone: '9173722468',
    buyerEmail: 'sale@aiyaratextile.in',
    buyerAttention: 'Mr. Om Prakash',
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
    buyerName: 'Aiyara Textile Manufacturing PVT LTD',
    buyerAddress: '706, IVY BUILDING-A, &PARK CITY, & ADDRESS:- SRV NO-8 & NAGAR HAVELI, IND&82/1/1/2. H NO-3227/42,SILVASSA-396230,DADRA IA',
    buyerGstin: '26AAVCA3353L1Z6',
    buyerPhone: '9173722468',
    buyerEmail: 'sale@aiyaratextile.in',
    buyerAttention: 'Mr. Om Prakash',
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
 * Purge dummy / template Aiyara invoices from Firestore
 */
export async function purgeDummyAiyaraInvoicesFromFirestore(): Promise<void> {
  try {
    const invSnap = await getDocs(collection(db, AIYARA_INVOICES_COLLECTION));
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
    console.warn('Purge dummy Aiyara invoices error:', e);
  }
}

/**
 * Subscribe to real-time changes of Aiyara Invoices in Firestore.
 * ONLY loads uploaded and user-saved invoices.
 */
export function subscribeAiyaraInvoices(
  onUpdate: (data: AiyaraInvoice[]) => void,
  onError?: (error: Error) => void
) {
  // Purge any legacy dummy invoices on start
  purgeDummyAiyaraInvoicesFromFirestore();

  const colRef = collection(db, AIYARA_INVOICES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const items: AiyaraInvoice[] = [];
      snapshot.forEach((docSnap) => {
        const docId = docSnap.id.toLowerCase();
        const d = docSnap.data() as AiyaraInvoice;
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
      console.error('Aiyara Invoices snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update an Aiyara Invoice in Firestore
 */
export async function saveAiyaraInvoiceToFirestore(invoice: AiyaraInvoice): Promise<void> {
  const docId = sanitizeDocId(invoice.id || `aiyara_inv_${Date.now()}`);
  const docRef = doc(db, AIYARA_INVOICES_COLLECTION, docId);

  // Clean undefined values recursively and ensure robust defaults
  const cleanedItems = (invoice.items || []).map((item, idx) => ({
    id: item.id || `item-${Date.now()}-${idx}`,
    itemNo: item.itemNo ?? `${idx + 1}`,
    description: item.description ?? `Item ${idx + 1}`,
    specification: item.specification ?? '',
    productCode: item.productCode ?? '',
    sizesCm: item.sizesCm ?? '',
    qtyPcs: Number(item.qtyPcs) || 1,
    totalSqMeter: Number(item.totalSqMeter) || 0,
    sqMtrPrice: Number(item.sqMtrPrice) || 0,
    totalAmount: Number(item.totalAmount) || 0,
  }));

  const cleanedInvoice = {
    id: docId,
    invoiceNo: invoice.invoiceNo ?? `PO # ${docId}`,
    poNumber: invoice.poNumber ?? '',
    poTitle: invoice.poTitle ?? '',
    date: invoice.date ?? new Date().toISOString().split('T')[0],
    supplierName: invoice.supplierName ?? 'FOUR CORNERS CARPETS',
    supplierAddress: invoice.supplierAddress ?? '',
    supplierGstin: invoice.supplierGstin ?? '',
    supplierContact: invoice.supplierContact ?? '',
    supplierAttention: invoice.supplierAttention ?? '',
    supplierBankDetails: invoice.supplierBankDetails ?? '',
    supplierIfsc: invoice.supplierIfsc ?? '',
    buyerName: invoice.buyerName ?? '',
    buyerAddress: invoice.buyerAddress ?? '',
    buyerGstin: invoice.buyerGstin ?? '',
    buyerPhone: invoice.buyerPhone ?? '',
    buyerEmail: invoice.buyerEmail ?? '',
    buyerAttention: invoice.buyerAttention ?? '',
    igstPercent: Number(invoice.igstPercent ?? 5),
    igstAmount: Number(invoice.igstAmount ?? 0),
    advancePercent: Number(invoice.advancePercent ?? 25),
    advanceAmount: Number(invoice.advanceAmount ?? 0),
    subTotal: Number(invoice.subTotal ?? 0),
    totalPcs: Number(invoice.totalPcs ?? 0),
    totalSqMeter: Number(invoice.totalSqMeter ?? 0),
    totalAmount: Number(invoice.totalAmount ?? 0),
    notes: invoice.notes ?? '25 % Advance & Balance Payment: The remaining 75% balance must be cleared within 90 days from the date of this invoice.',
    items: cleanedItems,
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(docRef, cleanedInvoice, { merge: true });
}

/**
 * Delete an Aiyara Invoice from Firestore
 */
export async function deleteAiyaraInvoiceFromFirestore(id: string): Promise<void> {
  try {
    const rawRef = doc(db, AIYARA_INVOICES_COLLECTION, id);
    await deleteDoc(rawRef);
  } catch (e) {
    console.warn('Direct deleteDoc failed:', e);
  }
  try {
    const docId = sanitizeDocId(id);
    if (docId !== id) {
      const docRef = doc(db, AIYARA_INVOICES_COLLECTION, docId);
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

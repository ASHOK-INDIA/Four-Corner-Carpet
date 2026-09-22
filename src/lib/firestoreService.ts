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
import { PurchaseOrder, PPWRFile, PPWRFilesStore, ForecastComment } from '../types';

const PO_COLLECTION = 'purchase_orders';
const PPWR_COLLECTION = 'ppwr_files';
const COMMENTS_COLLECTION = 'forecast_comments';

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

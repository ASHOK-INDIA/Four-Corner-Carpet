import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { PurchaseOrder, PPWRFilesStore } from '../types';

const PO_COLLECTION = 'purchase_orders';
const PPWR_COLLECTION = 'ppwr_files';

// Realtime listener for Purchase Orders
export const subscribePurchaseOrders = (callback: (orders: PurchaseOrder[]) => void) => {
  const poRef = collection(db, PO_COLLECTION);
  return onSnapshot(
    poRef,
    (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as unknown as PurchaseOrder);
      });
      callback(orders);
    },
    (error) => {
      console.error('Firestore Purchase Orders snapshot error:', error);
      callback([]);
    }
  );
};

// Realtime listener for PPWR Files
export const subscribePPWRFiles = (callback: (files: PPWRFilesStore) => void) => {
  const ppwrRef = collection(db, PPWR_COLLECTION);
  return onSnapshot(
    ppwrRef,
    (snapshot) => {
      const filesStore: PPWRFilesStore = {
        certifications: [],
        declarations: [],
        labReports: [],
        recycledContent: [],
      };

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const category = data.category as keyof PPWRFilesStore;
        if (filesStore[category]) {
          filesStore[category].push({
            id: docSnap.id,
            name: data.name,
            uploadDate: data.uploadDate,
            size: data.size,
            status: data.status,
            url: data.url,
            type: data.type,
          });
        }
      });

      callback(filesStore);
    },
    (error) => {
      console.error('Firestore PPWR files snapshot error:', error);
      callback({
        certifications: [],
        declarations: [],
        labReports: [],
        recycledContent: [],
      });
    }
  );
};

// Save / Update Purchase Order
export const savePurchaseOrderToFirestore = async (po: PurchaseOrder) => {
  try {
    const poDocRef = doc(db, PO_COLLECTION, po.id);
    await setDoc(poDocRef, po, { merge: true });
  } catch (error) {
    console.error('Error saving purchase order to Firestore:', error);
  }
};

// Update single milestone
export const updateMilestoneInFirestore = async (
  poId: string,
  milestoneKey: string,
  value: boolean
) => {
  try {
    const poDocRef = doc(db, PO_COLLECTION, poId);
    await updateDoc(poDocRef, {
      [`milestones.${milestoneKey}`]: value,
    });
  } catch (error) {
    console.error('Error updating milestone in Firestore:', error);
  }
};

// Delete Purchase Order
export const deletePurchaseOrderFromFirestore = async (poId: string) => {
  try {
    await deleteDoc(doc(db, PO_COLLECTION, poId));
  } catch (error) {
    console.error('Error deleting purchase order from Firestore:', error);
  }
};

// Save PPWR File
export const savePPWRFileToFirestore = async (category: string, fileData: any) => {
  try {
    const fileId = fileData.id || `ppwr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileRef = doc(db, PPWR_COLLECTION, fileId);
    await setDoc(fileRef, {
      category,
      ...fileData,
      id: fileId,
    });
  } catch (error) {
    console.error('Error saving PPWR file to Firestore:', error);
  }
};

// Delete PPWR File
export const deletePPWRFileFromFirestore = async (category: string, fileId: string) => {
  try {
    await deleteDoc(doc(db, PPWR_COLLECTION, fileId));
  } catch (error) {
    console.error('Error deleting PPWR file from Firestore:', error);
  }
};

// Clear All Data
export const clearAllFirestoreData = async () => {
  try {
    const poDocs = await getDocs(collection(db, PO_COLLECTION));
    const ppwrDocs = await getDocs(collection(db, PPWR_COLLECTION));

    const batch = writeBatch(db);
    poDocs.forEach((d) => batch.delete(d.ref));
    ppwrDocs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (error) {
    console.error('Error clearing Firestore data:', error);
  }
};

// Seed Sample / Demo Data
export const seedSampleDataToFirestore = async () => {
  try {
    const samplePOs: PurchaseOrder[] = [
      {
        id: 'po_1001',
        poNumber: 'PO-2026-881',
        styleName: 'Organic Cotton Crew Neck Tee',
        colorway: 'Navy Blue',
        buyerName: 'H&M Global',
        factoryName: 'Surat Fine Apparels Hub',
        destinationCountry: 'Germany',
        orderQuantity: 15000,
        exFactoryDate: '2026-10-15',
        status: 'ON_TRACK',
        ppwrStatus: 'COMPLIANT',
        carrier: 'Maersk Logistics',
        trackingNumber: 'MSK-99201948',
        notes: 'GOTS Certified organic cotton yarn in-house. PPWR recycled polybag verified.',
        milestones: {
          fabricInHouse: true,
          cuttingStarted: true,
          sewingStarted: true,
          qualityInspected: false,
          packedAndReady: false,
        },
      },
      {
        id: 'po_1002',
        poNumber: 'PO-2026-904',
        styleName: 'Washed Denim Oversized Jacket',
        colorway: 'Vintage Indigo',
        buyerName: 'Zara / Inditex',
        factoryName: 'Apex Textiles Gujarat',
        destinationCountry: 'Spain',
        orderQuantity: 8500,
        exFactoryDate: '2026-10-02',
        status: 'DELAYED',
        ppwrStatus: 'PENDING',
        carrier: 'DHL Global Forwarding',
        trackingNumber: 'DHL-8830192',
        notes: 'Washing chemical test lab report pending for EU REACH & PPWR packaging approval.',
        milestones: {
          fabricInHouse: true,
          cuttingStarted: true,
          sewingStarted: false,
          qualityInspected: false,
          packedAndReady: false,
        },
      },
      {
        id: 'po_1003',
        poNumber: 'PO-2026-920',
        styleName: 'Linen Blend Summer Blazer',
        colorway: 'Ecru Sand',
        buyerName: 'Mango Retail',
        factoryName: 'Surat Fine Apparels Hub',
        destinationCountry: 'France',
        orderQuantity: 6200,
        exFactoryDate: '2026-09-28',
        status: 'CRITICAL_DELAY',
        ppwrStatus: 'NON_COMPLIANT',
        carrier: 'FedEx Express',
        notes: 'Linen trim delivery bottleneck. Recycled content percentage declaration required.',
        milestones: {
          fabricInHouse: true,
          cuttingStarted: false,
          sewingStarted: false,
          qualityInspected: false,
          packedAndReady: false,
        },
      },
      {
        id: 'po_1004',
        poNumber: 'PO-2026-740',
        styleName: 'Recycled Fleece Pullover Hoodie',
        colorway: 'Charcoal Heather',
        buyerName: 'Decathlon EU',
        factoryName: 'GreenThread Mills Ltd',
        destinationCountry: 'Netherlands',
        orderQuantity: 22000,
        exFactoryDate: '2026-09-10',
        status: 'COMPLETED',
        ppwrStatus: 'COMPLIANT',
        carrier: 'MSC Shipping',
        trackingNumber: 'MSC-7710291',
        notes: 'GRS Certified 100% recycled polyester fleece. Shipped on schedule.',
        milestones: {
          fabricInHouse: true,
          cuttingStarted: true,
          sewingStarted: true,
          qualityInspected: true,
          packedAndReady: true,
        },
      },
    ];

    const batch = writeBatch(db);
    samplePOs.forEach((po) => {
      const docRef = doc(db, PO_COLLECTION, po.id);
      batch.set(docRef, po, { merge: true });
    });

    const samplePPWRFiles = [
      {
        id: 'ppwr_cert_1',
        category: 'certifications',
        name: 'EU_PPWR_Polybag_GRS_Cert_2026.pdf',
        uploadDate: '2026-08-14',
        size: '1.8 MB',
        status: 'Verified',
        type: 'PDF',
      },
      {
        id: 'ppwr_decl_1',
        category: 'declarations',
        name: 'Recycled_Content_Self_Declaration_v2.pdf',
        uploadDate: '2026-08-20',
        size: '840 KB',
        status: 'Verified',
        type: 'PDF',
      },
      {
        id: 'ppwr_lab_1',
        category: 'labReports',
        name: 'Heavy_Metals_In_Packaging_TUV_Report.pdf',
        uploadDate: '2026-08-25',
        size: '2.4 MB',
        status: 'Pending Review',
        type: 'PDF',
      },
    ];

    samplePPWRFiles.forEach((file) => {
      const docRef = doc(db, PPWR_COLLECTION, file.id);
      batch.set(docRef, file, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
};

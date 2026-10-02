export interface DesignBatch {
  name: string;
  batch: string;
  size: string;
  qty: number;
  status: string;
  progress: number;
}

export interface PurchaseOrder {
  po: string;
  appRef: string;
  estDate: string;
  notes: string;
  shipmentMilestone: string;
  designs: DesignBatch[];
}

export interface PPWRFile {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL';
  date: string;
  size: string;
  po: string;
}

export interface PPWRFilesStore {
  declaration: PPWRFile[];
  testReport: PPWRFile[];
  technicalDataSheet: PPWRFile[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  weatherCode: number;
  iconName: string;
}

export interface ForecastComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface CargoItem {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  qty: number;
  color: string;
  isCylinder?: boolean;
  packageType?: 'box' | 'roll' | 'pallet';
  rugsPerPallet?: number;
}

export interface SampleItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
}

export interface AiyaraLineItem {
  id: string;
  itemNo: string;
  description: string;
  specification: string;
  productCode: string;
  sizesCm: string;
  qtyPcs: number;
  totalSqMeter: number;
  sqMtrPrice: number;
  totalAmount: number;
}

export interface AiyaraInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  poNumber: string;
  poTitle?: string;
  
  supplierName: string;
  supplierAddress: string;
  supplierGstin: string;
  supplierContact: string;
  supplierAttention: string;
  supplierBankDetails: string;
  supplierIfsc: string;
  
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerAttention: string;

  items: AiyaraLineItem[];

  totalPcs: number;
  totalSqMeter: number;
  subTotal: number;
  igstPercent: number;
  igstAmount: number;
  advancePercent: number;
  advanceAmount: number;
  totalAmount: number;
  
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkerSmsAlert {
  id: string;
  poNumber: string;
  workerName: string;
  workerPhone: string;
  workerRole: string;
  stage: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';
  sentAt: string;
  sentBy?: string;
}

export interface ManufacturerWorker {
  id: string;
  name: string;
  phone: string;
  role: string;
  unit: string;
  activeOrdersCount?: number;
}



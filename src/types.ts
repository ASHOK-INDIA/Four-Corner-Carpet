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
  qtyPallet?: number;
  qtyPcs: number;
  totalSqMeter: number;
  sqMtrPrice: number;
  pcsPrice?: number;
  totalAmount: number;
  // Packing List & Export specific fields
  palletDimension?: string;
  cartonBaleNo?: string;
  rollNo?: string;
  netWeightKg?: number;
  grossWeightKg?: number;
  cbmVolume?: number;
  hsnCode?: string;
  weightKg?: number;
}

export interface ConsigneeMaster {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  eoriVat: string;
  attention: string;
}

export interface ExporterMaster {
  id?: string;
  name: string;
  address: string;
  gstin: string;
  iecNo: string;
  rexNo: string;
  contact: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  swiftCode: string;
  adCode: string;
  branch: string;
}

export interface AiyaraInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  poNumber: string;
  poTitle?: string;
  documentTitle?: string; // Header title: e.g. 'Performa Invoice', 'Tax Invoice', 'Commercial Invoice'
  
  // Exporter / Supplier Master details
  supplierName: string;
  supplierAddress: string;
  supplierGstin: string;
  supplierContact: string;
  supplierAttention: string;
  supplierBankDetails: string;
  supplierIfsc: string;
  supplierSwiftCode?: string;
  supplierAdCode?: string;
  supplierIecNo?: string;
  supplierRexNo?: string;
  
  // Consignee / Buyer Master details
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  buyerEoriVat?: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerAttention: string;

  // Export Shipping & Terms details
  invoiceType?: 'STANDARD' | 'POPTOP' | 'AIYARA'; // Dedicated Poptop invoice format vs Standard export
  priceMode?: 'PER_SQM' | 'PER_PCS'; // Price per Sq.M vs Price per Piece
  perPalletCharge?: number; // Per Pallet Charge amount
  totalPallets?: number; // Total number of pallets
  pcsPerPallet?: number; // Number of rug pieces per pallet (e.g. 10 pcs/pallet)

  currency?: string; // e.g. 'EUR (€)', 'USD ($)', 'INR (₹)'
  portOfLoading?: string; // e.g. Nhava Sheva / ICD Bhadohi / Delhi
  portOfDischarge?: string; // e.g. Gothenburg / Hamburg / Vienna
  countryOfOrigin?: string; // e.g. INDIA
  countryOfDestination?: string; // e.g. SWEDEN / AUSTRIA / GERMANY
  termsOfPayment?: string; // e.g. 30 Days Net / Letter of Credit / Advance
  termsOfDelivery?: string; // e.g. FOB / CIF / DDP

  // Shipping & Logistics Grid details (as per export invoice standard)
  preCarriedBy?: string; // e.g. "BY TRUCK"
  placeOfReceiptByPreCarrier?: string; // e.g. "BHADOHI"
  vesselFlightNo?: string; // e.g. "BY SEA"
  shipmentFrom?: string; // e.g. "MUMBAI"
  finalDestination?: string; // e.g. "Austria"
  marksAndNos?: string; // e.g. "Marks : F4C\nAustria"
  noAndKindOfPackages?: string; // e.g. "10 Pallet"

  items: AiyaraLineItem[];

  totalPcs: number;
  totalSqMeter: number;
  totalNetWeightKg?: number;
  totalGrossWeightKg?: number;
  totalCbm?: number;
  subTotal: number;
  igstPercent: number;
  igstAmount: number;
  advancePercent: number;
  advanceAmount: number;
  totalAmount: number;
  
  notes?: string;
  isUserUploaded?: boolean;
  updatedByUser?: boolean;
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

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  partyName: string;
  partyType: 'BUYER' | 'SUPPLIER' | 'ARTISAN' | 'TRANSPORTER' | 'BANK' | 'OTHER';
  transactionType: 'DEBIT' | 'CREDIT'; // Debit (Dr - Amount given/invoice raised) / Credit (Cr - Payment received/advance)
  particulars: string;
  poReference?: string;
  invoiceNo?: string;
  amount: number;
  paymentMode?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'UPI' | 'CREDIT';
  notes?: string;
  createdAt: string;
}

export interface QcCheckItem {
  id: string;
  title: string;
  category: 'DIMENSIONS' | 'COLOR' | 'WEAVE' | 'BACKING' | 'FINISHING' | 'PACKAGING' | 'LABELING';
  standard: string;
  status: 'PASS' | 'MINOR' | 'MAJOR' | 'NA';
  remarks?: string;
}

export interface QcInspectionPhoto {
  id: string;
  caption: string;
  url: string;
  tag: 'FACE' | 'BACKING' | 'BINDING' | 'PALLET' | 'LABEL' | 'GENERAL';
  uploadedAt: string;
}

export interface QcInspectionReport {
  id: string;
  poNumber: string;
  buyerName: string;
  inspectionDate: string;
  inspectorName: string;
  inspectionStage: 'INLINE' | 'PRE_SHIPMENT' | 'PALLET_STUFFING';
  aqlStandard: string;
  totalLotPieces: number;
  samplePiecesChecked: number;
  moisturePercent: number; // Max permissible < 12%
  pileHeightMm: number;
  weightPerSqMtrGsm?: number;
  overallGrade: 'PASS' | 'CONDITIONAL_PASS' | 'REWORK_REQUIRED' | 'FAIL';
  minorDefectsCount: number;
  majorDefectsCount: number;
  criticalDefectsCount: number;
  checks: QcCheckItem[];
  photos: QcInspectionPhoto[];
  certificateNo: string;
  verifiedBy: string;
  inspectorRemarks: string;
  palletCondition: 'EXCELLENT' | 'GOOD' | 'NEEDS_REWRAP';
  cornerProtectorsPresent: boolean;
  strappingTensionOk: boolean;
  isLockedApproved?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BuyerTrackingDetails {
  poNumber: string;
  buyerName: string;
  destinationPort: string;
  loadingPort: string;
  carrierName: string; // e.g. Maersk, MSC, Hapag-Lloyd
  containerNumber: string;
  sealNumber: string;
  blNumber: string; // Bill of Lading
  estimatedArrivalDate: string;
  vesselName: string;
  voyageNo: string;
  liveStatus: 'PRODUCTION' | 'QC_APPROVED' | 'STUFFED' | 'CUSTOMS_CLEARED' | 'ON_VESSEL' | 'PORT_ARRIVED' | 'DELIVERED';
  customsReleaseDate?: string;
  temperatureHumidityLog?: string;
  notes?: string;
}

export interface VoiceRugItem {
  id: string;
  photoUrl: string;
  fileName: string;
  title?: string;
  size?: string;           // e.g. "250x350 cm" / "8x10 ft"
  material?: string;       // e.g. "100% Wool", "PET Hand Woven"
  pileHeight?: string;     // e.g. "12 mm", "Cut & Loop 14mm"
  construction?: string;   // e.g. "Hand Tufted", "Hand Knotted", "Flatweave"
  color?: string;          // e.g. "Rust Brown", "Moss Green"
  voiceTranscript?: string;// raw spoken audio transcription
  priceEstimate?: string;  // e.g. "₹ 1,175 / m²"
  notes?: string;
  recordedAt?: string;
  createdAt: string;
}

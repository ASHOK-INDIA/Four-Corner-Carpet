export type POStatus = 'ON_TRACK' | 'DELAYED' | 'CRITICAL_DELAY' | 'COMPLETED' | 'CANCELLED';
export type PPWRStatus = 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT';

export interface POMilestones {
  fabricInHouse: boolean;
  cuttingStarted: boolean;
  sewingStarted: boolean;
  qualityInspected: boolean;
  packedAndReady: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  styleName: string;
  colorway: string;
  buyerName: string;
  factoryName: string;
  destinationCountry: string;
  orderQuantity: number;
  exFactoryDate: string;
  status: POStatus;
  ppwrStatus: PPWRStatus;
  milestones: POMilestones;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

export interface PPWRFile {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  status: 'Verified' | 'Pending Review' | 'Expired';
  url?: string;
  type?: string;
}

export interface PPWRFilesStore {
  certifications: PPWRFile[];
  declarations: PPWRFile[];
  labReports: PPWRFile[];
  recycledContent: PPWRFile[];
}

export interface WeatherData {
  temp: string;
  condition: string;
  humidity: string;
  location: string;
}

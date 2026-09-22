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


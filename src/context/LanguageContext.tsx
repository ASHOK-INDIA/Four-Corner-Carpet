import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'de-at';

export interface Translations {
  // Header
  appTitle: string;
  createPo: string;
  cbmCalc: string;
  competitorIntel: string;
  shipmentTrack: string;
  ppwr: string;
  print: string;
  adminOn: string;
  adminOff: string;
  
  // KPIs
  totalPOs: string;
  activeBatches: string;
  totalQuantity: string;
  shipped: string;
  readyForShipment: string;
  inProduction: string;
  qcInspection: string;

  // Controls & Table
  searchPlaceholder: string;
  allPOs: string;
  allStatus: string;
  view: string;
  poAndAppRef: string;
  designBatches: string;
  totalUnits: string;
  primaryStatus: string;
  shipmentMilestone: string;
  estDelivery: string;
  actions: string;
  noOrdersFound: string;
  noOrdersSub: string;
  clearAllData: string;
  viewOnly: string;

  // Statuses
  orderReceived: string;
  materialPrep: string;
  shippedStatus: string;

  // Common UI
  close: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  details: string;
  languageName: string;
  austrianGerman: string;
  english: string;
}

const enTranslations: Translations = {
  appTitle: 'POPTOP PRODUCTION',
  createPo: 'Create PO',
  cbmCalc: '3D CBM Calc',
  competitorIntel: 'Competitor Intel',
  shipmentTrack: 'Shipment Track',
  ppwr: 'PPWR',
  print: 'Print',
  adminOn: 'Admin On',
  adminOff: 'Admin Off',

  totalPOs: 'Total POs',
  activeBatches: 'Active Batches',
  totalQuantity: 'Total Quantity',
  shipped: 'Shipped',
  readyForShipment: 'Ready for Shipment',
  inProduction: 'In Production',
  qcInspection: 'QC Inspection',

  searchPlaceholder: 'Search PO, Customer Ref, Design, Batch...',
  allPOs: 'All Purchase Orders',
  allStatus: 'All Statuses',
  view: 'View',
  poAndAppRef: 'PO & App Ref',
  designBatches: 'Design Batches',
  totalUnits: 'Total Units',
  primaryStatus: 'Primary Status',
  shipmentMilestone: 'Shipment Milestone',
  estDelivery: 'Est. Delivery',
  actions: 'Actions',
  noOrdersFound: 'No Purchase Orders Found',
  noOrdersSub: 'Only records created or updated by Admin in Firestore will appear here.',
  clearAllData: 'Clear All Firestore Data',
  viewOnly: 'View Only',

  orderReceived: 'Order Received',
  materialPrep: 'Material Prep',
  shippedStatus: 'Shipped',

  close: 'Close',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  details: 'Details',
  languageName: 'English',
  austrianGerman: 'Österreichisches Deutsch (AT)',
  english: 'English (US/UK)',
};

const deAtTranslations: Translations = {
  appTitle: 'POPTOP PRODUKTION',
  createPo: 'Bestellung erstellen',
  cbmCalc: '3D CBM-Rechner',
  competitorIntel: 'Mitbewerber-Analyse',
  shipmentTrack: 'Sendungsverfolgung',
  ppwr: 'PPWR-Konformität',
  print: 'Drucken',
  adminOn: 'Admin Ein',
  adminOff: 'Admin Aus',

  totalPOs: 'Gesamt-Bestellungen',
  activeBatches: 'Aktive Chargen',
  totalQuantity: 'Gesamtstückzahl',
  shipped: 'Versendet',
  readyForShipment: 'Versandbereit',
  inProduction: 'In Produktion',
  qcInspection: 'Qualitätskontrolle (QC)',

  searchPlaceholder: 'Suche PO, Kundenreferenz, Design, Charge...',
  allPOs: 'Alle Bestellungen (POs)',
  allStatus: 'Alle Statuszustände',
  view: 'Ansicht',
  poAndAppRef: 'Bestell-Nr. & Kundenreferenz',
  designBatches: 'Design-Chargen',
  totalUnits: 'Gesamte Einheiten',
  primaryStatus: 'Hauptstatus',
  shipmentMilestone: 'Versand-Meilenstein',
  estDelivery: 'Vorauss. Lieferung',
  actions: 'Aktionen',
  noOrdersFound: 'Keine Bestellungen gefunden',
  noOrdersSub: 'Hier werden nur vom Admin in Firestore erstellte oder aktualisierte Datensätze angezeigt.',
  clearAllData: 'Alle Firestore-Daten löschen',
  viewOnly: 'Nur Lesezugriff',

  orderReceived: 'Bestellung eingegangen',
  materialPrep: 'Materialvorbereitung',
  shippedStatus: 'Versendet',

  close: 'Schließen',
  save: 'Speichern',
  cancel: 'Abbrechen',
  delete: 'Löschen',
  edit: 'Bearbeiten',
  details: 'Details',
  languageName: 'Österreichisch',
  austrianGerman: 'Österreichisches Deutsch (AT)',
  english: 'English (US/UK)',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('poptop_lang');
    return (saved === 'de-at' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('poptop_lang', lang);
  };

  const t = language === 'de-at' ? deAtTranslations : enTranslations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

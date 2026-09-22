import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, PPWRFilesStore, WeatherData } from './types';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { ControlsBar } from './components/ControlsBar';
import { ProductionTable } from './components/ProductionTable';
import { DetailModal } from './components/DetailModal';
import { ShipmentTrackModal } from './components/ShipmentTrackModal';
import { PPWRModal } from './components/PPWRModal';
import { OrderFormModal } from './components/OrderFormModal';
import { PrintSummaryModal } from './components/PrintSummaryModal';
import { PasswordModal } from './components/PasswordModal';
import {
  subscribePurchaseOrders,
  subscribePPWRFiles,
  savePurchaseOrderToFirestore,
  updateMilestoneInFirestore,
  deletePurchaseOrderFromFirestore,
  savePPWRFileToFirestore,
  deletePPWRFileFromFirestore,
  clearAllFirestoreData,
  seedSampleDataToFirestore,
} from './lib/firestoreService';

export default function App() {
  const [productionData, setProductionData] = useState<PurchaseOrder[]>([]);
  const [ppwrFilesStore, setPpwrFilesStore] = useState<PPWRFilesStore>({
    certifications: [],
    declarations: [],
    labReports: [],
    recycledContent: [],
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [searchQuery, setSearchQuery] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof PurchaseOrder>('exFactoryDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [trackingPO, setTrackingPO] = useState<PurchaseOrder | null>(null);
  const [isPPWROpen, setIsPPWROpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
  const [passwordModalAction, setPasswordModalAction] = useState<'clearData' | null>(null);

  const [weatherData] = useState<WeatherData>({
    temp: '28°C',
    condition: 'Partly Cloudy',
    humidity: '65%',
    location: 'Surat, India (Production Hub)',
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let isFirstLoad = true;
    const unsubscribePOs = subscribePurchaseOrders((orders) => {
      setProductionData(orders);
      setIsLoadingData(false);
      if (isFirstLoad && orders.length === 0) {
        isFirstLoad = false;
        seedSampleDataToFirestore();
      }
    });

    const unsubscribePPWR = subscribePPWRFiles((files) => {
      setPpwrFilesStore(files);
    });

    return () => {
      unsubscribePOs();
      unsubscribePPWR();
    };
  }, []);

  const uniqueFactories = useMemo(() => {
    const factories = new Set(productionData.map((po) => po.factoryName));
    return Array.from(factories).filter(Boolean);
  }, [productionData]);

  const uniqueBuyers = useMemo(() => {
    const buyers = new Set(productionData.map((po) => po.buyerName));
    return Array.from(buyers).filter(Boolean);
  }, [productionData]);

  const filteredPOs = useMemo(() => {
    return productionData
      .filter((po) => {
        const poNum = po.poNumber || (po as any).po || '';
        const style = po.styleName || (po as any).appRef || '';
        const buyer = po.buyerName || '';
        const factory = po.factoryName || '';
        const q = searchQuery.toLowerCase();

        const matchesSearch =
          poNum.toLowerCase().includes(q) ||
          style.toLowerCase().includes(q) ||
          buyer.toLowerCase().includes(q) ||
          factory.toLowerCase().includes(q);

        const matchesFactory = factoryFilter === 'ALL' || po.factoryName === factoryFilter;
        const matchesBuyer = buyerFilter === 'ALL' || po.buyerName === buyerFilter;
        const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;

        return matchesSearch && matchesFactory && matchesBuyer && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [productionData, searchQuery, factoryFilter, buyerFilter, statusFilter, sortField, sortDirection]);

  const handleMilestoneToggle = async (poId: string, milestoneKey: string) => {
    const po = productionData.find((p) => p.id === poId);
    if (!po) return;
    const currentVal = (po.milestones as any)[milestoneKey];
    await updateMilestoneInFirestore(poId, milestoneKey, !currentVal);
  };

  const handleSavePO = async (po: PurchaseOrder) => {
    await savePurchaseOrderToFirestore(po);
    setIsNewOrderOpen(false);
    setEditingPO(null);
  };

  const handleDeletePO = async (poId: string) => {
    if (window.confirm('Are you sure you want to delete this Purchase Order?')) {
      await deletePurchaseOrderFromFirestore(poId);
      if (selectedPO?.id === poId) setSelectedPO(null);
    }
  };

  const handleAddPPWRFile = async (category: keyof PPWRFilesStore, fileData: any) => {
    await savePPWRFileToFirestore(category, fileData);
  };

  const handleDeletePPWRFile = async (category: keyof PPWRFilesStore, fileId: string) => {
    await deletePPWRFileFromFirestore(category, fileId);
  };

  const handleClearAllData = async () => {
    await clearAllFirestoreData();
    setPasswordModalAction(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Header
        weather={weatherData}
        isOnline={isOnline}
        onOpenPPWR={() => setIsPPWROpen(true)}
        onOpenNewOrder={() => {
          setEditingPO(null);
          setIsNewOrderOpen(true);
        }}
        onOpenPrintSummary={() => setIsPrintSummaryOpen(true)}
        onPromptClearData={() => setPasswordModalAction('clearData')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <KPICards orders={productionData} />

        <ControlsBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          factoryFilter={factoryFilter}
          setFactoryFilter={setFactoryFilter}
          buyerFilter={buyerFilter}
          setBuyerFilter={setBuyerFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          factories={uniqueFactories}
          buyers={uniqueBuyers}
          onNewOrder={() => {
            setEditingPO(null);
            setIsNewOrderOpen(true);
          }}
        />

        <ProductionTable
          orders={filteredPOs}
          isLoading={isLoadingData}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={(field) => {
            if (sortField === field) {
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField(field);
              setSortDirection('asc');
            }
          }}
          onSelectPO={(po) => setSelectedPO(po)}
          onTrackShipment={(po) => setTrackingPO(po)}
          onMilestoneToggle={handleMilestoneToggle}
          onEditPO={(po) => {
            setEditingPO(po);
            setIsNewOrderOpen(true);
          }}
          onDeletePO={handleDeletePO}
          onSeedSampleData={seedSampleDataToFirestore}
        />
      </main>

      {selectedPO && (
        <DetailModal po={selectedPO} onClose={() => setSelectedPO(null)} />
      )}

      {trackingPO && (
        <ShipmentTrackModal po={trackingPO} onClose={() => setTrackingPO(null)} />
      )}

      {isPPWROpen && (
        <PPWRModal
          store={ppwrFilesStore}
          onClose={() => setIsPPWROpen(false)}
          onAddFile={handleAddPPWRFile}
          onDeleteFile={handleDeletePPWRFile}
        />
      )}

      {isNewOrderOpen && (
        <OrderFormModal
          editingPO={editingPO}
          onClose={() => {
            setIsNewOrderOpen(false);
            setEditingPO(null);
          }}
          onSave={handleSavePO}
        />
      )}

      {isPrintSummaryOpen && (
        <PrintSummaryModal
          orders={filteredPOs}
          onClose={() => setIsPrintSummaryOpen(false)}
        />
      )}

      {passwordModalAction && (
        <PasswordModal
          actionType={passwordModalAction}
          onClose={() => setPasswordModalAction(null)}
          onConfirm={handleClearAllData}
        />
      )}
    </div>
  );
}

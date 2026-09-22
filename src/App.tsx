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
} from './lib/firestoreService';
import { db } from './lib/firebase';

export default function App() {
  // State: Data from Cloud Firestore - initialized clean with NO random or fake data
  const [productionData, setProductionData] = useState<PurchaseOrder[]>([]);
  const [ppwrFilesStore, setPpwrFilesStore] = useState<PPWRFilesStore>({
    declaration: [],
    testReport: [],
    technicalDataSheet: [],
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // State: Admin Mode
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  // State: Clock & Weather
  const [timeString, setTimeString] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData>({
    temp: 32,
    condition: 'Sunny',
    weatherCode: 0,
    iconName: 'sun',
  });

  // State: Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPoFilter, setSelectedPoFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // State: Modals
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<PurchaseOrder | null>(null);

  const [shipmentTrackOpen, setShipmentTrackOpen] = useState<boolean>(false);
  const [trackSelectedPo, setTrackSelectedPo] = useState<string>('');

  const [ppwrModalOpen, setPpwrModalOpen] = useState<boolean>(false);

  const [orderFormOpen, setOrderFormOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
  const [editIndex, setEditIndex] = useState<number>(-1);

  const [printSummaryOpen, setPrintSummaryOpen] = useState<boolean>(false);

  // Real-time Firestore Subscriptions - Live admin-entered data ONLY
  useEffect(() => {
    setIsSyncing(true);
    const unsubscribePOs = subscribePurchaseOrders(
      (data) => {
        setProductionData(data);
        setIsSyncing(false);
      },
      (err) => {
        console.warn('Firestore PO subscription:', err);
        setIsSyncing(false);
      }
    );

    const unsubscribePPWR = subscribePPWRFiles(
      (data) => {
        setPpwrFilesStore(data);
      },
      (err) => {
        console.warn('Firestore PPWR subscription:', err);
      }
    );

    return () => {
      unsubscribePOs();
      unsubscribePPWR();
    };
  }, []);

  // Live IST Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const optionsTime: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const formatted = new Intl.DateTimeFormat('en-US', optionsTime).format(now);
      setTimeString(formatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live Bhadohi Weather
  const fetchWeather = async () => {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=25.4058&longitude=82.5759&current=temperature_2m,weather_code&timezone=Asia%2FKolkata'
      );
      const data = await response.json();
      if (data && data.current) {
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const { text, icon } = getWeatherInfo(code);
        setWeather({
          temp,
          condition: text,
          weatherCode: code,
          iconName: icon,
        });
      }
    } catch {
      setWeather({
        temp: 32,
        condition: 'Clear',
        weatherCode: 0,
        iconName: 'sun',
      });
    }
  };

  useEffect(() => {
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherInfo = (code: number) => {
    switch (code) {
      case 0:
        return { text: 'Sunny', icon: 'sun' };
      case 1:
      case 2:
      case 3:
        return { text: 'Partly Cloudy', icon: 'cloud-sun' };
      case 45:
      case 48:
        return { text: 'Foggy', icon: 'cloud-fog' };
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return { text: 'Drizzle', icon: 'cloud-rain' };
      case 61:
      case 63:
      case 65:
        return { text: 'Rain', icon: 'cloud-rain' };
      case 71:
      case 73:
      case 75:
        return { text: 'Snow', icon: 'cloud-snow' };
      case 95:
      case 96:
      case 99:
        return { text: 'Thunderstorm', icon: 'cloud-lightning' };
      default:
        return { text: 'Clear', icon: 'sun' };
    }
  };

  // Filtered Production Data
  const filteredData = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return productionData.filter((item) => {
      const matchesPo = selectedPoFilter === 'ALL' || item.po === selectedPoFilter;
      const matchesSearch =
        !query ||
        item.po.toLowerCase().includes(query) ||
        item.appRef.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query)) ||
        item.designs.some(
          (d) => d.name.toLowerCase().includes(query) || d.batch.toLowerCase().includes(query)
        );

      let matchesStatus = true;
      if (selectedStatusFilter !== 'ALL') {
        matchesStatus = item.designs.some((d) => d.status === selectedStatusFilter);
      }

      return matchesPo && matchesSearch && matchesStatus;
    });
  }, [productionData, searchTerm, selectedPoFilter, selectedStatusFilter]);

  // Admin Toggle Handler
  const handleToggleAdmin = () => {
    if (adminMode) {
      setAdminMode(false);
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSuccess = () => {
    setAdminMode(true);
    setIsPasswordModalOpen(false);
  };

  // PO Detail View
  const handleViewDetails = (index: number) => {
    setSelectedDetailOrder(filteredData[index] || productionData[index] || null);
    setDetailModalOpen(true);
  };

  // Shipment Track Actions
  const handleOpenShipmentTrack = () => {
    if (productionData.length > 0 && !trackSelectedPo) {
      setTrackSelectedPo(productionData[0].po);
    }
    setShipmentTrackOpen(true);
  };

  const handleSelectShipmentForPo = (po: string) => {
    setTrackSelectedPo(po);
    setShipmentTrackOpen(true);
  };

  const handleUpdateMilestone = async (po: string, milestone: string) => {
    try {
      await updateMilestoneInFirestore(po, milestone);
    } catch (e) {
      console.error('Failed to update milestone in Firestore:', e);
      setProductionData((prev) =>
        prev.map((item) => (item.po === po ? { ...item, shipmentMilestone: milestone } : item))
      );
    }
  };

  // PO CRUD Actions
  const handleOpenCreatePo = () => {
    if (!adminMode) {
      setIsPasswordModalOpen(true);
      return;
    }
    setOrderToEdit(null);
    setEditIndex(-1);
    setOrderFormOpen(true);
  };

  const handleEditOrder = (index: number) => {
    if (!adminMode) return;
    const targetOrder = filteredData[index] || productionData[index];
    if (!targetOrder) return;
    const realIndex = productionData.findIndex((p) => p.po === targetOrder.po);
    setOrderToEdit(targetOrder);
    setEditIndex(realIndex);
    setOrderFormOpen(true);
  };

  const handleDeleteOrder = async (index: number) => {
    if (!adminMode) return;
    const itemToDelete = filteredData[index] || productionData[index];
    if (!itemToDelete) return;
    if (window.confirm(`Are you sure you want to delete purchase order ${itemToDelete.po}?`)) {
      try {
        await deletePurchaseOrderFromFirestore(itemToDelete.po);
      } catch (e) {
        console.error('Failed to delete PO from Firestore:', e);
        setProductionData((prev) => prev.filter((p) => p.po !== itemToDelete.po));
      }
    }
  };

  const handleSaveOrder = async (newOrder: PurchaseOrder, _index: number) => {
    try {
      await savePurchaseOrderToFirestore(newOrder);
    } catch (e) {
      console.error('Failed to save PO to Firestore:', e);
      setProductionData((prev) => {
        const exists = prev.some((p) => p.po === newOrder.po);
        if (exists) {
          return prev.map((p) => (p.po === newOrder.po ? newOrder : p));
        }
        return [newOrder, ...prev];
      });
    }
  };

  const handleClearData = async () => {
    if (!adminMode) return;
    if (window.confirm('Are you sure you want to delete all records from Firestore? This action cannot be undone.')) {
      try {
        await clearAllFirestoreData();
        setProductionData([]);
        setPpwrFilesStore({ declaration: [], testReport: [], technicalDataSheet: [] });
      } catch (e) {
        console.error('Failed to clear Firestore data:', e);
      }
    }
  };

  // PPWR Actions
  const handleUploadPpwrFile = async (category: keyof PPWRFilesStore, file: any) => {
    try {
      await savePPWRFileToFirestore(category, file);
    } catch (e) {
      console.error('Failed to save PPWR file to Firestore:', e);
      setPpwrFilesStore((prev) => ({
        ...prev,
        [category]: [file, ...(prev[category] || [])],
      }));
    }
  };

  const handleDeletePpwrFile = async (category: keyof PPWRFilesStore, fileId: string) => {
    if (!adminMode) return;
    if (window.confirm('Are you sure you want to delete this document from Firestore?')) {
      try {
        await deletePPWRFileFromFirestore(fileId);
      } catch (e) {
        console.error('Failed to delete PPWR file from Firestore:', e);
        setPpwrFilesStore((prev) => ({
          ...prev,
          [category]: prev[category].filter((f) => f.id !== fileId),
        }));
      }
    }
  };

  return (
    <div className="bg-[#FFFFFF] text-slate-800 min-h-screen flex flex-col antialiased">
      {/* Top Header Navigation */}
      <Header
        timeString={timeString}
        weather={weather}
        adminMode={adminMode}
        isSyncing={isSyncing}
        onToggleAdmin={handleToggleAdmin}
        onOpenCreatePo={handleOpenCreatePo}
        onOpenShipmentTrack={handleOpenShipmentTrack}
        onOpenPPWR={() => setPpwrModalOpen(true)}
        onOpenPrintReport={() => setPrintSummaryOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* KPI Cards Row */}
        <KPICards productionData={productionData} />

        {/* Controls & Filters Bar */}
        <ControlsBar
          productionData={productionData}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedPoFilter={selectedPoFilter}
          onPoFilterChange={setSelectedPoFilter}
          selectedStatusFilter={selectedStatusFilter}
          onStatusFilterChange={setSelectedStatusFilter}
          adminMode={adminMode}
          onOpenCreatePo={handleOpenCreatePo}
          onClearData={handleClearData}
        />

        {/* Main Production Orders Table */}
        <ProductionTable
          filteredData={filteredData}
          allData={productionData}
          adminMode={adminMode}
          onViewDetails={handleViewDetails}
          onSelectShipmentPo={handleSelectShipmentForPo}
          onEditOrder={handleEditOrder}
          onDeleteOrder={handleDeleteOrder}
        />
      </main>

      {/* Detail Breakdown Modal */}
      <DetailModal
        order={selectedDetailOrder}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* Shipment Track 9-Step Milestone Modal */}
      <ShipmentTrackModal
        isOpen={shipmentTrackOpen}
        onClose={() => setShipmentTrackOpen(false)}
        productionData={productionData}
        selectedPoNumber={trackSelectedPo || (productionData[0]?.po ?? '')}
        onSelectPo={setTrackSelectedPo}
        adminMode={adminMode}
        onUnlockAdmin={() => {
          setShipmentTrackOpen(false);
          setIsPasswordModalOpen(true);
        }}
        onUpdateMilestone={handleUpdateMilestone}
      />

      {/* PPWR Compliance Management Modal */}
      <PPWRModal
        isOpen={ppwrModalOpen}
        onClose={() => setPpwrModalOpen(false)}
        ppwrFilesStore={ppwrFilesStore}
        adminMode={adminMode}
        productionData={productionData}
        onUploadFile={handleUploadPpwrFile}
        onDeleteFile={handleDeletePpwrFile}
      />

      {/* Create / Edit Purchase Order Form Modal */}
      <OrderFormModal
        isOpen={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        orderToEdit={orderToEdit}
        editIndex={editIndex}
        onSaveOrder={handleSaveOrder}
      />

      {/* Print Summary A4 Official Report Modal */}
      <PrintSummaryModal
        isOpen={printSummaryOpen}
        onClose={() => setPrintSummaryOpen(false)}
        productionData={productionData}
      />

      {/* Admin Passcode Authentication Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}

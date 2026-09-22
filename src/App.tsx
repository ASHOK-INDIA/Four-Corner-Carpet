import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, PPWRFilesStore, WeatherData, ForecastComment } from './types';
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
import { ContainerStuffingModal } from './components/ContainerStuffingModal';
import { CompetitorIntelligenceModal } from './components/CompetitorIntelligenceModal';
import {
  subscribePurchaseOrders,
  subscribePPWRFiles,
  savePurchaseOrderToFirestore,
  updateMilestoneInFirestore,
  deletePurchaseOrderFromFirestore,
  savePPWRFileToFirestore,
  deletePPWRFileFromFirestore,
  clearAllFirestoreData,
  subscribeForecastComments,
  saveForecastCommentToFirestore,
} from './lib/firestoreService';

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

  // State: Weather
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
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<PurchaseOrder | null>(null);

  const [printSummaryOpen, setPrintSummaryOpen] = useState<boolean>(false);

  // State: New Modules (3D CBM & Competitor Intel)
  const [is3DContainerOpen, setIs3DContainerOpen] = useState<boolean>(false);
  const [isCompetitorIntelOpen, setIsCompetitorIntelOpen] = useState<boolean>(false);

  // State: Buyer Forecast Comments
  const [buyerComment, setBuyerComment] = useState<string>('');
  const [commentsList, setCommentsList] = useState<ForecastComment[]>([]);

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

    const unsubscribeComments = subscribeForecastComments(
      (data) => {
        setCommentsList(data);
      },
      (err) => {
        console.warn('Firestore Comments subscription:', err);
      }
    );

    return () => {
      unsubscribePOs();
      unsubscribePPWR();
      unsubscribeComments();
    };
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

  // Helper to auto-close any open background popups when a new popup is requested
  const closeAllModals = () => {
    setDetailModalOpen(false);
    setShipmentTrackOpen(false);
    setPpwrModalOpen(false);
    setOrderFormOpen(false);
    setPrintSummaryOpen(false);
    setIs3DContainerOpen(false);
    setIsCompetitorIntelOpen(false);
    setIsPasswordModalOpen(false);
  };

  // Admin Toggle Handler
  const handleToggleAdmin = () => {
    if (adminMode) {
      setAdminMode(false);
    } else {
      closeAllModals();
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSuccess = () => {
    setAdminMode(true);
    setIsPasswordModalOpen(false);
  };

  // PO Detail View
  const handleViewDetails = (index: number) => {
    closeAllModals();
    setSelectedDetailOrder(filteredData[index] || productionData[index] || null);
    setDetailModalOpen(true);
  };

  // Shipment Track Actions
  const handleOpenShipmentTrack = () => {
    closeAllModals();
    if (productionData.length > 0 && !trackSelectedPo) {
      setTrackSelectedPo(productionData[0].po);
    }
    setShipmentTrackOpen(true);
  };

  const handleSelectShipmentForPo = (po: string) => {
    closeAllModals();
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
    closeAllModals();
    if (!adminMode) {
      setIsPasswordModalOpen(true);
      return;
    }
    setOrderToEdit(null);
    setEditIndex(-1);
    setOrderFormOpen(true);
  };

  const handleEditOrder = (realIndex: number) => {
    closeAllModals();
    if (!adminMode) return;
    const targetOrder = productionData[realIndex];
    if (!targetOrder) return;
    setOrderToEdit(targetOrder);
    setEditIndex(realIndex);
    setOrderFormOpen(true);
  };

  const handleDeleteOrder = async (realIndex: number) => {
    if (!adminMode) return;
    const itemToDelete = productionData[realIndex];
    if (!itemToDelete) return;
    setDeleteConfirmOrder(itemToDelete);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    try {
      await deletePurchaseOrderFromFirestore(deleteConfirmOrder.po);
      setProductionData((prev) => prev.filter((p) => p.po !== deleteConfirmOrder.po));
      setDeleteConfirmOrder(null);
    } catch (e) {
      console.error('Failed to delete PO from Firestore:', e);
      setDeleteConfirmOrder(null);
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerComment.trim()) return;
    try {
      await saveForecastCommentToFirestore(buyerComment.trim());
      setBuyerComment('');
      alert('Thank you! Your forecast comment has been submitted and saved to the database in real-time.');
    } catch (err) {
      console.error('Failed to save forecast comment in real-time:', err);
      alert('Failed to save your plan to the database. Please try again.');
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-[#E4002B] selection:text-white">
      {/* Top Header Navigation */}
      <Header
        weather={weather}
        adminMode={adminMode}
        isSyncing={isSyncing}
        onToggleAdmin={handleToggleAdmin}
        onOpenCreatePo={handleOpenCreatePo}
        onOpenShipmentTrack={handleOpenShipmentTrack}
        onOpenPPWR={() => {
          closeAllModals();
          setPpwrModalOpen(true);
        }}
        onOpenPrintReport={() => {
          closeAllModals();
          setPrintSummaryOpen(true);
        }}
        onOpen3DContainer={() => {
          closeAllModals();
          setIs3DContainerOpen(true);
        }}
        onOpenCompetitorIntel={() => {
          closeAllModals();
          setIsCompetitorIntelOpen(true);
        }}
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

      {/* Interactive Footer & Moving Forecast Board */}
      <footer className="mt-12 bg-white border-t border-slate-200 text-slate-800">
        {/* Moving News Ticker */}
        <div className="bg-[#EF3340] text-white py-2 overflow-hidden relative border-b border-rose-700 select-none">
          <div className="animate-marquee whitespace-nowrap flex gap-12 text-xs font-mono font-bold uppercase tracking-wider">
            <span>🌟 We are waiting your next order •</span>
            <span>🌟 We are waiting your next order •</span>
            <span>🌟 We are waiting your next order •</span>
            <span>🌟 We are waiting your next order •</span>
            <span>🌟 We are waiting your next order •</span>
            <span>🌟 We are waiting your next order •</span>
          </div>
        </div>

        {/* Comment Box & Interactive Planner Board */}
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Form Side */}
          <div className="md:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EF3340] animate-ping"></span>
              Submit Forecast & Next Order Plan
            </h3>
            <p className="text-xs text-slate-500">
              Share your forecasted volumes, size demands, or upcoming production timelines to reserve priority batches.
            </p>
            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                value={buyerComment}
                onChange={(e) => setBuyerComment(e.target.value)}
                placeholder="Write your forecast or next order plan here..."
                rows={3}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EF3340] resize-none"
              ></textarea>
              <button
                type="submit"
                className="w-full py-2 bg-[#EF3340] hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Submit Comment Plan
              </button>
            </form>
          </div>

          {/* List Side */}
          <div className="md:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 max-h-[280px] overflow-y-auto custom-scrollbar">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Buyer Plan & Forecast Board ({commentsList.length} Comments)
            </h4>
            <div className="space-y-3">
              {commentsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  No upcoming plans submitted yet. Share your next order plan on the left!
                </div>
              ) : (
                commentsList.map((cmt, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 text-[#EF3340] font-bold flex items-center justify-center font-mono flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 font-sans leading-relaxed break-words">{cmt.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </footer>

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

      {/* 3D Container Stuffing & CBM Calculator Modal */}
      <ContainerStuffingModal
        isOpen={is3DContainerOpen}
        onClose={() => setIs3DContainerOpen(false)}
        productionData={productionData}
        adminMode={adminMode}
      />

      {/* Competitor Intelligence Modal (German & EU Kids Brands, Chairs, Rugs) */}
      <CompetitorIntelligenceModal
        isOpen={isCompetitorIntelOpen}
        onClose={() => setIsCompetitorIntelOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-rose-700 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete purchase order <span className="font-bold text-rose-700">{deleteConfirmOrder.po}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmOrder(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteOrder}
                className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

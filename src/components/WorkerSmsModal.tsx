import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Users, 
  History, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  Factory, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Loader2, 
  Check,
  AlertCircle
} from 'lucide-react';
import { WorkerSmsAlert, ManufacturerWorker, PurchaseOrder } from '../types';
import { PasswordModal } from './PasswordModal';
import { 
  subscribeWorkerSmsAlerts, 
  saveWorkerSmsAlertToFirestore, 
  deleteWorkerSmsAlertFromFirestore,
  subscribeManufacturerWorkers,
  saveManufacturerWorkerToFirestore
} from '../lib/firestoreService';

interface WorkerSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData?: PurchaseOrder[];
  preselectedPoNumber?: string;
}

export const WorkerSmsModal: React.FC<WorkerSmsModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  preselectedPoNumber = ''
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'directory' | 'logs'>('compose');
  const [workers, setWorkers] = useState<ManufacturerWorker[]>([]);
  const [alerts, setAlerts] = useState<WorkerSmsAlert[]>([]);
  
  // Compose Form State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [customWorkerName, setCustomWorkerName] = useState<string>('');
  const [customWorkerPhone, setCustomWorkerPhone] = useState<string>('');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>(preselectedPoNumber || '');
  const [selectedStage, setSelectedStage] = useState<string>('Weaving & Tufting');
  const [messageBody, setMessageBody] = useState<string>('');
  
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccessNotice, setSentSuccessNotice] = useState<string | null>(null);
  
  // Add New Worker State
  const [isAddingWorker, setIsAddingWorker] = useState<boolean>(false);
  const [newWorkerName, setNewWorkerName] = useState<string>('');
  const [newWorkerPhone, setNewWorkerPhone] = useState<string>('');
  const [newWorkerRole, setNewWorkerRole] = useState<string>('Master Weaver');
  const [newWorkerUnit, setNewWorkerUnit] = useState<string>('Unit 1 - Bhadohi');
  
  // Auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Subscribe to Workers and SMS Alerts from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const unsubAlerts = subscribeWorkerSmsAlerts((data) => setAlerts(data));
    
    // Only subscribe to workers if authenticated
    let unsubWorkers: () => void;
    if (isAdminAuthenticated) {
      unsubWorkers = subscribeManufacturerWorkers((data) => {
        setWorkers(data);
        if (data.length > 0 && !selectedWorkerId) {
          setSelectedWorkerId(data[0].id);
        }
      });
    }

    return () => {
      unsubAlerts();
      if (unsubWorkers) unsubWorkers();
    };
  }, [isOpen, isAdminAuthenticated]);

  useEffect(() => {
    if (preselectedPoNumber) {
      setSelectedPoNumber(preselectedPoNumber);
    } else if (productionData.length > 0 && !selectedPoNumber) {
      setSelectedPoNumber(productionData[0].po);
    }
  }, [preselectedPoNumber, productionData]);

  if (!isOpen) return null;

  // Authentication check for directory
  const handleTabChange = (tab: 'compose' | 'directory' | 'logs') => {
    if (tab === 'directory' && !isAdminAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab(tab);
  };


  // Selected Worker Object
  const currentWorker = workers.find(w => w.id === selectedWorkerId);

  // Apply Quick Template
  const applyTemplate = (templateType: string) => {
    const poStr = selectedPoNumber ? `PO #${selectedPoNumber}` : 'PO #1128405';
    switch (templateType) {
      case 'dyeing':
        setMessageBody(`🚀 YARN DYEING: ${poStr} - Color shade approved. Please begin yarn dyeing batch at Colorway Studio.`);
        break;
      case 'weaving':
        setMessageBody(`🧵 WEAVING ALERT: ${poStr} - Yarn batch delivered to Loom Unit. Start weaving & tufting immediately.`);
        break;
      case 'qa':
        setMessageBody(`🔍 QUALITY CHECK: ${poStr} - Production batch completed. Please perform QA inspection at Terminal A.`);
        break;
      case 'packing':
        setMessageBody(`📦 PACKAGING ALERT: ${poStr} - QA cleared! Prepare export palletizing & wooden crate packing.`);
        break;
      case 'urgent':
        setMessageBody(`⚡ URGENT UPDATE: ${poStr} - Revision specs updated by client. Check PO dashboard before starting batch.`);
        break;
    }
  };

  // Dispatch SMS Alert
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const recipientPhone = currentWorker ? currentWorker.phone : customWorkerPhone;
    const recipientName = currentWorker ? currentWorker.name : (customWorkerName || 'Worker');
    const recipientRole = currentWorker ? currentWorker.role : 'Manufacturer Worker';

    if (!recipientPhone.trim()) {
      alert('Please select a worker or enter a valid mobile number.');
      return;
    }
    if (!messageBody.trim()) {
      alert('Please type an SMS alert message.');
      return;
    }

    try {
      setIsSending(true);

      // Call Express server API endpoint
      const apiRes = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerPhone: recipientPhone,
          workerName: recipientName,
          poNumber: selectedPoNumber,
          stage: selectedStage,
          message: messageBody,
          sentBy: 'Admin / Production Lead'
        })
      });

      const apiData = await apiRes.json();

      // Save Alert to Firestore
      const newAlert: WorkerSmsAlert = {
        id: `sms_${Date.now()}`,
        poNumber: selectedPoNumber || '1128405',
        workerName: recipientName,
        workerPhone: recipientPhone,
        workerRole: recipientRole,
        stage: selectedStage,
        message: messageBody,
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
        sentBy: 'Admin / Production Manager'
      };

      await saveWorkerSmsAlertToFirestore(newAlert);

      setSentSuccessNotice(`SMS Alert successfully dispatched to ${recipientName} (${recipientPhone})!`);
      setTimeout(() => setSentSuccessNotice(null), 4000);

      // Reset message
      setMessageBody('');
      setActiveTab('logs');
    } catch (err) {
      console.error('Failed to send SMS:', err);
      alert('Failed to dispatch SMS alert.');
    } finally {
      setIsSending(false);
    }
  };

  // Register New Worker
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerPhone.trim()) {
      alert('Worker name and phone number are required.');
      return;
    }

    try {
      const newWrk: ManufacturerWorker = {
        id: `wrk_${Date.now()}`,
        name: newWorkerName,
        phone: newWorkerPhone,
        role: newWorkerRole,
        unit: newWorkerUnit,
        activeOrdersCount: 0
      };

      await saveManufacturerWorkerToFirestore(newWrk);
      setNewWorkerName('');
      setNewWorkerPhone('');
      setIsAddingWorker(false);
      alert(`Worker ${newWorkerName} registered successfully!`);
    } catch (err) {
      console.error('Error saving worker:', err);
      alert('Failed to register worker.');
    }
  };

  // Delete Alert Log
  const handleDeleteAlertLog = async (id: string) => {
    if (!window.confirm('Delete this SMS alert log?')) return;
    try {
      await deleteWorkerSmsAlertFromFirestore(id);
    } catch (err) {
      console.error('Error deleting SMS alert log:', err);
    }
  };

  const filteredLogs = alerts.filter(a => 
    a.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.workerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-wide uppercase font-sans">
                  Worker SMS Alert Gateway
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  GSM Active
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-sans">
                Real-time SMS Dispatch to Carpet Artisans, Dyeing Leads, Weavers & QA Supervisors
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTabChange('compose')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send SMS Alert</span>
            </button>

            <button
              onClick={() => handleTabChange('directory')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Worker Directory ({workers.length})</span>
            </button>

            <button
              onClick={() => handleTabChange('logs')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Dispatch Logs ({alerts.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fast2SMS / MSG91 API Online</span>
          </div>
        </div>

        {/* Authentication Modal */}
        {showAuthModal && (
          <PasswordModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setIsAdminAuthenticated(true);
              setShowAuthModal(false);
              setActiveTab('directory');
            }}
          />
        )}

        {/* Success Alert Banner */}
        {sentSuccessNotice && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-inner shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{sentSuccessNotice}</span>
            </div>
            <button onClick={() => setSentSuccessNotice(null)} className="text-white hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6 custom-scrollbar">
          
          {/* TAB 1: COMPOSE & DISPATCH SMS */}
          {activeTab === 'compose' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Form: SMS Options */}
              <form onSubmit={handleSendSms} className="md:col-span-2 space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 font-sans">
                    <Send className="w-4 h-4 text-indigo-600" />
                    <span>Compose Worker Alert SMS</span>
                  </h3>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    Direct Carrier Dispatch
                  </span>
                </div>

                {/* Recipient Worker Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Select Manufacturer Worker / Artisan:
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="" disabled>-- Choose Worker --</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role}) — {w.phone}
                      </option>
                    ))}
                    <option value="custom">✏️ Enter Custom Mobile Number...</option>
                  </select>
                </div>

                {/* Custom Worker Phone if custom selected */}
                {selectedWorkerId === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <div>
                      <label className="text-[11px] font-bold text-amber-900 block mb-1">Worker Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Shyam Weaver"
                        value={customWorkerName}
                        onChange={(e) => setCustomWorkerName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-amber-900 block mb-1">Mobile Number:</label>
                      <input
                        type="text"
                        placeholder="+91 98765 00000"
                        value={customWorkerPhone}
                        onChange={(e) => setCustomWorkerPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Target PO & Stage */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Purchase Order Ref:
                    </label>
                    <select
                      value={selectedPoNumber}
                      onChange={(e) => setSelectedPoNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      {productionData.length > 0 ? (
                        productionData.map((po) => (
                          <option key={po.po} value={po.po}>
                            PO #{po.po} ({po.appRef || 'Order'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="1128405">PO #1128405 (Checks Wool)</option>
                          <option value="1128408">PO #1128408 (Tufted Runner)</option>
                          <option value="1128410">PO #1128410 (Dyeing Order)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Production Stage:
                    </label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Yarn Dyeing">🎨 Yarn Dyeing & Color Matching</option>
                      <option value="Weaving & Tufting">🧵 Weaving & Loom Tufting</option>
                      <option value="Binding & Shearing">✂️ Shearing, Binding & Backing</option>
                      <option value="Quality Inspection">🔍 Final Quality & EU Inspection</option>
                      <option value="Packaging & Dispatch">📦 Palletizing & Wooden Crate Packing</option>
                    </select>
                  </div>
                </div>

                {/* Message Body Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-700">
                      SMS Alert Message:
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {messageBody.length} / 160 Chars (1 SMS)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type urgent SMS message for artisan worker or click quick templates below..."
                    className="w-full p-3 text-xs font-sans bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Dispatch Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Transmitting SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span>Dispatch SMS Alert Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Right Sidebar: Quick Templates & Recipient Preview */}
              <div className="space-y-4">
                
                {/* Active Recipient Card */}
                <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm border border-indigo-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold block">
                    Target Recipient
                  </span>
                  {currentWorker ? (
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{currentWorker.name}</h4>
                      <p className="text-xs text-indigo-200 mt-0.5">{currentWorker.role}</p>
                      <div className="mt-2 pt-2 border-t border-indigo-800/80 flex items-center justify-between text-xs font-mono text-indigo-300">
                        <span>{currentWorker.phone}</span>
                        <span className="px-2 py-0.5 bg-indigo-800 rounded text-[10px]">{currentWorker.unit}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-indigo-200">
                      Enter custom mobile number or select a registered worker from dropdown.
                    </div>
                  )}
                </div>

                {/* Quick Templates Panel */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick SMS Templates</span>
                  </h4>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => applyTemplate('dyeing')}
                      className="w-full text-left p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] transition text-slate-700 hover:text-indigo-900 cursor-pointer font-medium"
                    >
                      🎨 Yarn Dyeing Shade Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('weaving')}
                      className="w-full text-left p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] transition text-slate-700 hover:text-indigo-900 cursor-pointer font-medium"
                    >
                      🧵 Weaving Start Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('qa')}
                      className="w-full text-left p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] transition text-slate-700 hover:text-indigo-900 cursor-pointer font-medium"
                    >
                      🔍 Final Quality Inspection
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('packing')}
                      className="w-full text-left p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] transition text-slate-700 hover:text-indigo-900 cursor-pointer font-medium"
                    >
                      📦 Crate Packing & Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('urgent')}
                      className="w-full text-left p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-[11px] transition cursor-pointer font-bold"
                    >
                      ⚡ Urgent Spec Revision
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: WORKER DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-sans">
                    Manufacturer Worker Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registered carpet artisans, dyeing leads, loom masters, and quality controllers
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingWorker(!isAddingWorker)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Worker</span>
                </button>
              </div>

              {/* Add New Worker Form Panel */}
              {isAddingWorker && (
                <form onSubmit={handleSaveWorker} className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide">
                    Register New Manufacturer Worker
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Bind"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Mobile Phone:</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={newWorkerPhone}
                        onChange={(e) => setNewWorkerPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Role / Designation:</label>
                      <input
                        type="text"
                        placeholder="e.g. Shearing Master"
                        value={newWorkerRole}
                        onChange={(e) => setNewWorkerRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Unit / Plant Location:</label>
                      <input
                        type="text"
                        placeholder="e.g. Unit 3 Bhadohi"
                        value={newWorkerUnit}
                        onChange={(e) => setNewWorkerUnit(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingWorker(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Save Worker Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map((w) => (
                  <div key={w.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900">{w.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded">
                          {w.phone}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 font-medium">{w.role}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{w.unit}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWorkerId(w.id);
                        setActiveTab('compose');
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send className="w-3 h-3 text-indigo-600" />
                      <span>Send Alert</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SMS DISPATCH LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter SMS logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <span className="text-xs font-mono text-slate-500">
                  Total Dispatched Logs: <strong className="text-slate-900">{filteredLogs.length}</strong>
                </span>
              </div>

              {/* Logs List */}
              <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No SMS alert logs match your filter.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative group">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {log.status}
                          </span>
                          <span className="font-extrabold text-xs text-slate-900">{log.workerName}</span>
                          <span className="text-[11px] font-mono text-slate-500">({log.workerPhone})</span>
                        </div>

                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
                          <span>PO #{log.poNumber}</span>
                          <span>•</span>
                          <span>{new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          
                          <button
                            onClick={() => handleDeleteAlertLog(log.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 transition"
                            title="Delete Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 font-sans leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        "{log.message}"
                      </p>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Stage: <strong className="text-indigo-700">{log.stage}</strong></span>
                        <span>Sender: {log.sentBy || 'Admin'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default WorkerSmsModal;

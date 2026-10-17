import React, { useState, useMemo } from 'react';
import {
  Globe,
  Ship,
  Box,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  ShieldCheck,
  Thermometer,
  Droplets,
  Share2,
  Copy,
  ExternalLink,
  Search,
  Check,
  X,
  Printer,
  Compass
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { PageFlipModal } from './PageFlipModal';

interface BuyerTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData?: PurchaseOrder[];
  selectedPoNumber?: string;
}

export const BuyerTrackingModal: React.FC<BuyerTrackingModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  selectedPoNumber = ''
}) => {
  const [activePo, setActivePo] = useState<string>(selectedPoNumber || '');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'CONTAINER' | 'DOCS'>('TIMELINE');

  // Select order
  const currentOrder = useMemo(() => {
    if (activePo) {
      const match = productionData.find((p) => p.po.toLowerCase() === activePo.toLowerCase());
      if (match) return match;
    }
    if (selectedPoNumber) {
      const match = productionData.find((p) => p.po.toLowerCase() === selectedPoNumber.toLowerCase());
      if (match) return match;
    }
    return productionData[0] || null;
  }, [productionData, activePo, selectedPoNumber]);

  if (!isOpen) return null;

  const po = currentOrder?.po || '1128405';
  const buyer = currentOrder?.appRef || 'Poptop Handels GmbH';
  const milestone = currentOrder?.shipmentMilestone || '5. Container Stuffing & Sealing';

  const TRACKING_STEPS = [
    {
      step: 1,
      title: 'Order Confirmed & Yarn Dyeing',
      date: 'May 02, 2025',
      desc: 'Raw wool batch dyed with eco-friendly Swiss dyes. Lab dips approved.',
      status: 'COMPLETED'
    },
    {
      step: 2,
      title: 'Loom Weaving & Hand-Tufting',
      date: 'May 10, 2025',
      desc: 'High density tufting completed on Master Looms at Bhadohi factory.',
      status: 'COMPLETED'
    },
    {
      step: 3,
      title: 'Washing, Latex Backing & Shearing',
      date: 'May 16, 2025',
      desc: 'Organic herbal wash, secondary natural latex vulcanization & level shearing.',
      status: 'COMPLETED'
    },
    {
      step: 4,
      title: 'Digital QC & AQL 2.5 Inspection',
      date: 'May 18, 2025',
      desc: 'Zero critical defects. Moisture content 8.4% (<12% ceiling). QC Passed.',
      status: 'COMPLETED'
    },
    {
      step: 5,
      title: 'Pallet Packaging & Container Stuffing',
      date: 'May 20, 2025',
      desc: 'Heat-treated wooden pallets, 200 gauge shrink wrap & corner protectors.',
      status: milestone.includes('Stuffing') || milestone.includes('Transit') || milestone.includes('Customs') || milestone.includes('Delivered') ? 'CURRENT' : 'PENDING'
    },
    {
      step: 6,
      title: 'Port Clearance & Sea Transit',
      date: 'May 26, 2025',
      desc: 'Loaded onto MSC Paloma vessel via Nhava Sheva (JNPT) port bound for Europe.',
      status: milestone.includes('Transit') || milestone.includes('Delivered') ? 'CURRENT' : 'PENDING'
    },
    {
      step: 7,
      title: 'Port Arrival & Destination Delivery',
      date: 'June 18, 2025',
      desc: 'Arrival at European destination hub (Vienna / Traiskirchen, Austria).',
      status: milestone.includes('Delivered') ? 'COMPLETED' : 'PENDING'
    }
  ];

  const handleCopyLink = () => {
    const trackingUrl = `${window.location.origin}/?trackPo=${encodeURIComponent(po)}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-5xl" id="buyerTrackingModal">
      <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[85vh] max-h-[880px]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Globe className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">Buyer Live Order Tracking Portal</h2>
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full uppercase">
                  ● LIVE SATELLITE SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-Time Consignment Progress, Container Condition & Milestone Tracking for International Buyers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Share / Copy Tracking Link */}
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-sky-400/40"
              title="Copy shareable tracking link to send to buyer via email/WhatsApp"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Tracking Link'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PO Switcher & Status Bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase">Track PO:</span>
            <select
              value={po}
              onChange={(e) => setActivePo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 cursor-pointer shadow-2xs"
            >
              {productionData.map((p) => (
                <option key={p.po} value={p.po}>
                  PO #{p.po} — {p.appRef}
                </option>
              ))}
              {productionData.length === 0 && <option value="1128405">PO #1128405 — poptop GmbH</option>}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Buyer Destination:</span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Vienna / Traiskirchen, Austria 🇦🇹</span>
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {/* Active Order Summary Banner */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Consignment Reference
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">PO #{po}</h3>
              <p className="text-xs text-slate-600">
                Consignee: <span className="font-bold text-slate-900">{buyer}</span> | Origin:{' '}
                <span className="font-bold text-slate-900">Bhadohi, India</span>
              </p>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estimated Delivery</div>
                <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5 justify-end">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>June 18, 2025</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">On Schedule (Direct Vessel)</span>
              </div>
            </div>
          </div>

          {/* Container & Vessel Sensor Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Container Details */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <Box className="w-5 h-5 text-indigo-600" />
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  40FT HC Container
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500">Container & Seal ID</div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5">MSKU-9482014</div>
              <p className="text-[10px] text-slate-500 mt-1">High Security Seal: #SEAL-99482</p>
            </div>

            {/* Vessel Tracking */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <Ship className="w-5 h-5 text-sky-600" />
                <span className="text-[10px] font-black bg-sky-50 text-sky-700 px-2 py-0.5 rounded">
                  Maersk / MSC Line
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500">Vessel & Voyage</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">MSC PALOMA / V.049W</div>
              <p className="text-[10px] text-slate-500 mt-1">Bill of Lading: MEDUM984102</p>
            </div>

            {/* Container Environment Telemetry */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                  Dry Guard Sensor
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500">Interior Environment</div>
              <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1 text-slate-800">
                  <Thermometer className="w-4 h-4 text-amber-500" />
                  21.5°C
                </span>
                <span className="flex items-center gap-1 text-sky-700">
                  <Droplets className="w-4 h-4 text-sky-500" />
                  48% RH
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Desiccant bags dry & active</p>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Consignment Progress Milestones</span>
            </h4>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {TRACKING_STEPS.map((st) => (
                <div key={st.step} className="relative">
                  <div
                    className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      st.status === 'COMPLETED'
                        ? 'border-emerald-500 bg-emerald-500'
                        : st.status === 'CURRENT'
                        ? 'border-sky-500 bg-sky-500 ring-4 ring-sky-500/20'
                        : 'border-slate-300'
                    }`}
                  >
                    {st.status === 'COMPLETED' && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{st.title}</span>
                      {st.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md uppercase">
                          Done
                        </span>
                      )}
                      {st.status === 'CURRENT' && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-md uppercase animate-pulse">
                          In Progress
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">{st.date}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageFlipModal>
  );
};

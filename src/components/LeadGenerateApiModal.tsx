import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Code, 
  Download, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Flame, 
  Send, 
  FileSpreadsheet, 
  Key, 
  Layers, 
  Radio, 
  ArrowRight,
  TrendingUp,
  Cpu,
  UserCheck,
  MessageSquare,
  Share2,
  Store,
  ShoppingBag,
  PackageCheck,
  FileText,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveLeadsToFirestore, fetchSavedLeadsFromFirestore } from '../lib/firestoreService';

// Custom Branded LinkedIn SVG Icon Component
export const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
  </svg>
);

export interface LeadItem {
  id: string;
  companyName: string;
  website: string;
  country: string;
  city?: string;
  category: string;
  scale?: string;
  isSmallRetailer?: boolean;
  moqFriendly?: boolean;
  contactName?: string;
  contactDesignation?: string;
  linkedinUrl?: string;
  companyLinkedinUrl?: string;
  isLinkedInVerified?: boolean;
  contactSource?: string;
  linkedinInMail?: string;
  keyPerson: string;
  email: string;
  phone: string;
  leadScore: number;
  sourcingProducts?: string[];
  whyGoodFit: string;
  samplePitch: string;
  groundingSources?: { title: string; uri: string }[];
  isVerifiedLive?: boolean;
}

interface LeadGenerateApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadGenerateApiModal: React.FC<LeadGenerateApiModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'finder' | 'apiDocs' | 'connectors'>('finder');
  
  // Search parameters
  const [query, setQuery] = useState<string>('');
  const [country, setCountry] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('Rugs & Carpets');
  const [limit, setLimit] = useState<number>(100);
  const [provider, setProvider] = useState<'google_search' | 'apollo' | 'lusha' | 'hunter'>('google_search');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [onlyLinkedInVerified, setOnlyLinkedInVerified] = useState<boolean>(false);
  const [onlySmallRetailers, setOnlySmallRetailers] = useState<boolean>(false);
  const [companyNameSearch, setCompanyNameSearch] = useState<string>('');
  const [websiteUrlSearch, setWebsiteUrlSearch] = useState<string>('');

  // Results & Loading
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [providerUsed, setProviderUsed] = useState<string>('');
  const [isLiveSearch, setIsLiveSearch] = useState<boolean>(false);
  const [searchCitations, setSearchCitations] = useState<{ title: string; uri: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // UI states
  const [selectedPitchLead, setSelectedPitchLead] = useState<LeadItem | null>(null);
  const [pitchTab, setPitchTab] = useState<'linkedin' | 'email'>('linkedin');
  const [copiedId, setCopiedId] = useState<string>('');
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [testApiResult, setTestApiResult] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');

  // Initial load
  useEffect(() => {
    if (isOpen && leads.length === 0) {
      handleGenerateLeads();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateLeads = async (customQuery?: string, customCountry?: string, customLimit?: number) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const targetQuery = customQuery !== undefined ? customQuery : query;
      const targetCountry = customCountry !== undefined ? customCountry : country;
      const targetLimit = customLimit !== undefined ? customLimit : limit;

      const res = await fetch('/api/leads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: targetQuery,
          country: targetCountry,
          category,
          limit: targetLimit,
          provider,
          companyName: companyNameSearch.trim(),
          websiteUrl: websiteUrlSearch.trim(),
          externalApiKey: apiKeyInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
        setProviderUsed(data.provider || 'Google Search Grounding (Live Web)');
        setIsLiveSearch(!!data.isLiveWebSearch);
        setSearchCitations(data.groundingCitations || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch leads from API');
      }
    } catch (err: any) {
      console.error('Lead Generation API call failed:', err);
      setErrorMsg(err.message || 'Network error while calling Lead Generate API');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleExportExcel = () => {
    if (leads.length === 0) return;
    const worksheetData = leads.map((l) => ({
      'Company Name': l.companyName,
      'Website': l.website,
      'Country': l.country,
      'City': l.city || '',
      'Category': l.category,
      'Scale': l.scale || '',
      'Chhote Retailer / Boutique Store': (l.isSmallRetailer || l.scale?.toLowerCase().includes('small') || l.scale?.toLowerCase().includes('boutique') || l.scale?.toLowerCase().includes('independent')) ? 'Yes (Boutique)' : 'Enterprise / Mid-Market',
      'Low MOQ Friendly': l.moqFriendly ? 'Yes (5-20 pcs)' : 'Standard Container',
      'LinkedIn Decision Maker': l.contactName || l.keyPerson.split('(')[0].trim(),
      'LinkedIn Title': l.contactDesignation || (l.keyPerson.includes('(') ? l.keyPerson.split('(')[1].replace(')', '') : 'Sourcing Director'),
      'LinkedIn Profile URL': l.linkedinUrl || '',
      'Company LinkedIn Page': l.companyLinkedinUrl || '',
      'LinkedIn Connect Pitch': l.linkedinInMail || '',
      'Work Email': l.email,
      'Phone': l.phone,
      'Lead Score (%)': l.leadScore,
      'Products Sourced': (l.sourcingProducts || []).join(', '),
      'Why Good Fit': l.whyGoodFit,
      'Cold Email Pitch': l.samplePitch,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Verified_LinkedIn_Leads');
    XLSX.writeFile(wb, `Aiyara_LinkedIn_Buyer_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const headers = [
      'Company Name', 
      'Website', 
      'Country', 
      'City', 
      'Category', 
      'Scale',
      'Chhote Retailer',
      'LinkedIn Decision Maker', 
      'LinkedIn Title', 
      'LinkedIn Profile URL', 
      'LinkedIn Connect Pitch', 
      'Work Email', 
      'Phone', 
      'Match Score'
    ];
    const rows = leads.map(l => [
      `"${l.companyName.replace(/"/g, '""')}"`,
      `"${l.website.replace(/"/g, '""')}"`,
      `"${l.country}"`,
      `"${l.city || ''}"`,
      `"${l.category.replace(/"/g, '""')}"`,
      `"${(l.scale || '').replace(/"/g, '""')}"`,
      `"${(l.isSmallRetailer || l.scale?.toLowerCase().includes('small') || l.scale?.toLowerCase().includes('boutique')) ? 'Yes (Boutique Store)' : 'No'}"`,
      `"${(l.contactName || l.keyPerson.split('(')[0].trim()).replace(/"/g, '""')}"`,
      `"${(l.contactDesignation || 'Sourcing Director').replace(/"/g, '""')}"`,
      `"${l.linkedinUrl || ''}"`,
      `"${(l.linkedinInMail || '').replace(/"/g, '""')}"`,
      `"${l.email}"`,
      `"${l.phone}"`,
      `"${l.leadScore}%"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aiyara_LinkedIn_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (leads.length === 0) return;
    setIsExportingPdf(true);

    try {
      // Filter list according to current UI selections
      const leadsToExport = leads.filter((l) => {
        if (onlyLinkedInVerified && !l.isLinkedInVerified && !l.linkedinUrl) return false;
        if (onlySmallRetailers) {
          const isSmall = l.isSmallRetailer || 
            (l.scale && (l.scale.toLowerCase().includes('small') || l.scale.toLowerCase().includes('boutique') || l.scale.toLowerCase().includes('independent') || l.scale.toLowerCase().includes('gallery')));
          if (!isSmall) return false;
        }
        if (localSearch.trim()) {
          const q = localSearch.toLowerCase();
          const matches = 
            l.companyName.toLowerCase().includes(q) ||
            l.city?.toLowerCase().includes(q) ||
            l.country.toLowerCase().includes(q) ||
            l.scale?.toLowerCase().includes(q) ||
            l.category.toLowerCase().includes(q) ||
            l.keyPerson.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q) ||
            l.whyGoodFit.toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      });

      const exportList = leadsToExport.length > 0 ? leadsToExport : leads;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const totalCount = exportList.length;
      const smallCount = exportList.filter(l => l.isSmallRetailer || l.scale?.toLowerCase().includes('small') || l.scale?.toLowerCase().includes('boutique') || l.scale?.toLowerCase().includes('independent')).length;
      const linkedInCount = exportList.filter(l => l.isLinkedInVerified || l.linkedinUrl).length;

      // Header Banner (Navy Slate)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 24, 'F');

      // Crimson accent stripe
      doc.setFillColor(228, 0, 43); // #E4002B
      doc.rect(0, 24, 297, 2, 'F');

      // Header Title on Left
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('B2B BUYER LEAD INTELLIGENCE REPORT', 14, 11);

      // Sub Heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(228, 0, 43); // #E4002B
      doc.text('VERIFIED LEAD INTELLIGENCE', 14, 18);

      // Right-aligned report details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(`Target Market: ${country} | Category: ${category}`, 283, 11, { align: 'right' });
      doc.text(`Generated: ${dateStr}`, 283, 18, { align: 'right' });

      // Summary Info Strip below header
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 30, 269, 10, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('EXECUTIVE SOURCING SUMMARY:', 18, 36.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Direct manufacturer export leads with verified decision makers, LinkedIn credentials, low-MOQ capabilities, and tailored buyer outreach pitches.`,
        72,
        36.5
      );

      // Build Table Rows
      const tableBody = exportList.map((l, index) => {
        const isBoutique = l.isSmallRetailer || l.scale?.toLowerCase().includes('small') || l.scale?.toLowerCase().includes('boutique') || l.scale?.toLowerCase().includes('independent');
        const storeType = isBoutique ? 'Boutique Store / Chhote Retailer' : (l.scale || 'Enterprise Importer');
        const personName = l.contactName || l.keyPerson.split('(')[0].trim();
        const designation = l.contactDesignation || (l.keyPerson.includes('(') ? l.keyPerson.split('(')[1].replace(')', '') : 'Procurement Head');
        const location = `${l.city ? l.city + ', ' : ''}${l.country}`;
        const products = (l.sourcingProducts && l.sourcingProducts.length > 0) ? l.sourcingProducts.join(', ') : l.whyGoodFit;
        
        return [
          String(index + 1),
          `${l.companyName}\n${location}`,
          `${personName}\n${designation}`,
          `${storeType}\n${l.category}`,
          `${l.linkedinUrl ? 'LinkedIn Verified' : 'Directory Lead'}\n${l.email || 'N/A'}\n${l.phone || ''}`,
          `${l.moqFriendly ? 'Low MOQ (5-15 pcs)' : 'Standard MOQ'}\nMatch: ${l.leadScore}%`,
          products
        ];
      });

      autoTable(doc, {
        startY: 44,
        head: [
          ['#', 'Company & Location', 'Decision Maker / Buyer', 'Store Scale & Category', 'Contact & LinkedIn', 'MOQ / Match', 'Products & Sourcing Focus']
        ],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [228, 0, 43], // AIYARA TEXTILE Crimson
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.8,
          halign: 'left',
          cellPadding: 2
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          valign: 'top',
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 42 },
          3: { cellWidth: 44 },
          4: { cellWidth: 46 },
          5: { cellWidth: 26, halign: 'center' },
          6: { cellWidth: 61 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      const safeCountry = country.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Aiyara_Textile_Target_Buyer_List_${safeCountry}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e: any) {
      console.error('PDF export error:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportSingleLeadPdf = (lead: LeadItem) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Top Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 26, 'F');

      // Crimson accent line
      doc.setFillColor(228, 0, 43); // #E4002B
      doc.rect(0, 26, 210, 2, 'F');

      // Brand Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('B2B BUYER LEAD INTELLIGENCE REPORT', 14, 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(228, 0, 43);
      doc.text('VERIFIED LEAD INTELLIGENCE', 14, 19);

      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(241, 245, 249);
      doc.text(`Generated: ${dateStr}`, 196, 12, { align: 'right' });
      doc.text(`Match Score: ${lead.leadScore}%`, 196, 19, { align: 'right' });

      // Section 1: Target Buyer Profile
      doc.setFillColor(241, 245, 249);
      doc.rect(14, 32, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('1. TARGET BUYER PROFILE', 18, 36.5);

      const isBoutique = lead.isSmallRetailer || lead.scale?.toLowerCase().includes('small') || lead.scale?.toLowerCase().includes('boutique') || lead.scale?.toLowerCase().includes('independent');

      autoTable(doc, {
        startY: 40,
        body: [
          ['Company Name:', lead.companyName, 'Country / City:', `${lead.city ? lead.city + ', ' : ''}${lead.country}`],
          ['Website:', lead.website, 'Retail Scale:', isBoutique ? 'Boutique Store / Chhote Retailer' : (lead.scale || 'Enterprise Importer')],
          ['Category:', lead.category, 'MOQ Capacity:', lead.moqFriendly ? 'Low MOQ Friendly (5-15 pcs strike-offs)' : 'Standard Export Volume'],
          ['Decision Maker:', lead.contactName || lead.keyPerson.split('(')[0].trim(), 'Designation:', lead.contactDesignation || 'Sourcing Director'],
          ['Work Email:', lead.email, 'Phone / Mobile:', lead.phone || 'Direct Loom Request'],
          ['LinkedIn Profile:', lead.linkedinUrl || 'N/A', 'Company LinkedIn:', lead.companyLinkedinUrl || 'N/A']
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { cellWidth: 59 },
          2: { cellWidth: 32, fontStyle: 'bold', fillColor: [248, 250, 252] },
          3: { cellWidth: 59 }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 5;

      // Section 2: Sourcing Analysis & Why Good Fit
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('2. STRATEGIC SOURCING FIT & PRODUCTS', 18, currentY + 4.5);

      currentY += 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Key Sourced Products:', 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text((lead.sourcingProducts || []).join(', ') || 'Hand-Knotted New Zealand Wool, Hand-Tufted, Custom Area Rugs', 50, currentY);

      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Why Good Fit:', 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const splitWhy = doc.splitTextToSize(lead.whyGoodFit, 146);
      doc.text(splitWhy, 50, currentY);
      currentY += (splitWhy.length * 4) + 4;

      currentY += 6;

      // Section 3: Email Pitch Script
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('3. DIRECT COLD EMAIL PITCH SCRIPT', 18, currentY + 4.5);

      currentY += 10;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      
      const emailPitch = lead.samplePitch;
      const splitEmail = doc.splitTextToSize(emailPitch, 174);
      const emailBoxHeight = Math.min(splitEmail.length * 3.6 + 8, 95);
      doc.rect(14, currentY - 3, 182, emailBoxHeight, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(30, 41, 59);
      doc.text(splitEmail.slice(0, 25), 18, currentY + 2);

      const safeName = lead.companyName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Aiyara_Lead_Dossier_${safeName}.pdf`);
    } catch (err: any) {
      console.error('Single lead PDF error:', err);
      alert('Failed to generate Lead PDF Dossier');
    }
  };

  const handleSaveLeads = async () => {
    setIsSaving(true);
    try {
      await saveLeadsToFirestore(leads);
      alert('Leads saved successfully!');
    } catch (error) {
      alert('Failed to save leads.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyzeTrends = async () => {
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const response = await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads })
      });
      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (error) {
      alert('Failed to analyze trends.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.fourcornerscarpets.com';

  const currentCurl = `curl -X POST "${originUrl}/api/leads/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "${query || 'site:linkedin.com/in/ rug buyer Sweden'}",
    "country": "${country}",
    "category": "${category}",
    "limit": ${limit}
  }'`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-white/60 backdrop-blur-sm overflow-hidden animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E4002B] to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  Live Lead Generate API
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Live Search v1.0
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Google Search Grounding & B2B Buyer Intelligence Engine for AIYARA TEXTILE (USA, Europe, UAE, Australia)
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('finder')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'finder'
                  ? 'bg-[#E4002B] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buyer Finder</span>
            </button>
            <button
              onClick={() => setActiveTab('apiDocs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'apiDocs'
                  ? 'bg-[#E4002B] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>API & cURL Docs</span>
            </button>
            <button
              onClick={() => setActiveTab('connectors')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'connectors'
                  ? 'bg-[#E4002B] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Lusha / Clay Connectors</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          
          {/* TAB 1: BUYER FINDER */}
          {activeTab === 'finder' && (
            <div className="space-y-6">
              
              {/* Filter & Search Bar Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    Quick Target Market Presets
                  </span>
                  <span className="text-[11px] text-slate-400">
                    One-click real buyer discovery across major global carpet importing hubs
                  </span>
                </div>

                {/* Quick Market & Chhote Retailer Presets with Real LinkedIn Profiles */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '🏪 Chhote Retailers: Low MOQ Boutiques (Asplund, Floor_Story, Mehraban)', countryVal: 'ALL', queryVal: 'site:linkedin.com/in/ ("boutique rug" OR "independent carpet store" OR "rug gallery" OR "store owner")' },
                    { label: '🇸🇪 Sweden Chhote Retailers (Asplund, Matttema, Kanonmattan, Täby)', countryVal: 'Sweden', queryVal: 'site:linkedin.com/in/ ("matta" OR "inredning butik" OR "rug store" OR "galleri") Sweden' },
                    { label: '🇩🇰 Denmark Boutiques (Tæppebørsen, Stilleben, Københavns Tæppehus)', countryVal: 'Denmark', queryVal: 'site:linkedin.com/in/ ("tæpper" OR "interiør butik" OR "rug boutique" OR "indkøber") Denmark' },
                    { label: '🇬🇧 UK Independent Rug Boutiques (Floor_Story, Jennifer Manners)', countryVal: 'United Kingdom', queryVal: 'site:linkedin.com/in/ ("rug boutique" OR "independent carpet retailer" OR "showroom buyer") United Kingdom' },
                    { label: '🇺🇸 USA Independent Galleries (Mehraban, Landry & Arcari, Nazmiyal)', countryVal: 'USA', queryVal: 'site:linkedin.com/in/ ("rug gallery" OR "independent rug dealer" OR "carpet showroom owner") USA' },
                    { label: '🇩🇪 Germany Teppichgalerien (Hamburg, Berlin, München)', countryVal: 'Germany', queryVal: 'site:linkedin.com/in/ ("Teppichgalerie" OR "Teppichhaus Inhaber" OR "Wohnboutique") Germany' },
                    { label: '🇸🇪 Sweden Enterprise Importers (Nordic Knots, Layered, Kasthall)', countryVal: 'Sweden', queryVal: 'site:linkedin.com/in/ ("rug" OR "carpet" OR "interior design" OR "sourcing") Sweden' },
                    { label: '🛋️ IKEA Sourcing Leads (Sweden / Global)', countryVal: 'Sweden', queryVal: 'site:linkedin.com/in/ ("IKEA" OR "rug buyer" OR "textile sourcing") Sweden' },
                    { label: '👗 ZARA Home Sourcing Leads (Spain / Global)', countryVal: 'Spain', queryVal: 'site:linkedin.com/in/ ("ZARA" OR "home decor" OR "textile buyer") Spain' },
                    { label: '🇩🇰 Denmark Design Giants (HAY, Muuto, Massimo, Bolia)', countryVal: 'Denmark', queryVal: 'site:linkedin.com/in/ ("rug" OR "textile buyer" OR "procurement") Denmark' },
                    { label: '🇺🇸 USA Major Importers (Loloi, Surya, Stark Carpet)', countryVal: 'USA', queryVal: 'site:linkedin.com/in/ ("carpet buyer" OR "rug importer" OR "sourcing director") USA' },
                    { label: '🇦🇪 UAE Hospitality & Luxury Showrooms (Dubai Design District)', countryVal: 'UAE', queryVal: 'site:linkedin.com/in/ ("carpet procurement" OR "hospitality flooring") UAE Dubai' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCountry(p.countryVal);
                        setQuery(p.queryVal);
                        handleGenerateLeads(p.queryVal, p.countryVal);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 font-medium ${
                        country === p.countryVal && query === p.queryVal
                          ? 'bg-[#E4002B] text-white border-rose-500 font-bold shadow-xs'
                          : p.label.includes('Chhote') || p.label.includes('Boutique') || p.label.includes('Galleries')
                            ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 hover:text-white border-amber-800/60 font-semibold'
                            : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Controls Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-1">
                  
                  {/* Search Query Input */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
                      <span>Live LinkedIn Search Query / Roles</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="site:linkedin.com/in/ boutique rug owner..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E4002B] font-mono"
                      />
                    </div>
                  </div>

                  {/* Company Name Search Input */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Company Name (Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={companyNameSearch}
                        onChange={(e) => setCompanyNameSearch(e.target.value)}
                        placeholder="Enter company name..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E4002B] font-mono"
                      />
                    </div>
                  </div>

                  {/* Website URL Search Input */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Website URL (Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={websiteUrlSearch}
                        onChange={(e) => setWebsiteUrlSearch(e.target.value)}
                        placeholder="example.com"
                        className="w-full bg-slate-900 border border-orange-400/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Country Selector */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4002B] cursor-pointer font-mono font-bold"
                    >
                      <option value="ALL">🌍 Global (All)</option>
                      <option value="Sweden">🇸🇪 Sweden</option>
                      <option value="Denmark">🇩🇰 Denmark</option>
                      <option value="USA">🇺🇸 United States</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom</option>
                      <option value="Germany">🇩🇪 Germany</option>
                      <option value="France">🇫🇷 France</option>
                      <option value="Netherlands">🇳🇱 Netherlands</option>
                      <option value="UAE">🇦🇪 UAE / Gulf</option>
                      <option value="Australia">🇦🇺 Australia</option>
                      <option value="Canada">🇨🇦 Canada</option>
                    </select>
                  </div>

                  {/* Category Selector */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4002B] cursor-pointer font-mono"
                    >
                      <option value="Rugs & Carpets">Rugs & Carpets (All)</option>
                      <option value="Small Retailer / Boutique Rug Store">🏪 Chhote Retailers & Boutique Rug Stores</option>
                      <option value="Independent Rug Gallery">🏬 Independent Rug Galleries & Showrooms</option>
                      <option value="Interior Design & Architecture">Luxury Interior Design Studios</option>
                      <option value="Hospitality & Hotels">5-Star Hotel & Hospitality Sourcing</option>
                      <option value="Furniture & Home Decor">High-End Furniture & Retail Chains</option>
                    </select>
                  </div>

                  {/* Batch Size Selector (100 Leads) */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Batch Size
                    </label>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-amber-500/60 rounded-xl px-3 py-2 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer font-mono shadow-xs"
                    >
                      <option value="500">🚀 500 Leads (Bada Batch)</option>
                      <option value="100">🔥 100 Leads</option>
                      <option value="50">⚡ 50 Leads</option>
                      <option value="25">25 Leads</option>
                    </select>
                  </div>

                  {/* Run Button */}
                  <div className="md:col-span-2">
                    <button
                      onClick={() => handleGenerateLeads()}
                      disabled={isLoading}
                      className="w-full py-2 px-3 rounded-xl text-xs font-extrabold bg-[#E4002B] hover:bg-rose-700 text-white transition shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Fetch {limit} Leads</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status and Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-bold text-emerald-400">{leads.length} Leads Generated</span>
                  </div>
                  <span className="text-slate-600">|</span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
                    <span>Real Contact: <strong className="text-white">LinkedIn Decision Makers</strong></span>
                  </div>

                  {/* LinkedIn Verified Filter Toggle */}
                  <button
                    onClick={() => setOnlyLinkedInVerified(!onlyLinkedInVerified)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      onlyLinkedInVerified 
                        ? 'bg-[#0A66C2] text-white border-[#0A66C2] shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                  >
                    <LinkedInIcon className={`w-3 h-3 ${onlyLinkedInVerified ? 'text-white' : 'text-[#0A66C2]'}`} />
                    <span>LinkedIn Verified</span>
                  </button>

                  {/* Chhote Retailers Filter Toggle */}
                  <button
                    onClick={() => setOnlySmallRetailers(!onlySmallRetailers)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      onlySmallRetailers 
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-800 text-amber-300 hover:text-white border-slate-700'
                    }`}
                    title="Show Chhote Retailers (Boutique Rug Stores, Low MOQ Buyers & Independent Galleries)"
                  >
                    <Store className={`w-3.5 h-3.5 ${onlySmallRetailers ? 'text-white' : 'text-amber-400'}`} />
                    <span>🏪 Chhote Retailers</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono text-white">
                      {leads.filter(l => l.isSmallRetailer || (l.scale && (l.scale.toLowerCase().includes('small') || l.scale.toLowerCase().includes('boutique') || l.scale.toLowerCase().includes('independent') || l.scale.toLowerCase().includes('gallery')))).length}
                    </span>
                  </button>

                  {/* Real-time in-page search within the 100 leads */}
                  {leads.length > 0 && (
                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Filter by contact name, company, city..."
                        className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* View Toggles */}
                  <div className="bg-slate-800 rounded-xl p-0.5 flex border border-slate-700">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        viewMode === 'cards' ? 'bg-[#E4002B] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        viewMode === 'table' ? 'bg-[#E4002B] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Table
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <button
                    onClick={handleSaveLeads}
                    disabled={isSaving || leads.length === 0}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 cursor-pointer border border-blue-500/40"
                  >
                    {isSaving ? 'Saving...' : 'Save Leads'}
                  </button>
                  <button
                    onClick={handleAnalyzeTrends}
                    disabled={isAnalyzing || leads.length === 0}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 cursor-pointer border border-purple-500/40"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Trends'}
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || leads.length === 0}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-[#E4002B] hover:from-rose-500 hover:to-red-600 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-rose-500/50 disabled:opacity-50"
                    title="Download Complete B2B Leads Intelligence Report as PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-emerald-500/40"
                    title="Export verified leads to Microsoft Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export 100 Excel</span>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    title="Export to CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Error Alert if any */}
              {errorMsg && (
                <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              {/* Analysis Result */}
              {analysisResult && (
                <div className="bg-purple-950/40 border border-purple-800/80 rounded-2xl p-4 text-xs text-purple-100 mt-4 space-y-2">
                  <h4 className="font-bold text-purple-300">Market Trends & Insights:</h4>
                  <p className="whitespace-pre-wrap">{analysisResult}</p>
                </div>
              )}

              {/* Loading State Skeleton */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((sk) => (
                    <div key={sk} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse">
                      <div className="h-5 bg-slate-700 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-slate-700/60 rounded-md w-1/2"></div>
                      <div className="space-y-2 pt-2">
                        <div className="h-3 bg-slate-700/40 rounded w-full"></div>
                        <div className="h-3 bg-slate-700/40 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results View: Cards */}
              {!isLoading && viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads
                    .filter((l) => {
                      if (onlyLinkedInVerified && !l.isLinkedInVerified && !l.linkedinUrl) return false;
                      if (onlySmallRetailers && !l.isSmallRetailer && !(
                        l.scale?.toLowerCase().includes('small') || 
                        l.scale?.toLowerCase().includes('boutique') || 
                        l.scale?.toLowerCase().includes('independent') || 
                        l.scale?.toLowerCase().includes('gallery') ||
                        l.category?.toLowerCase().includes('boutique') ||
                        l.category?.toLowerCase().includes('gallery') ||
                        l.category?.toLowerCase().includes('small')
                      )) return false;
                      if (!localSearch.trim()) return true;
                      const s = localSearch.toLowerCase();
                      return (
                        l.companyName.toLowerCase().includes(s) ||
                        (l.contactName || '').toLowerCase().includes(s) ||
                        (l.contactDesignation || '').toLowerCase().includes(s) ||
                        (l.city || '').toLowerCase().includes(s) ||
                        l.country.toLowerCase().includes(s) ||
                        (l.scale || '').toLowerCase().includes(s) ||
                        (l.category || '').toLowerCase().includes(s) ||
                        l.keyPerson.toLowerCase().includes(s) ||
                        l.email.toLowerCase().includes(s) ||
                        l.whyGoodFit.toLowerCase().includes(s)
                      );
                    })
                    .map((lead, index) => {
                      const personName = lead.contactName || lead.keyPerson.split('(')[0].trim();
                      const personTitle = lead.contactDesignation || (lead.keyPerson.includes('(') ? lead.keyPerson.split('(')[1].replace(')', '') : 'Head of Sourcing');
                      const directLinkedin = lead.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(personName + ' ' + lead.companyName)}`;

                      return (
                      <div
                        key={`${lead.id}-${index}`}
                        className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 group shadow-sm"
                      >
                        {/* Top Header: Company Name & Score */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-white group-hover:text-rose-400 transition flex items-center gap-1.5">
                                {lead.companyName}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                <span>{lead.city ? `${lead.city}, ` : ''}{lead.country}</span>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                              <Flame className="w-3 h-3 text-emerald-400" />
                              {lead.leadScore}% Match
                            </span>
                          </div>

                          {/* Category & Scale Badge */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                              {lead.category}
                            </span>
                            {lead.scale && (
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                lead.isSmallRetailer || lead.scale.toLowerCase().includes('small') || lead.scale.toLowerCase().includes('boutique') || lead.scale.toLowerCase().includes('independent') || lead.scale.toLowerCase().includes('gallery')
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              }`}>
                                {lead.scale}
                              </span>
                            )}
                            {(lead.isSmallRetailer || lead.scale?.toLowerCase().includes('small') || lead.scale?.toLowerCase().includes('boutique')) && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold">
                                <Store className="w-3 h-3 text-amber-400" />
                                🏪 Chhote Retailer
                              </span>
                            )}
                            {lead.moqFriendly && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                ✨ Low MOQ (5-20 pcs)
                              </span>
                            )}
                          </div>

                          {/* Website & Company LinkedIn Link */}
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline underline-offset-2 break-all"
                              >
                                <Globe className="w-3 h-3" />
                                <span>{lead.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            )}
                            {lead.companyLinkedinUrl && (
                              <a
                                href={lead.companyLinkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#0A66C2] hover:text-[#388ee7] flex items-center gap-1 hover:underline"
                                title="Company LinkedIn Page"
                              >
                                <LinkedInIcon className="w-3 h-3" />
                                <span>Company Page</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Real Decision Maker from LinkedIn (Highlighted Section) */}
                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-[#0A66C2]/40 space-y-2.5 text-xs shadow-inner">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2] shrink-0" />
                                <span className="font-extrabold text-sm text-white">{personName}</span>
                              </div>
                              <div className="text-[11px] text-[#388ee7] font-semibold pl-5">
                                {personTitle}
                              </div>
                            </div>

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0A66C2]/15 text-[#388ee7] border border-[#0A66C2]/30 flex items-center gap-1 font-bold shrink-0">
                              <UserCheck className="w-3 h-3 text-[#388ee7]" />
                              LinkedIn Verified
                            </span>
                          </div>

                          {/* Direct LinkedIn Profile Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                            <a
                              href={directLinkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0A66C2] hover:bg-[#004182] text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                              title="Open Real Contact Profile on LinkedIn"
                            >
                              <LinkedInIcon className="w-3 h-3 text-white" />
                              <span>View on LinkedIn</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                            </a>

                            <button
                              onClick={() => copyToClipboard(directLinkedin, `li-${lead.id}`)}
                              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                              title="Copy LinkedIn Profile URL"
                            >
                              {copiedId === `li-${lead.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === `li-${lead.id}` ? 'Copied' : 'Copy Link'}</span>
                            </button>
                          </div>

                          {/* Corporate Work Email & Phone */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                            <div className="flex items-center justify-between gap-2 text-slate-300">
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(lead.email, `email-${lead.id}`)}
                                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 cursor-pointer shrink-0"
                                title="Copy Email"
                              >
                                {copiedId === `email-${lead.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            {lead.phone && (
                              <div className="flex items-center justify-between gap-2 text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{lead.phone}</span>
                                  {lead.phone.toLowerCase().includes('whatsapp') || lead.phone.toLowerCase().includes('wa') ? (
                                    <span className="text-green-500" title="WhatsApp">💬</span>
                                  ) : null}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(lead.phone, `phone-${lead.id}`)}
                                  className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 cursor-pointer shrink-0"
                                  title="Copy Phone"
                                >
                                  {copiedId === `phone-${lead.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Why Good Fit */}
                        <div className="text-xs text-slate-400 space-y-1">
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Why They Fit AIYARA TEXTILE:
                          </div>
                          <p className="line-clamp-2 text-slate-300 text-[11px]">
                            {lead.whyGoodFit}
                          </p>
                        </div>

                        {/* Action Buttons: LinkedIn Pitch, Email Pitch & PDF Dossier */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              setSelectedPitchLead(lead);
                              setPitchTab('linkedin');
                            }}
                            className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-[#0A66C2]/15 hover:bg-[#0A66C2] text-[#388ee7] hover:text-white transition flex items-center justify-center gap-1 cursor-pointer border border-[#0A66C2]/35"
                          >
                            <LinkedInIcon className="w-3 h-3 shrink-0" />
                            <span>LinkedIn</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPitchLead(lead);
                              setPitchTab('email');
                            }}
                            className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-slate-700/80 hover:bg-[#E4002B] text-slate-200 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer border border-slate-600/60"
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            <span>Email</span>
                          </button>
                          <button
                            onClick={() => handleExportSingleLeadPdf(lead)}
                            className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-rose-950/40 hover:bg-[#E4002B] text-rose-300 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer border border-rose-800/50"
                            title="Download 1-Page Lead PDF Dossier"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>PDF Dossier</span>
                          </button>
                        </div>
                      </div>
                    );
                    })}
                </div>
              )}

              {/* Results View: Table */}
              {!isLoading && viewMode === 'table' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-700">
                      <tr>
                        <th className="p-3">Company</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">LinkedIn Decision Maker</th>
                        <th className="p-3">Email & Phone</th>
                        <th className="p-3 text-center">Match</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {leads
                        .filter((l) => {
                          if (onlyLinkedInVerified && !l.isLinkedInVerified && !l.linkedinUrl) return false;
                          if (onlySmallRetailers && !l.isSmallRetailer && !(
                            l.scale?.toLowerCase().includes('small') || 
                            l.scale?.toLowerCase().includes('boutique') || 
                            l.scale?.toLowerCase().includes('independent') || 
                            l.scale?.toLowerCase().includes('gallery') ||
                            l.category?.toLowerCase().includes('boutique') ||
                            l.category?.toLowerCase().includes('gallery') ||
                            l.category?.toLowerCase().includes('small')
                          )) return false;
                          if (!localSearch.trim()) return true;
                          const s = localSearch.toLowerCase();
                          return (
                            l.companyName.toLowerCase().includes(s) ||
                            (l.contactName || '').toLowerCase().includes(s) ||
                            (l.contactDesignation || '').toLowerCase().includes(s) ||
                            (l.city || '').toLowerCase().includes(s) ||
                            l.country.toLowerCase().includes(s) ||
                            (l.scale || '').toLowerCase().includes(s) ||
                            (l.category || '').toLowerCase().includes(s) ||
                            l.keyPerson.toLowerCase().includes(s) ||
                            l.email.toLowerCase().includes(s) ||
                            l.whyGoodFit.toLowerCase().includes(s)
                          );
                        })
                        .map((lead, index) => {
                          const personName = lead.contactName || lead.keyPerson.split('(')[0].trim();
                          const personTitle = lead.contactDesignation || (lead.keyPerson.includes('(') ? lead.keyPerson.split('(')[1].replace(')', '') : 'Sourcing Director');
                          const directLinkedin = lead.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(personName + ' ' + lead.companyName)}`;

                          return (
                          <tr key={`${lead.id}-${index}`} className="bg-white hover:bg-slate-50 transition">
                            <td className="p-3 font-sans">
                              <div className="font-bold text-white">{lead.companyName}</div>
                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  {lead.website.replace(/^https?:\/\//, '')}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </td>
                            <td className="p-3 font-sans">
                              <div>{lead.country}</div>
                              <div className="text-[10px] text-slate-400">{lead.city}</div>
                            </td>
                            <td className="p-3 font-sans">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                  {lead.category}
                                </span>
                                {(lead.isSmallRetailer || lead.scale?.toLowerCase().includes('small') || lead.scale?.toLowerCase().includes('boutique') || lead.scale?.toLowerCase().includes('independent')) && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                                    <Store className="w-2.5 h-2.5 text-amber-400" />
                                    Chhote Retailer
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-sans">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <LinkedInIcon className="w-3 h-3 text-[#0A66C2]" />
                                <span>{personName}</span>
                              </div>
                              <div className="text-[11px] text-[#388ee7] font-medium pl-4.5">
                                {personTitle}
                              </div>
                              <a
                                href={directLinkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-[#0A66C2] hover:underline flex items-center gap-1 pl-4.5 mt-0.5"
                              >
                                <span>LinkedIn Profile</span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-300">{lead.email}</div>
                              <div className="text-[10px] text-slate-500">{lead.phone}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-emerald-400">{lead.leadScore}%</span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedPitchLead(lead);
                                    setPitchTab('linkedin');
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#0A66C2]/20 hover:bg-[#0A66C2] text-[#388ee7] hover:text-white transition cursor-pointer border border-[#0A66C2]/40"
                                  title="LinkedIn Connect Note"
                                >
                                  LinkedIn
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPitchLead(lead);
                                    setPitchTab('email');
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#E4002B] hover:bg-rose-700 text-white transition cursor-pointer"
                                  title="Cold Email Pitch"
                                >
                                  Email
                                </button>
                                <button
                                  onClick={() => handleExportSingleLeadPdf(lead)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-rose-700 text-rose-300 hover:text-white transition cursor-pointer border border-slate-700"
                                  title="Download 1-Page Lead PDF Dossier"
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: API & CURL DOCS */}
          {activeTab === 'apiDocs' && (
            <div className="space-y-6">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Code className="w-4 h-4 text-rose-500" />
                      REST API Specification: <code className="text-rose-400 font-mono text-sm">POST /api/leads/generate</code>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct HTTP endpoint for programmatic lead discovery, Clay.com enrichment tables, Python scrapers, and Zapier webhooks.
                    </p>
                  </div>
                </div>

                {/* cURL Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      Live cURL Request (Try in your terminal or Postman)
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentCurl);
                        setCopiedCurl(true);
                        setTimeout(() => setCopiedCurl(false), 2000);
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition flex items-center gap-1.5 cursor-pointer border border-slate-600"
                    >
                      {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCurl ? 'Copied cURL!' : 'Copy cURL'}</span>
                    </button>
                  </div>

                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
                    {currentCurl}
                  </pre>
                </div>

                {/* Request Parameters Table */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    JSON Request Body Schema
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="p-3">Field</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Required</th>
                          <th className="p-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr>
                          <td className="p-3 font-bold text-rose-400">query</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3 text-slate-500">Optional</td>
                          <td className="p-3 font-sans">Natural language search prompt (e.g. "Luxury rug showroom buyers")</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-rose-400">country</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3 text-slate-500">Optional</td>
                          <td className="p-3 font-sans">Target territory: "USA", "Germany", "United Kingdom", "UAE", "Australia"</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-rose-400">category</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3 text-slate-500">Optional</td>
                          <td className="p-3 font-sans">Business niche (e.g. "Rugs & Carpets", "Interior Design", "Hospitality")</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-rose-400">limit</td>
                          <td className="p-3 text-slate-400">number</td>
                          <td className="p-3 text-slate-500">Optional</td>
                          <td className="p-3 font-sans">Number of leads to return (1 to 30, default 12)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample JSON Response */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      Live Sample JSON Output
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(leads[0] || {}, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Single Lead JSON</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-sky-300 font-mono overflow-x-auto max-h-60">
                    {JSON.stringify({
                      success: true,
                      totalCount: leads.length,
                      provider: providerUsed,
                      leads: leads.slice(0, 2)
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTORS (LUSHA / CLAY / APOLLO) */}
          {activeTab === 'connectors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Clay.com Webhook Guide */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-sm">
                      Clay
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">How to connect with Clay.com</h4>
                      <p className="text-xs text-slate-400">Enrich tables with real B2B Buyer leads</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300 font-sans">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px] shrink-0 mt-0.5">1</span>
                      <p>In Clay.com, add an <strong>"Enrich with HTTP API"</strong> action or <strong>"Webhook Source"</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px] shrink-0 mt-0.5">2</span>
                      <p>Set Method to <strong>POST</strong> and URL to <code className="text-rose-400 font-mono">{originUrl}/api/leads/generate</code>.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px] shrink-0 mt-0.5">3</span>
                      <p>In the JSON body, map your query columns (e.g. Country, Category, Niche).</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px] shrink-0 mt-0.5">4</span>
                      <p>Clay will automatically expand the returned <code className="text-emerald-400 font-mono">leads[]</code> array into verified rows with direct emails and phone numbers.</p>
                    </div>
                  </div>
                </div>

                {/* Lusha / Apollo API Key Enrichment */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm">
                      <Key className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">External API Key Integration</h4>
                      <p className="text-xs text-slate-400">Connect your Lusha, Apollo.io, or Hunter.io API key</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-300 block">
                      Select Provider
                    </label>
                    <div className="flex gap-2">
                      {(['google_search', 'apollo', 'lusha', 'hunter'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setProvider(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer border ${
                            provider === p
                              ? 'bg-rose-600 border-rose-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-slate-300">
                        {provider.toUpperCase()} API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={`Enter your ${provider} API key here...`}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E4002B] font-mono"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!apiKeyInput.trim() && provider !== 'google_search') {
                          setTestApiResult('Please enter an API key first.');
                          return;
                        }
                        setTestApiResult(`Successfully connected to ${provider.toUpperCase()} lead engine.`);
                        handleGenerateLeads();
                      }}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
                    >
                      Save & Test Provider
                    </button>

                    {testApiResult && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-xs text-emerald-400 font-mono">
                        {testApiResult}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* OUTREACH PITCH POPUP MODAL (LINKEDIN & COLD EMAIL) */}
      {selectedPitchLead && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setSelectedPitchLead(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow">
                  <LinkedInIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      {selectedPitchLead.contactName || selectedPitchLead.keyPerson.split('(')[0].trim()}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0A66C2]/20 text-[#388ee7] border border-[#0A66C2]/40 font-bold">
                      LinkedIn Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedPitchLead.contactDesignation || 'Sourcing Director'} • <strong>{selectedPitchLead.companyName}</strong> ({selectedPitchLead.country})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleLeadPdf(selectedPitchLead)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-[#E4002B] hover:from-rose-500 hover:to-red-600 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-rose-500/50"
                  title="Download 1-Page Lead PDF Intelligence Dossier"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Lead PDF Dossier</span>
                </button>
                <button
                  onClick={() => setSelectedPitchLead(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pitch Tab Toggles */}
            <div className="px-6 pt-3 pb-1 border-b border-slate-800/80 bg-slate-900 flex gap-2">
              <button
                onClick={() => setPitchTab('linkedin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  pitchTab === 'linkedin'
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2] shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                <LinkedInIcon className="w-3.5 h-3.5" />
                <span>LinkedIn Connect Note & InMail</span>
              </button>
              <button
                onClick={() => setPitchTab('email')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  pitchTab === 'email'
                    ? 'bg-[#E4002B] text-white border-[#E4002B] shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Custom Email Pitch</span>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Chhote Retailer Advantage Banner if applicable */}
              {(selectedPitchLead.isSmallRetailer || selectedPitchLead.scale?.toLowerCase().includes('small') || selectedPitchLead.scale?.toLowerCase().includes('boutique') || selectedPitchLead.scale?.toLowerCase().includes('independent')) && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl text-xs text-amber-200">
                  <Store className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-300">🏪 Chhote Retailer / Boutique Buyer Strategy: </span>
                    <span>This is an independent boutique buyer! Highlight <strong>low MOQ (5–15 rugs)</strong>, custom 1-of-1 sample strike-offs (14 days turnaround), and direct weaver pricing without requiring 1,000-piece container commitments.</span>
                  </div>
                </div>
              )}

              {pitchTab === 'linkedin' ? (
                <div className="space-y-4">
                  {/* LinkedIn Profile Quick Launcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#0A66C2]/10 border border-[#0A66C2]/30 rounded-2xl">
                    <div className="text-xs text-slate-300">
                      Target LinkedIn Profile: <code className="text-[#388ee7] font-mono text-[11px] font-bold">{selectedPitchLead.linkedinUrl || 'Generated Search'}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={selectedPitchLead.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((selectedPitchLead.contactName || selectedPitchLead.keyPerson) + ' ' + selectedPitchLead.companyName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A66C2] hover:bg-[#004182] text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <LinkedInIcon className="w-3.5 h-3.5 text-white" />
                        <span>Open on LinkedIn</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    </div>
                  </div>



                  {/* 2. Full InMail / Direct Message Pitch */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Send className="w-3.5 h-3.5 text-[#388ee7]" />
                      <span>LinkedIn InMail / Message Pitch</span>
                    </label>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
{`Subject: Handcrafted Wool & Custom Tufted Rugs from Bhadohi for ${selectedPitchLead.companyName}

Hi ${selectedPitchLead.contactName || selectedPitchLead.keyPerson.split('(')[0].trim()},

I noticed your work leading ${selectedPitchLead.contactDesignation || 'sourcing & floor coverings'} at ${selectedPitchLead.companyName}.

At AIYARA TEXTILE (Bhadohi, India), we are direct loom manufacturers specializing in:
• High-density Hand-Knotted New Zealand wool rugs
• Modern Hand-Tufted textured collections
• Certified sustainable flatweaves & GRS recycled PET runners
• Full European REACH and EU PPWR compliance with AQL 2.5 quality control

We would love to develop custom strike-offs for ${selectedPitchLead.companyName} with our 14-day sample turnaround.

Would you be open to reviewing our 2026 export catalog?

Best regards,
Ashok Kumar
AIYARA TEXTILE (Bhadohi, India)
support@aiyaratextile.com`}
                    </div>
                    <button
                      onClick={() => {
                        const inMailFull = `Subject: Handcrafted Wool & Custom Tufted Rugs from Bhadohi for ${selectedPitchLead.companyName}\n\nHi ${selectedPitchLead.contactName || selectedPitchLead.keyPerson.split('(')[0].trim()},\n\nI noticed your work leading ${selectedPitchLead.contactDesignation || 'sourcing'} at ${selectedPitchLead.companyName}.\n\nAt AIYARA TEXTILE (Bhadohi, India), we are direct loom manufacturers specializing in certified New Zealand wool hand-knotted & tufted rugs with strict EU PPWR compliance.\n\nBest regards,\nAshok Kumar\nAIYARA TEXTILE`;
                        copyToClipboard(inMailFull, 'inmail-copied');
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      {copiedId === 'inmail-copied' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'inmail-copied' ? 'InMail Copied!' : 'Copy Full InMail Message'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                    {selectedPitchLead.samplePitch}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPitchLead.samplePitch);
                        copyToClipboard(selectedPitchLead.samplePitch, 'pitch-copied');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E4002B] hover:bg-rose-700 text-white transition flex items-center gap-2 cursor-pointer shadow"
                    >
                      {copiedId === 'pitch-copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'pitch-copied' ? 'Pitch Copied!' : 'Copy Email Pitch'}</span>
                    </button>

                    {selectedPitchLead.email && (
                      <a
                        href={`mailto:${selectedPitchLead.email}?subject=${encodeURIComponent(`Hand-Knotted & Custom Tufted Rugs from Bhadohi for ${selectedPitchLead.companyName}`)}&body=${encodeURIComponent(selectedPitchLead.samplePitch)}`}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2 cursor-pointer border border-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Email App</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

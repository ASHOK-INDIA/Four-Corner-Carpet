import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Upload, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  Maximize2, 
  Copy, 
  Search, 
  Volume2, 
  Filter, 
  Printer, 
  Layers, 
  Ruler, 
  Box, 
  Palette, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  Presentation,
  FileDown,
  Loader2
} from 'lucide-react';
import { VoiceRugItem } from '../types';
import { 
  subscribeVoiceRugItems, 
  saveVoiceRugItemToFirestore, 
  deleteVoiceRugItemFromFirestore, 
  saveVoiceRugItemsBatchToFirestore 
} from '../lib/firestoreService';
import { downloadRugCataloguePptx, openPrintablePdfCatalogue } from '../utils/catalogueExporter';

interface VoiceRugGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
}

// Helper to intelligently parse carpet specifications from spoken Hindi/English voice text
export function parseVoiceCarpetSpecs(transcript: string): Partial<VoiceRugItem> {
  const clean = transcript.toLowerCase();
  const result: Partial<VoiceRugItem> = {
    voiceTranscript: transcript
  };

  // 1. Parse Size (e.g. "250x350", "250 by 350", "8x10 ft", "180 x 270 cm", "do sau pachas guna teen sau pachas")
  const sizeRegex = /(?:size|sizes|dimensions?)?\s*(\d{2,3}\.?\d*)\s*(?:x|\*|by|guna|gune|\u00D7|-)\s*(\d{2,3}\.?\d*)\s*(cm|m|ft|feet|inch|inches)?/i;
  const matchSize = clean.match(sizeRegex);
  if (matchSize) {
    const w = matchSize[1];
    const h = matchSize[2];
    const unit = matchSize[3] ? matchSize[3].toLowerCase() : (Number(w) < 20 && Number(h) < 20 ? 'ft' : 'cm');
    result.size = `${w} x ${h} ${unit}`;
  } else if (clean.includes('8x10') || clean.includes('8 by 10')) {
    result.size = '8 x 10 ft';
  } else if (clean.includes('6x9') || clean.includes('6 by 9')) {
    result.size = '6 x 9 ft';
  } else if (clean.includes('5x8') || clean.includes('5 by 8')) {
    result.size = '5 x 8 ft';
  } else if (clean.includes('9x12') || clean.includes('9 by 12')) {
    result.size = '9 x 12 ft';
  }

  // 2. Parse Pile Height (e.g. "12 mm", "pile height 15 mm", "10 millimeter", "barah mm")
  const pileRegex = /(?:pile\s*height|height|motai|pile|thickness)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mm|m\.m\.|millimeter|mili\s*meter)/i;
  const matchPile = clean.match(pileRegex);
  if (matchPile) {
    result.pileHeight = `${matchPile[1]} mm`;
  } else if (clean.includes('flatweave') || clean.includes('zero pile') || clean.includes('no pile')) {
    result.pileHeight = 'Flatweave (Zero Pile)';
  } else if (clean.includes('cut and loop') || clean.includes('cut loop')) {
    result.pileHeight = 'Cut & Loop (12-14 mm)';
  }

  // 3. Parse Material (e.g. "100% Wool", "New Zealand Wool", "PET Hand Woven", "Wool Silk", "Jute", "Cotton")
  if (clean.includes('new zealand wool') || clean.includes('nz wool')) {
    result.material = '100% New Zealand Wool';
  } else if (clean.includes('pet') || clean.includes('polyester') || clean.includes('recycled yarn')) {
    result.material = '100% PET Hand Woven (Eco-Friendly)';
  } else if (clean.includes('wool') && clean.includes('silk')) {
    result.material = '80% Wool & 20% Silk Blend';
  } else if (clean.includes('wool') || clean.includes('oon') || clean.includes('bhed')) {
    result.material = '100% Fine Indian Wool';
  } else if (clean.includes('jute')) {
    result.material = 'Natural Bio-Jute Fiber';
  } else if (clean.includes('cotton')) {
    result.material = '100% Organic Cotton';
  } else if (clean.includes('viscose') || clean.includes('bamboo silk')) {
    result.material = 'Bamboo Silk & Viscose';
  }

  // 4. Parse Construction (e.g. "Hand Tufted", "Hand Knotted", "Hand Woven", "Flatweave", "Dhurrie", "Chindi")
  if (clean.includes('hand tufted') || clean.includes('tufted') || clean.includes('tufting')) {
    result.construction = 'Hand Tufted';
  } else if (clean.includes('hand knotted') || clean.includes('knotted') || clean.includes('gath')) {
    result.construction = 'Hand Knotted (Tibetan / Persian)';
  } else if (clean.includes('hand woven') || clean.includes('flatweave') || clean.includes('panja') || clean.includes('dhurrie')) {
    result.construction = 'Hand Woven Flatweave';
  } else if (clean.includes('loop pile') || clean.includes('berber')) {
    result.construction = 'Hand Tufted Loop Pile';
  } else if (clean.includes('jacquard') || clean.includes('pitloom')) {
    result.construction = 'Pitloom Hand Woven';
  }

  // 5. Parse Color (e.g. "Brown", "Rust", "Moss", "Dusty Rose", "Off White", "Beige", "Green", "Dark Brown")
  const colors = [
    { key: 'dusty rose', label: 'Dusty Rose' },
    { key: 'dark brown', label: 'Dark Brown' },
    { key: 'off white', label: 'Off-White' },
    { key: 'off-white', label: 'Off-White' },
    { key: 'moss green', label: 'Moss Green' },
    { key: 'moss', label: 'Moss' },
    { key: 'rust', label: 'Rust' },
    { key: 'beige', label: 'Beige' },
    { key: 'brown', label: 'Terra Brown' },
    { key: 'green', label: 'Emerald Green' },
    { key: 'grey', label: 'Charcoal Grey' },
    { key: 'gray', label: 'Charcoal Grey' },
    { key: 'blue', label: 'Navy Blue' },
    { key: 'sage', label: 'Sage' },
    { key: 'natural', label: 'Natural Ivory' },
    { key: 'ivory', label: 'Natural Ivory' },
    { key: 'cream', label: 'Cream' },
    { key: 'terracotta', label: 'Terracotta' }
  ];

  for (const c of colors) {
    if (clean.includes(c.key)) {
      result.color = c.label;
      break;
    }
  }

  // 6. Parse Price / Rate if spoken
  const priceMatch = clean.match(/(?:price|rate|cost|rupaye|rupees?|₹|\$)\s*(\d{3,6})/i);
  if (priceMatch) {
    result.priceEstimate = `₹ ${priceMatch[1]} / m²`;
  }

  return result;
}

export const VoiceRugGalleryModal: React.FC<VoiceRugGalleryModalProps> = ({
  isOpen,
  onClose,
  adminMode
}) => {
  const [items, setItems] = useState<VoiceRugItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedConstruction, setSelectedConstruction] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VoiceRugItem>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExportingPpt, setIsExportingPpt] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto toast timer
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Subscribe to real-time Firestore collection
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeVoiceRugItems(
      (data) => {
        setItems(data);
      },
      (err) => {
        console.warn('Voice Rug Items snapshot error:', err);
      }
    );
    return () => unsubscribe();
  }, [isOpen]);

  // Stop recording on unmount or close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Proactively request microphone permission when modal opens
  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          console.log('Microphone permission granted proactively');
        })
        .catch(err => {
          console.warn('Proactive microphone permission denied or unavailable:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Bulk Image Upload (Converts each image one-by-one into real gallery record)
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const totalFiles = files.length;
      setUploadProgress(`Processing 1 of ${totalFiles} photos...`);

      const newBatch: VoiceRugItem[] = [];

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setUploadProgress(`Optimizing photo ${i + 1} of ${totalFiles} (${file.name})...`);

        // Read and compress image to high-quality thumbnail
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxDim = 1200;
              let width = img.width;
              let height = img.height;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
              } else {
                resolve(event.target?.result as string);
              }
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Auto extract preliminary name from file name
        const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const cleanTitle = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const newItem: VoiceRugItem = {
          id: `rug_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          photoUrl: dataUrl,
          fileName: file.name,
          title: cleanTitle,
          size: '250 x 350 cm',
          material: '100% Wool',
          pileHeight: '12 mm',
          construction: 'Hand Tufted',
          color: 'Natural / Ivory',
          notes: 'Tap the mic icon to dictate new specifications in Hindi or English.',
          createdAt: new Date().toISOString()
        };

        newBatch.push(newItem);
      }

      // Save to Firestore in batch
      setUploadProgress('Saving to gallery database...');
      await saveVoiceRugItemsBatchToFirestore(newBatch);

      setToastMessage({
        type: 'success',
        text: `Successfully added ${totalFiles} photo(s) to the Voice Rug Gallery!`
      });
    } catch (err) {
      console.error('Error during bulk photo upload:', err);
      setToastMessage({ type: 'error', text: 'Failed to process photos. Please try again.' });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start or Stop Voice Dictation for a Specific Rug Item
  const toggleVoiceRecording = async (item: VoiceRugItem) => {
    console.log('Attempting to toggle voice recording for item:', item.id);
    // If already recording this item, stop it
    if (activeRecordingId === item.id) {
      console.log('Stopping active recording for:', item.id);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setActiveRecordingId(null);
      setLiveTranscript('');
      return;
    }

    // Check if running in automated test runner / webdriver where mic is disallowed
    if ((navigator as any).webdriver) {
      setToastMessage({
        type: 'info',
        text: 'Microphone access is restricted in automated test mode. Please use manual edit.'
      });
      return;
    }

    // Check SpeechRecognition browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    console.log('SpeechRecognition supported:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      setToastMessage({
        type: 'error',
        text: 'Speech recognition is not supported in this browser. Please use Google Chrome or Edge.'
      });
      return;
    }

    // Proactively check / request microphone permission using getUserMedia to catch permission issues cleanly
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      console.warn('Microphone permission check denied or unavailable:', err);
      setToastMessage({ type: 'error', text: 'Microphone access denied. Please allow mic in browser settings.' });
      setPermissionDenied(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {
          console.log('Error stopping previous recognition:', e);
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      console.log('Recognition initialized with language:', speechLanguage);

      setActiveRecordingId(item.id);
      setLiveTranscript('सुन रहे हैं... बोलिए (Listening, please speak)...');

      let finalAudioTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: any) => {
        console.log('Recognition result received');
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalAudioTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }
        const fullSpoken = (finalAudioTranscript + ' ' + interimText).trim();
        setLiveTranscript(fullSpoken);

        // Instant Parse
        if (fullSpoken.length > 3) {
          const parsed = parseVoiceCarpetSpecs(fullSpoken);
          const updatedItem: VoiceRugItem = {
            ...item,
            ...parsed,
            recordedAt: new Date().toISOString()
          };
          saveVoiceRugItemToFirestore(updatedItem).catch(() => {});
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setToastMessage({ type: 'error', text: 'Microphone access denied.' });
          setPermissionDenied(true);
        } else if (event.error !== 'no-speech') {
          console.warn('Voice recognition error:', event.error);
        }
        setActiveRecordingId(null);
        setLiveTranscript('');
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setActiveRecordingId(null);
        if (finalAudioTranscript.trim()) {
          const parsed = parseVoiceCarpetSpecs(finalAudioTranscript.trim());
          const finalItem: VoiceRugItem = {
            ...item,
            ...parsed,
            recordedAt: new Date().toISOString()
          };
          saveVoiceRugItemToFirestore(finalItem).then(() => {
            setToastMessage({
              type: 'success',
              text: 'Voice specs updated and saved automatically!'
            });
          }).catch(() => {});
        }
        setLiveTranscript('');
      };

      console.log('Calling recognition.start()');
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setToastMessage({ type: 'error', text: 'Could not access microphone.' });
      setActiveRecordingId(null);
    }
  };

  // Start Manual Editing of an Item
  const handleStartEdit = (item: VoiceRugItem) => {
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  // Save Manual Editing
  const handleSaveEdit = async (itemId: string) => {
    const existing = items.find(i => i.id === itemId);
    if (!existing) return;
    const updated: VoiceRugItem = {
      ...existing,
      ...editForm,
      recordedAt: new Date().toISOString()
    };
    try {
      await saveVoiceRugItemToFirestore(updated);
      setEditingItemId(null);
      setEditForm({});
      setToastMessage({ type: 'success', text: 'Rug specifications updated successfully!' });
    } catch (err) {
      console.error('Error saving edited rug item:', err);
      setToastMessage({ type: 'error', text: 'Failed to update rug specifications.' });
    }
  };

  // Delete an Item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteVoiceRugItemFromFirestore(itemId);
      setToastMessage({ type: 'success', text: 'Photo deleted from gallery.' });
    } catch (err) {
      console.error('Error deleting rug item:', err);
      setToastMessage({ type: 'error', text: 'Failed to delete photo.' });
    }
  };

  // Copy Specifications as WhatsApp / Buyer formatted message
  const handleCopySpecs = (item: VoiceRugItem) => {
    const msg = `🌟 *FOUR CORNERS CARPETS — SPECIFICATION SHEET*\n` +
      `📌 *Design / Title:* ${item.title || item.fileName}\n` +
      `📐 *Size:* ${item.size || 'Custom'}\n` +
      `🧶 *Material:* ${item.material || '100% Wool'}\n` +
      `📏 *Pile Height:* ${item.pileHeight || 'Standard'}\n` +
      `🏗️ *Construction:* ${item.construction || 'Hand Tufted'}\n` +
      `🎨 *Colorway:* ${item.color || 'Standard'}\n` +
      (item.priceEstimate ? `💰 *Price:* ${item.priceEstimate}\n` : '') +
      (item.voiceTranscript ? `🎙️ *Voice Note:* "${item.voiceTranscript}"\n` : '');

    navigator.clipboard.writeText(msg).then(() => {
      setToastMessage({ type: 'success', text: 'Specifications copied to clipboard (WhatsApp ready)!' });
    }).catch(() => {
      setToastMessage({ type: 'error', text: 'Could not copy to clipboard.' });
    });
  };

  // Download Catalogue in PowerPoint (.pptx) Format
  const handleDownloadPptx = async () => {
    const targetItems = filteredItems.length > 0 ? filteredItems : items;
    if (targetItems.length === 0) {
      setToastMessage({ type: 'error', text: 'No rugs available to export.' });
      return;
    }
    try {
      setIsExportingPpt(true);
      setToastMessage({ type: 'success', text: `Generating PowerPoint Catalogue for ${targetItems.length} rugs...` });
      await downloadRugCataloguePptx(targetItems, 'Product Showcase Catalogue');
      setToastMessage({ type: 'success', text: 'PowerPoint Catalogue (.pptx) downloaded successfully!' });
    } catch (err) {
      console.error('Error generating PPTX:', err);
      setToastMessage({ type: 'error', text: 'Failed to create PPTX file.' });
    } finally {
      setIsExportingPpt(false);
    }
  };

  // Download or Print Catalogue in PDF Format
  const handleDownloadPdf = () => {
    const targetItems = filteredItems.length > 0 ? filteredItems : items;
    if (targetItems.length === 0) {
      setToastMessage({ type: 'error', text: 'No rugs available to export.' });
      return;
    }
    setToastMessage({ type: 'success', text: `Preparing PDF Catalogue for ${targetItems.length} rugs...` });
    openPrintablePdfCatalogue(targetItems, 'Exclusive Rug & Carpet Collection');
  };

  // Filtered List
  const filteredItems = items.filter(it => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (it.title || '').toLowerCase().includes(term) ||
      (it.size || '').toLowerCase().includes(term) ||
      (it.material || '').toLowerCase().includes(term) ||
      (it.construction || '').toLowerCase().includes(term) ||
      (it.color || '').toLowerCase().includes(term) ||
      (it.voiceTranscript || '').toLowerCase().includes(term);

    const matchConstruction = selectedConstruction === 'ALL' || 
      (it.construction || '').toLowerCase().includes(selectedConstruction.toLowerCase());

    return matchSearch && matchConstruction;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Outer Card */}
      <div 
        className="relative w-full h-full md:max-w-7xl md:h-[94vh] bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 px-4 md:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between shrink-0 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl shadow-md">
              <Mic className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm md:text-base tracking-wide uppercase font-mono">
                  Voice Rug Specifier &amp; Photo Gallery
                </h2>
                <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                  AI + Voice Engine
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Bulk Upload
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                बल्क में फोटो अपलोड करें • हर फोटो पर माइक बोलकर साइज, मटेरियल, पाइल हाइट और कंस्ट्रक्शन जोड़ें
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Company Selector for Export */}
            <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700">
              <select
                id="companySelector"
                className="bg-transparent text-xs font-bold text-white px-3 py-1.5 focus:outline-none cursor-pointer"
                onChange={(e) => (window as any).selectedCompany = e.target.value}
                defaultValue="Four Corners Carpets"
              >
                <option value="Four Corners Carpets">Four Corners Carpets</option>
                <option value="Export Textile Manufacturing">Export Textile Manufacturing</option>
              </select>
            </div>

            {/* Language Switcher for Voice Input */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setSpeechLanguage('hi-IN')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  speechLanguage === 'hi-IN' ? 'bg-[#E4002B] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Hindi Voice Recognition"
              >
                <span>🇮🇳 हिन्दी</span>
              </button>
              <button
                onClick={() => setSpeechLanguage('en-IN')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  speechLanguage === 'en-IN' ? 'bg-[#E4002B] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="English Voice Recognition"
              >
                <span>🇬🇧 English</span>
              </button>
            </div>

            {/* Hidden Input for Bulk Photo Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBulkUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Upload Bulk Photos Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>बल्क फोटो जोड़ें</span>
            </button>

            {/* Download PPT Catalogue Button */}
            <button
              onClick={handleDownloadPptx}
              disabled={isExportingPpt || items.length === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-orange-400"
              title="Download PowerPoint Presentation Catalogue (.pptx) with slides for each rug"
            >
              {isExportingPpt ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PPT बन रही है...</span>
                </>
              ) : (
                <>
                  <Presentation className="w-3.5 h-3.5 text-white" />
                  <span>Catalogue PPT</span>
                </>
              )}
            </button>

            {/* Download PDF Catalogue Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={items.length === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-red-400"
              title="Download or Print PDF Catalogue with coversheet and specifications"
            >
              <FileDown className="w-3.5 h-3.5 text-white" />
              <span>Catalogue PDF</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Close Gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Active Voice Recording Alert Bar */}
        {activeRecordingId && (
          <div className="bg-rose-900/90 text-white px-4 py-2 border-b border-rose-700 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400 animate-ping" />
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-300 animate-bounce" />
                <span className="text-xs font-bold font-mono">
                  🎙️ माइक सक्रिय है (Mic Active):
                </span>
                <span className="text-xs italic text-amber-200">
                  {liveTranscript || 'बोलिए... जैसे: "Size 250 by 350, 100% Wool, Pile Height 12 mm, Hand Tufted"'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if (recognitionRef.current) recognitionRef.current.stop();
                setActiveRecordingId(null);
                setLiveTranscript('');
              }}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-800 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
            >
              डन (Finish Voice)
            </button>
          </div>
        )}
        
        {/* Persistent Permission Denied Alert Bar */}
        {permissionDenied && (
          <div className="bg-amber-600 text-slate-950 px-4 py-3 border-b border-amber-500 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div className="text-xs font-bold">
                <p className="uppercase tracking-widest font-black">Microphone Access Denied (माइक बंद है)</p>
                <p className="font-normal opacity-90">
                  Please click the 🔒 icon in your browser address bar and <strong>Allow</strong> microphone access, then refresh the page.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPermissionDenied(false)}
              className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-800 shadow-sm"
            >
              Dismiss (हटाएं)
            </button>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by size, material, construction, color or transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-bold font-mono">Construction:</span>
            <select
              value={selectedConstruction}
              onChange={(e) => setSelectedConstruction(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white cursor-pointer focus:outline-none"
            >
              <option value="ALL">All Techniques (सभी)</option>
              <option value="Tufted">Hand Tufted</option>
              <option value="Knotted">Hand Knotted</option>
              <option value="Woven">Hand Woven / Flatweave</option>
              <option value="Loop">Loop Pile</option>
            </select>

            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              Total: <strong className="text-amber-400 font-bold">{filteredItems.length}</strong> rugs
            </span>
          </div>
        </div>

        {/* Main Gallery Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-slate-950">
          
          {/* Upload Progress Loader */}
          {isUploading && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-800/80 border border-rose-500/50 flex items-center justify-center gap-3 text-sm text-rose-300 font-bold shadow-xl animate-pulse">
              <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span>{uploadProgress || 'Processing photos...'}</span>
            </div>
          )}

          {/* Empty State */}
          {items.length === 0 && !isUploading && (
            <div className="text-center py-20 px-4 max-w-lg mx-auto space-y-4">
              <div className="w-20 h-20 bg-rose-950/80 text-[#E4002B] rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-700/50 shadow-xl">
                <ImageIcon className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                गैलरी खाली है (No Photos Yet)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                अपने कंप्यूटर या मोबाइल से एक साथ बल्क में कार्पेट/रग्स के फोटो अपलोड करें। प्रत्येक फोटो पर दिए गए माइक (Mic) बटन को दबाकर अपनी आवाज में साइज, मटेरियल, पाइल हाइट और कंस्ट्रक्शन बोलें — सिस्टम खुद-ब-खुद फैंसी टेक्स्ट कार्ड तैयार कर देगा।
              </p>
              <div className="pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#E4002B] to-amber-500 hover:from-rose-600 hover:to-amber-400 text-white font-black text-xs rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>बल्क में फोटो अपलोड करें (Attach Photos)</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid of Rug Photo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isRecordingThis = activeRecordingId === item.id;
              const isEditingThis = editingItemId === item.id;

              return (
                <div 
                  key={item.id}
                  className={`bg-slate-900/90 rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col shadow-xl ${
                    isRecordingThis 
                      ? 'border-rose-500 ring-2 ring-rose-500 shadow-rose-950/50 scale-[1.01]' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Photo Thumbnail Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden group">
                    <img 
                      src={item.photoUrl} 
                      alt={item.title || item.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => setPreviewImage(item.photoUrl)}
                    />

                    {/* Quick Floating Actions on Photo */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewImage(item.photoUrl)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-md transition shadow-md cursor-pointer"
                        title="Enlarge Image"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg backdrop-blur-md transition shadow-md cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Prominent Floating Microphone Button */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <button
                        onClick={() => toggleVoiceRecording(item)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-xl cursor-pointer ${
                          isRecordingThis 
                            ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-400/40' 
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:scale-105'
                        }`}
                        title="Click to speak specifications (Size, Material, Pile Height, Construction)"
                      >
                        {isRecordingThis ? (
                          <>
                            <MicOff className="w-4 h-4 text-white animate-bounce" />
                            <span>सुन रहे हैं... (Listening)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-slate-950" />
                            <span>माइक बोलें (Speak Specs)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Title Overlay Banner */}
                    <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/50 max-w-[55%] truncate">
                      <span className="text-[11px] font-bold text-white truncate font-mono">
                        {item.title || item.fileName}
                      </span>
                    </div>
                  </div>

                  {/* Fancy Specifications Details Area ("थोड़ा फैंसी में") */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    
                    {isEditingThis ? (
                      /* Inline Edit Form */
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Design Title:</label>
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-cyan-400 block font-bold">Size:</label>
                            <input
                              type="text"
                              value={editForm.size || ''}
                              onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                              placeholder="250 x 350 cm"
                              className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-400 block font-bold">Pile Height:</label>
                            <input
                              type="text"
                              value={editForm.pileHeight || ''}
                              onChange={(e) => setEditForm({ ...editForm, pileHeight: e.target.value })}
                              placeholder="12 mm"
                              className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-amber-400 block font-bold">Material:</label>
                            <input
                              type="text"
                              value={editForm.material || ''}
                              onChange={(e) => setEditForm({ ...editForm, material: e.target.value })}
                              placeholder="100% Wool"
                              className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-indigo-400 block font-bold">Construction:</label>
                            <input
                              type="text"
                              value={editForm.construction || ''}
                              onChange={(e) => setEditForm({ ...editForm, construction: e.target.value })}
                              placeholder="Hand Tufted"
                              className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1 bg-emerald-600 text-white font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Fancy Badges & Specs Grid */
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-mono font-bold text-xs text-white truncate">
                            {item.title || 'Custom Rug Design'}
                          </h4>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition"
                            title="Edit Specs Manually"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Visual Spec Badges (Fancy Colorful Pills) */}
                        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                          {/* Size Badge */}
                          <div className="bg-cyan-950/50 border border-cyan-800/60 p-2 rounded-xl flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-cyan-400 block">Size</span>
                              <span className="font-mono font-black text-cyan-100 truncate block">
                                {item.size || 'Pending Voice'}
                              </span>
                            </div>
                          </div>

                          {/* Pile Height Badge */}
                          <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl flex items-center gap-2">
                            <Box className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Pile Height</span>
                              <span className="font-mono font-black text-emerald-100 truncate block">
                                {item.pileHeight || 'Standard'}
                              </span>
                            </div>
                          </div>

                          {/* Material Badge */}
                          <div className="bg-amber-950/50 border border-amber-800/60 p-2 rounded-xl flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-amber-400 block">Material</span>
                              <span className="font-bold text-amber-100 truncate block">
                                {item.material || '100% Wool'}
                              </span>
                            </div>
                          </div>

                          {/* Construction Badge */}
                          <div className="bg-indigo-950/50 border border-indigo-800/60 p-2 rounded-xl flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-indigo-400 block">Construction</span>
                              <span className="font-bold text-indigo-100 truncate block">
                                {item.construction || 'Hand Tufted'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Colorway & Optional Price Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {item.color && (
                            <span className="px-2 py-0.5 bg-rose-950/80 border border-rose-800/70 text-rose-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                              <Palette className="w-3 h-3 text-rose-400" />
                              <span>{item.color}</span>
                            </span>
                          )}
                          {item.priceEstimate && (
                            <span className="px-2 py-0.5 bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-[10px] font-mono font-black rounded-lg">
                              {item.priceEstimate}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 font-mono ml-auto">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Spoken Voice Transcription Quote Card */}
                        {item.voiceTranscript ? (
                          <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl text-[10px] text-slate-300 italic flex items-start gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              "{item.voiceTranscript}"
                            </span>
                          </div>
                        ) : (
                          <div className="p-1.5 bg-slate-950/40 rounded-lg text-[9.5px] text-slate-500 italic text-center">
                            💡 माइक पर क्लिक करके बोलें: "Size 250x350, 100% Wool, Pile 12mm"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Card Actions */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleCopySpecs(item)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        title="Copy formatted specifications for WhatsApp"
                      >
                        <Copy className="w-3 h-3 text-amber-400" />
                        <span>Copy WhatsApp Specs</span>
                      </button>

                      <button
                        onClick={() => toggleVoiceRecording(item)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{item.voiceTranscript ? 'Re-speak' : 'Record'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Bottom Bar Info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">
              FOUR CORNERS CARPETS — Voice Specification Engine (Microphone &amp; AI Recognition)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPptx}
              disabled={isExportingPpt || items.length === 0}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
            >
              <Presentation className="w-3.5 h-3.5 text-white" />
              <span>Download PPT</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={items.length === 0}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5 text-white" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Attach Photos</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 bg-[#E4002B] hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer transition shadow-xs"
            >
              Done (बंद करें)
            </button>
          </div>
        </div>

      </div>

      {/* Floating Image Zoom Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={previewImage} alt="Rug Preview" className="w-auto h-auto max-h-[85vh] object-contain rounded-xl" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-70 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold font-mono text-white ${
            toastMessage.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-[#E4002B] border border-rose-500'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

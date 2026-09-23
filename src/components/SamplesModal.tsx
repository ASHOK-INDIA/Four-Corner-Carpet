import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Sparkles,
  Camera,
  Grid,
  Upload,
  CheckCircle2,
  SlidersHorizontal,
  Wand2
} from 'lucide-react';
import { SampleItem } from '../types';
import { 
  subscribeSampleItems, 
  saveSampleItemToFirestore, 
  deleteSampleItemFromFirestore 
} from '../lib/firestoreService';
import { makeRugBackgroundTransparent } from '../lib/transparentRug';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
  onOpenARView?: (sample: SampleItem) => void;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({ isOpen, onClose, adminMode, onOpenARView }) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0); // -1 for left, 1 for right
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Auto-Transparency States
  const [autoTransparent, setAutoTransparent] = useState<boolean>(true); // Auto transparent enabled by default
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(false);
  const [isProcessingTransparency, setIsProcessingTransparency] = useState<boolean>(false);
  const [transparentMap, setTransparentMap] = useState<Record<string, string>>({});

  // Upload form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [autoRemoveUploadBg, setAutoRemoveUploadBg] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to Firestore Samples (Real user data ONLY - No random auto-seeding)
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeSampleItems(
      (data) => {
        // Filter out any default unsplash mock items or IDs containing sample-1, sample-2, sample-3
        const realSamples = data.filter(item => 
          item.id !== 'sample-1' && 
          item.id !== 'sample-2' && 
          item.id !== 'sample-3' &&
          !item.imageUrl.includes('unsplash.com')
        );
        setSamples(realSamples);

        // Auto-delete legacy mock items from Firestore in background
        data.forEach(item => {
          if (
            item.id === 'sample-1' || 
            item.id === 'sample-2' || 
            item.id === 'sample-3' || 
            item.imageUrl.includes('unsplash.com')
          ) {
            deleteSampleItemFromFirestore(item.id).catch(err => 
              console.warn('Failed to delete legacy sample:', err)
            );
          }
        });
      },
      (err) => {
        console.error('Samples loading error:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const currentSample = samples[currentIndex];

  // Automatically make active sample background transparent
  useEffect(() => {
    if (!isOpen || !currentSample || !autoTransparent) return;

    // Check if already processed
    if (transparentMap[currentSample.id]) return;

    let isMounted = true;
    setIsProcessingTransparency(true);

    makeRugBackgroundTransparent(currentSample.imageUrl)
      .then((transparentUrl) => {
        if (isMounted && transparentUrl) {
          setTransparentMap((prev) => ({
            ...prev,
            [currentSample.id]: transparentUrl,
          }));
        }
      })
      .catch((err) => {
        console.warn('Auto transparency processing error:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsProcessingTransparency(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSample?.id, currentSample?.imageUrl, autoTransparent, transparentMap]);

  // Auto-slide every 4 seconds if not paused
  useEffect(() => {
    if (!isOpen || samples.length <= 1) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % samples.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, samples.length]);

  // Adjust active index if length changes
  useEffect(() => {
    if (currentIndex >= samples.length && samples.length > 0) {
      setCurrentIndex(samples.length - 1);
    }
  }, [samples, currentIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (samples.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % samples.length);
  };

  const handlePrev = () => {
    if (samples.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + samples.length) % samples.length);
  };

  // Direct file upload with auto-transparency
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setFormError('');
      if (!newTitle.trim()) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }

      if (autoRemoveUploadBg) {
        // Automatically make uploaded rug background transparent
        const transparentDataUrl = await makeRugBackgroundTransparent(file);
        setNewUrl(transparentDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setNewUrl(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('File background removal error:', err);
      setFormError('Failed to process image transparency.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Please enter a valid title.');
      return;
    }
    if (!newUrl.trim()) {
      setFormError('Please provide an image URL or upload a photo.');
      return;
    }

    try {
      setIsUploading(true);
      setFormError('');
      
      let finalImageUrl = newUrl.trim();

      // If user enabled auto-remove background and it's a URL (not already processed data URL)
      if (autoRemoveUploadBg && !finalImageUrl.startsWith('data:image/png;base64')) {
        try {
          const autoTransparentUrl = await makeRugBackgroundTransparent(finalImageUrl);
          if (autoTransparentUrl && autoTransparentUrl !== finalImageUrl) {
            finalImageUrl = autoTransparentUrl;
          }
        } catch {
          // fallback to original URL
        }
      }

      const newSample: SampleItem = {
        id: `sample-${Date.now()}`,
        title: newTitle.trim(),
        imageUrl: finalImageUrl,
        description: newDesc.trim(),
        createdAt: new Date().toISOString()
      };

      await saveSampleItemToFirestore(newSample);

      // Cache transparent representation immediately
      setTransparentMap((prev) => ({
        ...prev,
        [newSample.id]: finalImageUrl,
      }));
      
      // Reset form
      setNewTitle('');
      setNewUrl('');
      setNewDesc('');
      
      // Select the newly added sample
      setTimeout(() => {
        setDirection(1);
        setCurrentIndex(samples.length); // will be the last element
      }, 300);

    } catch (err) {
      setFormError('Failed to save sample to database. Please check your network connection.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSample = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this sample?')) return;

    try {
      await deleteSampleItemFromFirestore(id);
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    } catch (err) {
      console.error('Delete sample error:', err);
      alert('Failed to delete sample.');
    }
  };

  // 3D Flip-Slide Animation Variants
  const slideFlipVariants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 80 : -80,
      x: dir > 0 ? 250 : -250,
      opacity: 0,
      scale: 0.85,
      z: -100
    }),
    center: {
      rotateY: 0,
      x: 0,
      opacity: 1,
      scale: 1,
      z: 0,
      transition: {
        rotateY: { type: 'spring', stiffness: 100, damping: 15 },
        x: { type: 'spring', stiffness: 120, damping: 18 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 }
      }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -80 : 80,
      x: dir > 0 ? -250 : 250,
      opacity: 0,
      scale: 0.85,
      z: -100,
      transition: {
        duration: 0.4
      }
    })
  };

  const displayedImageSrc = currentSample
    ? (autoTransparent && transparentMap[currentSample.id]
        ? transparentMap[currentSample.id]
        : currentSample.imageUrl)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-950/60 backdrop-blur-md">
      {/* Main Container */}
      <div 
        id="samples-modal-container"
        className={`relative w-full h-full md:max-w-6xl md:h-[86vh] bg-white/95 backdrop-blur-xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-red-500/30 transition-all duration-300 ${
          isFullscreen ? 'md:max-w-full md:h-full md:rounded-none' : ''
        }`}
      >
        
        {/* LEFT COLUMN: Image Carousel Viewer (Red Theme Header & Floating Transparent Rug Stage) */}
        <div className="flex-1 flex flex-col bg-[#F5EFEB] relative h-full">
          {/* Crimson Top Bar with Auto-Transparent Controls */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-[#B91C1C] via-[#E4002B] to-[#B91C1C] px-4 sm:px-6 py-3.5 flex items-center justify-between z-30 text-white shadow-md">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span className="font-black text-xs sm:text-sm tracking-widest uppercase">
                Samples Gallery
              </span>
              <span className="px-2 py-0.5 text-[10px] bg-white/20 rounded-md font-mono">
                {samples.length > 0 ? `${currentIndex + 1} / ${samples.length}` : '0 / 0'}
              </span>

              {/* Auto Transparent Active Pill */}
              <button
                type="button"
                onClick={() => setAutoTransparent(!autoTransparent)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition border cursor-pointer ${
                  autoTransparent
                    ? 'bg-emerald-600/90 text-white border-emerald-300/60 shadow-xs'
                    : 'bg-black/30 text-white/80 border-white/20 hover:bg-black/40'
                }`}
                title="Toggle Auto Background Transparency for Rug Samples"
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Transparent: {autoTransparent ? 'ON' : 'OFF'}</span>
                {isProcessingTransparency && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />
                )}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Checkerboard Grid View Toggle */}
              <button
                type="button"
                onClick={() => setShowCheckerboard(!showCheckerboard)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                  showCheckerboard
                    ? 'bg-white text-slate-900 border-white shadow-sm'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
                title="Toggle Transparency Checkerboard Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {/* Mobile Auto-Transparent Toggle */}
              <button
                type="button"
                onClick={() => setAutoTransparent(!autoTransparent)}
                className={`sm:hidden p-1.5 rounded-lg border transition ${
                  autoTransparent ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-white/20 text-white border-white/20'
                }`}
                title="Auto Transparent"
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>

              {/* View in AR Room Button */}
              {onOpenARView && currentSample && (
                <button
                  type="button"
                  onClick={() => onOpenARView(currentSample)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition transform active:scale-95 cursor-pointer border border-amber-300"
                  title="View this rug sample in 3D AR on your room floor"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-950" />
                  <span className="hidden sm:inline">View in AR Room</span>
                  <span className="sm:hidden">AR View</span>
                </button>
              )}

              {/* Maximize Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close button */}
              <button 
                type="button"
                onClick={onClose}
                className={`p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer ${adminMode ? 'md:hidden' : 'block'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 3D Perspective Floating Transparent Rug Stage */}
          <div 
            className={`flex-1 flex items-center justify-center p-4 relative overflow-hidden mt-12 transition-colors duration-500 perspective-1000 ${
              showCheckerboard 
                ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100' 
                : 'bg-gradient-to-br from-[#FAF7F2] via-[#EFE8DF] to-[#E3D8CA]'
            }`}
          >
            {samples.length > 0 && currentSample ? (
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={currentSample.id}
                  custom={direction}
                  variants={slideFlipVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute w-full h-[72%] max-h-[500px] md:h-[82%] px-4 md:px-12 flex flex-col items-center justify-center cursor-pointer"
                >
                  {/* Floating Transparent Rug Display Container (No Solid Background Box) */}
                  <div className="relative group w-full h-full max-w-2xl flex items-center justify-center">
                    
                    {/* Realistic Rug Drop Shadow on Floor Stage */}
                    <div 
                      className="absolute inset-x-8 bottom-4 h-12 bg-black/25 blur-xl rounded-full transform scale-x-95 pointer-events-none transition-all duration-300 group-hover:scale-x-100 group-hover:blur-2xl"
                    />

                    {/* Auto-Transparent Rug Image */}
                    <img 
                      src={displayedImageSrc} 
                      alt={currentSample.title}
                      referrerPolicy="no-referrer"
                      className={`max-w-full max-h-full object-contain transition-all duration-500 hover:scale-105 select-none ${
                        autoTransparent
                          ? 'drop-shadow-[0_22px_30px_rgba(25,15,10,0.38)] mix-blend-multiply'
                          : 'drop-shadow-2xl'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />

                    {/* Auto-Transparent Active Tag */}
                    {autoTransparent && (
                      <div className="absolute top-2 left-2 z-10 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white flex items-center gap-1 border border-white/20 shadow-xs">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          Auto Transparent
                        </span>
                      </div>
                    )}
                    
                    {/* Hover Detail Overlay (Floating Pill at Bottom) */}
                    <div className="absolute inset-x-4 bottom-2 bg-slate-950/85 backdrop-blur-md rounded-2xl p-4 text-white flex items-center justify-between gap-4 border border-white/20 shadow-xl opacity-90 group-hover:opacity-100 transition-all">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs md:text-sm font-black text-white tracking-wide truncate">
                          {currentSample.title}
                        </h3>
                        {currentSample.description && (
                          <p className="text-[10px] md:text-[11px] text-red-200 truncate mt-0.5 font-sans">
                            {currentSample.description}
                          </p>
                        )}
                      </div>

                      {onOpenARView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenARView(currentSample);
                          }}
                          className="shrink-0 px-3.5 py-1.5 bg-gradient-to-r from-[#E4002B] via-[#EF4444] to-[#B91C1C] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition transform active:scale-95 cursor-pointer border border-red-300/40"
                          title="View this rug sample in 3D AR on your room floor"
                        >
                          <Camera className="w-3.5 h-3.5 text-white" />
                          <span>View in AR</span>
                        </button>
                      )}
                    </div>

                    {/* Delete Icon (Only Admin) */}
                    {adminMode && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSample(currentSample.id, e)}
                        className="absolute top-2 right-2 bg-red-600/90 text-white p-2 rounded-xl hover:bg-red-700 transition-all hover:scale-105 cursor-pointer shadow-lg border border-red-500 z-20"
                        title="Delete this Sample from Firestore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center text-slate-400 flex flex-col items-center">
                <ImageIcon className="w-12 h-12 mb-3 text-slate-300 animate-pulse" />
                <p className="text-sm">No samples available in collection.</p>
                {adminMode && <p className="text-xs mt-1 text-slate-500">Upload or add a custom rug image using the right panel.</p>}
              </div>
            )}

            {/* Left/Right Absolute Trigger Arrow Controls */}
            {samples.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 md:left-6 bg-[#E4002B]/90 hover:bg-[#E4002B] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
                  title="Previous Sample"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 md:right-6 bg-[#E4002B]/90 hover:bg-[#E4002B] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
                  title="Next Sample"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Dots and Quick Instructions (Red Crimson Highlight) */}
          <div className="bg-[#EFE8DF] border-t border-[#DFD6C5] px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-800">
            <div className="flex space-x-1.5">
              {samples.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-6 bg-[#E4002B]' 
                      : 'w-2.5 bg-slate-400 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-700">
              <span className="bg-[#E4002B] px-2 py-0.5 rounded text-white text-[10px] font-bold">
                AUTO TRANSPARENT
              </span>
              <span>Rug background is automatically transparent on canvas</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Red Crimson Sidebar - Upload Image / Add Sample */}
        {adminMode && (
          <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-red-200/50 flex flex-col bg-slate-50 h-1/3 md:h-full">
            {/* Sidebar Title with Close */}
            <div className="p-4 bg-slate-100 border-b border-red-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#E4002B] tracking-wide uppercase">
                  Samples Manager
                </h2>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Manage Rug Collections & Auto-Transparent Cuts
                </p>
              </div>
              {/* Desktop Close */}
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex p-1.5 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {/* Upload form for admin */}
              <div className="p-4 bg-white rounded-2xl border border-red-200/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-red-100 text-[#E4002B] p-1.5 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                      Add New Rug Sample
                    </h3>
                  </div>

                  {/* Auto-Remove Background Toggle in Form */}
                  <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRemoveUploadBg}
                      onChange={(e) => setAutoRemoveUploadBg(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Auto Cutout</span>
                  </label>
                </div>

                {/* Upload File Button */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2 px-3 border-2 border-dashed border-red-300 hover:border-[#E4002B] rounded-xl bg-red-50/50 hover:bg-red-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#E4002B]" />
                    <span>Upload Rug Image (Auto-Cutout)</span>
                  </button>
                </div>

                <form onSubmit={handleAddSample} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 tracking-wider uppercase mb-1">
                      Sample Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bhadohi Hand-Tufted Floral Rug"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 tracking-wider uppercase mb-1 flex items-center justify-between">
                      <span>Image URL or Upload Preview *</span>
                      <LinkIcon className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://... or upload image above"
                      value={newUrl.startsWith('data:') ? '✓ Image data uploaded (Auto-Cutout applied)' : newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 tracking-wider uppercase mb-1">
                      Material / Design Description
                    </label>
                    <textarea
                      placeholder="Describe BHP / Woolen texture details..."
                      rows={2}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B] resize-none"
                    />
                  </div>

                  {formError && (
                    <p className="text-[11px] text-red-600 font-bold bg-red-50 p-2.5 rounded-lg border border-red-200">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-2 bg-[#E4002B] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-all hover:shadow-lg active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isUploading ? 'Processing & Saving...' : 'Save Transparent Rug'}</span>
                  </button>
                </form>
              </div>

              {/* List Overview Side-Panel */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  Samples List ({samples.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {samples.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setDirection(idx > currentIndex ? 1 : -1);
                        setCurrentIndex(idx);
                      }}
                      className={`w-full text-left p-2 rounded-xl border flex items-center space-x-2.5 transition-all cursor-pointer ${
                        idx === currentIndex
                          ? 'bg-rose-50 border-[#E4002B] ring-1 ring-[#E4002B]'
                          : 'bg-white hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <img 
                          src={transparentMap[item.id] || item.imageUrl} 
                          alt={item.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain mix-blend-multiply"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold text-slate-800 truncate">
                          {item.title}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {item.description || 'No description provided'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Red Accent Footer */}
            <div className="p-3 bg-slate-100 border-t border-red-100 text-[10px] text-slate-400 text-center font-sans">
              popTop® Real-time Manufacturing Gallery • Auto Transparent
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SamplesModal;

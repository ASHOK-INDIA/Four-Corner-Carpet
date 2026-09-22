import React, { useState, useEffect } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { SampleItem } from '../types';
import { 
  subscribeSampleItems, 
  saveSampleItemToFirestore, 
  deleteSampleItemFromFirestore 
} from '../lib/firestoreService';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({ isOpen, onClose, adminMode }) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0); // -1 for left, 1 for right
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Upload form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

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

        // Auto-delete them from Firestore in background if they exist in the database!
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

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (!isOpen || samples.length <= 1) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % samples.length);
    }, 3000);

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

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Please enter a valid title.');
      return;
    }
    if (!newUrl.trim()) {
      setFormError('Please enter a valid image URL.');
      return;
    }
    // Simple URL check
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      setFormError('URL must start with http:// or https://');
      return;
    }

    try {
      setIsUploading(true);
      setFormError('');
      
      const newSample: SampleItem = {
        id: `sample-${Date.now()}`,
        title: newTitle.trim(),
        imageUrl: newUrl.trim(),
        description: newDesc.trim(),
        createdAt: new Date().toISOString()
      };

      await saveSampleItemToFirestore(newSample);
      
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

  const currentSample = samples[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-950/50 backdrop-blur-md">
      {/* Main Container */}
      <div 
        id="samples-modal-container"
        className={`relative w-full h-full md:max-w-6xl md:h-[85vh] bg-white/95 backdrop-blur-xl md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-rose-100/40 transition-all duration-300 ${
          isFullscreen ? 'md:max-w-full md:h-full md:rounded-none' : ''
        }`}
      >
        
        {/* LEFT COLUMN: Image Carousel Viewer (Red Theme Header & Accent) */}
        <div className="flex-1 flex flex-col bg-[#F4EFE6] relative h-full">
          {/* Crimson Top Bar for Viewer */}
          <div className="absolute top-0 inset-x-0 bg-[#E4002B] px-6 py-4 flex items-center justify-between z-30 text-white shadow-md">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span className="font-extrabold text-sm tracking-widest uppercase">
                Samples Gallery
              </span>
              <span className="px-2 py-0.5 text-[10px] bg-white/20 rounded font-mono">
                {samples.length > 0 ? `${currentIndex + 1} / ${samples.length}` : '0 / 0'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Maximize Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close button (always show if not admin, show on mobile for admin) */}
              <button 
                type="button"
                onClick={onClose}
                className={`p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer ${adminMode ? 'md:hidden' : 'block'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 3D Perspective Stage */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden mt-12 bg-gradient-to-br from-[#FCFAF7] via-[#F3EDE4] to-[#EAE2D5] perspective-1000">
            {samples.length > 0 && currentSample ? (
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={currentSample.id}
                  custom={direction}
                  variants={slideFlipVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute w-full h-[70%] max-h-[480px] md:h-[80%] px-4 md:px-12 flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="relative group w-full h-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl border border-[#DFD6C5]/60 flex items-center justify-center">
                    {/* Referrer-policy no-referrer added to standard img for clean external image loading */}
                    <img 
                      src={currentSample.imageUrl} 
                      alt={currentSample.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        // Fallback image in case of broken link
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    
                    {/* Hover Detail Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 text-white flex flex-col justify-end">
                      <h3 className="text-sm md:text-base font-bold text-white tracking-wide">
                        {currentSample.title}
                      </h3>
                      {currentSample.description && (
                        <p className="text-[11px] md:text-xs text-rose-100 mt-1 line-clamp-2 max-w-lg">
                          {currentSample.description}
                        </p>
                      )}
                    </div>

                    {/* Delete Icon (Only Admin) */}
                    {adminMode && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSample(currentSample.id, e)}
                        className="absolute top-4 right-4 bg-red-600/90 text-white p-2.5 rounded-xl hover:bg-red-700 transition-all hover:scale-105 cursor-pointer shadow-lg border border-red-500"
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
                {adminMode && <p className="text-xs mt-1 text-slate-500">Add a custom image URL using the right panel.</p>}
              </div>
            )}

            {/* Left/Right Absolute Trigger Arrow Controls */}
            {samples.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 md:left-6 bg-[#E4002B]/90 hover:bg-[#E4002B] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
                  title="Previous Sample (Flip-Slide)"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 md:right-6 bg-[#E4002B]/90 hover:bg-[#E4002B] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
                  title="Next Sample (Flip-Slide)"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Dots and Quick Instructions (Crimson background highlight) */}
          <div className="bg-[#EAE2D5] border-t border-[#DFD6C5] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-800">
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

            <div className="flex items-center space-x-2 text-[11px] text-slate-600">
              <span className="bg-[#E4002B] px-2 py-0.5 rounded text-white text-[10px] font-bold">
                PRO TIP
              </span>
              <span>Use side arrows for 3D Flip transition</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Red Crimson Sidebar - Upload Image / Add Sample */}
        {adminMode && (
          <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-rose-100 flex flex-col bg-slate-50 h-1/3 md:h-full">
          {/* Sidebar Title with Close */}
          <div className="p-5 bg-slate-100 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#E4002B] tracking-wide uppercase">
                Samples Manager
              </h2>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                Manage Bhutan & Bhadohi Sample Collections
              </p>
            </div>
            {/* Desktop Close */}
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex p-1.5 hover:bg-rose-100 text-slate-500 hover:text-red-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* Upload form for admin */}
            <div className="p-4 bg-white rounded-xl border border-rose-200/50 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-red-100 text-[#E4002B] p-1.5 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
                  Add New Sample Rug
                </h3>
              </div>

              <form onSubmit={handleAddSample} className="space-y-3.5">
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
                    <span>Image URL *</span>
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newUrl}
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
                  className="w-full py-2 bg-[#E4002B] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:shadow-lg active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{isUploading ? 'Uploading...' : 'Save to Firestore'}</span>
                </button>
              </form>
            </div>

            {/* List Overview Side-Panel */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                Samples List ({samples.length})
              </h4>
              <div className="space-y-2">
                {samples.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDirection(idx > currentIndex ? 1 : -1);
                      setCurrentIndex(idx);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center space-x-3 transition-all ${
                      idx === currentIndex
                        ? 'bg-rose-50 border-[#E4002B]/40 ring-1 ring-[#E4002B]'
                        : 'bg-white hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-100 flex items-center justify-center">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold text-slate-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {item.description || 'No description provided'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Red Accent Footer */}
          <div className="p-4 bg-slate-100 border-t border-rose-100 text-[10px] text-slate-400 text-center font-sans">
            popTop® Real-time Manufacturing Gallery
          </div>
        </div>
        )}

      </div>
    </div>
  );
};

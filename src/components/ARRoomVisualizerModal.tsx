import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Smartphone, Download, RefreshCw, Image as ImageIcon, Sliders, Check, Layers, Upload, ExternalLink, Palette, Sparkles, Move, Wand2 } from 'lucide-react';
import { SampleItem } from '../types';
import { subscribeSampleItems } from '../lib/firestoreService';
import { makeRugBackgroundTransparent } from '../lib/transparentRug';

interface ARRoomVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSample?: SampleItem | null;
}

// Crisp Vector SVG for Pure Tan Studio Floor (Tan Wall + Baseboard + Natural Oak Tan Floor Planks)
const createTanStudioSvg = (tanFloorHex: string = '%23D2B48C', tanWallHex: string = '%23EADBCA') => 
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="tanWallGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tanWallHex}"/>
      <stop offset="100%" stop-color="%23DDD0BE"/>
    </linearGradient>
    <linearGradient id="tanFloorGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23C2A37B"/>
      <stop offset="35%" stop-color="${tanFloorHex}"/>
      <stop offset="100%" stop-color="%23B8956B"/>
    </linearGradient>
    <linearGradient id="wallOcclusion" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(45,30,18,0.32)"/>
      <stop offset="100%" stop-color="rgba(45,30,18,0)"/>
    </linearGradient>
  </defs>
  <!-- Architectural Tan Wall -->
  <rect x="0" y="0" width="1400" height="385" fill="url(%23tanWallGrad)"/>
  <!-- Baseboard Moulding -->
  <rect x="0" y="375" width="1400" height="10" fill="%23CFC2B0"/>
  <rect x="0" y="385" width="1400" height="15" fill="%23FAF6F0"/>
  <line x1="0" y1="400" x2="1400" y2="400" stroke="%23967C60" stroke-width="2.5"/>
  <!-- Pure Tan Floor Area -->
  <rect x="0" y="400" width="1400" height="500" fill="url(%23tanFloorGrad)"/>
  <rect x="0" y="400" width="1400" height="90" fill="url(%23wallOcclusion)"/>
  <!-- Floor Perspective Planks Lines -->
  <line x1="700" y1="400" x2="700" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="560" y1="400" x2="420" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="840" y1="400" x2="980" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="420" y1="400" x2="140" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="980" y1="400" x2="1260" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="280" y1="400" x2="-140" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
  <line x1="1120" y1="400" x2="1540" y2="900" stroke="%23B6946A" stroke-width="2" opacity="0.45"/>
</svg>`;

// Tan Swatches
const TAN_SHADES = [
  { id: 'tan-classic', name: 'Classic Tan', hex: '#D2B48C', encoded: '%23D2B48C' },
  { id: 'tan-sand', name: 'Warm Sand Tan', hex: '#DFCEBA', encoded: '%23DFCEBA' },
  { id: 'tan-oak', name: 'Natural Oak Tan', hex: '#CDB296', encoded: '%23CDB296' },
  { id: 'tan-honey', name: 'Amber Honey Tan', hex: '#DDA15E', encoded: '%23DDA15E' },
  { id: 'tan-saddle', name: 'Saddle Tan', hex: '#B08968', encoded: '%23B08968' },
];

// Room Settings with Poptop Kids Furniture & Pure Tan Studio Floor
const PRESET_ROOMS = [
  {
    id: 'tan-pure-studio',
    title: 'Pure Tan Studio Floor',
    subtitle: 'Warm Tan Wall & Oak Planks (Catalog Staging)',
    product: 'Tan Architectural Floor',
    url: createTanStudioSvg('%23D2B48C'),
    floorAngle: 58,
    defaultY: 60,
    poptopUrl: 'https://poptop.shop/shop/',
    isTanStudio: true,
  },
  {
    id: 'poptop-study-wood',
    title: 'Poptop Learning Room',
    subtitle: 'Height-Adjustable Desk & Lamp with Wood Floor',
    product: "Kid's Desk + Lamp",
    url: 'https://poptop.shop/wp-content/uploads/2026/04/kind-holzboden-locken-dsk-lmp-desktop2.jpg',
    floorAngle: 58,
    defaultY: 62,
    poptopUrl: 'https://poptop.shop/produkt/poptop-hoehenverstellbarer-kinderschreibtisch/',
  },
  {
    id: 'poptop-white-study',
    title: 'Poptop White Study Suite',
    subtitle: 'White Desk & Ergonomic Recycled PET Chair',
    product: 'Desk White + PET Chair',
    url: 'https://poptop.shop/wp-content/uploads/2025/03/fullframe_white1-1.jpg',
    floorAngle: 60,
    defaultY: 60,
    poptopUrl: 'https://poptop.shop/produkt/kinderschreibtischstuhl/',
  },
  {
    id: 'poptop-play-carpet',
    title: 'Poptop Play Space',
    subtitle: 'Desk Station with Floor Staging for Rugs',
    product: 'Play Station & Rug Zone',
    url: 'https://poptop.shop/wp-content/uploads/2026/01/carpet.jpg',
    floorAngle: 56,
    defaultY: 58,
    poptopUrl: 'https://poptop.shop/produkt/poptop-schreibtischteppich/',
  },
  {
    id: 'poptop-bundle-room',
    title: 'Poptop Bundle Room',
    subtitle: 'Complete Desk, Chair & Toy Storage Station',
    product: 'Desk + Chair + Toy Storage',
    url: 'https://poptop.shop/wp-content/uploads/2026/03/bundle-aktion.jpg',
    floorAngle: 58,
    defaultY: 62,
    poptopUrl: 'https://poptop.shop/aktionen/',
  },
  {
    id: 'poptop-desk-craft',
    title: 'Poptop Craft Workstation',
    subtitle: 'Adjustable Kids Table & Paper Roll Station',
    product: 'Paper-Roll Craft Desk',
    url: 'https://poptop.shop/wp-content/uploads/2024/09/DSK_WHT_1080x1280_6-Andere.jpg',
    floorAngle: 55,
    defaultY: 60,
    poptopUrl: 'https://poptop.shop/shop/',
  },
  {
    id: 'poptop-storage-corner',
    title: 'Poptop Toy Storage Corner',
    subtitle: 'Modular Stackable Storage Base & Play Floor',
    product: 'Toy Storage Base Set',
    url: 'https://poptop.shop/wp-content/uploads/2026/02/TOS_1080x1280_13.jpg',
    floorAngle: 54,
    defaultY: 58,
    poptopUrl: 'https://poptop.shop/produkt/spielzeugaufbewahrung-basisset/',
  },
];

const RUG_SIZES = [
  { label: '5 x 8 ft', scale: 0.72, cm: '150 x 240 cm' },
  { label: '6 x 9 ft', scale: 0.85, cm: '180 x 270 cm' },
  { label: '8 x 10 ft', scale: 1.0, cm: '240 x 300 cm' },
  { label: '9 x 12 ft', scale: 1.15, cm: '270 x 360 cm' },
  { label: '10 x 14 ft', scale: 1.30, cm: '300 x 420 cm' },
];

const FALLBACK_SAMPLES: SampleItem[] = [
  {
    id: 'fallback-1',
    title: 'Bhadohi Master Indo-Tibetan Hand-Knotted',
    imageUrl: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80',
    description: '10/10 fine density New Zealand wool with Austrian earth pigments and vintage border.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fallback-2',
    title: 'Alpine Minimalist Ivory Grid Rug',
    imageUrl: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Plush hand-tufted cut pile, 2800 GSM, ecru and alpine snow fleece.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fallback-3',
    title: 'Austrian Modernist Terracotta Dhurrie',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
    description: 'Flatweave panja loom, pure wool and raw jute geometric field.',
    createdAt: new Date().toISOString(),
  },
];

export const ARRoomVisualizerModal: React.FC<ARRoomVisualizerModalProps> = ({
  isOpen,
  onClose,
  initialSample,
}) => {
  // Samples Collection from Firestore
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [activeSample, setActiveSample] = useState<SampleItem>(initialSample || FALLBACK_SAMPLES[0]);

  // Camera / Room Backdrop Mode
  const [useLiveCamera, setUseLiveCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState(PRESET_ROOMS[0]);
  const [customRoomImage, setCustomRoomImage] = useState<string | null>(null);

  // Tan Floor Tone State
  const [activeTanShade, setActiveTanShade] = useState(TAN_SHADES[0]);

  // Rug Transform State
  const [selectedSize, setSelectedSize] = useState(RUG_SIZES[2]); // 8x10 ft default
  const [pitch, setPitch] = useState<number>(58); // perspective tilt angle
  const [rotation, setRotation] = useState<number>(0); // 0-360 deg
  const [posX, setPosX] = useState<number>(0); // px offset
  const [posY, setPosY] = useState<number>(60); // % floor placement
  const [shadowStrength, setShadowStrength] = useState<number>(0.65);
  const [lightingWarmth, setLightingWarmth] = useState<'neutral' | 'warm' | 'cool'>('warm');

  // Mouse Drag State for Positioning Rug
  const [isDraggingRug, setIsDraggingRug] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPosX: number; initialPosY: number } | null>(null);

  // Auto-Transparency Cache for AR Rug
  const [autoTransparent, setAutoTransparent] = useState<boolean>(true);
  const [transparentRugMap, setTransparentRugMap] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roomFileInputRef = useRef<HTMLInputElement | null>(null);
  const rugFileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to Samples module from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeSampleItems(
      (data) => {
        const realSamples = data.filter(item => 
          item.id !== 'sample-1' && 
          item.id !== 'sample-2' && 
          item.id !== 'sample-3' &&
          !item.imageUrl.includes('unsplash.com')
        );

        setSamples(realSamples);

        if (initialSample) {
          setActiveSample(initialSample);
        } else if (realSamples.length > 0) {
          setActiveSample(realSamples[0]);
        }
      },
      (err) => {
        console.error('AR Visualizer samples fetch error:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, initialSample]);

  // Auto-process rug transparency for clean floor integration
  useEffect(() => {
    if (!isOpen || !activeSample || !autoTransparent) return;
    if (transparentRugMap[activeSample.id]) return;

    let isMounted = true;
    makeRugBackgroundTransparent(activeSample.imageUrl)
      .then((transparentUrl) => {
        if (isMounted && transparentUrl) {
          setTransparentRugMap((prev) => ({
            ...prev,
            [activeSample.id]: transparentUrl,
          }));
        }
      })
      .catch((err) => {
        console.warn('AR Rug transparency error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeSample?.id, activeSample?.imageUrl, autoTransparent, transparentRugMap]);

  // Camera stream handler
  useEffect(() => {
    if (!isOpen) return;

    if (useLiveCamera) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(null);
        })
        .catch((err) => {
          console.error('Camera stream access error:', err);
          setCameraError('Unable to access floor camera. Please check browser camera permissions.');
          setUseLiveCamera(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [useLiveCamera, isOpen]);

  // Sync initial sample when prop updates
  useEffect(() => {
    if (initialSample) {
      setActiveSample(initialSample);
    }
  }, [initialSample]);

  // Mouse & Touch Drag Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Left click or single touch only
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    e.stopPropagation();

    setIsDraggingRug(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: posX,
      initialPosY: posY,
    };

    // Capture pointer to track smoothly outside target
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    e.preventDefault();
    const { startX, startY, initialPosX, initialPosY } = dragStartRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const containerHeight = containerRef.current?.clientHeight || 600;
    // Map vertical pixel delta to percentage of container floor
    const percentDeltaY = (deltaY / containerHeight) * 100;

    const newPosX = Math.round(Math.min(320, Math.max(-320, initialPosX + deltaX)));
    const newPosY = Math.round(Math.min(85, Math.max(30, initialPosY + percentDeltaY)));

    setPosX(newPosX);
    setPosY(newPosY);
  }, []);

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      setIsDraggingRug(false);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  // Custom room upload handler
  const handleCustomRoomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomRoomImage(event.target?.result as string);
        setUseLiveCamera(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomRugUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let finalImgUrl: string;
      if (autoTransparent) {
        finalImgUrl = await makeRugBackgroundTransparent(file);
      } else {
        finalImgUrl = await new Promise((res) => {
          const r = new FileReader();
          r.onload = (ev) => res(ev.target?.result as string);
          r.readAsDataURL(file);
        });
      }

      const customItem: SampleItem = {
        id: `custom-rug-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: finalImgUrl,
        description: 'Uploaded custom client carpet sample',
        createdAt: new Date().toISOString(),
      };
      setActiveSample(customItem);
      setTransparentRugMap((prev) => ({
        ...prev,
        [customItem.id]: finalImgUrl,
      }));
    }
  };

  // Change Tan Studio shade dynamically
  const handleSelectTanShade = (shade: typeof TAN_SHADES[0]) => {
    setActiveTanShade(shade);
    const newSvg = createTanStudioSvg(shade.encoded);
    const updatedRoom = {
      ...PRESET_ROOMS[0],
      url: newSvg,
      title: `${shade.name} Studio Floor`,
    };
    setSelectedRoom(updatedRoom);
    setCustomRoomImage(null);
    setUseLiveCamera(false);
  };

  // Capture AR Snapshot with Signature Red branding
  const handleCaptureSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
      // Draw background
      ctx.drawImage(bgImg, 0, 0, 1200, 800);

      // Draw overlay label with Signature Red styling
      ctx.fillStyle = 'rgba(26, 10, 12, 0.92)';
      ctx.fillRect(20, 20, 560, 95);
      ctx.fillStyle = '#E4002B';
      ctx.fillRect(20, 20, 6, 95);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('FOUR CORNERS CARPETS × POPTOP KIDS FURNITURE', 40, 52);
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(activeSample.title, 40, 76);
      ctx.fillStyle = '#FCA5A5';
      ctx.font = '12px monospace';
      ctx.fillText(`Scale: ${selectedSize.label} (${selectedSize.cm}) | Background: ${selectedRoom.title}`, 40, 97);

      // Download snapshot
      const link = document.createElement('a');
      link.download = `AR-Room-Sample-${activeSample.title.replace(/\s/g, '_')}-${selectedSize.label.replace(/\s/g, '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    bgImg.src = customRoomImage || selectedRoom.url;
  };

  if (!isOpen) return null;

  const currentRugDisplayUrl = (autoTransparent && transparentRugMap[activeSample.id])
    ? transparentRugMap[activeSample.id]
    : activeSample.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#150A0C] border-2 border-[#E4002B]/60 w-full max-w-6xl rounded-3xl shadow-[0_25px_80px_rgba(228,0,43,0.35)] flex flex-col h-[94vh] overflow-hidden text-[#FFF0F2]">
        {/* Top Header - Signature Red Luxury Atelier Styling */}
        <div className="bg-gradient-to-r from-[#240A0D] via-[#380E14] to-[#240A0D] border-b border-[#E4002B]/40 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E4002B] to-[#99001D] flex items-center justify-center shadow-lg shadow-red-950/60">
              <Camera className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                  AR "View Rug in Your Room"
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E4002B] text-white text-[9px] font-black tracking-widest uppercase shadow-sm">
                  POPTOP Kids Furniture
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-[#3B0E14] text-[#FF8585] border border-red-500/40 text-[9px] font-mono font-bold">
                  Red Studio UI
                </span>
              </div>
              <p className="text-[10px] text-red-200/80 hidden sm:block">
                Drag rug anywhere on Tan floor with mouse • poptop.shop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Direct Link to Poptop Official Shop */}
            <a
              href="https://poptop.shop/shop/?"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-[#2D0F14] hover:bg-[#40131B] text-red-200 hover:text-white border border-red-500/40 shadow-xs"
              title="Open poptop.shop/shop/ in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E4002B]" />
              <span className="hidden md:inline">poptop.shop</span>
            </a>

            {/* Live Camera Toggle Button */}
            <button
              onClick={() => setUseLiveCamera(!useLiveCamera)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                useLiveCamera
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/40'
                  : 'bg-[#2D0F14] hover:bg-[#40131B] border-red-500/30 text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#E4002B]" />
              <span>{useLiveCamera ? 'Using Live Camera' : 'Live Camera AR'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-950/80 text-red-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main AR Canvas & Side Controls Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Viewport / AR Display Frame (8 Cols) - TAN BACKGROUND CANVAS WITH MOUSE DRAG SUPPORT */}
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`lg:col-span-8 bg-[#D2B48C] relative flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-[#E4002B]/35 ${
              isDraggingRug ? 'cursor-grabbing select-none' : 'cursor-default'
            }`}
            style={{
              backgroundColor: '#D2B48C',
              backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.2) 0%, rgba(180,140,100,0.25) 100%)',
            }}
          >
            {/* Background Stream: Live Camera Video OR Selected Room Image */}
            {useLiveCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div
                className="w-full h-full bg-cover bg-center transition-all duration-500 pointer-events-none"
                style={{
                  backgroundImage: `url(${customRoomImage || selectedRoom.url})`,
                  filter:
                    lightingWarmth === 'warm'
                      ? 'sepia(0.18) brightness(0.98)'
                      : lightingWarmth === 'cool'
                      ? 'contrast(1.05) hue-rotate(5deg)'
                      : 'none',
                }}
              />
            )}

            {/* Subtle Room Depth Warm Tan Vignette */}
            <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[#281A10]/40 pointer-events-none" />

            {/* Camera Error Banner */}
            {cameraError && (
              <div className="absolute top-4 left-4 right-4 bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between z-20 backdrop-blur-sm shadow-lg border border-red-400">
                <span>{cameraError}</span>
                <button
                  onClick={() => setCameraError(null)}
                  className="p-0.5 hover:bg-red-700 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* HUD On-Screen Dimension & AR Tracking Overlay with Signature Red Accents */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
              <span className="px-3 py-1 bg-[#1A0A0C]/90 backdrop-blur-md border border-[#E4002B]/60 rounded-xl text-[11px] font-mono font-bold text-white flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#E4002B] animate-ping" />
                Floor Scale: {selectedSize.label} ({selectedSize.cm})
              </span>
              <span className="px-2.5 py-0.5 bg-[#250D11]/85 backdrop-blur-md rounded-lg text-[10px] font-mono text-white font-bold max-w-xs truncate border border-[#E4002B]/40 shadow-sm">
                Sample: {activeSample.title}
              </span>
              <span className="px-2.5 py-0.5 bg-[#3B0E14]/90 backdrop-blur-md rounded-lg text-[10px] font-mono text-red-200 font-bold max-w-xs truncate border border-[#E4002B]/50 shadow-sm">
                Room: {selectedRoom.title} • {selectedRoom.product}
              </span>
              <span className="px-2.5 py-0.5 bg-[#1A0A0C]/75 backdrop-blur-md rounded-lg text-[9px] font-mono text-red-200/80">
                Tilt: {pitch}° | Rotation: {rotation}° | Ambient: {lightingWarmth}
              </span>
            </div>

            {/* Drag Hint Banner on Screen */}
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-lg ${
                isDraggingRug 
                  ? 'bg-[#E4002B] text-white border-white scale-105 shadow-red-950/80' 
                  : 'bg-[#1A0A0C]/85 text-red-100 border-[#E4002B]/40'
              }`}>
                <Move className={`w-3.5 h-3.5 ${isDraggingRug ? 'animate-bounce' : 'text-[#E4002B]'}`} />
                <span>
                  {isDraggingRug 
                    ? `Moving Rug: X ${posX}px | Y ${posY}%` 
                    : '🖱️ Drag Rug with Mouse to Position'}
                </span>
              </div>
            </div>

            {/* Snapshot Action Button inside Viewport - Red Styled */}
            <div className="absolute bottom-4 right-4 z-20">
              <button
                onClick={handleCaptureSnapshot}
                className="px-4 py-2.5 bg-gradient-to-r from-[#E4002B] via-[#EF4444] to-[#B91C1C] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-xl shadow-red-950/60 flex items-center gap-2 cursor-pointer transition transform active:scale-95 border border-red-300/40"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Save Client AR Photo</span>
              </button>
            </div>

            {/* Reset Placement Quick Button */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={() => {
                  setPosX(0);
                  setPosY(60);
                  setRotation(0);
                  setPitch(selectedRoom.floorAngle || 58);
                }}
                className="px-3 py-1.5 bg-[#1F0A0D]/85 hover:bg-[#330D13] text-red-200 hover:text-white border border-[#E4002B]/40 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm cursor-pointer shadow-md"
                title="Reset Floor Position"
              >
                <RefreshCw className="w-3 h-3 text-[#E4002B]" />
                <span>Reset Center</span>
              </button>
            </div>

            {/* THE PERSPECTIVE AR RUG (DRAGGABLE VIA MOUSE / TOUCH) */}
            <div
              onPointerDown={handlePointerDown}
              className={`absolute select-none transition-transform duration-75 touch-none z-10 ${
                isDraggingRug 
                  ? 'cursor-grabbing scale-102 filter brightness-105' 
                  : 'cursor-grab hover:scale-101'
              }`}
              style={{
                top: `${posY}%`,
                left: `calc(50% + ${posX}px)`,
                width: `${270 * selectedSize.scale}px`,
                height: `${360 * selectedSize.scale}px`,
                transform: `translate(-50%, -50%) perspective(800px) rotateX(${pitch}deg) rotateZ(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              title="Click and drag to position rug anywhere on the floor"
            >
              {/* Drop Shadow Simulation on Room Floor */}
              <div
                className="absolute inset-0 rounded-lg pointer-events-none transition-all"
                style={{
                  boxShadow: `0 ${32 * shadowStrength}px ${55 * shadowStrength}px rgba(40, 20, 10, ${shadowStrength})`,
                  filter: 'blur(8px)',
                  transform: 'scale(1.03)',
                }}
              />

              {/* Realistic Rug Woven Border & Sample Carpet Photo */}
              <div className={`w-full h-full relative rounded-md overflow-hidden transition-all flex flex-col justify-between ${
                isDraggingRug
                  ? 'ring-4 ring-[#E4002B] ring-offset-2 ring-offset-black/50 shadow-2xl'
                  : 'hover:ring-2 hover:ring-white/80'
              } ${autoTransparent ? 'bg-transparent' : 'bg-[#1C140E] border-2 border-white/60'}`}>
                
                {/* Drag Handle Indicator Overlay */}
                <div className="absolute top-2 right-2 z-20 opacity-0 hover:opacity-100 transition-opacity bg-black/60 px-2 py-0.5 rounded text-[9px] font-mono text-white flex items-center gap-1 pointer-events-none">
                  <Move className="w-2.5 h-2.5 text-[#E4002B]" />
                  <span>Drag Me</span>
                </div>

                {/* Top Hand-Woven Fringe simulation (if not transparent) */}
                {!autoTransparent && (
                  <div className="w-full h-1 bg-[#F5EDE2]/80 border-b border-black/30 z-10 shrink-0" />
                )}

                {/* Sample Carpet Image with Auto-Transparency */}
                <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
                  <img
                    src={currentRugDisplayUrl}
                    alt={activeSample.title}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className={`w-full h-full object-contain pointer-events-none select-none ${
                      autoTransparent ? 'drop-shadow-[0_12px_20px_rgba(20,10,5,0.4)]' : 'object-cover'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_SAMPLES[0].imageUrl;
                    }}
                  />

                  {/* Wool Pile Sheen & Ambient Lighting Wash */}
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                    style={{
                      backgroundImage:
                        lightingWarmth === 'warm'
                          ? 'radial-gradient(circle at 40% 30%, rgba(210, 180, 140, 0.5), transparent 75%)'
                          : lightingWarmth === 'cool'
                          ? 'radial-gradient(circle at 40% 30%, rgba(147, 197, 253, 0.4), transparent 75%)'
                          : 'radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.35), transparent 75%)',
                    }}
                  />
                  {/* Subtle Pile Texture Grid Feel */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none" />
                </div>

                {/* Bottom Hand-Woven Fringe simulation (if not transparent) */}
                {!autoTransparent && (
                  <div className="w-full h-1 bg-[#F5EDE2]/80 border-t border-black/30 z-10 shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* AR Floor & Room Control Panel (4 Cols) - SIGNATURE RED UI THEME */}
          <div className="lg:col-span-4 bg-[#180A0D] p-4 md:p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs border-l border-[#E4002B]/30 text-[#FFF0F2]">
            
            {/* Drag & Transparency Quick Toggle Bar */}
            <div className="p-3 bg-[#200B0E] rounded-2xl border border-[#E4002B]/35 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-[#E4002B]" />
                <span className="text-[11px] font-bold text-white">Auto-Transparent Rug</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoTransparent(!autoTransparent)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition border cursor-pointer ${
                  autoTransparent
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-[#2A0E13] text-red-200 border-red-500/30 hover:bg-[#381118]'
                }`}
              >
                {autoTransparent ? 'ACTIVE (ON)' : 'OFF'}
              </button>
            </div>

            {/* Quick Tan Floor Tone Palette Swatches */}
            <div className="p-3 bg-[#200B0E] rounded-2xl border border-[#E4002B]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono uppercase font-black text-[#E4002B] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#E4002B]" /> Tan Floor Tone
                </span>
                <span className="text-[9.5px] font-mono text-red-200">{activeTanShade.name}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TAN_SHADES.map((shade) => (
                  <button
                    key={shade.id}
                    onClick={() => handleSelectTanShade(shade)}
                    className={`h-7 rounded-lg transition border cursor-pointer flex items-center justify-center ${
                      activeTanShade.id === shade.id && selectedRoom.isTanStudio
                        ? 'ring-2 ring-white border-[#E4002B] scale-105 shadow-sm'
                        : 'border-[#1C140E] hover:scale-105'
                    }`}
                    style={{ backgroundColor: shade.hex }}
                    title={shade.name}
                  >
                    {activeTanShade.id === shade.id && selectedRoom.isTanStudio && (
                      <Check className="w-3 h-3 text-[#1C140E] stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 1: Samples Collection Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase font-black text-[#E4002B] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#E4002B]" /> 1. Select Rug from Samples
                </label>
                <input
                  type="file"
                  ref={rugFileInputRef}
                  onChange={handleCustomRugUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => rugFileInputRef.current?.click()}
                  className="text-[10px] text-red-400 hover:text-white underline font-mono cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" /> Test Other Image
                </button>
              </div>

              {/* Sample Cards Horizontal / Grid */}
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {(samples.length > 0 ? samples : FALLBACK_SAMPLES).map((sample) => {
                  const isSelected = activeSample.id === sample.id;
                  return (
                    <button
                      key={sample.id}
                      onClick={() => setActiveSample(sample)}
                      className={`w-full p-2 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#3B0E14] border-[#E4002B] ring-1 ring-[#E4002B] shadow-sm'
                          : 'bg-[#240D11]/80 border-red-500/20 text-[#FFF0F2] hover:bg-[#301016] hover:border-red-500/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-red-500/30 shrink-0 bg-[#140E0A] flex items-center justify-center">
                        <img
                          src={transparentRugMap[sample.id] || sample.imageUrl}
                          alt={sample.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain mix-blend-multiply"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_SAMPLES[0].imageUrl;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#FFF0F2]'}`}>
                            {sample.title}
                          </p>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#E4002B] shrink-0 stroke-[3]" />}
                        </div>
                        {sample.description && (
                          <p className="text-[10px] text-red-200/70 truncate mt-0.5">{sample.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Standard Rug Size Dimension */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase font-black text-[#E4002B] flex items-center justify-between">
                <span>2. Rug Size Dimension</span>
                <span className="text-[10px] text-white font-bold">{selectedSize.cm}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RUG_SIZES.map((size) => (
                  <button
                    key={size.label}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-1.5 rounded-xl border text-center font-mono font-bold transition cursor-pointer ${
                      selectedSize.label === size.label
                        ? 'bg-gradient-to-r from-[#E4002B] to-[#B91C1C] text-white font-black shadow-md border-red-400'
                        : 'bg-[#250D11] border-red-500/25 text-red-100 hover:bg-[#351017] hover:text-white'
                    }`}
                  >
                    <div className="text-[11px]">{size.label}</div>
                    <div className="text-[8px] opacity-80">{size.cm.split(' ')[0]} cm</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: 3D Floor Perspective & Placement Sliders (Syncs with Mouse Drag) */}
            <div className="space-y-3 bg-[#200B0E] p-3.5 rounded-2xl border border-red-500/30">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase font-black text-[#E4002B] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#E4002B]" /> 3. 3D Floor Perspective & Placement
                </label>
                <span className="text-[9px] font-mono text-emerald-400">Mouse Drag Active</span>
              </div>

              {/* Floor Placement Y (Distance / Depth) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-red-200/80">
                  <span className="flex items-center gap-1">
                    <Move className="w-3 h-3 text-[#E4002B]" /> Floor Depth (Y Position):
                  </span>
                  <span className="text-white font-bold">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="85"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  className="w-full accent-[#E4002B] cursor-pointer"
                />
              </div>

              {/* Floor Placement X (Left/Right) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-red-200/80">
                  <span className="flex items-center gap-1">
                    <Move className="w-3 h-3 text-[#E4002B]" /> Side Position (X Offset):
                  </span>
                  <span className="text-white font-bold">{posX}px</span>
                </div>
                <input
                  type="range"
                  min="-320"
                  max="320"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                  className="w-full accent-[#E4002B] cursor-pointer"
                />
              </div>

              {/* Tilt / Floor Pitch Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-red-200/80">
                  <span>Floor Tilt (Pitch):</span>
                  <span className="text-white font-bold">{pitch}°</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full accent-[#E4002B] cursor-pointer"
                />
              </div>

              {/* 360° Floor Rotation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-red-200/80">
                  <span>Floor Orientation (Rotation):</span>
                  <span className="text-white font-bold">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-[#E4002B] cursor-pointer"
                />
              </div>
            </div>

            {/* Section 4: Poptop Kids Furniture & Tan Studio Rooms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-mono uppercase font-black text-[#E4002B] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#E4002B]" /> 4. Room & Furniture Setting
                  </label>
                  <span className="text-[9px] text-red-200/70 font-mono">Tan Studio & poptop.shop</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://poptop.shop/shop/?"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-red-400 hover:text-white flex items-center gap-0.5 font-mono cursor-pointer"
                    title="Open Poptop Shop"
                  >
                    <span>poptop.shop</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <input
                    type="file"
                    ref={roomFileInputRef}
                    onChange={handleCustomRoomUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => roomFileInputRef.current?.click()}
                    className="text-[10px] text-red-300 hover:text-white underline font-mono cursor-pointer"
                  >
                    Upload Room
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_ROOMS.map((room) => {
                  const isSelected = selectedRoom.id === room.id && !customRoomImage && !useLiveCamera;
                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        setSelectedRoom(room);
                        setCustomRoomImage(null);
                        setUseLiveCamera(false);
                        setPitch(room.floorAngle);
                        setPosY(room.defaultY);
                      }}
                      className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-[#E4002B] bg-[#3B0E14] ring-1 ring-[#E4002B]'
                          : 'border-red-500/20 bg-[#250D11]/80 hover:bg-[#301016] hover:border-red-500/40'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-lg shrink-0 overflow-hidden border border-red-500/30 bg-[#1C140E]">
                        <img
                          src={room.url}
                          alt={room.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-white truncate">{room.title}</p>
                        <p className="text-[8px] font-mono text-red-400 truncate">{room.product}</p>
                        <p className="text-[7.5px] font-sans text-red-200/70 truncate">{room.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Ambient Lighting Tone */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase font-black text-[#E4002B]">
                5. Ambient Lighting Tone
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'neutral', label: 'Daylight' },
                  { id: 'warm', label: 'Warm Glow' },
                  { id: 'cool', label: 'Cool White' },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setLightingWarmth(tone.id as any)}
                    className={`py-1.5 rounded-lg border text-center font-mono text-[10px] font-bold transition cursor-pointer ${
                      lightingWarmth === tone.id
                        ? 'bg-gradient-to-r from-[#E4002B] to-[#B91C1C] text-white border-red-400 font-black shadow-sm'
                        : 'bg-[#250D11] border-red-500/25 text-red-200 hover:text-white hover:bg-[#351017]'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARRoomVisualizerModal;

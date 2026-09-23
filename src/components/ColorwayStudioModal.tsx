import React, { useState, useRef, useEffect } from 'react';
import { PageFlipModal } from './PageFlipModal';
import { Palette, Layers, RefreshCw, Send, Sparkles, Check, Download, Info, Sliders, Pipette, Search, ArrowLeft, X, Upload, Image as ImageIcon, Camera, Zap } from 'lucide-react';

interface ColorwayStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface YarnPom {
  id: string;
  code: string;
  pantone: string;
  name: string;
  material: 'New Zealand Wool' | 'Lustrous Viscose' | 'Natural Jute' | 'Organic Cotton' | 'PET Eco Fiber';
  hex: string;
  category: 'Earths' | 'Pastels' | 'Neutrals' | 'Blues & Greys' | 'Jewel Tones' | 'Undyed';
}

const YARN_POMS: YarnPom[] = [
  // Earths & Terracotta
  { id: 'p1', code: 'NZ-101', pantone: '18-1440 TPX', name: 'Terracotta Clay', material: 'New Zealand Wool', hex: '#C85A32', category: 'Earths' },
  { id: 'p2', code: 'NZ-102', pantone: '16-1334 TPX', name: 'Bhadohi Ochre', material: 'New Zealand Wool', hex: '#D99B26', category: 'Earths' },
  { id: 'p3', code: 'NZ-103', pantone: '19-1220 TPX', name: 'Raw Spice', material: 'New Zealand Wool', hex: '#7A3828', category: 'Earths' },
  { id: 'p4', code: 'JT-201', pantone: '15-1119 TPX', name: 'Natural Jute Bark', material: 'Natural Jute', hex: '#A88C69', category: 'Earths' },
  { id: 'p5', code: 'NZ-104', pantone: '17-1137 TPX', name: 'Sienna Rust', material: 'New Zealand Wool', hex: '#9E472A', category: 'Earths' },

  // Neutrals & Off-Whites
  { id: 'p6', code: 'NZ-105', pantone: '11-0606 TPX', name: 'Alps Snow White', material: 'New Zealand Wool', hex: '#F5F5ED', category: 'Neutrals' },
  { id: 'p7', code: 'NZ-106', pantone: '13-0905 TPX', name: 'Ecru Fleece', material: 'New Zealand Wool', hex: '#E6DFC8', category: 'Neutrals' },
  { id: 'p8', code: 'VS-301', pantone: '12-0104 TPX', name: 'Pearl Viscose', material: 'Lustrous Viscose', hex: '#ECE8DF', category: 'Neutrals' },
  { id: 'p9', code: 'CT-401', pantone: '14-1107 TPX', name: 'Oatmeal Cotton', material: 'Organic Cotton', hex: '#D8CBB5', category: 'Neutrals' },
  { id: 'p10', code: 'NZ-107', pantone: '15-1305 TPX', name: 'Warm Greige', material: 'New Zealand Wool', hex: '#B8A89A', category: 'Neutrals' },

  // Blues & Greys
  { id: 'p11', code: 'NZ-108', pantone: '19-4024 TPX', name: 'Danube Slate Blue', material: 'New Zealand Wool', hex: '#2B4A6F', category: 'Blues & Greys' },
  { id: 'p12', code: 'VS-302', pantone: '18-4214 TPX', name: 'Alpine Mist', material: 'Lustrous Viscose', hex: '#63829B', category: 'Blues & Greys' },
  { id: 'p13', code: 'NZ-109', pantone: '19-3908 TPX', name: 'Charcoal Wool', material: 'New Zealand Wool', hex: '#32363A', category: 'Blues & Greys' },
  { id: 'p14', code: 'PET-501', pantone: '16-4408 TPX', name: 'Glacier Blue (Recycled)', material: 'PET Eco Fiber', hex: '#7A99AC', category: 'Blues & Greys' },
  { id: 'p15', code: 'NZ-110', pantone: '14-4110 TPX', name: 'Soft Fog Gray', material: 'New Zealand Wool', hex: '#9CA4AC', category: 'Blues & Greys' },

  // Pastels & Austrian Modern
  { id: 'p16', code: 'VS-303', pantone: '13-1408 TPX', name: 'Vienna Rose', material: 'Lustrous Viscose', hex: '#E3B2B1', category: 'Pastels' },
  { id: 'p17', code: 'NZ-111', pantone: '14-0210 TPX', name: 'Sage Leaf', material: 'New Zealand Wool', hex: '#9BA88D', category: 'Pastels' },
  { id: 'p18', code: 'NZ-112', pantone: '13-1011 TPX', name: 'Soft Apricot', material: 'New Zealand Wool', hex: '#ECCBB3', category: 'Pastels' },
  { id: 'p19', code: 'VS-304', pantone: '12-0715 TPX', name: 'Vanilla Sheen', material: 'Lustrous Viscose', hex: '#F0E5BE', category: 'Pastels' },

  // Jewel Tones
  { id: 'p20', code: 'NZ-113', pantone: '19-5226 TPX', name: 'Emerald Forest', material: 'New Zealand Wool', hex: '#1C4A37', category: 'Jewel Tones' },
  { id: 'p21', code: 'NZ-114', pantone: '19-1664 TPX', name: 'Habsburg Burgundy', material: 'New Zealand Wool', hex: '#68182B', category: 'Jewel Tones' },
  { id: 'p22', code: 'NZ-115', pantone: '19-3952 TPX', name: 'Deep Indigo', material: 'New Zealand Wool', hex: '#1E2848', category: 'Jewel Tones' },
  { id: 'p23', code: 'VS-305', pantone: '19-1522 TPX', name: 'Plum Velvet', material: 'Lustrous Viscose', hex: '#4F2338', category: 'Jewel Tones' },

  // Undyed Natural
  { id: 'p24', code: 'UN-601', pantone: 'UNDYED-WOOL-01', name: 'Raw Indian Fleece', material: 'New Zealand Wool', hex: '#E0D6C1', category: 'Undyed' },
  { id: 'p25', code: 'UN-602', pantone: 'UNDYED-JUTE-02', name: 'Raw Unbleached Jute', material: 'Natural Jute', hex: '#947D5C', category: 'Undyed' },
];

interface PatternTemplate {
  id: string;
  title: string;
  description: string;
  zones: { id: 'field' | 'pattern' | 'border' | 'accent'; label: string; defaultPom: string }[];
}

const TEMPLATES: PatternTemplate[] = [
  {
    id: 'alpine-grid',
    title: 'Alpine Geometric Grid',
    description: 'Modern European minimalist grid with subtle hand-carved accents.',
    zones: [
      { id: 'field', label: 'Main Field (Background)', defaultPom: 'p6' },
      { id: 'pattern', label: 'Geometric Grid Lines', defaultPom: 'p1' },
      { id: 'border', label: 'Outer Carved Border', defaultPom: 'p11' },
      { id: 'accent', label: 'Fringe & Binding Trim', defaultPom: 'p2' },
    ],
  },
  {
    id: 'bhadohi-medallion',
    title: 'Bhadohi Heritage Medallion',
    description: 'Classic high-density hand-tufted center medallion motif.',
    zones: [
      { id: 'field', label: 'Center Ground', defaultPom: 'p7' },
      { id: 'pattern', label: 'Medallion & Floral Work', defaultPom: 'p21' },
      { id: 'border', label: 'Intricate Outer Border', defaultPom: 'p20' },
      { id: 'accent', label: 'Corner Flourishes', defaultPom: 'p2' },
    ],
  },
  {
    id: 'scandi-stripe',
    title: 'Scandinavian Minimalist Stripe',
    description: 'Textured loop-and-cut pile linear design for modern living rooms.',
    zones: [
      { id: 'field', label: 'Primary Cut-Pile Base', defaultPom: 'p8' },
      { id: 'pattern', label: 'Loop-Pile Stripe A', defaultPom: 'p12' },
      { id: 'border', label: 'Loop-Pile Stripe B', defaultPom: 'p15' },
      { id: 'accent', label: 'Selvedge Side Edge', defaultPom: 'p13' },
    ],
  },
];

// Helper: Color distance calculation (Hex -> RGB -> Euclidean distance)
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function findClosestYarnPom(targetHex: string, poms: YarnPom[]): { pom: YarnPom; similarity: number } {
  const target = hexToRgb(targetHex);
  let bestPom = poms[0];
  let minDistance = Infinity;

  poms.forEach((p) => {
    const rgb = hexToRgb(p.hex);
    const dist = Math.sqrt(
      Math.pow(target.r - rgb.r, 2) +
      Math.pow(target.g - rgb.g, 2) +
      Math.pow(target.b - rgb.b, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      bestPom = p;
    }
  });

  // Max distance in RGB space is sqrt(255^2 * 3) ~ 441.67
  const similarity = Math.max(0, Math.min(100, Math.round((1 - minDistance / 441.67) * 100)));
  return { pom: bestPom, similarity };
}

export const ColorwayStudioModal: React.FC<ColorwayStudioModalProps> = ({ isOpen, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PatternTemplate>(TEMPLATES[0]);
  const [activeZone, setActiveZone] = useState<'field' | 'pattern' | 'border' | 'accent'>('field');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Mapping zoneId -> YarnPom
  const [colorMap, setColorMap] = useState<Record<string, YarnPom>>(() => {
    const initial: Record<string, YarnPom> = {};
    TEMPLATES[0].zones.forEach((z) => {
      initial[z.id] = YARN_POMS.find((p) => p.id === z.defaultPom) || YARN_POMS[0];
    });
    return initial;
  });

  const [requestedSuccess, setRequestedSuccess] = useState(false);

  // Photo Eyedropper & Recoloring State
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'pattern' | 'customPhoto'>('pattern');
  const [photoRecolorMode, setPhotoRecolorMode] = useState<'recolored' | 'original'>('recolored');
  const [photoTintOpacity, setPhotoTintOpacity] = useState<number>(0.55);
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [matchedPomInfo, setMatchedPomInfo] = useState<{ pom: YarnPom; similarity: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectTemplate = (template: PatternTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode('pattern');
    const updated: Record<string, YarnPom> = {};
    template.zones.forEach((z) => {
      updated[z.id] = YARN_POMS.find((p) => p.id === z.defaultPom) || YARN_POMS[0];
    });
    setColorMap(updated);
  };

  const handleApplyPom = (pom: YarnPom) => {
    setColorMap((prev) => ({
      ...prev,
      [activeZone]: pom,
    }));
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setUploadedImageSrc(src);
        setPreviewMode('customPhoto');
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw image on canvas refs with dynamic Yarn Pom recoloring overlay
  useEffect(() => {
    if (uploadedImageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        [canvasRef.current, mainPreviewCanvasRef.current].forEach((canvas) => {
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // 1. Draw original base image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // 2. If Recolor Mode is active, apply selected Yarn Pom colors in multi-zone layers
          if (photoRecolorMode === 'recolored') {
            const w = canvas.width;
            const h = canvas.height;

            // Layer A: Field Pom Tint across whole photo
            if (colorMap.field?.hex) {
              ctx.save();
              ctx.globalCompositeOperation = 'color';
              ctx.fillStyle = colorMap.field.hex;
              ctx.globalAlpha = photoTintOpacity;
              ctx.fillRect(0, 0, w, h);
              ctx.restore();
            }

            // Layer B: Outer Border Pom Tint around frame edges
            if (colorMap.border?.hex) {
              const bWidth = Math.min(w, h) * 0.12;
              ctx.save();
              ctx.globalCompositeOperation = 'color';
              ctx.fillStyle = colorMap.border.hex;
              ctx.globalAlpha = photoTintOpacity;
              ctx.fillRect(0, 0, w, bWidth);
              ctx.fillRect(0, h - bWidth, w, bWidth);
              ctx.fillRect(0, bWidth, bWidth, h - 2 * bWidth);
              ctx.fillRect(w - bWidth, bWidth, bWidth, h - 2 * bWidth);
              ctx.restore();
            }

            // Layer C: Pattern / Medallion Pom Tint in center oval
            if (colorMap.pattern?.hex) {
              ctx.save();
              ctx.globalCompositeOperation = 'color';
              ctx.fillStyle = colorMap.pattern.hex;
              ctx.globalAlpha = photoTintOpacity * 0.9;
              ctx.beginPath();
              ctx.ellipse(w / 2, h / 2, w * 0.28, h * 0.28, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.restore();
            }

            // Layer D: Accent Pom Tint in core center
            if (colorMap.accent?.hex) {
              ctx.save();
              ctx.globalCompositeOperation = 'color';
              ctx.fillStyle = colorMap.accent.hex;
              ctx.globalAlpha = photoTintOpacity * 0.95;
              ctx.beginPath();
              ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.08, 0, 2 * Math.PI);
              ctx.fill();
              ctx.restore();
            }
          }
        });
      };
      img.src = uploadedImageSrc;
    }
  }, [uploadedImageSrc, previewMode, colorMap, photoRecolorMode, photoTintOpacity]);

  // Click on image canvas to sample pixel color
  const sampleColorFromCanvas = (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;

    setPickedHex(hex);
    const closestMatch = findClosestYarnPom(hex, YARN_POMS);
    setMatchedPomInfo(closestMatch);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    sampleColorFromCanvas(canvasRef.current, e);
  };

  const handleMainPreviewCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    sampleColorFromCanvas(mainPreviewCanvasRef.current, e);
  };

  const filteredPoms = YARN_POMS.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pantone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.material.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRequestStrikeOff = () => {
    setRequestedSuccess(true);
    setTimeout(() => {
      setRequestedSuccess(false);
    }, 4000);
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} id="colorwayStudioModal">
      <div className="flex flex-col h-full max-h-[92vh] overflow-hidden bg-slate-50">
        {/* Sticky Modal Top Bar with Working Back / Close Buttons */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border border-slate-200"
            title="Go back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#E4002B]" />
            <span>← Back / Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#E4002B]" />
            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase font-mono tracking-wider">
              Virtual Yarn Pom Box & Colorway Studio
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Main Studio Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full custom-scrollbar">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#8B001A] to-[#E4002B] p-5 rounded-2xl text-white shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-extrabold tracking-wider uppercase shadow-xs">
                  Design your Rug at Ashok color lab
                </span>
              </div>
              <h2 className="text-xl font-black mt-1 font-sans">Virtual Yarn Pom Box & Colorway Studio</h2>
              <p className="text-xs text-rose-100/90 mt-0.5">
                Select yarn poms from over 200+ Pantone-matched shades to create custom rug colorways & order physical 30x30cm strike-offs.
              </p>
            </div>

            <button
              onClick={handleRequestStrikeOff}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4 text-slate-950" />
              <span>Request Physical Strike-Off (30x30 cm)</span>
            </button>
          </div>

        {requestedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Strike-Off Order Dispatched to Bhadohi Dye House!</p>
              <p className="text-emerald-700 font-normal">
                Ref: <span className="font-mono font-bold">SO-2026-POM-{Math.floor(1000 + Math.random() * 9000)}</span>. Lab dip yarn dyeing will start in 24 hours. Physical 30x30 cm sample will ship via DHL Express to your office.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Left Studio Canvas & Right Pom Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Rug Interactive Canvas (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pattern Template Switcher */}
            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#E4002B]" /> 1. Select Pattern Template
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-2 rounded-xl text-[11px] font-bold text-left border transition cursor-pointer flex flex-col justify-between h-18 ${
                      selectedTemplate.id === tmpl.id
                        ? 'bg-rose-50 border-[#E4002B] text-[#E4002B] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="line-clamp-2 leading-tight">{tmpl.title}</span>
                    <span className="text-[9px] text-slate-400 font-mono font-normal">Preset</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Rug Visualizer Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner text-white space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Pipette className="w-4 h-4 text-amber-400" /> Interactive Color Preview
                </span>

                {/* Toggle View Tabs: Vector Pattern vs Uploaded Custom Photo */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setPreviewMode('pattern')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      previewMode === 'pattern'
                        ? 'bg-[#E4002B] text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" /> CAD Pattern
                  </button>
                  <button
                    onClick={() => {
                      if (!uploadedImageSrc) {
                        fileInputRef.current?.click();
                      } else {
                        setPreviewMode('customPhoto');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      previewMode === 'customPhoto'
                        ? 'bg-[#E4002B] text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    {uploadedImageSrc ? 'My Photo' : 'Upload Photo'}
                  </button>
                </div>
              </div>

              {/* Dynamic Display Area: Vector SVG OR Custom Photo Eyedropper Canvas */}
              {previewMode === 'pattern' ? (
                <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl border border-slate-800 p-4 flex items-center justify-center relative shadow-2xl">
                  <svg viewBox="0 0 300 400" className="w-full h-full rounded-lg shadow-lg">
                    {/* Outer Selvedge Border */}
                    <rect
                      x="5"
                      y="5"
                      width="290"
                      height="390"
                      rx="8"
                      fill={colorMap.border?.hex || '#111'}
                      stroke={colorMap.accent?.hex || '#333'}
                      strokeWidth="4"
                    />

                    {/* Secondary Inner Field */}
                    <rect
                      x="25"
                      y="25"
                      width="250"
                      height="350"
                      rx="4"
                      fill={colorMap.field?.hex || '#eee'}
                    />

                    {/* Template Specific Graphics */}
                    {selectedTemplate.id === 'alpine-grid' && (
                      <g>
                        {/* Grid Lines */}
                        <path
                          d="M 25 100 H 275 M 25 180 H 275 M 25 260 H 275 M 25 340 H 275 M 100 25 V 375 M 200 25 V 375"
                          stroke={colorMap.pattern?.hex || '#888'}
                          strokeWidth="8"
                          strokeDasharray="12 6"
                        />
                        {/* Accent Corner Blocks */}
                        <rect x="35" y="35" width="20" height="20" fill={colorMap.accent?.hex} />
                        <rect x="245" y="35" width="20" height="20" fill={colorMap.accent?.hex} />
                        <rect x="35" y="345" width="20" height="20" fill={colorMap.accent?.hex} />
                        <rect x="245" y="345" width="20" height="20" fill={colorMap.accent?.hex} />
                      </g>
                    )}

                    {selectedTemplate.id === 'bhadohi-medallion' && (
                      <g>
                        {/* Center Medallion */}
                        <circle cx="150" cy="200" r="70" fill={colorMap.pattern?.hex} />
                        <circle cx="150" cy="200" r="45" fill={colorMap.border?.hex} />
                        <circle cx="150" cy="200" r="20" fill={colorMap.accent?.hex} />
                        {/* Decorative Lines */}
                        <line x1="25" y1="25" x2="275" y2="375" stroke={colorMap.accent?.hex} strokeWidth="3" opacity="0.6" />
                        <line x1="275" y1="25" x2="25" y2="375" stroke={colorMap.accent?.hex} strokeWidth="3" opacity="0.6" />
                      </g>
                    )}

                    {selectedTemplate.id === 'scandi-stripe' && (
                      <g>
                        {/* Minimalist Vertical Stripes */}
                        <rect x="40" y="25" width="30" height="350" fill={colorMap.pattern?.hex} />
                        <rect x="90" y="25" width="15" height="350" fill={colorMap.accent?.hex} />
                        <rect x="125" y="25" width="50" height="350" fill={colorMap.border?.hex} />
                        <rect x="195" y="25" width="15" height="350" fill={colorMap.accent?.hex} />
                        <rect x="230" y="25" width="30" height="350" fill={colorMap.pattern?.hex} />
                      </g>
                    )}

                    {/* Fringe Details top and bottom */}
                    <line x1="10" y1="2" x2="290" y2="2" stroke={colorMap.accent?.hex} strokeWidth="4" strokeDasharray="3 3" />
                    <line x1="10" y1="398" x2="290" y2="398" stroke={colorMap.accent?.hex} strokeWidth="4" strokeDasharray="3 3" />
                  </svg>
                </div>
              ) : (
                <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl border border-slate-800 p-2 flex flex-col items-center justify-between relative shadow-2xl overflow-hidden group">
                  {uploadedImageSrc ? (
                    <>
                      <div className="w-full bg-slate-900/90 py-1.5 px-2 rounded-lg text-[10px] font-mono border border-slate-700 flex flex-wrap items-center justify-between gap-1 z-10 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPhotoRecolorMode(photoRecolorMode === 'recolored' ? 'original' : 'recolored')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition cursor-pointer flex items-center gap-1 ${
                              photoRecolorMode === 'recolored'
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {photoRecolorMode === 'recolored' ? 'Yarn Colors Applied' : 'Original Photo'}
                          </button>

                          {photoRecolorMode === 'recolored' && (
                            <div className="flex items-center gap-1 ml-1">
                              <span className="text-[9px] text-slate-400">Tint:</span>
                              {[0.35, 0.55, 0.85].map((op) => (
                                <button
                                  key={op}
                                  onClick={() => setPhotoTintOpacity(op)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono cursor-pointer ${
                                    photoTintOpacity === op
                                      ? 'bg-rose-600 text-white font-bold'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {op === 0.35 ? '35%' : op === 0.55 ? '55%' : '85%'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[9px] text-slate-300 hover:text-white underline cursor-pointer ml-auto"
                        >
                          Change Photo
                        </button>
                      </div>

                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden my-1 cursor-crosshair relative">
                        <canvas
                          ref={mainPreviewCanvasRef}
                          onClick={handleMainPreviewCanvasClick}
                          className="max-h-full max-w-full object-contain rounded-lg border border-slate-700 shadow-xl"
                          title="Click pixel to sample color"
                        />
                      </div>

                      {matchedPomInfo && (
                        <div className="w-full bg-slate-900/95 border border-amber-400/50 p-2 rounded-xl text-xs font-mono space-y-1.5 z-10 shrink-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Sampled Match:</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{matchedPomInfo.similarity}% Match</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-4 h-4 rounded-full border border-white/60 shrink-0" style={{ backgroundColor: matchedPomInfo.pom.hex }}></span>
                              <span className="font-bold text-white text-[11px] truncate">{matchedPomInfo.pom.code} - {matchedPomInfo.pom.name}</span>
                            </div>
                            <button
                              onClick={() => handleApplyPom(matchedPomInfo.pom)}
                              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-extrabold rounded-lg shrink-0 cursor-pointer"
                            >
                              Apply to {activeZone.toUpperCase()}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-lg flex flex-col items-center justify-center p-6 text-center cursor-pointer transition space-y-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center shadow-inner">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">Upload Custom Carpet or Room Photo</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Photo will render inside this preview viewport</p>
                      </div>
                      <span className="px-3 py-1.5 bg-[#E4002B] text-white text-[10px] font-bold rounded-xl shadow-xs">
                        Browse Image File
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Zone Picker Buttons */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Active Coloring Zone (Select target area to recolor):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.zones.map((zone) => {
                    const currentPom = colorMap[zone.id];
                    const isActive = activeZone === zone.id;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setActiveZone(zone.id as any)}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2.5 transition cursor-pointer ${
                          isActive
                            ? 'bg-white/15 border-amber-400 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-white/40 shrink-0 shadow-inner"
                          style={{ backgroundColor: currentPom?.hex }}
                        ></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate leading-none">{zone.label}</p>
                          <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                            {currentPom?.code} ({currentPom?.name})
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 200+ Yarn Pom Palette & Filter (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-sans flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#E4002B]" /> 2. Yarn Pom Palette Selector
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Currently applying to: <span className="font-bold text-[#E4002B] uppercase">{activeZone}</span>
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Pantone or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E4002B]"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {['All', 'Earths', 'Pastels', 'Neutrals', 'Blues & Greys', 'Jewel Tones', 'Undyed'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#E4002B] text-white shadow-2xs font-extrabold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Yarn Pom Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {filteredPoms.map((pom) => {
                const isSelectedInZone = colorMap[activeZone]?.id === pom.id;
                return (
                  <button
                    key={pom.id}
                    onClick={() => handleApplyPom(pom)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer relative group ${
                      isSelectedInZone
                        ? 'bg-rose-50 border-[#E4002B] ring-2 ring-rose-300/50 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Pom Swatch Circle with Material Texture feel */}
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-full border border-slate-300 shadow-sm flex items-center justify-center transition group-hover:scale-105"
                        style={{ backgroundColor: pom.hex }}
                      >
                        {isSelectedInZone && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                      </div>
                    </div>

                    {/* Pom Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-black text-slate-800">{pom.code}</span>
                        <span className="text-[8px] bg-slate-200/80 text-slate-600 px-1 rounded font-mono">
                          {pom.material.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5">{pom.name}</p>
                      <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{pom.pantone}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Colorway Spec Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-800 uppercase flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#E4002B]" /> Active Colorway Spec Sheet
                </span>
                <button
                  onClick={() => {
                    const text = `Colorway Spec (${selectedTemplate.title}):\n` +
                      (Object.entries(colorMap) as [string, YarnPom][])
                        .map(([z, p]) => `${z.toUpperCase()}: ${p.code} - ${p.name} (${p.pantone}, ${p.material})`)
                        .join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Colorway specs copied to clipboard!');
                  }}
                  className="text-[10px] text-[#E4002B] font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Copy Specs
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                {(Object.entries(colorMap) as [string, YarnPom][]).map(([zoneKey, p]) => (
                  <div key={zoneKey} className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block uppercase text-[8px] font-bold">{zoneKey}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: p.hex }}></span>
                      <span className="font-bold text-slate-800 truncate">{p.code}</span>
                    </div>
                    <span className="text-slate-500 block truncate text-[9px]">{p.pantone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE: User Photo Upload & Eyedropper Color Picker Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-rose-100 text-[#E4002B] rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  AI Color Extractor
                </span>
                <span className="text-xs text-slate-500 font-mono">Pantone AI Matcher</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 font-sans mt-0.5 flex items-center gap-2">
                <Pipette className="w-4 h-4 text-[#E4002B]" /> 3. Upload Custom Photo & Eyedropper Color Picker
              </h3>
              <p className="text-xs text-slate-500">
                Upload your own room picture, moodboard, or carpet inspiration photo. Click anywhere on the image to sample exact colors and match to Bhadohi Pantone Yarn Poms!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gradient-to-r from-slate-900 to-[#E4002B] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Custom Photo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Image Canvas with Eyedropper cursor */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center space-y-3">
              {uploadedImageSrc ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span className="flex items-center gap-1">
                      <Pipette className="w-3.5 h-3.5 text-amber-400" /> Click anywhere on the image to sample color
                    </span>
                    <button
                      onClick={() => {
                        setUploadedImageSrc(null);
                        setPickedHex(null);
                        setMatchedPomInfo(null);
                      }}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear Image
                    </button>
                  </div>

                  <div className="relative inline-block max-w-full overflow-hidden rounded-xl border-2 border-amber-400/50 shadow-2xl group cursor-crosshair">
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="max-h-[360px] w-auto max-w-full object-contain mx-auto transition"
                      title="Click pixel to pick color"
                    />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-950/80 rounded-xl p-8 text-center cursor-pointer transition space-y-3 my-2"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Click to upload carpet or moodboard photo</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Supports JPG, PNG, WEBP, HEIC</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Eyedropper Live Sample & Closest Pantone Pom Card */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <span className="text-xs font-bold font-mono text-slate-800 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Eyedropper Color Match Result
              </span>

              {pickedHex && matchedPomInfo ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Sampled Color vs Matched Pom Comparison */}
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Sampled Pixel Color</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border border-slate-300 shadow-xs shrink-0"
                          style={{ backgroundColor: pickedHex }}
                        ></div>
                        <span className="font-mono text-xs font-black text-slate-900">{pickedHex}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Match Similarity</span>
                      <div className="flex items-center gap-1 text-emerald-700 font-black text-sm font-mono mt-1">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> {matchedPomInfo.similarity}% Match
                      </div>
                    </div>
                  </div>

                  {/* Matched Yarn Pom Detail Box */}
                  <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 bg-[#E4002B] text-white text-[9px] font-mono font-black rounded uppercase">
                          Closest Bhadohi Yarn Pom
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-1">{matchedPomInfo.pom.name}</h4>
                        <p className="text-xs font-mono text-slate-600 font-bold">{matchedPomInfo.pom.code} • {matchedPomInfo.pom.pantone}</p>
                      </div>

                      <div
                        className="w-10 h-10 rounded-full border-2 border-white shadow-md shrink-0"
                        style={{ backgroundColor: matchedPomInfo.pom.hex }}
                      ></div>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono bg-white/70 p-2 rounded-lg border border-rose-100">
                      Material Spec: <span className="font-bold text-slate-800">{matchedPomInfo.pom.material}</span>
                    </div>

                    <button
                      onClick={() => handleApplyPom(matchedPomInfo.pom)}
                      className="w-full py-2.5 bg-[#E4002B] hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply {matchedPomInfo.pom.code} to active zone ({activeZone.toUpperCase()})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs font-mono space-y-2">
                  <Pipette className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Upload a photo on the left and click any part of the image to pick colors & match Pantone Yarn Poms!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageFlipModal>
);
};

export default ColorwayStudioModal;

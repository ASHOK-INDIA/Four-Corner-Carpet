import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Grid, Printer, X, Layers, Info, Upload, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw, Check, Pipette, Eye } from 'lucide-react';

interface WeaverGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPattern?: string;
  initialColorMap?: Record<string, { code: string; name: string; hex: string }>;
}

const WEAVE_QUALITIES = [
  { id: 'knotted-10-10', name: 'Hand-Knotted (10/10 Quality)', knotsPerSqInch: 100, knotsPerSqMeter: 155000, description: 'Fine Tibetan cross-knot construction' },
  { id: 'knotted-12-12', name: 'Hand-Knotted (12/12 Indo-Tibetan)', knotsPerSqInch: 144, knotsPerSqMeter: 223200, description: 'Master heirloom density, ultra-sharp detail' },
  { id: 'tufted-cut', name: 'Hand-Tufted Cut Pile', knotsPerSqInch: 45, knotsPerSqMeter: 70000, description: 'Heavy export plush pile for European living rooms' },
  { id: 'tufted-loop', name: 'Hand-Tufted Loop Pile', knotsPerSqInch: 38, knotsPerSqMeter: 59000, description: 'Textured berber loop structure' },
  { id: 'flatweave', name: 'Flatweave / Hand-Woven Dhurrie', knotsPerSqInch: 30, knotsPerSqMeter: 46500, description: 'Double-sided reversible panja loom' },
];

export const WeaverGraphModal: React.FC<WeaverGraphModalProps> = ({
  isOpen,
  onClose,
  initialPattern = 'alpine-grid',
  initialColorMap,
}) => {
  // Weaver Graph Naksha State
  const [gridZoom, setGridZoom] = useState<number>(1);
  const [loomId, setLoomId] = useState<string>('Loom-BH-42');
  const [weaverName, setWeaverName] = useState<string>('Master Weaver Ramu Ansari');
  const [selectedQuality, setSelectedQuality] = useState(WEAVE_QUALITIES[0]);

  // Uploaded CAD / Photo Graph State
  const [uploadedCadSrc, setUploadedCadSrc] = useState<string | null>(null);
  const [uploadedCadName, setUploadedCadName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'standard-grid' | 'cad-photo'>('standard-grid');
  const [showLoomGridOverlay, setShowLoomGridOverlay] = useState<boolean>(true);
  const [pixelateKnots, setPixelateKnots] = useState<boolean>(true);
  const [sampledColor, setSampledColor] = useState<string | null>(null);

  // Extracted Colors from uploaded CAD
  const [extractedColors, setExtractedColors] = useState<{
    border: { code: string; name: string; hex: string };
    field: { code: string; name: string; hex: string };
    pattern: { code: string; name: string; hex: string };
    accent: { code: string; name: string; hex: string };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Default Color Mapping
  const defaultColors = useMemo(() => ({
    border: initialColorMap?.border || { code: 'NZ-108', name: 'Danube Slate Blue', hex: '#2B4A6F' },
    field: initialColorMap?.field || { code: 'NZ-105', name: 'Alps Snow White', hex: '#F5F5ED' },
    pattern: initialColorMap?.pattern || { code: 'NZ-101', name: 'Terracotta Clay', hex: '#C85A32' },
    accent: initialColorMap?.accent || { code: 'NZ-102', name: 'Bhadohi Ochre', hex: '#D99B26' },
  }), [initialColorMap]);

  const activeColors = extractedColors || defaultColors;

  // Handle CAD / Photo File Upload
  const handleCadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedCadName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setUploadedCadSrc(src);
        setViewMode('cad-photo');
        setGridZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process CAD Image on Canvas (Pixelation & Knot Grid)
  useEffect(() => {
    if (viewMode !== 'cad-photo' || !uploadedCadSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetWidth = 480;
      const targetHeight = Math.round((img.height / img.width) * targetWidth);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (pixelateKnots) {
        // Draw low-res offscreen canvas to create true loom knots
        const knotCols = 32;
        const knotRows = Math.round((img.height / img.width) * knotCols);
        const offscreen = document.createElement('canvas');
        offscreen.width = knotCols;
        offscreen.height = knotRows;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, knotCols, knotRows);

          // Extract colors for index
          try {
            const pixelData = offCtx.getImageData(0, 0, knotCols, knotRows).data;
            const rgbToHex = (r: number, g: number, b: number) =>
              '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

            const getPixelHex = (x: number, y: number) => {
              const i = (y * knotCols + x) * 4;
              return rgbToHex(pixelData[i], pixelData[i + 1], pixelData[i + 2]);
            };

            const borderHex = getPixelHex(1, 1);
            const fieldHex = getPixelHex(Math.floor(knotCols / 2), Math.floor(knotRows / 2));
            const patternHex = getPixelHex(Math.floor(knotCols / 4), Math.floor(knotRows / 3));
            const accentHex = getPixelHex(Math.floor(knotCols * 0.75), Math.floor(knotRows * 0.6));

            setExtractedColors({
              border: { code: 'CAD-01', name: 'CAD Border Shade', hex: borderHex },
              field: { code: 'CAD-02', name: 'CAD Field Ground', hex: fieldHex },
              pattern: { code: 'CAD-03', name: 'CAD Pattern Core', hex: patternHex },
              accent: { code: 'CAD-04', name: 'CAD Accent Highlight', hex: accentHex },
            });
          } catch (e) {
            console.warn('Color extraction notice:', e);
          }

          // Render back up with nearest-neighbor crisp pixels
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreen, 0, 0, targetWidth, targetHeight);
        }
      } else {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      // Draw subtle loom graph lines overlay if toggled
      if (showLoomGridOverlay) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 0.5;

        const stepX = targetWidth / 32;
        const stepY = targetHeight / (Math.round((img.height / img.width) * 32) || 40);

        for (let x = 0; x <= targetWidth; x += stepX) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, targetHeight);
          ctx.stroke();
        }

        for (let y = 0; y <= targetHeight; y += stepY) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(targetWidth, y);
          ctx.stroke();
        }

        // Draw 10-knot major loom marker lines
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= targetWidth; x += stepX * 8) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, targetHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= targetHeight; y += stepY * 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(targetWidth, y);
          ctx.stroke();
        }

        ctx.restore();
      }
    };
    img.src = uploadedCadSrc;
  }, [viewMode, uploadedCadSrc, pixelateKnots, showLoomGridOverlay]);

  // Sample Pixel Color on Click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(val => val.toString(16).padStart(2, '0')).join('');
    setSampledColor(hex);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-white">
        {/* Top Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md font-bold">
              <Grid className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Master Weaver Graph (Naksha) & CAD Loom Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase">
                  Bhadohi Mill Standard
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1:1 Loom Weaving Naksha Chart • Upload Custom CAD or Photo to Generate Weaving Knots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hidden CAD file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCadUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Upload CAD Button in Header */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              title="Upload your custom CAD design or carpet photo"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CAD / Photo</span>
            </button>

            {/* Print A4 Naksha */}
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              title="Print official factory Loom Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print A4 Naksha</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Weaver Graph (Naksha) */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Canvas: Interactive Loom Graph (8 Cols) */}
            <div className="lg:col-span-8 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col space-y-3">
              {/* View Mode & Controls Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setViewMode('standard-grid')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'standard-grid'
                        ? 'bg-[#E4002B] text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    <span>Loom Grid View</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!uploadedCadSrc) {
                        fileInputRef.current?.click();
                      } else {
                        setViewMode('cad-photo');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'cad-photo'
                        ? 'bg-[#E4002B] text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>{uploadedCadSrc ? 'My CAD / Photo' : 'Upload CAD'}</span>
                  </button>
                </div>

                {/* Viewport Toggles & Zoom */}
                <div className="flex items-center gap-2">
                  {viewMode === 'cad-photo' && uploadedCadSrc && (
                    <>
                      <button
                        onClick={() => setPixelateKnots(!pixelateKnots)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                          pixelateKnots
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Toggle Knot-by-Knot Pixelation"
                      >
                        {pixelateKnots ? 'Knots: ON' : 'Knots: Smooth'}
                      </button>

                      <button
                        onClick={() => setShowLoomGridOverlay(!showLoomGridOverlay)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                          showLoomGridOverlay
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Toggle Loom Grid Lines"
                      >
                        Grid Lines
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setGridZoom(gridZoom === 1 ? 1.5 : 1)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-mono cursor-pointer transition"
                  >
                    {gridZoom === 1 ? 'Zoom 1.5x' : 'Reset 1.0x'}
                  </button>
                </div>
              </div>

              {/* Viewport Stage: CAD Canvas OR Standard 16x20 Grid */}
              <div className="flex-1 overflow-auto max-h-[460px] custom-scrollbar p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-center relative min-h-[350px]">
                {viewMode === 'cad-photo' ? (
                  uploadedCadSrc ? (
                    <div
                      className="transition-transform duration-100 flex flex-col items-center justify-center"
                      style={{ transform: `scale(${gridZoom})`, transformOrigin: 'center center' }}
                    >
                      <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="rounded-lg border-2 border-slate-700 shadow-2xl cursor-crosshair max-w-full"
                        title="Click on any knot to sample color"
                      />
                      <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-3">
                        <span>File: <strong className="text-amber-400">{uploadedCadName}</strong></span>
                        {sampledColor && (
                          <span className="flex items-center gap-1.5">
                            Sampled:
                            <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: sampledColor }} />
                            <strong className="text-white">{sampledColor}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-8 text-center cursor-pointer transition space-y-3 max-w-md"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Upload Your CAD Design or Rug Photo</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Upload high-res PNG, JPG, or CAD graph. The engine will generate pixelated loom knots and extract Bhadohi color poms.
                        </p>
                      </div>
                      <span className="inline-block px-3 py-1.5 bg-[#E4002B] text-white text-xs font-bold rounded-xl shadow-xs">
                        Browse CAD Image
                      </span>
                    </div>
                  )
                ) : (
                  /* Standard 16x20 Simulated Naksha Grid */
                  <div
                    className="grid grid-cols-16 gap-[2px] bg-slate-950 p-3 rounded-lg border border-slate-700 shadow-2xl transition-transform"
                    style={{ transform: `scale(${gridZoom})`, transformOrigin: 'center center' }}
                  >
                    {Array.from({ length: 320 }).map((_, index) => {
                      const row = Math.floor(index / 16);
                      const col = index % 16;
                      const isBorder = row === 0 || row === 19 || col === 0 || col === 15;
                      const isPattern =
                        (row >= 5 && row <= 14 && (col === 5 || col === 10)) ||
                        (col >= 3 && col <= 12 && (row === 7 || row === 12));
                      const isAccent = (row === 9 || row === 10) && (col === 7 || col === 8);

                      let cellColor = activeColors.field.hex;
                      let cellPom = activeColors.field.code;
                      if (isBorder) {
                        cellColor = activeColors.border.hex;
                        cellPom = activeColors.border.code;
                      } else if (isAccent) {
                        cellColor = activeColors.accent.hex;
                        cellPom = activeColors.accent.code;
                      } else if (isPattern) {
                        cellColor = activeColors.pattern.hex;
                        cellPom = activeColors.pattern.code;
                      }

                      return (
                        <div
                          key={index}
                          title={`Knot R${row + 1}:C${col + 1} • ${cellPom}`}
                          className="w-5 h-5 rounded-xs flex items-center justify-center text-[7px] font-mono font-black text-white/90 border border-black/30 shadow-xs cursor-pointer hover:scale-125 hover:z-20 transition"
                          style={{ backgroundColor: cellColor }}
                        >
                          {isBorder ? 'B' : isAccent ? 'A' : isPattern ? 'P' : 'F'}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Loom & Master Artisan Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900 p-3 rounded-xl border border-slate-800 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block font-bold">ASSIGNED LOOM:</span>
                  <input
                    type="text"
                    value={loomId}
                    onChange={(e) => setLoomId(e.target.value)}
                    className="bg-transparent text-white font-bold border-b border-slate-700 focus:outline-none focus:border-amber-400 w-full mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block font-bold">MASTER WEAVER:</span>
                  <input
                    type="text"
                    value={weaverName}
                    onChange={(e) => setWeaverName(e.target.value)}
                    className="bg-transparent text-white font-bold border-b border-slate-700 focus:outline-none focus:border-amber-400 w-full mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block font-bold">KNOT DENSITY:</span>
                  <span className="text-amber-400 font-bold block mt-0.5">
                    {selectedQuality.knotsPerSqInch} Knots / Sq. In ({selectedQuality.knotsPerSqMeter.toLocaleString()} / m²)
                  </span>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Yarn Color Palette Index & Loom Quality (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* CAD Upload Trigger Box if in standard mode */}
              {viewMode === 'standard-grid' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-amber-400 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Upload CAD Design</p>
                      <p className="text-[10px] font-mono text-slate-400">Load custom factory graph</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 group-hover:bg-[#E4002B] text-slate-300 group-hover:text-white px-2 py-1 rounded font-mono transition">
                    Browse
                  </span>
                </div>
              )}

              {/* Weave Quality Selector */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Weave Construction Quality
                </label>
                <div className="space-y-1.5">
                  {WEAVE_QUALITIES.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuality(q)}
                      className={`w-full p-2 rounded-xl text-left border text-xs font-mono transition cursor-pointer ${
                        selectedQuality.id === q.id
                          ? 'bg-rose-950/40 border-rose-500 text-white font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{q.name}</span>
                        <span className="text-[10px] text-amber-400">{q.knotsPerSqInch} KPI</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-sans mt-0.5">{q.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Index & Yarn Poms */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Naksha Color Index & Yarn Poms
                  </h4>
                  {extractedColors && (
                    <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                      From CAD
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'Border (B)', pom: activeColors.border, pct: '22%' },
                    { key: 'Field Ground (F)', pom: activeColors.field, pct: '54%' },
                    { key: 'Pattern Lines (P)', pom: activeColors.pattern, pct: '18%' },
                    { key: 'Accent Core (A)', pom: activeColors.accent, pct: '6%' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full border border-white/40 shadow-inner shrink-0"
                          style={{ backgroundColor: item.pom.hex }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{item.pom.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {item.key} • {item.pom.code}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-amber-300">{item.pct}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>WARP / WEFT:</span>
                    <span className="text-slate-200 font-bold">10/2 Cotton Hand-Spun</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PILE FIBER:</span>
                    <span className="text-slate-200 font-bold">100% NZ Wool (Blended)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FINISH:</span>
                    <span className="text-slate-200 font-bold">Herbal Luster Wash</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeaverGraphModal;

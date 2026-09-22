import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, Box, Plus, Trash2, RotateCw, Layers, RefreshCw, AlertTriangle, CheckCircle, Info, Printer, ShieldAlert, FolderOpen, Lock, FileDown } from 'lucide-react';
import { PageFlipModal } from './PageFlipModal';
import { PurchaseOrder, CargoItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  subscribeContainerItems,
  saveCargoItemToFirestore,
  deleteCargoItemFromFirestore
} from '../lib/firestoreService';

export interface ContainerPreset {
  id: string;
  name: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  maxCbm: number;
  maxWeightKg: number;
}

export const CONTAINER_PRESETS: ContainerPreset[] = [
  {
    id: '20ft',
    name: '20ft Standard Dry Container',
    lengthM: 5.898,
    widthM: 2.352,
    heightM: 2.393,
    maxCbm: 33.2,
    maxWeightKg: 28200,
  },
  {
    id: '40ft',
    name: '40ft Standard Dry Container',
    lengthM: 12.032,
    widthM: 2.352,
    heightM: 2.393,
    maxCbm: 67.7,
    maxWeightKg: 28800,
  },
  {
    id: '40hc',
    name: '40ft High Cube (HC) Container',
    lengthM: 12.032,
    widthM: 2.352,
    heightM: 2.698,
    maxCbm: 76.2,
    maxWeightKg: 28600,
  },
  {
    id: 'lcl',
    name: 'LCL (Less than Container Load)',
    lengthM: 6.0,
    widthM: 2.3,
    heightM: 2.3,
    maxCbm: 999,
    maxWeightKg: 999999,
  },
];

const COLOR_PALETTE = ['#EF3340', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

interface ContainerStuffingModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData?: PurchaseOrder[];
  adminMode?: boolean;
}

export const ContainerStuffingModal: React.FC<ContainerStuffingModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  adminMode = false,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('40hc');
  const [cargoItems, setCargoItems] = useState<CargoItem[]>([]);
  const [viewMode, setViewMode] = useState<'solid' | 'wireframe' | 'layer'>('solid');
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Sync cargo items with real Admin productionData and subscribe to real-time Firestore updates
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeContainerItems(
      (firebaseItems) => {
        setCargoItems(firebaseItems);
      },
      (err) => {
        console.warn('Failed to subscribe to container cargo items:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // New Item State
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemLength, setNewItemLength] = useState<number>(100);
  const [newItemWidth, setNewItemWidth] = useState<number>(40);
  const [newItemHeight, setNewItemHeight] = useState<number>(30);
  const [newItemWeight, setNewItemWeight] = useState<number>(10);
  const [newItemQty, setNewItemQty] = useState<number>(50);
  const [newItemColor, setNewItemColor] = useState<string>('#8B5CF6');
  const [newItemPackageType, setNewItemPackageType] = useState<'box' | 'roll' | 'pallet'>('box');
  const [newItemRugsPerPallet, setNewItemRugsPerPallet] = useState<number>(20);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const currentContainer = CONTAINER_PRESETS.find((c) => c.id === selectedPresetId) || CONTAINER_PRESETS[2];

  // CBM calculations
  const calculateItemCbm = (item: CargoItem) => {
    return (item.lengthCm * item.widthCm * item.heightCm) / 1000000;
  };

  const totalCbm = cargoItems.reduce((acc, item) => acc + calculateItemCbm(item) * item.qty, 0);
  const totalWeightKg = cargoItems.reduce((acc, item) => acc + item.weightKg * item.qty, 0);
  const totalItemsCount = cargoItems.reduce((acc, item) => acc + item.qty, 0);

  const cbmUtilization = Math.min((totalCbm / currentContainer.maxCbm) * 100, 100);
  const weightUtilization = Math.min((totalWeightKg / currentContainer.maxWeightKg) * 100, 100);

  const isOverCbm = totalCbm > currentContainer.maxCbm;
  const isOverWeight = totalWeightKg > currentContainer.maxWeightKg;

  // Add Item Handler (Saves directly to Firestore in real-time)
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMode) {
      alert('Admin mode is required to add cargo specifications.');
      return;
    }
    if (!newItemName.trim() || newItemLength <= 0 || newItemWidth <= 0 || newItemHeight <= 0 || newItemQty <= 0) {
      alert('Please fill out valid dimensions and quantity.');
      return;
    }
    const newItem: CargoItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      lengthCm: newItemLength,
      widthCm: newItemWidth,
      heightCm: newItemHeight,
      weightKg: newItemWeight,
      qty: newItemQty,
      color: newItemColor,
      isCylinder: newItemPackageType === 'roll',
      packageType: newItemPackageType,
      rugsPerPallet: newItemPackageType === 'pallet' ? newItemRugsPerPallet : undefined,
    };
    try {
      await saveCargoItemToFirestore(newItem);
      setNewItemName('');
    } catch (err) {
      console.error('Failed to save container item to Firestore:', err);
      alert('Failed to save cargo specification to cloud. Please try again.');
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!adminMode) {
      alert('Admin mode is required to remove cargo items.');
      return;
    }
    try {
      await deleteCargoItemFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete container item from Firestore:', err);
      alert('Failed to delete cargo specification from cloud. Please try again.');
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    doc.text('Loading Manifest', 14, 15);
    
    const tableData = cargoItems.map(item => [
      item.name,
      `${item.lengthCm}x${item.widthCm}x${item.heightCm}`,
      item.weightKg,
      item.qty,
      (calculateItemCbm(item) * item.qty).toFixed(2)
    ]);

    autoTable(doc, {
      head: [['Item Name', 'Dim (cm)', 'Wt/unit (kg)', 'Qty', 'CBM']],
      body: tableData,
    });
    
    // Add signature
    try {
      const signatureUrl = 'https://i.postimg.cc/B6v0YTML/Signature-Ashok.png';
      const response = await fetch(signatureUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        doc.addImage(base64data, 'PNG', 14, (doc as any).lastAutoTable.finalY + 10, 40, 20);
        doc.text('Authorized Signature', 14, (doc as any).lastAutoTable.finalY + 35);
        doc.save(`Loading_Manifest_${new Date().toISOString().slice(0,10)}.pdf`);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading signature image:', error);
      doc.save(`Loading_Manifest_${new Date().toISOString().slice(0,10)}.pdf`);
    }
  };

  // Three.js 3D Container Scene Setup
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate 50 background

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const maxDim = Math.max(currentContainer.lengthM, currentContainer.widthM, currentContainer.heightM);
    camera.position.set(maxDim * 1.6, maxDim * 1.2, maxDim * 1.8);
    camera.lookAt(0, currentContainer.heightM / 2, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.3);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 5. Container Outer Box (Translucent Glass + Blue Metallic Wireframe)
    const cLen = currentContainer.lengthM;
    const cWid = currentContainer.widthM;
    const cHgt = currentContainer.heightM;

    // Center point for 3D is origin, offset by dimensions so (0,0,0) is bottom-back-left corner
    const containerGroup = new THREE.Group();

    // Container Walls (Translucent)
    const containerGeo = new THREE.BoxGeometry(cLen, cHgt, cWid);
    const containerMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.5,
      side: THREE.DoubleSide,
    });
    const containerMesh = new THREE.Mesh(containerGeo, containerMat);
    containerMesh.position.set(cLen / 2, cHgt / 2, cWid / 2);
    containerGroup.add(containerMesh);

    // Container Outer Frame Wireframe Lines
    const edges = new THREE.EdgesGeometry(containerGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.set(cLen / 2, cHgt / 2, cWid / 2);
    containerGroup.add(wireframe);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(Math.max(cLen, cWid) * 1.2, 20, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.set(cLen / 2, 0, cWid / 2);
    scene.add(gridHelper);

    // 6. Packing Stuffed Cargo Items inside 3D Container
    let curX = 0.05;
    let curY = 0.05;
    let curZ = 0.05;
    let rowMaxH = 0;
    let rowMaxW = 0;

    cargoItems.forEach((item) => {
      const iLenM = item.lengthCm / 100;
      const iWidM = item.widthCm / 100;
      const iHgtM = item.heightCm / 100;

      const itemColor = new THREE.Color(item.color);

      for (let i = 0; i < item.qty; i++) {
        // Check bounds
        if (curX + iLenM > cLen) {
          curX = 0.05;
          curZ += rowMaxW + 0.02;
          rowMaxW = 0;
        }
        if (curZ + iWidM > cWid) {
          curZ = 0.05;
          curY += rowMaxH + 0.02;
          rowMaxH = 0;
        }
        if (curY + iHgtM > cHgt) {
          // Exceeded container dimensions physically
          break;
        }

        rowMaxH = Math.max(rowMaxH, iHgtM);
        rowMaxW = Math.max(rowMaxW, iWidM);

        let mesh: THREE.Object3D;
        const isCylinder = item.packageType ? item.packageType === 'roll' : item.isCylinder;
        const isPallet = item.packageType === 'pallet';

        if (isCylinder) {
          const cylGeo = new THREE.CylinderGeometry(iWidM / 2, iWidM / 2, iLenM, 16);
          const cylMat = new THREE.MeshStandardMaterial({
            color: itemColor,
            roughness: 0.4,
            metalness: 0.1,
            wireframe: viewMode === 'wireframe',
          });
          const cylMesh = new THREE.Mesh(cylGeo, cylMat);
          cylMesh.rotation.z = Math.PI / 2; // Lie horizontal
          cylMesh.position.set(curX + iLenM / 2, curY + iWidM / 2, curZ + iWidM / 2);
          mesh = cylMesh;
        } else if (isPallet) {
          const palletGroup = new THREE.Group();
          
          const baseH = iHgtM * 0.15; // 15% height for wooden pallet base
          const cargoH = iHgtM * 0.85; // 85% height for cargo stack
          
          // 1. Wooden Base
          const baseGeo = new THREE.BoxGeometry(iLenM * 0.98, baseH, iWidM * 0.98);
          const baseMat = new THREE.MeshStandardMaterial({
            color: 0x854d0e, // Wooden amber-800
            roughness: 0.8,
            metalness: 0.1,
            wireframe: viewMode === 'wireframe',
          });
          const baseMesh = new THREE.Mesh(baseGeo, baseMat);
          baseMesh.position.set(0, baseH / 2, 0);
          palletGroup.add(baseMesh);

          // Wood line edges
          const baseEdges = new THREE.EdgesGeometry(baseGeo);
          const baseLineMat = new THREE.LineBasicMaterial({ color: 0x451a03, transparent: true, opacity: 0.4 });
          const baseWire = new THREE.LineSegments(baseEdges, baseLineMat);
          baseMesh.add(baseWire);

          // 2. Cargo Stack on top
          const cargoGeo = new THREE.BoxGeometry(iLenM * 0.96, cargoH * 0.98, iWidM * 0.96);
          const cargoMat = new THREE.MeshStandardMaterial({
            color: itemColor,
            roughness: 0.4,
            metalness: 0.1,
            wireframe: viewMode === 'wireframe',
          });
          const cargoMesh = new THREE.Mesh(cargoGeo, cargoMat);
          cargoMesh.position.set(0, baseH + cargoH / 2, 0);
          palletGroup.add(cargoMesh);

          // Cargo line edges
          const cargoEdges = new THREE.EdgesGeometry(cargoGeo);
          const cargoLineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
          const cargoWire = new THREE.LineSegments(cargoEdges, cargoLineMat);
          cargoMesh.add(cargoWire);

          palletGroup.position.set(curX + iLenM / 2, curY, curZ + iWidM / 2);
          mesh = palletGroup;
        } else {
          const boxGeo = new THREE.BoxGeometry(iLenM * 0.98, iHgtM * 0.98, iWidM * 0.98);
          const boxMat = new THREE.MeshStandardMaterial({
            color: itemColor,
            roughness: 0.3,
            metalness: 0.1,
            wireframe: viewMode === 'wireframe',
          });
          const boxMesh = new THREE.Mesh(boxGeo, boxMat);
          boxMesh.position.set(curX + iLenM / 2, curY + iHgtM / 2, curZ + iWidM / 2);

          // Dark stroke edge on box
          const boxEdges = new THREE.EdgesGeometry(boxGeo);
          const boxLineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
          const boxWire = new THREE.LineSegments(boxEdges, boxLineMat);
          boxMesh.add(boxWire);
          
          mesh = boxMesh;
        }

        containerGroup.add(mesh);

        curX += iLenM + 0.02;
      }
    });

    scene.add(containerGroup);

    // Center scene origin
    containerGroup.position.set(-cLen / 2, 0, -cWid / 2);

    // 7. Interactive Orbit Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      containerGroup.rotation.y += deltaX * 0.008;
      containerGroup.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 8. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        containerGroup.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [isOpen, selectedPresetId, cargoItems, viewMode, autoRotate]);

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-6xl" id="cbmCalculatorModal">
      {/* Modal Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#EF3340] to-[#e11d48] text-white border-b border-rose-600 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-bold shadow-inner">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide">Container Plan</h2>
            <p className="text-xs text-rose-100">
              Interactive 3D Container Loading Simulation & Export Volumetric Planning
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/30 shadow-sm backdrop-blur-sm"
          title="Close Modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Modal Body Grid */}
      <div className="p-5 lg:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-slate-50">
        {/* Top Control Bar: Container Selection & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Container Preset Select */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Export Container Type:
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#EF3340] cursor-pointer"
            >
              {CONTAINER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.maxCbm} m³ / {(preset.maxWeightKg / 1000).toFixed(1)}t)
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 font-mono flex justify-between pt-1">
              <span>
                L: {currentContainer.lengthM}m × W: {currentContainer.widthM}m × H: {currentContainer.heightM}m
              </span>
              <span className="font-bold text-slate-700">Max Vol: {currentContainer.maxCbm} CBM</span>
            </div>
          </div>

          {/* CBM Utilization Metric Card */}
          <div
            className={`p-4 rounded-xl border shadow-xs space-y-2 ${
              isOverCbm ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Volume (CBM) Utilization
              </span>
              {isOverCbm ? (
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold uppercase animate-pulse flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> CBM Overload
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold font-mono">
                  Space Available
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black font-mono tracking-tight">{totalCbm.toFixed(2)} CBM</span>
              <span className="text-xs font-semibold text-slate-500">
                / {currentContainer.maxCbm} CBM ({cbmUtilization.toFixed(1)}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverCbm ? 'bg-rose-600' : cbmUtilization > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(cbmUtilization, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Gross Weight Utilization Metric Card */}
          <div
            className={`p-4 rounded-xl border shadow-xs space-y-2 ${
              isOverWeight ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gross Payload Weight
              </span>
              {isOverWeight ? (
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold uppercase animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Weight Limit Exceeded
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold font-mono">
                  {(currentContainer.maxWeightKg - totalWeightKg).toLocaleString()} kg Capacity
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black font-mono tracking-tight">
                {(totalWeightKg / 1000).toFixed(2)} Tons
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {(currentContainer.maxWeightKg / 1000).toFixed(1)}t ({weightUtilization.toFixed(1)}%)
              </span>
            </div>
            {/* Weight Progress Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverWeight ? 'bg-rose-600' : weightUtilization > 90 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(weightUtilization, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Middle Section: 3D WebGL Canvas Viewport & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 3D WebGL Viewport (8 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Box className="w-4 h-4 text-[#EF3340]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3D Interactive Container View
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode(viewMode === 'solid' ? 'wireframe' : 'solid')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Toggle Wireframe / Solid render"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {viewMode === 'solid' ? 'Wireframe' : 'Solid'}
                </button>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    autoRotate ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                  title="Auto Rotate 3D Model"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  {autoRotate ? 'Rotating' : 'Static'}
                </button>
              </div>
            </div>

            {/* 3D WebGL Canvas Container */}
            <div
              ref={canvasContainerRef}
              className="w-full h-80 sm:h-96 rounded-xl border border-slate-200 bg-slate-900 overflow-hidden relative cursor-grab active:cursor-grabbing"
            >
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 text-[10px] text-slate-300 font-mono pointer-events-none flex items-center gap-2">
                <Info className="w-3 h-3 text-sky-400" />
                <span>Drag mouse to rotate 3D view • Scroll to zoom</span>
              </div>
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap gap-2 pt-1">
              {cargoItems.map((item) => (
                <div
                  key={item.id}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-800">{item.name}</span>
                  <span className="text-slate-500 font-mono">({item.qty} units)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cargo Item Manager & Manual Entry (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Cargo Items List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cargo Items Manifest ({totalItemsCount} Total Packages)
                </h3>
              </div>

              <div className="space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {cargoItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic space-y-1">
                    <p className="font-semibold text-slate-600">No Cargo Items in Manifest</p>
                    <p className="text-[11px]">Database is empty or no PO items exist. Add cargo specifications below.</p>
                  </div>
                ) : (
                  cargoItems.map((item) => {
                    const itemCbmTotal = calculateItemCbm(item) * item.qty;
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {item.lengthCm}×{item.widthCm}×{item.heightCm} cm | {item.weightKg}kg/unit | {item.packageType === 'pallet' ? `Pallet (${item.rugsPerPallet || 0} rugs)` : item.isCylinder ? 'Roll' : 'Box'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right">
                          <div>
                            <span className="font-bold font-mono text-slate-900 block">{item.qty} pcs</span>
                            <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                              {itemCbmTotal.toFixed(2)} CBM
                            </span>
                          </div>
                          {adminMode && (
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add New Cargo Item Form */}
            {adminMode ? (
              <form onSubmit={handleAddItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#EF3340]" /> Add Cargo Specification
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item / Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Kids Chair Flatpack Carton"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#EF3340]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">L (cm)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newItemLength}
                      onChange={(e) => setNewItemLength(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">W (cm)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newItemWidth}
                      onChange={(e) => setNewItemWidth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">H (cm)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newItemHeight}
                      onChange={(e) => setNewItemHeight(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Wt (kg)</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      required
                      value={newItemWeight}
                      onChange={(e) => setNewItemWeight(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Color</label>
                    <input
                      type="color"
                      value={newItemColor}
                      onChange={(e) => setNewItemColor(e.target.value)}
                      className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg p-0.5 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Package Type</label>
                    <select
                      value={newItemPackageType}
                      onChange={(e) => setNewItemPackageType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#EF3340] cursor-pointer"
                    >
                      <option value="box">Box / Carton</option>
                      <option value="roll">Rolled Cylinder (Rug Roll)</option>
                      <option value="pallet">Pallet</option>
                    </select>
                  </div>

                  {newItemPackageType === 'pallet' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rugs per Pallet</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={newItemRugsPerPallet}
                        onChange={(e) => setNewItemRugsPerPallet(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#EF3340] hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Container
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md text-center py-6 space-y-2">
                <Lock className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 font-mono">Admin Mode Required</p>
                <p className="text-[11px] text-slate-500">Enable Admin Mode to add or modify cargo specifications.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
          <span>Total Volume: <strong className="text-slate-900">{totalCbm.toFixed(2)} CBM</strong></span>
          <span>•</span>
          <span>Gross Wt: <strong className="text-slate-900">{(totalWeightKg / 1000).toFixed(2)} Tonnes</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer print:hidden"
          >
            <Printer className="w-3.5 h-3.5" /> Print Loading Manifest
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </PageFlipModal>
  );
};

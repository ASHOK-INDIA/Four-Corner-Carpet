import React, { useState } from 'react';
import { X, Globe, TrendingUp, Search, Award, Sparkles, ShoppingBag, BarChart3, Filter, CheckCircle2, ChevronRight, Euro, ArrowUpRight } from 'lucide-react';
import { PageFlipModal } from './PageFlipModal';

export interface CompetitorBrand {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  categories: string[];
  priceRange: string;
  salesVolumeIndex: number; // monthly units
  growthYoY: string;
  topTrendingItem: {
    title: string;
    category: 'Rug' | 'Chair' | 'Furniture';
    priceEur: number;
    material: string;
    colors: string[];
    rating: number;
    unitsSoldMonthly: number;
  };
  keyFeatures: string[];
  marketShareEstimate: string;
}

export const EU_COMPETITORS_DATA: CompetitorBrand[] = [
  {
    id: 'benuta-kids',
    name: 'Benuta Kids',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    categories: ['Kids Rugs', 'Play Mats'],
    priceRange: '€49 - €189',
    salesVolumeIndex: 18400,
    growthYoY: '+34%',
    topTrendingItem: {
      title: 'Safari Animals Washable Cotton Rug (120×170cm)',
      category: 'Rug',
      priceEur: 79.95,
      material: '100% OEKO-TEX Washable Cotton',
      colors: ['Sage Green', 'Oatmeal Beige', 'Soft Clay'],
      rating: 4.9,
      unitsSoldMonthly: 3850,
    },
    keyFeatures: ['Machine Washable', 'Non-Toxic Dye', 'Anti-Slip Backing'],
    marketShareEstimate: '22% DE Kids Rug Market',
  },
  {
    id: 'vertbaudet-de',
    name: 'Vertbaudet Germany',
    country: 'Germany / France',
    countryCode: 'DE',
    flag: '🇩🇪',
    categories: ['Kids Furniture', 'Kids Chairs', 'Kids Rugs'],
    priceRange: '€39 - €249',
    salesVolumeIndex: 22100,
    growthYoY: '+28%',
    topTrendingItem: {
      title: 'Nordic Pastel Arch Tufted Rug (140×200cm)',
      category: 'Rug',
      priceEur: 89.99,
      material: 'Hand-Tufted Wool & Microfiber Blend',
      colors: ['Dusty Terracotta', 'Mustard', 'Cream'],
      rating: 4.8,
      unitsSoldMonthly: 4100,
    },
    keyFeatures: ['FSC-Certified Wood Chairs', 'Nordic Pastel Palette', 'Thematic Play Designs'],
    marketShareEstimate: '19% EU Kids Home',
  },
  {
    id: 'paidi',
    name: 'Paidi Furniture',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    categories: ['Kids Furniture', 'Kids Chairs'],
    priceRange: '€89 - €320',
    salesVolumeIndex: 12500,
    growthYoY: '+18%',
    topTrendingItem: {
      title: 'Paidi Yovo Ergonomic Height-Adjustable Swivel Chair',
      category: 'Chair',
      priceEur: 179.00,
      material: 'Solid Beech Wood Frame & Breathable Mesh',
      colors: ['Mint Green', 'Rose Pink', 'Slate Grey'],
      rating: 4.9,
      unitsSoldMonthly: 2100,
    },
    keyFeatures: ['Ergonomic Posture Support', '10-Year Warranty', 'Made in Germany'],
    marketShareEstimate: '15% DE Premium Seating',
  },
  {
    id: 'pinolino',
    name: 'Pinolino Kinderträume',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    categories: ['Kids Furniture', 'Kids Chairs', 'Wooden Seating'],
    priceRange: '€45 - €190',
    salesVolumeIndex: 14800,
    growthYoY: '+22%',
    topTrendingItem: {
      title: 'Pinolino Fenna Solid Spruce Table & 2 Chair Set',
      category: 'Chair',
      priceEur: 119.00,
      material: 'Untreated Solid Spruce & White Lacquer',
      colors: ['Natural Pine', 'Soft White'],
      rating: 4.7,
      unitsSoldMonthly: 2950,
    },
    keyFeatures: ['Eco Solid Spruce Wood', 'Child-Safe Non-Toxic Varnish', 'Montessori Friendly'],
    marketShareEstimate: '14% DE Wooden Furniture',
  },
  {
    id: 'petite-amelie',
    name: 'Petite Amélie',
    country: 'Netherlands / Germany',
    countryCode: 'NL',
    flag: '🇳🇱',
    categories: ['Kids Furniture', 'Kids Chairs', 'Kids Rugs'],
    priceRange: '€35 - €210',
    salesVolumeIndex: 11200,
    growthYoY: '+41%',
    topTrendingItem: {
      title: 'Minimalist Lion Face Round Washable Rug (Ø 120cm)',
      category: 'Rug',
      priceEur: 69.90,
      material: '100% Organic Tufted Cotton',
      colors: ['Warm Sand', 'Caramel'],
      rating: 4.9,
      unitsSoldMonthly: 2400,
    },
    keyFeatures: ['Dutch Minimalist Design', 'Ultra Soft Plush Pile', 'Neutral Nursery Palette'],
    marketShareEstimate: '11% Benelux / DE Online',
  },
  {
    id: 'lorena-canals',
    name: 'Lorena Canals',
    country: 'Spain / Germany / EU',
    countryCode: 'ES',
    flag: '🇪🇸',
    categories: ['Kids Rugs', 'Textile Seating'],
    priceRange: '€89 - €299',
    salesVolumeIndex: 16500,
    growthYoY: '+29%',
    topTrendingItem: {
      title: 'Puffy Woolly Sheep Washable Wool Rug (110×160cm)',
      category: 'Rug',
      priceEur: 159.00,
      material: '100% Natural Washable Wool',
      colors: ['Off-White Natural', 'Warm Grey'],
      rating: 5.0,
      unitsSoldMonthly: 3100,
    },
    keyFeatures: ['First Washable Wool Rugs', 'Handcrafted in India', 'Eco-Packaging'],
    marketShareEstimate: '18% EU Premium Washables',
  },
  {
    id: 'bloomingville-mini',
    name: 'Bloomingville Mini',
    country: 'Denmark / EU',
    countryCode: 'DK',
    flag: '🇩🇰',
    categories: ['Kids Furniture', 'Kids Chairs', 'Kids Rugs'],
    priceRange: '€49 - €220',
    salesVolumeIndex: 9800,
    growthYoY: '+25%',
    topTrendingItem: {
      title: 'Handwoven Rattan Mushroom Stool & Play Chair',
      category: 'Chair',
      priceEur: 89.00,
      material: 'Natural Rattan & Cane',
      colors: ['Honey Rattan'],
      rating: 4.8,
      unitsSoldMonthly: 1850,
    },
    keyFeatures: ['Scandinavian Aesthetic', 'Artisanal Natural Fiber', 'Cozy Nursery Vibe'],
    marketShareEstimate: '8% EU Nordic Segment',
  },
  {
    id: 'kave-home-kids',
    name: 'Kave Home Kids',
    country: 'Spain / Germany',
    countryCode: 'ES',
    flag: '🇪🇸',
    categories: ['Kids Chairs', 'Kids Rugs', 'Furniture'],
    priceRange: '€39 - €180',
    salesVolumeIndex: 8900,
    growthYoY: '+31%',
    topTrendingItem: {
      title: 'Nuage Tufted Rainbow Arches Rug (120×180cm)',
      category: 'Rug',
      priceEur: 79.99,
      material: 'Recycled PET Fiber & Cotton Backing',
      colors: ['Multi Pastel', 'Earthy Ochre'],
      rating: 4.7,
      unitsSoldMonthly: 1600,
    },
    keyFeatures: ['Sustainable Recycled PET', 'Mediterranean Colors', 'High Durability'],
    marketShareEstimate: '7% Southern DE / ES',
  },
  {
    id: 'hm-home-kids',
    name: 'H&M Home Kids DE',
    country: 'Sweden / Germany',
    countryCode: 'SE',
    flag: '🇸🇪',
    categories: ['Kids Rugs', 'Kids Seating', 'Decor'],
    priceRange: '€19 - €89',
    salesVolumeIndex: 31000,
    growthYoY: '+15%',
    topTrendingItem: {
      title: 'Alphabet Hopscotch Cotton Printed Play Rug (100×150cm)',
      category: 'Rug',
      priceEur: 39.99,
      material: '100% Cotton Canvas',
      colors: ['Off-White', 'Black Print'],
      rating: 4.6,
      unitsSoldMonthly: 7200,
    },
    keyFeatures: ['Fast-Fashion Pricing', 'High Turnaround', 'Global Retail Distribution'],
    marketShareEstimate: '26% Volume Budget Segment',
  },
];

interface CompetitorIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompetitorIntelligenceModal: React.FC<CompetitorIntelligenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'brands' | 'trending_rugs' | 'trending_chairs' | 'market_insights'>('trending_rugs');

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Filtering Competitors
  const filteredCompetitors = EU_COMPETITORS_DATA.filter((brand) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      brand.categories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesCountry = selectedCountry === 'ALL' || brand.countryCode === selectedCountry;
    const matchesSearch =
      !searchQuery ||
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.topTrendingItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.topTrendingItem.material.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesCountry && matchesSearch;
  });

  // Extract Rug items
  const trendingRugs = EU_COMPETITORS_DATA.filter(
    (b) => b.topTrendingItem.category === 'Rug' || b.categories.includes('Kids Rugs')
  );

  // Extract Chair items
  const trendingChairs = EU_COMPETITORS_DATA.filter(
    (b) => b.topTrendingItem.category === 'Chair' || b.categories.includes('Kids Chairs')
  );

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-6xl" id="competitorIntelligenceModal">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-950 text-white border-b border-rose-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
            <Globe className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-wide">Competitor</h2>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono font-bold uppercase">
                DE & Surrounding EU Kids Market
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
          title="Close Modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Main Body */}
      <div className="p-5 lg:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-stone-50">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-100 p-2 rounded-xl border border-rose-700 shadow-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('trending_rugs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'trending_rugs'
                  ? 'bg-[#EF3340] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trending Kids Rugs</span>
            </button>
            <button
              onClick={() => setActiveTab('trending_chairs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'trending_chairs'
                  ? 'bg-[#EF3340] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Kids Chairs & Furniture</span>
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'brands'
                  ? 'bg-[#EF3340] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>EU Brands Directory</span>
            </button>
            <button
              onClick={() => setActiveTab('market_insights')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'market_insights'
                  ? 'bg-[#EF3340] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Market & Price Insights</span>
            </button>
          </div>

          <div className="text-right px-2">
            <span className="text-[11px] font-mono text-stone-500 block">Current Live Date:</span>
            <span className="text-xs font-bold font-mono text-[#EF3340]">{currentDateFormatted}</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-100 p-3.5 rounded-xl border border-rose-700">
          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Search Brand or Product</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Vertbaudet, Benuta..."
                className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#EF3340]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Country Region</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-800 cursor-pointer font-bold"
            >
              <option value="ALL">All EU Regions</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="NL">🇳🇱 Netherlands</option>
              <option value="ES">🇪🇸 Spain</option>
              <option value="DK">🇩🇰 Denmark</option>
              <option value="SE">🇸🇪 Sweden</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Product Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-800 cursor-pointer font-bold"
            >
              <option value="ALL">All Categories</option>
              <option value="Rugs">Kids Rugs & Play Mats</option>
              <option value="Chairs">Kids Chairs & Ergonomic Seating</option>
              <option value="Furniture">Kids Modular Furniture & Tables</option>
            </select>
          </div>
        </div>

        {/* TAB 1: TRENDING KIDS RUGS */}
        {activeTab === 'trending_rugs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" /> Top Selling Rugs ({currentDateFormatted})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingRugs.map((brand) => {
                const item = brand.topTrendingItem;
                return (
                  <div
                    key={brand.id}
                    className="bg-stone-100 rounded-2xl border border-rose-700 shadow-xs hover:shadow-md transition p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="text-base">{brand.flag}</span> {brand.name}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-200 text-[#EF3340] border border-rose-700 font-mono font-bold text-[10px] rounded-full">
                          {brand.growthYoY} YoY
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-stone-900 leading-snug">{item.title}</h4>
                      <div className="bg-stone-200 p-2.5 rounded-xl border border-stone-300 text-[11px] space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Retail Price:</span>
                          <span className="font-bold text-stone-900">€{item.priceEur.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Material:</span>
                          <span className="font-bold text-emerald-800 truncate max-w-[150px]">{item.material}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Est. Sales Vol:</span>
                          <span className="font-bold text-indigo-800">{item.unitsSoldMonthly.toLocaleString()} units/mo</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Trending Color Palette:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.colors.map((color, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-stone-200 text-stone-800 border border-stone-300 rounded text-[10px] font-semibold">
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-stone-300 flex items-center justify-between text-[11px]">
                      <span className="text-amber-700 font-bold font-mono">★ {item.rating} Rating</span>
                      <span className="text-stone-500 font-mono">{brand.marketShareEstimate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TRENDING KIDS CHAIRS & FURNITURE */}
        {activeTab === 'trending_chairs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-700" /> Kids Furniture & Ergonomics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingChairs.map((brand) => {
                const item = brand.topTrendingItem;
                return (
                  <div
                    key={brand.id}
                    className="bg-stone-100 rounded-2xl border border-rose-700 shadow-xs hover:shadow-md transition p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="text-base">{brand.flag}</span> {brand.name}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-200 text-indigo-800 border border-indigo-700 font-mono font-bold text-[10px] rounded-full">
                          {brand.priceRange}
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-stone-900 leading-snug">{item.title}</h4>
                      <div className="bg-stone-200 p-2.5 rounded-xl border border-stone-300 text-[11px] space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Retail Price:</span>
                          <span className="font-bold text-stone-900">€{item.priceEur.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Material & Build:</span>
                          <span className="font-bold text-indigo-800 truncate max-w-[150px]">{item.material}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Monthly Sales:</span>
                          <span className="font-bold text-emerald-800">{item.unitsSoldMonthly.toLocaleString()} units</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Key Selling Points:</span>
                        <div className="flex flex-wrap gap-1">
                          {brand.keyFeatures.map((feat, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-stone-200 text-stone-800 border border-stone-300 rounded text-[10px] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-stone-300 flex items-center justify-between text-[11px]">
                      <span className="text-amber-700 font-bold font-mono">★ {item.rating}</span>
                      <span className="text-stone-500 font-mono">{brand.marketShareEstimate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BRANDS DIRECTORY */}
        {activeTab === 'brands' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Brands Database ({filteredCompetitors.length} Brands Listed)
            </h3>
            <div className="border border-rose-700 rounded-2xl overflow-hidden bg-stone-100 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-200 text-stone-700 font-semibold border-b border-rose-700">
                  <tr>
                    <th className="p-3">Brand Name</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">Categories</th>
                    <th className="p-3">Price Range</th>
                    <th className="p-3">Monthly Vol Index</th>
                    <th className="p-3">Growth</th>
                    <th className="p-3">Top Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300 font-sans text-stone-800">
                  {filteredCompetitors.map((brand) => (
                    <tr key={brand.id} className="hover:bg-stone-200 transition">
                      <td className="p-3 font-bold text-stone-900">{brand.name}</td>
                      <td className="p-3 font-semibold text-stone-700 flex items-center gap-1.5">
                        <span>{brand.flag}</span> {brand.country}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {brand.categories.map((cat, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px] font-mono">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-stone-900">{brand.priceRange}</td>
                      <td className="p-3 font-mono text-indigo-800 font-bold">{brand.salesVolumeIndex.toLocaleString()} units</td>
                      <td className="p-3 font-mono text-emerald-800 font-bold">{brand.growthYoY}</td>
                      <td className="p-3 text-stone-700 max-w-xs truncate">{brand.topTrendingItem.title} (€{brand.topTrendingItem.priceEur})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MARKET & PRICE INSIGHTS */}
        {activeTab === 'market_insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-stone-100 p-5 rounded-2xl border border-rose-700 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#EF3340]" /> Material Preference Breakdown
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                      <span>Hand-Tufted Natural New Zealand Wool</span>
                      <span className="font-mono font-bold text-indigo-800">28% Demand</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-700 h-full rounded-full" style={{ width: '28%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                      <span>Recycled PET Bottle Eco Poly Yarn</span>
                      <span className="font-mono font-bold text-sky-800">18% Demand</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-sky-600 h-full rounded-full" style={{ width: '18%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                      <span>Natural Jute & Rattan Handwoven</span>
                      <span className="font-mono font-bold text-amber-800">12% Demand</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full rounded-full" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-100 p-5 rounded-2xl border border-rose-700 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" /> Strategic Manufacturing Guidance
                </h4>
                <div className="space-y-2.5 text-xs text-stone-800">
                  <div className="p-3 bg-amber-200/50 rounded-xl border border-amber-300">
                    <p className="font-bold text-amber-950 mb-0.5">1. Machine Washable Lightweight Rugs</p>
                    <p className="text-amber-900 text-[11px]">
                      German mothers prioritize easy maintenance. Flexible 100% cotton backing sells at 3x higher velocity.
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-200/50 rounded-xl border border-emerald-300">
                    <p className="font-bold text-emerald-950 mb-0.5">2. Natural Earth & Pastel Tones</p>
                    <p className="text-emerald-900 text-[11px]">
                      Top selling colors: Sage Green, Oatmeal Beige, Muted Clay, Terracotta arches.
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-200/50 rounded-xl border border-indigo-300">
                    <p className="font-bold text-indigo-950 mb-0.5">3. Ergonomic Chairs & FSC Certification</p>
                    <p className="text-indigo-900 text-[11px]">
                      Non-toxic water-based finishes and FSC/PEFC wood certifications are mandatory.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-stone-100 border-t border-rose-700 flex justify-between items-center text-stone-600">
        <p className="text-xs italic">
          Data synchronized for DE and EU Markets ({currentDateFormatted}).
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold bg-stone-200 text-stone-900 hover:bg-stone-300 rounded-xl transition cursor-pointer border border-rose-700"
        >
          Close
        </button>
      </div>
    </PageFlipModal>
  );
};

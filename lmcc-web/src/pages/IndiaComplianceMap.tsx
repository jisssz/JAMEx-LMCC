import React, { useEffect, useMemo, useState } from 'react';
import {
  Minus,
  Plus,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  PieChart,
  Clock,
  Sparkles,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';

type Position = [number, number];
type PolygonCoordinates = Position[][];
type Geometry =
  | { type: 'Polygon'; coordinates: PolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };
interface StateFeature {
  type: 'Feature';
  properties: { state_lgd: number; name: string };
  geometry: Geometry;
}
interface FeatureCollection {
  type: 'FeatureCollection';
  features: StateFeature[];
}

interface StateSummaryItem {
  rank: number;
  name: string;
  inspections: number;
  complianceRate: number;
  compliantCount: number;
  needsReviewCount: number;
  nonCompliantCount: number;
}

const stateSummaries: StateSummaryItem[] = [
  { rank: 1, name: 'Maharashtra', inspections: 944, complianceRate: 68, compliantCount: 642, needsReviewCount: 214, nonCompliantCount: 88 },
  { rank: 2, name: 'Karnataka', inspections: 700, complianceRate: 73, compliantCount: 512, needsReviewCount: 136, nonCompliantCount: 52 },
  { rank: 3, name: 'Tamil Nadu', inspections: 637, complianceRate: 74, compliantCount: 468, needsReviewCount: 128, nonCompliantCount: 41 },
  { rank: 4, name: 'Uttar Pradesh', inspections: 612, complianceRate: 69, compliantCount: 422, needsReviewCount: 130, nonCompliantCount: 60 },
  { rank: 5, name: 'Gujarat', inspections: 580, complianceRate: 76, compliantCount: 440, needsReviewCount: 98, nonCompliantCount: 42 },
  { rank: 6, name: 'Delhi', inspections: 520, complianceRate: 74, compliantCount: 384, needsReviewCount: 92, nonCompliantCount: 44 },
  { rank: 7, name: 'West Bengal', inspections: 498, complianceRate: 71, compliantCount: 354, needsReviewCount: 104, nonCompliantCount: 40 },
  { rank: 8, name: 'Rajasthan', inspections: 412, complianceRate: 66, compliantCount: 272, needsReviewCount: 96, nonCompliantCount: 44 },
  { rank: 9, name: 'Madhya Pradesh', inspections: 398, complianceRate: 70, compliantCount: 278, needsReviewCount: 82, nonCompliantCount: 38 },
  { rank: 10, name: 'Bihar', inspections: 356, complianceRate: 67, compliantCount: 238, needsReviewCount: 80, nonCompliantCount: 38 },
];

function allPositions(geometry: Geometry): Position[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

function geometryPath(geometry: Geometry, project: (position: Position) => Position): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) =>
      polygon.map(
        (ring) =>
          ring
            .map((point, index) => {
              const [x, y] = project(point);
              return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ') + ' Z'
      )
    )
    .join(' ');
}

export const IndiaComplianceMap: React.FC = () => {
  const [collection, setCollection] = useState<FeatureCollection | null>(null);
  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [viewMode, setViewMode] = useState<'states' | 'districts'>('states');
  const [zoom, setZoom] = useState(1);
  const pan = { x: 0, y: 0 };

  // Filters state
  const [timePeriod, setTimePeriod] = useState('Last 30 days');
  const [category, setCategory] = useState('All Categories');
  const [filterCompliant, setFilterCompliant] = useState(true);
  const [filterNeedsReview, setFilterNeedsReview] = useState(true);
  const [filterNonCompliant, setFilterNonCompliant] = useState(true);

  useEffect(() => {
    fetch('/data/india-states-lgd-simplified.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load boundary');
        return res.json();
      })
      .then((data) => setCollection(data as FeatureCollection))
      .catch((err) => console.warn('Could not load GeoJSON:', err));
  }, []);

  const projectedFeatures = useMemo(() => {
    if (!collection) return [];
    const points = collection.features.flatMap((f) => allPositions(f.geometry));
    const latMid = points.reduce((sum, p) => sum + p[1], 0) / Math.max(1, points.length);
    const xs = points.map((p) => p[0] * Math.cos((latMid * Math.PI) / 180));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...points.map((p) => p[1]));
    const maxY = Math.max(...points.map((p) => p[1]));

    const project = (point: Position): Position => [
      24 + (((point[0] * Math.cos((latMid * Math.PI) / 180) - minX) / (maxX - minX)) * 752),
      24 + (((maxY - point[1]) / (maxY - minY)) * 752),
    ];

    return collection.features.map((feature) => ({
      feature,
      d: geometryPath(feature.geometry, project),
    }));
  }, [collection]);

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30 font-sans">
      <ZenoxNav />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* ==================================================== */}
        {/* HEADER SECTION (Matching Reference Image 5)         */}
        {/* ==================================================== */}
        <div className="space-y-1 pb-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>NATIONAL INSIGHTS</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-mono">
              <Sparkles size={12} className="text-violet-400" />
              <span>SIMULATED DEMO DATA</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans tracking-tight text-white font-normal">
            India Compliance Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Explore state-wise insights on packaged commodity inspections. All state and district metrics represent simulated surveillance telemetry for SIH 2026.
          </p>
        </div>

        {/* ==================================================== */}
        {/* TOP 4 KPI CARDS (Matching Reference Image 5)         */}
        {/* ==================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Inspections */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  12,486
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Total Inspections</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-violet-400 font-mono bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 flex items-center gap-1">
              <TrendingUp size={11} />
              <span>18%</span>
            </span>
          </div>

          {/* Card 2: Compliant */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  8,912
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Compliant</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              71%
            </span>
          </div>

          {/* Card 3: Needs Review */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  2,684
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Needs Review</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              21%
            </span>
          </div>

          {/* Card 4: Non-compliant */}
          <div className="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-white font-mono leading-none block">
                  890
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Non-compliant</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              8%
            </span>
          </div>
        </div>

        {/* Data Origin Disclaimer */}
        <div className="bg-[#090d16] border border-violet-500/20 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
            <span><strong>Surveillance Modeling Notice:</strong> All state telemetry, district coverage, and violation heatmaps are simulated demo data for Legal Metrology demonstration. Real product scans remain on your device until saved.</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 shrink-0 hidden sm:inline-block">SIH 2026 Model</span>
        </div>

        {/* ==================================================== */}
        {/* MAIN 3-SECTION MAP GRID (Matching Reference Image 5) */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------- */}
          {/* SECTION 1: FILTERS (2.5 / 12 cols)                 */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-violet-400" />
                  <span className="font-semibold text-white text-xs">Filters</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTimePeriod('Last 30 days');
                    setCategory('All Categories');
                    setFilterCompliant(true);
                    setFilterNeedsReview(true);
                    setFilterNonCompliant(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Time Period Filter */}
              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block font-medium">Time Period</label>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white focus:outline-none cursor-pointer"
                >
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Financial Year 2025–26</option>
                </select>
              </div>

              {/* Product Category Filter */}
              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block font-medium">Product Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white focus:outline-none cursor-pointer"
                >
                  <option>All Categories</option>
                  <option>Snacks &amp; Chips</option>
                  <option>Beverages</option>
                  <option>Edible Oils</option>
                  <option>Dairy &amp; Confectionery</option>
                </select>
              </div>

              {/* Inspection Status Checkboxes */}
              <div className="space-y-2.5 text-xs pt-1">
                <label className="text-slate-400 block font-medium">Inspection Status</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterCompliant}
                        onChange={(e) => setFilterCompliant(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="text-slate-300">Compliant</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">8,912</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterNeedsReview}
                        onChange={(e) => setFilterNeedsReview(e.target.checked)}
                        className="accent-amber-500 rounded"
                      />
                      <span className="text-slate-300">Needs Review</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">2,684</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterNonCompliant}
                        onChange={(e) => setFilterNonCompliant(e.target.checked)}
                        className="accent-red-500 rounded"
                      />
                      <span className="text-slate-300">Non-compliant</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">890</span>
                  </label>
                </div>
              </div>

              {/* Declaration Type */}
              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block font-medium">Declaration Type</label>
                <select className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white focus:outline-none cursor-pointer">
                  <option>All Declarations</option>
                  <option>Rule 6(1)(da) Maximum Retail Price</option>
                  <option>Rule 6(1)(c) Net Quantity</option>
                  <option>Rule 6(1)(d) Dates of Packing</option>
                  <option>Rule 6(1)(a) Manufacturer / Packer</option>
                </select>
              </div>

              {/* Apply Filters Orange Button */}
              <button
                type="button"
                onClick={() => alert('Filters applied to geographic dataset')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs transition shadow-md shadow-orange-500/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <Filter size={13} className="stroke-[2.5]" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* SECTION 2: MAP CANVAS WITH CALLOUTS (5.5 / 12 cols) */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-5 relative space-y-4">
            <div className="bg-[#090d16] rounded-3xl border border-white/[0.08] p-5 relative overflow-hidden h-[540px] flex flex-col justify-between">
              {/* Top Controls: Zoom + / - and View Mode Tabs */}
              <div className="flex items-center justify-between z-20">
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <Minus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/[0.08] text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('states')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      viewMode === 'states'
                        ? 'bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    States
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('districts')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      viewMode === 'districts'
                        ? 'bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Districts
                  </button>
                </div>
              </div>

              {/* Vector SVG India Map with glowing density */}
              <div className="absolute inset-0 flex items-center justify-center p-6 z-10 overflow-hidden">
                <div
                  className="w-full h-full max-w-[480px] max-h-[480px] transition-transform duration-200"
                  style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                >
                  <svg
                    viewBox="0 0 800 800"
                    className="w-full h-full filter drop-shadow-[0_0_25px_rgba(255,122,61,0.15)]"
                  >
                    <defs>
                      <linearGradient id="mapGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>

                    {projectedFeatures.length > 0 ? (
                      projectedFeatures.map(({ feature, d }) => {
                        const isMatch = feature.properties.name
                          .toLowerCase()
                          .includes(selectedState.toLowerCase());

                        return (
                          <path
                            key={feature.properties.state_lgd}
                            d={d}
                            onClick={() => setSelectedState(feature.properties.name)}
                            className={`cursor-pointer transition duration-200 stroke-[1] ${
                              isMatch
                                ? 'fill-orange-500/50 stroke-orange-400'
                                : 'fill-[#0e1628]/80 hover:fill-[#1b253d] stroke-white/[0.12]'
                            }`}
                          />
                        );
                      })
                    ) : (
                      // Clean fallback SVG schematic of India
                      <path
                        d="M 380 90 L 440 120 L 480 180 L 520 220 L 600 240 L 640 280 L 580 320 L 540 310 L 520 370 L 480 430 L 460 520 L 440 600 L 410 700 L 390 730 L 370 700 L 350 580 L 320 500 L 260 440 L 220 390 L 240 340 L 290 310 L 310 240 L 340 160 Z"
                        fill="url(#mapGlow)"
                        stroke="#ff7a3d"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* State Callout Tooltips (Matching Reference Image 5) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {/* Maharashtra Callout */}
                <div
                  className="absolute left-[20%] top-[48%] pointer-events-auto cursor-pointer p-2.5 rounded-xl bg-[#090d16]/95 border border-orange-500/40 shadow-xl text-[10px] space-y-1 backdrop-blur-md"
                  onClick={() => setSelectedState('Maharashtra')}
                >
                  <span className="font-bold text-white block text-xs">Maharashtra</span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>642 Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>214 Needs Review</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>88 Non-compliant</span>
                  </div>
                </div>

                {/* Delhi Callout */}
                <div
                  className="absolute left-[44%] top-[24%] pointer-events-auto cursor-pointer p-2 rounded-xl bg-[#090d16]/95 border border-white/[0.12] shadow-xl text-[9px] space-y-0.5 backdrop-blur-md"
                  onClick={() => setSelectedState('Delhi')}
                >
                  <span className="font-bold text-white block text-[10px]">Delhi</span>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>384 Compliant</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    <span>92 Needs Review</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-400">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    <span>44 Non-compliant</span>
                  </div>
                </div>

                {/* Karnataka Callout */}
                <div
                  className="absolute left-[28%] top-[68%] pointer-events-auto cursor-pointer p-2 rounded-xl bg-[#090d16]/95 border border-white/[0.12] shadow-xl text-[9px] space-y-0.5 backdrop-blur-md"
                  onClick={() => setSelectedState('Karnataka')}
                >
                  <span className="font-bold text-white block text-[10px]">Karnataka</span>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>512 Compliant</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    <span>136 Needs Review</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-400">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    <span>52 Non-compliant</span>
                  </div>
                </div>

                {/* Tamil Nadu Callout */}
                <div
                  className="absolute right-[24%] top-[72%] pointer-events-auto cursor-pointer p-2 rounded-xl bg-[#090d16]/95 border border-white/[0.12] shadow-xl text-[9px] space-y-0.5 backdrop-blur-md"
                  onClick={() => setSelectedState('Tamil Nadu')}
                >
                  <span className="font-bold text-white block text-[10px]">Tamil Nadu</span>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>468 Compliant</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    <span>128 Needs Review</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-400">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    <span>41 Non-compliant</span>
                  </div>
                </div>
              </div>

              {/* Bottom Density Gradient Legend */}
              <div className="z-20 bg-black/60 p-3 rounded-2xl border border-white/[0.08] backdrop-blur-md w-60">
                <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1.5">
                  Inspection Density
                </span>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
                <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* SECTION 3: STATE-WISE SUMMARY TABLE (4 / 12 cols)  */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-full" />
                  <span className="font-semibold text-white text-xs tracking-wide">
                    State-wise Summary
                  </span>
                </div>
                <select className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-[11px] text-slate-300 focus:outline-none cursor-pointer">
                  <option>Sort by Inspections</option>
                  <option>Sort by Compliance %</option>
                </select>
              </div>

              {/* State Table Header */}
              <div className="grid grid-cols-12 text-[10px] text-slate-500 uppercase font-mono pb-1 border-b border-white/[0.04]">
                <span className="col-span-1">#</span>
                <span className="col-span-5">State</span>
                <span className="col-span-3 text-right">Inspections</span>
                <span className="col-span-3 text-right">Compliance</span>
              </div>

              {/* State List */}
              <div className="divide-y divide-white/[0.03] text-xs">
                {stateSummaries.map((item) => (
                  <div
                    key={item.rank}
                    onClick={() => setSelectedState(item.name)}
                    className={`grid grid-cols-12 items-center py-2.5 px-1 rounded-xl transition cursor-pointer ${
                      selectedState === item.name ? 'bg-orange-500/10 text-orange-300' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="col-span-1 font-mono text-[11px] text-slate-500">{item.rank}</span>
                    <span className="col-span-5 font-medium truncate text-white">{item.name}</span>
                    <span className="col-span-3 text-right font-mono text-slate-300">{item.inspections}</span>
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${item.complianceRate}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400">{item.complianceRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BOTTOM 3 CARDS ROW (Matching Reference Image 5)      */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* -------------------------------------------------- */}
          {/* CARD 1: KEY INSIGHTS                               */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sparkles size={15} className="text-violet-400" />
              <span>Key Insights</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 shrink-0" />
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">Maharashtra</strong> has the highest number of inspections (944) across western industrial zones.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                <p className="text-slate-300 leading-relaxed">
                  Overall compliance rate is <strong className="text-white">71%</strong> across India, demonstrating high rule awareness on FMCG commodities.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">MRP declaration issues</strong> are the most common (42%), primarily concerning inclusive-of-all-taxes syntax.
                </p>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 2: COMMON ISSUES BY CATEGORY (Donut Chart)    */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <PieChart size={15} className="text-violet-400" />
              <span>Common Issues by Category</span>
            </div>

            <div className="flex items-center gap-5">
              {/* Donut Chart Visual */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Segment 1: MRP 42% (orange) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#ff7a3d"
                    strokeWidth="4"
                    strokeDasharray="42, 100"
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: Net Quantity 28% (purple) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="4"
                    strokeDasharray="28, 100"
                    strokeDashoffset="-42"
                  />
                  {/* Segment 3: Manufacturer 15% (blue) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeDasharray="15, 100"
                    strokeDashoffset="-70"
                  />
                  {/* Segment 4: Consumer care 10% (teal) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="4"
                    strokeDasharray="10, 100"
                    strokeDashoffset="-85"
                  />
                  {/* Segment 5: Other 5% (gray) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="4"
                    strokeDasharray="5, 100"
                    strokeDashoffset="-95"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-bold text-xs text-white font-mono leading-none">2,684</span>
                  <span className="text-[8px] text-slate-500 uppercase mt-0.5">Issues</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-slate-300">MRP Declaration</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">42%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-slate-300">Net Quantity</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">28%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-slate-300">Manufacturer Details</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">15%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-slate-300">Consumer Care</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">10%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-slate-300">Other</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 3: RECENT ACTIVITY                            */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Clock size={15} className="text-orange-400" />
                <span>Recent Activity</span>
              </div>
              <button
                type="button"
                onClick={() => alert('Viewing all national activity records')}
                className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium transition cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Item 1 */}
              <div className="flex items-start justify-between gap-3 p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="font-medium text-white">Lay's Classic (Maharashtra)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Needs review • MRP declaration
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">2 hours ago</span>
              </div>

              {/* Item 2 */}
              <div className="flex items-start justify-between gap-3 p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-medium text-white">Maggi Noodles (Karnataka)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Compliant • All declarations valid
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">4 hours ago</span>
              </div>

              {/* Item 3 */}
              <div className="flex items-start justify-between gap-3 p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="font-medium text-white">Coca-Cola (Delhi)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Non-compliant • Missing manufacturer details
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">6 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IndiaComplianceMap;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';

type Position = [number, number];
type PolygonCoordinates = Position[][];
type Geometry = { type: 'Polygon'; coordinates: PolygonCoordinates } | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };
interface StateFeature { type: 'Feature'; properties: { state_lgd: number; name: string }; geometry: Geometry }
interface FeatureCollection { type: 'FeatureCollection'; features: StateFeature[] }
type Category = 'MRP declaration' | 'Net quantity' | 'Packer details' | 'Consumer care' | 'Unreadable declaration';
type Severity = 'Review' | 'High' | 'Critical';
interface DemoRecord { id: string; stateId: number; category: Category; severity: Severity; date: string }

const categories: Category[] = ['MRP declaration', 'Net quantity', 'Packer details', 'Consumer care', 'Unreadable declaration'];
const severities: Severity[] = ['Review', 'High', 'Critical'];
const DEMO_SEED = 2601024;

function buildDemoRecords(features: StateFeature[]): DemoRecord[] {
  // A fixed LCG seed keeps every demo view reproducible; records never enter report storage or analytics APIs.
  let seed = DEMO_SEED;
  const next = (max: number) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % max; };
  return features.flatMap(feature => Array.from({ length: 3 + next(6) }, (_, index) => ({
    id: `demo-${feature.properties.state_lgd}-${index + 1}`,
    stateId: feature.properties.state_lgd,
    category: categories[next(categories.length)],
    severity: severities[next(severities.length)],
    date: `2026-${String(7 + next(4)).padStart(2, '0')}-${String(1 + next(28)).padStart(2, '0')}`,
  })));
}

function allPositions(geometry: Geometry): Position[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.flatMap(ring => ring));
}

function geometryPath(geometry: Geometry, project: (position: Position) => Position): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z')).join(' ');
}

const displayName = (name: string) => name.replace(/&/g, 'and').replace(/,/g, ' and ').replace(/\s+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

export const IndiaComplianceMap: React.FC = () => {
  const [collection, setCollection] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All categories'>('All categories');
  const [severity, setSeverity] = useState<Severity | 'All severity'>('All severity');
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-10-31');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/data/india-states-lgd-simplified.geojson')
      .then(response => { if (!response.ok) throw new Error(`Boundary request failed (${response.status})`); return response.json(); })
      .then(data => { if (active) setCollection(data as FeatureCollection); })
      .catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Could not load state boundaries.'); });
    return () => { active = false; };
  }, []);

  const demoRecords = useMemo(() => collection ? buildDemoRecords(collection.features) : [], [collection]);
  const filteredRecords = useMemo(() => demoRecords.filter(record =>
    (category === 'All categories' || record.category === category) &&
    (severity === 'All severity' || record.severity === severity) &&
    record.date >= fromDate && record.date <= toDate
  ), [demoRecords, category, severity, fromDate, toDate]);
  const counts = useMemo(() => {
    const result = new Map<number, number>();
    filteredRecords.forEach(record => result.set(record.stateId, (result.get(record.stateId) || 0) + 1));
    return result;
  }, [filteredRecords]);
  const selected = collection?.features.find(feature => feature.properties.state_lgd === selectedId) || null;
  const stateRecords = selected ? filteredRecords.filter(record => record.stateId === selected.properties.state_lgd) : [];
  const ranked = collection ? [...collection.features].filter(feature => displayName(feature.properties.name).toLowerCase().includes(query.toLowerCase())).sort((a,b) => (counts.get(b.properties.state_lgd) || 0) - (counts.get(a.properties.state_lgd) || 0)) : [];

  const projectedFeatures = useMemo(() => {
    if (!collection) return [];
    const points = collection.features.flatMap(feature => allPositions(feature.geometry));
    const latMid = points.reduce((sum, point) => sum + point[1], 0) / Math.max(1, points.length);
    const xs = points.map(point => point[0] * Math.cos(latMid * Math.PI / 180));
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...points.map(point => point[1])), maxY = Math.max(...points.map(point => point[1]));
    const project = (point: Position): Position => [24 + ((point[0] * Math.cos(latMid * Math.PI / 180) - minX) / (maxX - minX)) * 752, 24 + ((maxY - point[1]) / (maxY - minY)) * 752];
    return collection.features.map(feature => ({ feature, d: geometryPath(feature.geometry, project) }));
  }, [collection]);

  const resetFilters = () => { setCategory('All categories'); setSeverity('All severity'); setFromDate('2026-07-01'); setToDate('2026-10-31'); setQuery(''); setSelectedId(null); setZoom(1); setPan({ x: 0, y: 0 }); };
  const fillFor = (count: number) => count === 0 ? '#111827' : count < 4 ? '#39233a' : count < 8 ? '#773a3c' : '#d46635';

  return <div className="min-h-screen bg-[#06080e] text-slate-100"><ZenoxNav/><main className="mx-auto max-w-6xl space-y-6 px-5 py-10">
    <div><p className="text-xs uppercase tracking-[.2em] text-cyan-300">Geographic overview</p><h1 className="mt-2 font-display text-4xl">India compliance map</h1><p className="mt-3 max-w-2xl text-sm text-slate-400">Explore state and union territory demo observations. This map uses a fixed, synthetic dataset separate from inspections, reports, and operational analytics.</p></div>
    <div role="note" className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 text-sm font-semibold tracking-wide text-amber-100">DEMO MODE — ALL MAP RECORDS AND COUNTS ARE SIMULATED</div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Filtered demo records" value={filteredRecords.length}/><Metric label="States / UTs with records" value={counts.size}/><Metric label="High or critical" value={filteredRecords.filter(r=>r.severity!=='Review').length}/><Metric label="Dataset seed" value={DEMO_SEED}/></div>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="rounded-3xl border border-white/10 bg-[#0b101b] p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">State observations · filtered demo data</h2><div className="flex gap-2"><button aria-label="Zoom out" className="rounded-lg border border-white/10 p-2" onClick={()=>setZoom(value=>Math.max(1,value-.25))}><Minus className="h-4 w-4"/></button><button aria-label="Zoom in" className="rounded-lg border border-white/10 p-2" onClick={()=>setZoom(value=>Math.min(3,value+.25))}><Plus className="h-4 w-4"/></button><button aria-label="Reset map view" className="rounded-lg border border-white/10 p-2" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw className="h-4 w-4"/></button></div></div>
        {loadError ? <div role="alert" className="rounded-xl border border-rose-400/20 p-4 text-sm text-rose-200">Could not load the India boundary layer: {loadError}</div> : !collection ? <div role="status" className="flex h-[25rem] items-center justify-center text-sm text-slate-400">Loading licensed state boundaries…</div> : <div className="overflow-hidden rounded-2xl bg-[#080b12]" onPointerMove={event=>{if(dragging.current){setPan(prev=>({x:prev.x+event.clientX-dragging.current!.x,y:prev.y+event.clientY-dragging.current!.y}));dragging.current={x:event.clientX,y:event.clientY};}}} onPointerUp={()=>{dragging.current=null;}} onPointerLeave={()=>{dragging.current=null;}}>
          <svg viewBox="0 0 800 800" role="img" aria-label="Interactive map of simulated inspection counts by Indian state and union territory" className="h-[25rem] w-full touch-none" onPointerDown={event=>{dragging.current={x:event.clientX,y:event.clientY};}}>
            <g transform={`translate(${pan.x} ${pan.y}) translate(400 400) scale(${zoom}) translate(-400 -400)`}>
              {projectedFeatures.map(({feature,d})=>{const stateCount=counts.get(feature.properties.state_lgd)||0;const isSelected=feature.properties.state_lgd===selectedId;return <path key={feature.properties.state_lgd} d={d} fill={fillFor(stateCount)} stroke={isSelected?'#fbbf24':'#a78bfa'} strokeWidth={isSelected?2.8:1.15} vectorEffect="non-scaling-stroke" fillRule="evenodd" tabIndex={0} role="button" aria-label={`${displayName(feature.properties.name)}: ${stateCount} simulated observations`} aria-pressed={isSelected} onClick={()=>setSelectedId(feature.properties.state_lgd)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(feature.properties.state_lgd);}}} className="cursor-pointer transition-colors hover:fill-orange-400 focus:outline-none focus:stroke-white"/>;})}
            </g>
          </svg><div className="flex items-center justify-between border-t border-white/[.06] px-3 py-2 text-[10px] text-slate-500"><span>Drag to pan · buttons to zoom</span><span>Counts are synthetic</span></div>
        </div>}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400"><Legend color="#111827" label="0"/><Legend color="#39233a" label="1–3"/><Legend color="#773a3c" label="4–7"/><Legend color="#d46635" label="8+"/><span className="basis-full text-slate-500">Fill intensity reflects the filtered simulated record count.</span></div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Boundaries: States (2024), Local Government Directory source, via <a className="text-cyan-300 underline" href="https://bharatlas.com/view/gb_adm1" target="_blank" rel="noreferrer">Bharatlas</a>; licensed CC0 / CC BY 4.0. Geometry simplified for overview display. Snapshot: 2024.</p>
      </div>
      <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/[.02] p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Filters</h2><button onClick={resetFilters} className="text-xs text-cyan-300">Clear filters</button></div>
        <select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value as Category|'All categories')} className="w-full rounded-xl border border-white/10 bg-[#0b101b] px-3 py-2 text-sm"><option>All categories</option>{categories.map(item=><option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by severity" value={severity} onChange={e=>setSeverity(e.target.value as Severity|'All severity')} className="w-full rounded-xl border border-white/10 bg-[#0b101b] px-3 py-2 text-sm"><option>All severity</option>{severities.map(item=><option key={item}>{item}</option>)}</select>
        <label className="block text-xs text-slate-400">From<input aria-label="From date" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white"/></label>
        <label className="block text-xs text-slate-400">To<input aria-label="To date" type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b101b] px-3 py-2 text-sm text-white"/></label>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"><Search className="h-4 w-4 text-slate-400"/><input aria-label="Search states and union territories" className="w-full bg-transparent text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="max-h-56 space-y-1 overflow-auto">{ranked.map(feature=><button key={feature.properties.state_lgd} onClick={()=>setSelectedId(feature.properties.state_lgd)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${selectedId===feature.properties.state_lgd?'bg-cyan-500/15 text-cyan-100':'text-slate-300 hover:bg-white/[.05]'}`}><span>{displayName(feature.properties.name)}</span><span className="font-mono text-amber-200">{counts.get(feature.properties.state_lgd)||0}</span></button>)}{collection&&ranked.length===0&&<p className="p-3 text-sm text-slate-500">No matching locations.</p>}</div>
        <div className="border-t border-white/[.08] pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-orange-300"/>{selected?displayName(selected.properties.name):'Select a state'}</h3>{selected?<><p className="mt-2 text-2xl text-white">{stateRecords.length} <span className="text-xs text-slate-400">simulated records</span></p><div className="mt-3 space-y-2">{categories.map(item=>{const count=stateRecords.filter(record=>record.category===item).length;return <div key={item} className="flex justify-between text-xs text-slate-400"><span>{item}</span><span>{count}</span></div>})}</div><div className="mt-3 space-y-2">{stateRecords.slice(0,5).map(record=><div key={record.id} className="rounded-lg border border-white/[.06] bg-black/20 p-2 text-[10px] text-slate-400"><span className="text-amber-200">{record.severity}</span> · {record.category} · {record.date} · SIMULATED</div>)}</div></>:<p className="mt-2 text-xs text-slate-500">Choose a map state or list item to review its filtered demo summary.</p>}</div>
      </aside>
    </section>
  </main></div>;
};

const Metric: React.FC<{label:string;value:number}> = ({label,value}) => <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-display text-2xl text-white">{value.toLocaleString()}</p></div>;
const Legend: React.FC<{color:string;label:string}> = ({color,label}) => <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border border-white/10" style={{backgroundColor:color}}/>{label}</span>;

import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, Filter, Sparkles } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import './india-compliance-map.css';

type Position = [number, number];
type Geometry =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };
interface StateFeature {
  type: 'Feature';
  properties: { state_lgd: number; name: string };
  geometry: Geometry;
}
interface FeatureCollection { type: 'FeatureCollection'; features: StateFeature[] }

// Existing simulated state totals. These aggregates have no dates, product
// categories, or declaration breakdowns; never manufacture those dimensions.
const demoStates = [
  { name: 'Maharashtra', compliant: 642, review: 214, nonCompliant: 88 },
  { name: 'Karnataka', compliant: 512, review: 136, nonCompliant: 52 },
  { name: 'Tamil Nadu', compliant: 468, review: 128, nonCompliant: 41 },
  { name: 'Uttar Pradesh', compliant: 422, review: 130, nonCompliant: 60 },
  { name: 'Gujarat', compliant: 440, review: 98, nonCompliant: 42 },
  { name: 'Delhi', compliant: 384, review: 92, nonCompliant: 44 },
  { name: 'West Bengal', compliant: 354, review: 104, nonCompliant: 40 },
  { name: 'Rajasthan', compliant: 272, review: 96, nonCompliant: 44 },
  { name: 'Madhya Pradesh', compliant: 278, review: 82, nonCompliant: 38 },
  { name: 'Bihar', compliant: 238, review: 80, nonCompliant: 38 },
];
const statuses = [
  { key: 'compliant', label: 'Compliant', color: '#34d399' },
  { key: 'review', label: 'Needs review', color: '#fbbf24' },
  { key: 'nonCompliant', label: 'Non-compliant', color: '#f87171' },
] as const;
type Status = typeof statuses[number]['key'];
const allStatuses: Record<Status, boolean> = { compliant: true, review: true, nonCompliant: true };
const number = (value: number) => value.toLocaleString('en-IN');
const rate = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : '—';
const normalize = (name: string) => name.toLowerCase().replace(/^nct of /, '').trim();

function allPositions(geometry: Geometry): Position[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.flatMap(ring => ring));
}
function geometryPath(geometry: Geometry, project: (point: Position) => Position) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z')).join(' ');
}

export const IndiaComplianceMap: React.FC = () => {
  const [collection, setCollection] = useState<FeatureCollection | null>(null);
  const [geoStatus, setGeoStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [stateFilter, setStateFilter] = useState('all');
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [enabled, setEnabled] = useState(allStatuses);
  const [sort, setSort] = useState('inspections');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    setGeoStatus('loading');
    fetch('/data/india-states-lgd-simplified.geojson', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Boundary request failed');
        return response.json();
      })
      .then((data: FeatureCollection) => {
        if (data.type !== 'FeatureCollection' || !data.features?.length ||
          !data.features.every(feature => feature.properties?.name &&
            ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type) &&
            allPositions(feature.geometry).length > 0 &&
            allPositions(feature.geometry).every(point => point.length >= 2 && point.every(Number.isFinite)))) {
          throw new Error('Invalid boundaries');
        }
        if (!controller.signal.aborted) { setCollection(data); setGeoStatus('ready'); }
      })
      .catch(() => { if (!controller.signal.aborted) setGeoStatus('error'); });
    return () => controller.abort();
  }, [attempt]);

  const projectedFeatures = useMemo(() => {
    if (!collection) return [];
    const points = collection.features.flatMap(feature => allPositions(feature.geometry));
    const cos = Math.cos(points.reduce((sum, p) => sum + p[1], 0) / points.length * Math.PI / 180);
    const xs = points.map(p => p[0] * cos), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = 752 / Math.max(maxX - minX, maxY - minY, 1);
    const project = (point: Position): Position => [
      (800 - (maxX - minX) * scale) / 2 + (point[0] * cos - minX) * scale,
      (800 - (maxY - minY) * scale) / 2 + (maxY - point[1]) * scale,
    ];
    return collection.features.map(feature => ({ feature, d: geometryPath(feature.geometry, project) }));
  }, [collection]);

  const filteredStates = useMemo(() => demoStates
    .filter(state => stateFilter === 'all' || state.name === stateFilter)
    .map(state => {
      const compliant = enabled.compliant ? state.compliant : 0;
      const review = enabled.review ? state.review : 0;
      const nonCompliant = enabled.nonCompliant ? state.nonCompliant : 0;
      return { name: state.name, compliant, review, nonCompliant, total: compliant + review + nonCompliant };
    }), [stateFilter, enabled]);
  const rows = [...filteredStates].sort((a, b) =>
    (sort === 'compliance' ? (b.total ? b.compliant / b.total : -1) - (a.total ? a.compliant / a.total : -1)
      : b.total - a.total) || a.name.localeCompare(b.name));
  const totals = filteredStates.reduce((sum, state) => ({
    total: sum.total + state.total, compliant: sum.compliant + state.compliant,
    review: sum.review + state.review, nonCompliant: sum.nonCompliant + state.nonCompliant,
  }), { total: 0, compliant: 0, review: 0, nonCompliant: 0 });
  const selected = filteredStates.find(state => normalize(state.name) === normalize(selectedState));
  const hasDemoData = demoStates.some(state => normalize(state.name) === normalize(selectedState));
  const stateOptions = Array.from(new Set([...demoStates.map(state => state.name),
    ...(collection?.features.map(feature => normalize(feature.properties.name) === 'delhi' ? 'Delhi' : feature.properties.name) ?? [])])).sort();
  const reset = () => {
    setStateFilter('all'); setEnabled(allStatuses); setSort('inspections');
    setSelectedState('Maharashtra'); setZoom(1);
  };
  let chartOffset = 0;
  const segments = statuses.map(status => {
    const start = chartOffset;
    chartOffset += totals.total ? totals[status.key] / totals.total * 100 : 0;
    return `${status.color} ${start}% ${chartOffset}%`;
  });

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 font-sans">
      <ZenoxNav />
      <main className="india-demo-map w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-orange-300">NATIONAL INSIGHTS</span>
            <span className="map-demo-badge"><Sparkles size={14} aria-hidden="true" /> SIMULATED DEMO DATA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl tracking-tight text-white">India Compliance Map</h1>
          <p className="text-sm text-slate-400">Explore the existing ten-state demonstration dataset.</p>
        </header>
        <aside className="map-panel map-disclosure">
          <strong>Surveillance Modeling Notice:</strong> All metrics on this page are simulated demo data, not actual inspections or national statistics. Only ten states have sample counts. Missing coverage does not mean zero inspections.
        </aside>
        <div className="map-metrics" aria-label="Filtered demo metrics">
          <div className="map-panel"><span>Total demo inspections</span><strong data-testid="map-total">{number(totals.total)}</strong></div>
          {statuses.map(status => <div className="map-panel" key={status.key}>
            <span>{status.label}</span><strong style={{ color: status.color }} data-testid={`map-${status.key}`}>{number(totals[status.key])}</strong>
            <small>{rate(totals[status.key], totals.total)} of filtered inspections</small>
          </div>)}
        </div>
        <div className="map-workspace">
          <section className="map-panel space-y-5" aria-labelledby="map-filter-heading">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 id="map-filter-heading"><Filter size={16} aria-hidden="true" /> Filters</h2>
              <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Reset all</button>
            </div>
            <label className="map-field" htmlFor="map-state-filter">State coverage
              <select id="map-state-filter" value={stateFilter} onChange={event => {
                setStateFilter(event.target.value);
                if (event.target.value !== 'all') setSelectedState(event.target.value);
              }}>
                <option value="all">All demo states</option>
                {demoStates.map(state => <option key={state.name}>{state.name}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="mb-2 text-sm text-slate-300">Inspection status</legend>
              {statuses.map(status => <label className="map-checkbox" key={status.key}>
                <input type="checkbox" checked={enabled[status.key]} onChange={event => setEnabled(previous => ({ ...previous, [status.key]: event.target.checked }))} />
                {status.label}
              </label>)}
            </fieldset>
            <p className="text-sm text-slate-400">Filters update immediately. This aggregate dataset has no dates, product categories, declaration types, or district counts, so those breakdowns are unavailable.</p>
            <p role="status" className="text-sm text-orange-200">{number(totals.total)} matching demo inspections across {filteredStates.length} sample states.</p>
          </section>
          <section className="map-panel space-y-4" aria-labelledby="map-boundary-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="map-boundary-heading">State boundaries</h2>
              <div className="flex items-center gap-1" aria-label="Map zoom controls">
                <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, +(value + 0.2).toFixed(1)))}><Plus size={18} /></button>
                <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
                <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, +(value - 0.2).toFixed(1)))}><Minus size={18} /></button>
                <button type="button" aria-label="Reset map zoom" onClick={() => setZoom(1)}><RotateCcw size={16} /></button>
              </div>
            </div>
            <label className="map-field" htmlFor="map-selected-state">Inspect a state (does not change filters)
              <select id="map-selected-state" value={selectedState} onChange={event => setSelectedState(event.target.value)}>
                {stateOptions.map(name => <option key={name}>{name}</option>)}
              </select>
            </label>
            {geoStatus === 'ready' ? <div className="map-viewport" tabIndex={0} role="region" aria-label="Scrollable state map; use arrow keys or touch to pan when zoomed">
              <svg viewBox="0 0 800 800" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} aria-label="India demo state coverage">
                <title>India state boundaries. Select a state for its filtered demo counts.</title>
                {projectedFeatures.map(({ feature, d }) => {
                  const name = normalize(feature.properties.name) === 'delhi' ? 'Delhi' : feature.properties.name;
                  const item = filteredStates.find(state => normalize(state.name) === normalize(name));
                  const isSelected = normalize(selectedState) === normalize(name);
                  return <path key={feature.properties.state_lgd} d={d} fillRule="evenodd" role="button" tabIndex={0}
                    aria-label={`${name}: ${item ? `${item.total} matching demo inspections` : 'no data in current scope'}`}
                    aria-pressed={isSelected} className={isSelected ? 'map-state selected' : 'map-state'}
                    style={{ fill: item?.total ? `rgba(251, 146, 60, ${0.2 + 0.65 * item.total / Math.max(...filteredStates.map(state => state.total), 1)})` : '#172033' }}
                    onClick={() => setSelectedState(name)} onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedState(name); }
                    }}><title>{name}</title></path>;
                })}
              </svg>
            </div> : <div className="map-fallback" role="status">
              <p>{geoStatus === 'loading' ? 'Loading state boundaries…' : 'State boundaries are unavailable. Use the state selector or summary table to explore demo data.'}</p>
              {geoStatus === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry map boundaries</button>}
            </div>}
            <p className="text-xs text-slate-400">Orange intensity: relative filtered demo inspection count. Dark: no matching sample count. White outline: selected state. Zoomed map supports touch scrolling.</p>
            <div className="map-selection" aria-live="polite">
              <h3>{selectedState}</h3>
              {selected ? <><p>{number(selected.total)} matching demo inspections · {rate(selected.compliant, selected.total)} compliant</p>
                <ul>{statuses.map(status => <li key={status.key}>{status.label}: {number(selected[status.key])}</li>)}</ul></>
                : <p>{hasDemoData ? 'This state is outside the current state filter.' : 'No demo inspection data is available for this state.'}</p>}
            </div>
          </section>
          <section className="map-panel space-y-4" aria-labelledby="map-summary-heading">
            <h2 id="map-summary-heading">State-wise demo summary</h2>
            <label className="map-field" htmlFor="map-sort">Sort states
              <select id="map-sort" value={sort} onChange={event => setSort(event.target.value)}>
                <option value="inspections">Inspections (highest first)</option>
                <option value="compliance">Compliance % (highest first)</option>
              </select>
            </label>
            <p className="text-xs text-slate-400">Compliance = compliant / filtered inspections. — means no matching inspections.</p>
            <div className="map-table-scroll">
              <table><caption className="sr-only">Filtered demo counts by state. Select a state to inspect its status breakdown.</caption>
                <thead><tr><th scope="col">State</th><th scope="col">Inspections</th><th scope="col">Compliance</th></tr></thead>
                <tbody>{rows.map(state => <tr key={state.name} className={normalize(state.name) === normalize(selectedState) ? 'selected' : ''}>
                  <th scope="row"><button type="button" aria-pressed={normalize(state.name) === normalize(selectedState)} onClick={() => setSelectedState(state.name)}>{state.name}</button></th>
                  <td>{number(state.total)}</td><td>{rate(state.compliant, state.total)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            {!totals.total && <p role="status">No demo inspections match these filters. Select an inspection status or reset all.</p>}
          </section>
        </div>
        <section className="map-panel space-y-4" aria-labelledby="map-chart-heading">
          <h2 id="map-chart-heading">Inspection status categories · filtered demo data</h2>
          <p className="text-sm text-slate-400">The chart and state table use the same filtered counts. Issue/declaration category data is not available.</p>
          <div className="map-chart-layout">
            <div className="map-donut" aria-hidden="true" style={{ background: totals.total ? `conic-gradient(${segments.join(',')})` : '#334155' }}><span>{number(totals.total)}<small>demo inspections</small></span></div>
            <ul className="map-chart-legend">{statuses.map(status => <li key={status.key}>
              <span className="map-dot" style={{ background: status.color }} aria-hidden="true" />
              <span>{status.label}</span><strong>{number(totals[status.key])} ({rate(totals[status.key], totals.total)})</strong>
            </li>)}</ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default IndiaComplianceMap;

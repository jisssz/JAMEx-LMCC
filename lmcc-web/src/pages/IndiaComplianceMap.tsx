import React, { useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';

const states = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];

export const IndiaComplianceMap: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => states.filter(state => state.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="min-h-screen bg-[#06080e] text-slate-100"><ZenoxNav/><main className="mx-auto max-w-6xl space-y-6 px-5 py-10">
    <div><p className="text-xs uppercase tracking-[.2em] text-cyan-300">Geographic overview</p><h1 className="mt-2 font-display text-4xl">India compliance map</h1><p className="mt-3 max-w-2xl text-sm text-slate-400">Explore state and union territory selections. Inspection records do not currently contain jurisdiction fields, so no geographic counts are shown.</p></div>
    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[.07] p-4 text-sm text-amber-100"><strong>Map data unavailable.</strong> Licensed state boundary geometry could not be loaded in this build environment. The list below is for navigation only; no illustrative counts or fabricated map shapes are shown.</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><section className="flex min-h-[26rem] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0b101b] p-8 text-center"><MapPin className="h-10 w-10 text-cyan-300"/><h2 className="mt-4 text-lg font-medium">{selected || 'Select a state or union territory'}</h2><p className="mt-2 max-w-md text-sm text-slate-400">{selected ? 'No inspection data is mapped to this jurisdiction yet.' : 'Boundary geometry and state-level data will appear here when verified sources are available.'}</p></section><aside className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"><Search className="h-4 w-4 text-slate-400"/><input aria-label="Search states and union territories" className="w-full bg-transparent text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="mt-3 max-h-[24rem] space-y-1 overflow-auto">{filtered.map(state=><button key={state} onClick={()=>setSelected(state)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selected===state?'bg-cyan-500/15 text-cyan-100':'text-slate-300 hover:bg-white/[.05]'}`}>{state}</button>)}{filtered.length===0&&<p className="p-3 text-sm text-slate-500">No matching locations.</p>}</div></aside></div>
  </main></div>;
};

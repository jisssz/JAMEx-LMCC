import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, ScanLine } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { getReports, ReportRead } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';
import { Button } from '../components/ui/button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRead[]>([]);
  const [localCount, setLocalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getReports(100).catch(() => [] as ReportRead[]), getLocalReports().catch(() => [] as LocalReport[])])
      .then(([server, local]) => {
        if (!active) return;
        setReports(server);
        setLocalCount(local.filter((item) => item.syncStatus !== 'synced').length);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reviewed = reports.filter((item) => item.verdict === 'PASS').length;
  const needsReview = reports.filter((item) => item.verdict !== 'PASS').length;
  const metrics = [
    { label: 'Latest reports loaded', value: reports.length, Icon: ClipboardList, tone: 'text-violet-300' },
    { label: 'Screened clear', value: reviewed, Icon: CheckCircle2, tone: 'text-emerald-300' },
    { label: 'Needs review', value: needsReview, Icon: AlertTriangle, tone: 'text-amber-300' },
    { label: 'Waiting to sync', value: localCount, Icon: Activity, tone: 'text-cyan-300' },
  ];

  return <div className="min-h-screen bg-[#06080e] text-slate-100 pb-16">
    <ZenoxNav />
    <main className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs uppercase tracking-[.2em] text-amber-300">Inspection workspace</p><h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Dashboard</h1><p className="mt-3 text-slate-400">Your saved package screenings and next steps.</p></div>
        <Button onClick={() => navigate('/scan')} className="rounded-full px-6"><ScanLine className="mr-2 h-4 w-4"/>Scan product <ArrowRight className="ml-2 h-4 w-4"/></Button>
      </div>
      <p className="mt-7 rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs leading-relaxed text-slate-400">Report cards and summary counts use up to the latest 100 reports returned by the server. Locally queued reports are shown in the sync count. Screening results are aids for review, not official legal determinations. National map and authority surveillance figures are illustrative demo data.</p>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Saved inspection summary">
        {metrics.map(({label, value, Icon, tone}) => <article key={label} className="rounded-2xl border border-white/[.08] bg-[#0b101b] p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon className={`h-5 w-5 ${tone}`}/></div><p className="mt-4 text-3xl font-semibold text-white">{loading ? '—' : value}</p></article>)}
      </section>
      <section className="mt-7 rounded-2xl border border-white/[.08] bg-[#0b101b] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Recent saved reports</h2><p className="mt-1 text-sm text-slate-400">Only submitted reports appear here. New scans are kept on device until you save a report.</p></div><Button variant="glass" onClick={() => navigate('/reports')}>View reports <ArrowRight className="ml-2 h-4 w-4"/></Button></div>
        {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading saved reports…</p> : reports.length ? <div className="mt-5 divide-y divide-white/[.06]">{reports.slice(0,5).map((report) => <button key={report.id} onClick={() => navigate(`/history/${report.id}`)} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-white/[.025]"><span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{report.productName || 'Package inspection'}</span><span className="mt-1 block text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()} · {report.netQuantity || 'Quantity not recorded'}</span></span><span className={`shrink-0 rounded-full px-3 py-1 text-xs ${report.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{report.verdict === 'PASS' ? 'Screened clear' : 'Review'}</span></button>)}</div> : <div className="py-12 text-center"><p className="text-sm text-slate-300">No saved reports yet.</p><p className="mt-2 text-xs text-slate-500">Run a product scan, review the findings, then save a report to build your history.</p><Button variant="glass" onClick={() => navigate('/scan')} className="mt-5">Start a scan <ArrowRight className="ml-2 h-4 w-4"/></Button></div>}
      </section>
      <div className="mt-6 flex flex-wrap gap-3"><Button variant="glass" onClick={() => navigate('/history')}>Inspection history</Button><Button variant="glass" onClick={() => navigate('/authority-dashboard')}>Demo surveillance dashboard</Button></div>
    </main>
  </div>;
};

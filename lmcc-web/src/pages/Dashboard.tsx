import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, ScanLine } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { getReports, ReportRead } from '../services/api';
import { getLocalReports } from '../services/storage/localReports';
import { Button } from '../components/ui/button';
import './reference-workspace.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRead[]>([]);
  const [localCount, setLocalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [localError, setLocalError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setServerError(false);
    setLocalError(false);
    Promise.allSettled([getReports(100), getLocalReports()]).then(([server, local]) => {
      if (!active) return;
      setServerError(server.status === 'rejected');
      setLocalError(local.status === 'rejected');
      setReports(server.status === 'fulfilled' ? server.value : []);
      setLocalCount(local.status === 'fulfilled' ? local.value.filter(item => item.syncStatus !== 'synced').length : 0);
      setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  const metrics = [
    { label: 'Reports loaded', value: reports.length, Icon: ClipboardList, unavailable: serverError },
    { label: 'Screened clear', value: reports.filter(item => item.verdict === 'PASS').length, Icon: CheckCircle2, unavailable: serverError },
    { label: 'Needs review', value: reports.filter(item => item.verdict !== 'PASS').length, Icon: AlertTriangle, unavailable: serverError },
    { label: 'Waiting to sync', value: localCount, Icon: Activity, unavailable: localError },
  ];

  return <div className="reference-workspace dashboard-workspace min-h-screen text-slate-100">
    <ZenoxNav />
    <main className="reference-main">
      <header className="reference-header">
        <div><p className="reference-eyebrow">Inspection workspace</p><h1>Dashboard</h1><p className="text-sm text-slate-400">Saved screenings. Clear next steps.</p></div>
        <Button onClick={() => navigate('/scan')} className="reference-primary"><ScanLine className="mr-2 h-4 w-4"/>Scan product <ArrowRight className="ml-2 h-4 w-4"/></Button>
      </header>
      <p className="my-5 text-xs leading-relaxed text-slate-400">Latest 100 server reports · Device queue counted separately · Screening supports human review.</p>
      {(serverError || localError) && <div role="alert" className="reference-notice"><p>{serverError ? 'Saved reports could not be loaded. Counts are unavailable, not zero.' : 'The device queue could not be read. Server reports are still shown.'}{serverError && localError ? ' The device queue is also unavailable.' : ''}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Retry loading</Button></div>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Saved inspection summary" aria-busy={loading}>
        {metrics.map(({ label, value, Icon, unavailable }) => <article key={label} className="reference-panel p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-400">{label}</span><Icon aria-hidden="true" className="h-4 w-4 text-violet-300"/></div><p className={`mt-4 font-medium tabular-nums ${unavailable ? 'text-lg text-slate-400' : 'text-3xl text-white'}`}>{loading ? '—' : unavailable ? 'Unavailable' : value}</p></article>)}
      </section>
      <section className="reference-panel mt-5 p-5 sm:p-6" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Recent reports</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">Submitted reports only. New scans stay on device until you save a report.</p></div><Button variant="outline" onClick={() => navigate('/reports')}>View reports <ArrowRight className="ml-2 h-4 w-4"/></Button></div>
        {loading ? <p role="status" className="reference-empty">Loading saved reports…</p> : serverError ? <p className="reference-empty">Report history is temporarily unavailable. Retry loading above.</p> : reports.length ? <div className="mt-5 divide-y divide-white/[.08]">{reports.slice(0, 5).map(report => <button key={report.id} onClick={() => navigate(`/history/${report.id}`)} className="report-record"><span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{report.productName || 'Package inspection'}</span><span className="mt-1 block text-xs text-slate-400">{new Date(report.createdAt).toLocaleString()} · {report.netQuantity || 'Quantity not recorded'}</span></span><span className={`shrink-0 rounded-full px-3 py-1 text-xs ${report.verdict === 'PASS' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{report.verdict === 'PASS' ? 'Screened clear' : 'Review'}</span><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/></button>)}</div> : <div className="reference-empty"><ClipboardList aria-hidden="true" className="mx-auto mb-4 h-7 w-7 text-violet-300"/><h2>No saved reports yet</h2><p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">Scan a package, review the findings, then save a report to build your history.</p>{localCount > 0 && <p className="mt-3 text-xs text-violet-300">{localCount} device report{localCount === 1 ? '' : 's'} waiting to sync.</p>}<Button onClick={() => navigate('/scan')} className="reference-primary mt-5">Start a scan <ArrowRight className="ml-2 h-4 w-4"/></Button></div>}
      </section>
      <div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => navigate('/history')}>Inspection history</Button><Button variant="outline" onClick={() => navigate('/rules')}>Rule reference</Button><Button variant="ghost" onClick={() => navigate('/authority-dashboard')}>Demo surveillance dashboard <ArrowRight className="ml-2 h-4 w-4"/></Button></div>
    </main>
  </div>;
};

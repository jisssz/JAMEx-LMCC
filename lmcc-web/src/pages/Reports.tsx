import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, Download, FileText, LoaderCircle, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { getReports, ReportRead } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';
import { exportInspectionReportCsv, exportInspectionReportPdf } from '../services/export/reportExporter';
import './records-workspace.css';

type ReportRow = {
  id: string;
  createdAt: string;
  verdict: string;
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  dateDeclaration?: string;
  consumerCare?: string;
  issueCount: number;
  issues: ReportRead['issues'];
  rawOcr?: string;
  userRemarks?: string;
  local: boolean;
};

function fromLocal(report: LocalReport): ReportRow {
  const payload = report.payload;
  return {
    id: report.localId,
    createdAt: report.createdAt,
    verdict: payload.verdict,
    productName: payload.productName,
    mrp: payload.mrp,
    netQuantity: payload.netQuantity,
    manufacturer: payload.manufacturer,
    dateDeclaration: payload.dateDeclaration,
    consumerCare: payload.consumerCare,
    issueCount: payload.issueCount ?? payload.issues?.length ?? 0,
    issues: payload.issues ?? [],
    rawOcr: payload.rawOcr,
    userRemarks: payload.userRemarks,
    local: true,
  };
}

function fromServer(report: ReportRead): ReportRow {
  return { ...report, local: false };
}

const fmtDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'PDF' | 'CSV'>('PDF');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const localPromise = getLocalReports().catch(() => [] as LocalReport[]);
    try {
      const [server, local] = await Promise.all([getReports(100), localPromise]);
      const serverRows = server.map(fromServer);
      const serverIds = new Set(server.map((item) => item.id));
      const localRows = local
        .filter((item) => !item.serverId || !serverIds.has(item.serverId))
        .map(fromLocal);
      const merged = [...localRows, ...serverRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRows(merged);
      setSelectedId((current) => current && merged.some((row) => row.id === current) ? current : merged[0]?.id ?? null);
    } catch (cause) {
      const local = await localPromise;
      const localRows = local.map(fromLocal);
      setRows(localRows);
      setSelectedId((current) => current && localRows.some((row) => row.id === current) ? current : localRows[0]?.id ?? null);
      setError(localRows.length ? 'Showing reports saved on this device. Server reports are unavailable.' : cause instanceof Error ? cause.message : 'Unable to load saved reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesStatus = status === 'ALL' || row.verdict === status;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [row.id, row.productName, row.manufacturer, row.mrp].some((v) => v?.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  }), [rows, search, status]);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const exportData = (row: ReportRow) => ({
    reportId: row.id,
    timestamp: row.createdAt,
    verdict: { overallStatus: row.verdict === 'PASS' ? 'PASS' as const : 'REVIEW' as const, details: row.issues },
    extractedLabel: {
      mrp: row.mrp,
      netQuantityRaw: row.netQuantity,
      manufacturer: row.manufacturer,
      datesRaw: row.dateDeclaration,
      consumerCareRaw: row.consumerCare,
    },
    productName: row.productName || 'Unspecified product',
    userRemarks: row.userRemarks,
    rawOcr: row.rawOcr,
  });

  const download = () => {
    if (!selected) return;
    const data = exportData(selected);
    if (format === 'PDF') exportInspectionReportPdf(data);
    else exportInspectionReportCsv(data);
  };

  const counts = useMemo(() => ({
    total: rows.length,
    pass: rows.filter((row) => row.verdict === 'PASS').length,
    review: rows.filter((row) => row.verdict !== 'PASS').length,
  }), [rows]);

  return (
    <div className="records-workspace min-h-screen bg-[#06080e] text-slate-100">
      <ZenoxNav />
      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-8 sm:px-7 lg:px-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.06] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-orange-300"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />Report center</div>
            <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">Inspection reports</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">Review and export saved screening records and their source declarations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.07]"><RefreshCw className="h-4 w-4" />Refresh</button>
            <button onClick={() => navigate('/scan')} className="rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(251,126,37,.2)]">New scan <span aria-hidden>→</span></button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Saved records', value: counts.total, icon: FileText, color: 'text-violet-300' },
            { label: 'Screened as PASS', value: counts.pass, icon: CheckCircle2, color: 'text-emerald-300' },
            { label: 'Needs review', value: counts.review, icon: ShieldAlert, color: 'text-orange-300' },
          ].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-[#0b101c]/80 p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{stat.label}</span><stat.icon className={`h-4 w-4 ${stat.color}`} /></div><div className="mt-2 text-2xl font-semibold">{stat.value}</div></div>)}
        </div>

        {error && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/[0.06] px-4 py-3 text-sm text-orange-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

        <div className="reports-desktop-workspace">
          <section className="report-configuration records-panel" aria-labelledby="configuration-title">
            <p className="records-eyebrow">Export workspace</p>
            <h2 id="configuration-title" className="mt-2 font-semibold">Report configuration</h2>
            <p className="mt-2 text-sm text-slate-400">Choose a saved inspection, preview its evidence, and export a copy.</p>
            <label className="mt-6 block text-xs text-slate-300" htmlFor="workspace-format">Document format</label>
            <select id="workspace-format" value={format} onChange={(e) => setFormat(e.target.value as 'PDF' | 'CSV')} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"><option value="PDF">PDF document</option><option value="CSV">CSV spreadsheet</option></select>
            <p className="mt-3 text-xs text-slate-400">{format === 'PDF' ? 'Readable inspection document with saved findings.' : 'Tabular inspection data for spreadsheet review.'}</p>
            <button onClick={download} disabled={!selected || loading} className="records-primary mt-5 w-full"><Download className="h-4 w-4" />Export {format}</button>
            <div className="mt-6 border-t border-white/10 pt-4"><p className="records-eyebrow">Selected record</p><p className="mt-2 text-sm break-words">{selected?.productName || (selected ? 'Unspecified product' : 'No record selected')}</p><p className="mt-1 break-all text-xs text-slate-400">{selected?.id || 'Select a record from the inspection list.'}</p></div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090e18]/90">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-4">
              <div><h2 className="font-semibold">Saved inspections</h2><p className="mt-1 text-xs text-slate-500">Records are loaded from your reporting service and this device.</p></div>
              <div className="flex gap-2">
                 <label className="relative"><span className="sr-only">Search saved records</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved records" className="w-48 rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-400/50" /></label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by screening status" className="rounded-xl border border-white/10 bg-[#0b101c] px-3 text-xs text-slate-300 outline-none"><option value="ALL">All statuses</option><option value="PASS">PASS</option><option value="REVIEW">Review</option></select>
              </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Loading saved reports…</div> : filtered.length ? filtered.map((row) => {
                const active = row.id === selectedId;
                 return <button key={row.id} aria-pressed={active} onClick={() => setSelectedId(row.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-left transition hover:bg-white/[0.035] ${active ? 'bg-orange-400/[0.06] ring-1 ring-inset ring-orange-400/50' : ''}`}>
                  <span className="min-w-0"><span className="flex items-center gap-2 truncate text-sm font-medium text-slate-100">{row.productName || 'Unspecified product'}{row.local && <span className="rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-violet-300">This device</span>}</span><span className="mt-1 block truncate text-xs text-slate-400">{row.netQuantity || 'Quantity not recorded'}{row.mrp ? ` · ${row.mrp}` : ''}{row.manufacturer ? ` · ${row.manufacturer}` : ''}</span><span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" />{fmtDate(row.createdAt)}</span></span>
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${row.verdict === 'PASS' ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300' : 'border-orange-400/20 bg-orange-400/[0.07] text-orange-300'}`}>{row.verdict === 'PASS' ? 'Screened PASS' : 'Needs review'}</span>
                </button>;
              }) : <div className="p-12 text-center"><FileText className="mx-auto h-8 w-8 text-slate-600" /><h3 className="mt-3 font-medium">{rows.length ? 'No records match these filters' : 'No saved reports yet'}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{rows.length ? 'Try another search or status.' : 'Complete a product screening and save its record to see it here.'}</p>{!rows.length && <button onClick={() => navigate('/scan')} className="mt-4 rounded-xl bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950">Start a scan</button>}</div>}
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090e18]/90">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-4"><div><h2 className="font-semibold">Report preview</h2><p className="mt-1 text-xs text-slate-500">Evidence from the selected saved record</p></div><FileText className="h-5 w-5 text-violet-300" /></div>
            {selected ? <div className="p-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0d1320] p-4">
                <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500">Screening record</div><h3 className="mt-1 text-lg font-semibold">{selected.productName || 'Unspecified product'}</h3><div className="mt-1 break-all text-[11px] text-slate-500">ID · {selected.id}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${selected.verdict === 'PASS' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-orange-400/10 text-orange-300'}`}>{selected.verdict === 'PASS' ? 'Screened PASS' : 'Needs review'}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.06] pt-4 text-xs">
                  {[
                    ['Net quantity', selected.netQuantity], ['MRP', selected.mrp], ['Manufacturer / packer', selected.manufacturer], ['Date declaration', selected.dateDeclaration], ['Consumer care', selected.consumerCare], ['Recorded', fmtDate(selected.createdAt)],
                  ].map(([label, value]) => <div key={label}><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 break-words text-slate-200">{value || 'Not recorded'}</div></div>)}
                </div>
                <div className="mt-4 border-t border-white/[0.06] pt-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Screening findings ({selected.issues.length || selected.issueCount})</div>{selected.issues.length ? <ul className="mt-2 space-y-2">{selected.issues.map((issue, index) => <li key={`${issue.ruleId}-${index}`} className="rounded-lg bg-white/[0.03] px-3 py-2"><div className="text-xs font-medium text-slate-200">{issue.title || issue.field}</div><div className="mt-1 text-[11px] leading-relaxed text-slate-400">{issue.explanation}</div></li>)}</ul> : <p className="mt-2 text-xs text-slate-400">No structured findings were saved with this record.</p>}</div>
                {selected.rawOcr && <details className="mt-3 border-t border-white/[0.06] pt-3"><summary className="cursor-pointer text-xs text-slate-300">View saved extracted text</summary><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] text-slate-400">{selected.rawOcr}</pre></details>}
                <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-slate-500">Advisory screening record. This automated label screening is not an official legal compliance determination.</p>
              </div>
              <div className="mt-3 flex items-center gap-2"><label className="sr-only" htmlFor="report-format">Export format</label><select id="report-format" value={format} onChange={(e) => setFormat(e.target.value as 'PDF' | 'CSV')} className="flex-1 rounded-xl border border-white/10 bg-[#0b101c] px-3 py-3 text-sm outline-none"><option value="PDF">PDF document</option><option value="CSV">CSV spreadsheet</option></select><button onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 px-4 py-3 text-sm font-semibold text-slate-950"><Download className="h-4 w-4" />Download</button></div>
              <button onClick={() => navigate(`/history/${encodeURIComponent(selected.id)}`)} className="mt-2 w-full rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04]">Open full record details <span aria-hidden>→</span></button>
            </div> : <div className="p-10 text-center text-sm text-slate-500">Select a saved report to preview it.</div>}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Reports;

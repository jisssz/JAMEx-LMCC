import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { getReports, ReportRead } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';
import './saved-records.css';

export type SavedRecord = ReportRead & { source: string };

// Prefer server copies by acknowledgement or client id; retain local copies
// when the server is unavailable or the record falls outside its recent window.
export function mergeSavedRecords(server: ReportRead[], local: LocalReport[]): SavedRecord[] {
  const ids = new Set<string>();
  const clientIds = new Set<string>();
  const result: SavedRecord[] = [];
  for (const report of server) {
    if (ids.has(report.id) || (report.localReportId && clientIds.has(report.localReportId))) continue;
    ids.add(report.id);
    if (report.localReportId) clientIds.add(report.localReportId);
    result.push({ ...report, source: 'Server' });
  }
  for (const report of local) {
    const clientId = report.payload.localReportId || report.localId;
    if ((report.serverId && ids.has(report.serverId)) || clientIds.has(clientId) || clientIds.has(report.localId)) continue;
    clientIds.add(clientId);
    clientIds.add(report.localId);
    if (report.serverId) ids.add(report.serverId);
    result.push({ ...report.payload, id: report.serverId || report.localId, createdAt: report.createdAt,
      issueCount: report.payload.issueCount ?? report.payload.issues.length,
      source: report.syncStatus === 'synced' ? 'Saved on device · synced' : report.syncStatus === 'failed' ? 'Saved on device · sync failed' : 'Saved on device · pending sync' });
  }
  return result.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export function useSavedRecords() {
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([getReports(100), getLocalReports()]).then(([server, local]) => {
      if (!active) return;
      setRecords(mergeSavedRecords(server.status === 'fulfilled' ? server.value : [], local.status === 'fulfilled' ? local.value : []));
      setErrors([
        ...(server.status === 'rejected' ? ['Server unavailable. Only accessible device records are shown.'] : []),
        ...(local.status === 'rejected' ? ['Device records could not be read.'] : []),
      ]);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return { records, loading, errors };
}

export function recordStatus(verdict: string) {
  return verdict === 'PASS' ? 'Compliant' : verdict === 'REVIEW' ? 'Needs review' : 'Unknown verdict';
}

export function recordDate(value: string) {
  return Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-GB') : 'Date not recorded';
}

export function withinPeriod(record: SavedRecord, days: string) {
  if (days === 'all') return true;
  const age = Date.now() - Date.parse(record.createdAt);
  return age >= 0 && age <= Number(days) * 86400000;
}

export const History: React.FC = () => {
  const { records, loading, errors } = useSavedRecords();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => records.filter(record =>
    [record.productName, record.manufacturer, record.id].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())) &&
    (status === 'all' || record.verdict === status) && withinPeriod(record, period)
  ), [records, query, status, period]);
  const pages = Math.ceil(filtered.length / 8);
  const currentPage = Math.min(page, Math.max(1, pages));
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const selected = visible.find(record => record.id === selectedId);
  const reset = () => { setPage(1); setSelectedId(null); };

  return <div className="min-h-screen bg-[#06080e] text-slate-100">
    <ZenoxNav />
    <main className="saved-records">
      <header><p className="eyebrow">INSPECTION HISTORY</p><h1>Past Inspections</h1><p>Search saved inspections and review their recorded declarations.</p></header>
      <p role="status">{loading ? 'Loading saved records…' : `${records.length} accessible saved records. Includes up to 100 recent server reports and device records.`}</p>
      {errors.map(error => <p className="availability" key={error} role="status">{error}</p>)}
      <div className="record-filters">
        <label>Search inspections<input type="search" value={query} onChange={event => { setQuery(event.target.value); reset(); }} placeholder="Product, manufacturer or full ID" /></label>
        <label>Status<select value={status} onChange={event => { setStatus(event.target.value); reset(); }}><option value="all">All statuses</option><option value="PASS">Compliant</option><option value="REVIEW">Needs review</option></select></label>
        <label>Time period<select value={period} onChange={event => { setPeriod(event.target.value); reset(); }}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
      </div>
      <section className="record-panel" aria-label="Saved inspections">
        <div className="record-scroll" role="region" aria-label="Inspection table, scroll horizontally for more columns" tabIndex={0}>
          <table><thead><tr><th scope="col">Product</th><th scope="col">Declarations</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Details</th></tr></thead>
            <tbody>{visible.map(record => <tr key={record.id} aria-selected={selected?.id === record.id}>
              <td>{record.productName || 'Product name not recorded'}<small>{record.id}</small></td>
              <td>MRP: {record.mrp || 'Not recorded'}<small>Net quantity: {record.netQuantity || 'Not recorded'}</small></td>
              <td>{recordStatus(record.verdict)}</td><td>{recordDate(record.createdAt)}</td><td>{record.source}</td>
              <td><button onClick={() => setSelectedId(record.id)} aria-label={`View details for ${record.productName || record.id}`}>View details</button></td>
            </tr>)}</tbody></table>
        </div>
        {!loading && !filtered.length && <p className="record-empty">{records.length ? 'No inspections match your filters.' : errors.length ? 'No saved records are accessible right now.' : 'No saved inspections yet.'}</p>}
        <footer className="record-pagination"><span>{filtered.length ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)}` : '0'} of {filtered.length} matching records</span>
          {pages > 1 && <div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelectedId(null); }}><ChevronLeft size={16} /></button><span>Page {currentPage} of {pages}</span><button aria-label="Next page" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); setSelectedId(null); }}><ChevronRight size={16} /></button></div>}
        </footer>
      </section>
      {selected && <section className="record-panel record-detail" aria-label="Inspection details">
        <header><h2>Inspection Details</h2><button aria-label="Close inspection details" onClick={() => setSelectedId(null)}><X size={18} /></button></header>
        <h3>{selected.productName || 'Product name not recorded'}</h3><p>{selected.id} · {selected.source}</p>
        <dl>{Object.entries({ Status: recordStatus(selected.verdict), Date: recordDate(selected.createdAt), MRP: selected.mrp, 'Net quantity': selected.netQuantity, 'Manufacturer / packer': selected.manufacturer, 'Date declaration': selected.dateDeclaration, 'Consumer care': selected.consumerCare, Remarks: selected.userRemarks }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
        <h3>Recorded issues</h3>{selected.issues?.length ? <ul>{selected.issues.map((issue, index) => <li key={`${issue.ruleId}-${index}`}><strong>{issue.title}</strong><p>{issue.ruleId} · {issue.severity}</p><p>{issue.explanation}</p>{issue.evidence && <p>Evidence: {issue.evidence}</p>}</li>)}</ul> : <p>No issue details recorded.</p>}
        {selected.rawOcr && <details><summary>Saved OCR text</summary><pre>{selected.rawOcr}</pre></details>}
      </section>}
      <Link className="record-link" to="/scan">Start a new inspection</Link>
    </main>
  </div>;
};

export default History;

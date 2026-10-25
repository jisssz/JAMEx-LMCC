import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ZenoxNav from '../components/ui/ZenoxNav';
import { recordDate, recordStatus, useSavedRecords, withinPeriod } from './History';
import './saved-records.css';

export const Dashboard: React.FC = () => {
  const { records, loading, errors } = useSavedRecords();
  const [period, setPeriod] = useState('30');
  const filtered = records.filter(record => withinPeriod(record, period));
  const metrics = {
    'Saved inspections': filtered.length,
    Compliant: filtered.filter(record => record.verdict === 'PASS').length,
    'Needs review': filtered.filter(record => record.verdict === 'REVIEW').length,
    'Recorded issues': filtered.reduce((sum, record) => sum + (record.issueCount ?? record.issues?.length ?? 0), 0),
  };
  return <div className="min-h-screen bg-[#06080e] text-slate-100">
    <ZenoxNav />
    <main className="saved-records">
      <header><p className="eyebrow">EVIDENCE-LED COMPLIANCE</p><h1>Executive Compliance Dashboard</h1><p>Screening results from your accessible saved inspections.</p></header>
      <div className="record-filters"><label>Time period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></label><Link className="record-link" to="/scan?mode=upload">Upload Image</Link><Link className="record-link" to="/scan">Start Live Scan</Link></div>
      <p role="status">{loading ? 'Loading saved records…' : 'Counts cover up to 100 recent server reports plus device records, deduplicated before filtering. They are not registry-wide totals.'}</p>
      {errors.map(error => <p className="availability" key={error} role="status">{error}</p>)}
      <section className="record-metrics" aria-label="Saved inspection metrics">{Object.entries(metrics).map(([label, value]) => <div className="record-panel" key={label}><strong>{loading ? '—' : value}</strong><span>{label}</span></div>)}</section>
      <section className="record-panel" aria-label="Recent inspections">
        <header className="record-section-header"><div><h2>Recent Inspections</h2><p>Latest saved records in the selected period.</p></div><Link to="/history">View all</Link></header>
        <div className="record-scroll" role="region" aria-label="Recent inspections table, scroll horizontally for more columns" tabIndex={0}>
          <table><thead><tr><th scope="col">Product</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col">Source</th></tr></thead><tbody>{filtered.slice(0, 4).map(record => <tr key={record.id}><td>{record.productName || 'Product name not recorded'}<small>{record.netQuantity || 'Net quantity not recorded'}</small></td><td>{recordStatus(record.verdict)}</td><td>{recordDate(record.createdAt)}</td><td>{record.source}</td></tr>)}</tbody></table>
        </div>
        {!loading && !filtered.length && <p className="record-empty">{records.length ? 'No saved inspections in this period.' : errors.length ? 'No saved records are accessible right now.' : 'No saved inspections yet. Start an inspection to create your first record.'}</p>}
      </section>
      <Link className="record-link" to="/reports">Open Reports Repository</Link>
    </main>
  </div>;
};

export default Dashboard;

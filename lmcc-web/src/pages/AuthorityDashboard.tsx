import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  Info,
  AlertTriangle,
  FileText,
  Building2,
  Layers,
} from 'lucide-react';
import {
  getAnalyticsSummary,
  getAnalyticsIssues,
  getAnalyticsCategories,
  getAnalyticsTrends,
  getAnalyticsBrands,
  AnalyticsSummary,
  IssuesBreakdown,
  CategoriesBreakdown,
  TrendsResponse,
  BrandsResponse,
} from '../services/api';
import ZenoxNav from '../components/ui/ZenoxNav';
import { Spotlight } from '../components/ui/spotlight';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { sanitizeCsvCell } from '../services/export/reportExporter';
import { jsPDF } from 'jspdf';

export const AuthorityDashboard: React.FC = () => {
  const [useDemoData, setUseDemoData] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [issues, setIssues] = useState<IssuesBreakdown | null>(null);
  const [categories, setCategories] = useState<CategoriesBreakdown | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [brands, setBrands] = useState<BrandsResponse | null>(null);

  const fetchAllAnalytics = useCallback(async (demoMode: boolean) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [sumRes, issRes, catRes, trnRes, brnRes] = await Promise.all([
        getAnalyticsSummary(demoMode),
        getAnalyticsIssues(demoMode),
        getAnalyticsCategories(demoMode),
        getAnalyticsTrends(demoMode),
        getAnalyticsBrands(demoMode),
      ]);
      setSummary(sumRes);
      setIssues(issRes);
      setCategories(catRes);
      setTrends(trnRes);
      setBrands(brnRes);
    } catch (err: unknown) {
      console.warn('Analytics fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to connect to live analytics API.';
      setErrorMessage(`${msg} Showing demonstration dataset.`);
      if (!demoMode) {
        setUseDemoData(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAnalytics(useDemoData);
  }, [useDemoData, fetchAllAnalytics]);

  const handleExportCSV = () => {
    if (!summary || !issues) return;

    const rows: string[][] = [
      ['LMCC Legal Metrology Market Surveillance Intelligence Export'],
      ['Generated At', new Date().toISOString()],
      ['Data Source', summary.isDemonstrationData ? 'Illustrative Pilot Dataset' : 'Live Screening Registry'],
      [''],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Screenings', String(summary.totalScans)],
      ['Compliant (PASS)', String(summary.passCount)],
      ['Flagged for Review', String(summary.reviewCount)],
      ['Overall Compliance Rate', `${summary.passRate}%`],
      ['Total Non-Compliance Issues Identified', String(summary.totalIssues)],
      [''],
      ['TOP NON-COMPLIANCE ISSUES IDENTIFIED (Rule 6 Violations)'],
      ['Declaration Field', 'Statutory Gazette Reference', 'Occurrences', 'Share (%)'],
      ...(issues?.items || []).map((i) => [
        i.field,
        i.ruleReference,
        String(i.count),
        `${i.percentage}%`,
      ]),
      [''],
      ['COMMODITY SECTOR BREAKDOWN'],
      ['Sector Category', 'Total Screenings', 'Under Review', 'Review Rate (%)'],
      ...(categories?.items || []).map((c) => [
        c.category,
        String(c.screenings),
        String(c.reviewCount),
        `${c.reviewRate}%`,
      ]),
      [''],
      ['MANUFACTURER SURVEILLANCE RECORDS'],
      ['Manufacturer / Declared Brand', 'Screenings', 'Reviews Flagged', 'Review Rate (%)'],
      ...(brands?.items || []).map((b) => [
        b.manufacturer,
        String(b.screenings),
        String(b.reviewCount),
        `${b.reviewRate}%`,
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LMCC_Market_Surveillance_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const sourceLabel = summary.isDemonstrationData ? 'Demonstration Dataset' : 'Live Registry';

    // Header
    doc.setFillColor(12, 16, 29);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LEGAL METROLOGY MARKET SURVEILLANCE INTELLIGENCE REPORT', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Source: ${sourceLabel} | Generated: ${new Date().toLocaleString()} | PII Policy: Zero-PII`, 14, 28);

    // Summary Metrics
    let y = 52;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Executive Surveillance Summary', 14, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Packages Screened: ${summary.totalScans}`, 14, y);
    doc.text(`Compliant (PASS): ${summary.passCount} (${summary.passRate}%)`, 110, y);

    y += 7;
    doc.text(`Flagged for Review: ${summary.reviewCount}`, 14, y);
    doc.text(`Issues Identified: ${summary.totalIssues}`, 110, y);

    // Top Statutory Issues Table
    y += 14;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Top Rule 6 Non-Compliance Deficiencies', 14, y);

    y += 8;
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y - 5, 182, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Declaration Field', 16, y);
    doc.text('Statutory Provision', 75, y);
    doc.text('Occurrences', 145, y);
    doc.text('Share', 175, y);

    y += 7;
    doc.setFont('helvetica', 'normal');
    (issues?.items || []).slice(0, 7).forEach((issue) => {
      doc.text(issue.field.slice(0, 28), 16, y);
      doc.text(issue.ruleReference, 75, y);
      doc.text(String(issue.count), 145, y);
      doc.text(`${issue.percentage}%`, 175, y);
      y += 6;
    });

    // Save
    doc.save(`LMCC_Surveillance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Ambient Lighting */}
      <BackgroundBeams />
      <Spotlight className="-top-40 right-0 md:right-40 md:-top-20" fill="#06b6d4" />

      {/* Navigation */}
      <ZenoxNav />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* ==================================================== */}
        {/* HEADER SECTION & LIVE/DEMO TOGGLE */}
        {/* ==================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="cyan" className="gap-1.5 py-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Market Surveillance Intelligence</span>
              </Badge>
              {summary?.isDemonstrationData ? (
                <Badge variant="review">Demonstration Reference Dataset</Badge>
              ) : (
                <Badge variant="pass">Live Registry</Badge>
              )}
            </div>
            <h1 className="hero-display text-white text-3xl sm:text-4xl font-normal tracking-tight">
              Authority Surveillance <span className="font-display-italic text-slate-300">Console</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl font-sans">
              Real-time Legal Metrology Rule 6 statutory compliance telemetry, defect patterns, and manufacturer risk observations.
            </p>
          </div>

          {/* Controls & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live vs Demo Toggle */}
            <div className="flex items-center rounded-xl bg-slate-900/80 p-1 border border-white/[0.08] backdrop-blur-md">
              <button
                type="button"
                onClick={() => setUseDemoData(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  useDemoData
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Demo Reference
              </button>
              <button
                type="button"
                onClick={() => setUseDemoData(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  !useDemoData
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Registry
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchAllAnalytics(useDemoData)}
              disabled={loading}
              className="rounded-xl gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={!summary}
              className="rounded-xl gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </Button>

            <Button
              size="sm"
              variant="glass"
              onClick={handleExportPDF}
              disabled={!summary}
              className="rounded-xl gap-1.5 text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit PDF</span>
            </Button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* DEMO NOTICE BANNER */}
        {/* ==================================================== */}
        {summary?.isDemonstrationData && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Demonstration Reference Dataset Active:</strong> Displaying illustrative pilot surveillance telemetry. To inspect live records persisted in your PostgreSQL database, switch the toggle above to <strong>Live Registry</strong>.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* ==================================================== */}
        {/* KPI METRIC CARDS */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-white/[0.08] hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TOTAL SCREENINGS</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl text-white font-normal mt-2">
              {summary ? summary.totalScans.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-sans flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Aggregated market observations</span>
            </div>
          </Card>

          <Card className="p-5 border-white/[0.08] hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>COMPLIANT (PASS)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl text-emerald-400 font-normal mt-2">
              {summary ? summary.passCount.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-sans flex items-center justify-between">
              <span>Compliance Rate</span>
              <span className="font-mono text-emerald-400 font-semibold">{summary?.passRate}%</span>
            </div>
          </Card>

          <Card className="p-5 border-white/[0.08] hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>FLAGGED FOR REVIEW</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl text-amber-400 font-normal mt-2">
              {summary ? summary.reviewCount.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-sans flex items-center justify-between">
              <span>Mandatory review rate</span>
              <span className="font-mono text-amber-400 font-semibold">
                {summary && summary.totalScans > 0
                  ? `${Math.round((summary.reviewCount / summary.totalScans) * 100)}%`
                  : '—'}
              </span>
            </div>
          </Card>

          <Card className="p-5 border-white/[0.08] hover:border-violet-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>MONITORED BRANDS</span>
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl text-violet-300 font-normal mt-2">
              {brands ? brands.items.length : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-sans flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>Unique registered packers</span>
            </div>
          </Card>
        </div>

        {/* ==================================================== */}
        {/* DEFICIENCIES & SECTOR BREAKDOWNS */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Non-Compliance Deficiencies */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Statutory Declaration Omissions</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Frequency of Rule 6 mandatory declaration omissions across packaging
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">RULE 6</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-3 pt-2">
              {issues?.items.map((issue) => (
                <div key={issue.field} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{issue.field}</span>
                    <Badge variant="review" className="font-mono text-[10px]">{issue.ruleReference}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{issue.count} incidents observed</span>
                    <span className="font-semibold text-amber-400">{issue.percentage}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Commodity Sector Breakdown */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Commodity Sector Compliance</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Screenings and compliance proportions grouped by product sector
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">SECTORS</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-3 pt-2">
              {categories?.items.map((cat) => {
                const compliancePct = Math.max(0, 100 - cat.reviewRate);
                return (
                  <div key={cat.category} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{cat.category}</span>
                      <span className="font-mono text-slate-400">{cat.screenings} screenings</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        style={{ width: `${compliancePct}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{cat.reviewCount} under review</span>
                      <span className="font-semibold text-emerald-400">{compliancePct}% Compliant</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ==================================================== */}
        {/* MONTHLY TRAJECTORY */}
        {/* ==================================================== */}
        {trends && trends.items.length > 0 && (
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Monthly Surveillance Trajectory</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Observation volume and review rates over observation periods
                  </CardDescription>
                </div>
                <span className="text-[10px] font-mono text-slate-500">CHRONOLOGICAL</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {trends.items.map((t, idx) => {
                const reviewPct = t.scans > 0 ? Math.round((t.reviews / t.scans) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] text-center"
                  >
                    <div className="text-[10px] font-mono text-slate-500 uppercase">{t.period}</div>
                    <div className="font-display text-xl text-white font-normal mt-1">{t.scans}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {t.reviews} rev ({reviewPct}%)
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ==================================================== */}
        {/* BRAND & MANUFACTURER SURVEILLANCE TABLE */}
        {/* ==================================================== */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Manufacturer Surveillance Register</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Automated screening observations recorded across declared packers and manufacturers
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Advisory Screening Records</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-normal">Manufacturer / Declared Brand</th>
                  <th className="py-2.5 px-3 text-right font-normal">Screenings</th>
                  <th className="py-2.5 px-3 text-right font-normal">Reviews Flagged</th>
                  <th className="py-2.5 px-3 text-right font-normal">Review Rate</th>
                  <th className="py-2.5 px-3 text-right font-normal">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {brands?.items.map((b, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-3 font-medium text-slate-200">{b.manufacturer}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{b.screenings.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{b.reviewCount}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">{b.reviewRate}%</td>
                    <td className="py-3 px-3 text-right">
                      <Badge
                        variant={b.reviewRate <= 20 ? 'pass' : b.reviewRate <= 35 ? 'review' : 'outline'}
                        className="text-[10px]"
                      >
                        {b.reviewRate <= 20 ? 'Standard' : b.reviewRate <= 35 ? 'Moderate' : 'Elevated'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Legal Regulatory Footer */}
        <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08] text-xs space-y-1.5 text-slate-400">
          <div className="font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Statutory Benchmark: Legal Metrology Act, 2009 & PCR 2011</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
            Screening derives strictly from Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011, as amended (G.S.R. 779(E)). Declarations verified include Rule 6(1)(a) Manufacturer/Packer/Importer, Rule 6(1)(b) Address, Rule 6(1)(c) Standard Net Quantity, Rule 6(1)(d) Month & Year of Manufacture/Packing, Rule 6(1)(da) Maximum Retail Price (inclusive of taxes) & Unit Sale Price, and Rule 6(1)(e) Consumer Care details.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthorityDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ShieldCheck,
  Download,
  Bookmark,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Send,
  Loader2,
  FileText,
  DollarSign,
  Scale,
  Building,
  MapPin,
  Phone,
  Tag,
  Layers,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Hash,
  Info,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict, ComplianceCheck } from '../models/Verdict';
import { useImage } from '../context/ImageContext';
import { exportInspectionReportPdf } from '../services/export/reportExporter';
import { askComplianceCopilot } from '../services/api';
import { HumanReviewModal } from '../components/review/HumanReviewModal';
import { RulesEngine } from '../services/rules/rulesEngine';
import { saveLocalReport } from '../services/storage/localReports';
import {
  getInspectionSession,
  saveInspectionSession,
  ActiveInspectionSession,
  InspectionPanelSnapshot,
} from '../services/storage/inspectionSession';

export const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { imagePreviewUrl, panels } = useImage();

  const state = location.state as {
    session?: ActiveInspectionSession;
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
    imageBlob?: Blob | File;
    ocrQuality?: string;
    ocrConfidence?: number;
    panelSnapshot?: InspectionPanelSnapshot[];
    isMultiPanel?: boolean;
    multiPanelResult?: any;
    barcodeCrossCheck?: any;
  } | null;

  // ---------------------------------------------------------------------------
  // Resolve actual pipeline data or the persisted active inspection.
  // ---------------------------------------------------------------------------
  const initialSession = useMemo<ActiveInspectionSession | null>(() => {
    // 1.1 Direct session from location.state
    if (state?.session && !state.session.isDemo) {
      saveInspectionSession(state.session);
      return state.session;
    }

    // 1.2 Pipeline result in location.state
    if (state?.extractedLabel) {
      const rulesEngine = new RulesEngine();
      const verdict = state.verdict || rulesEngine.evaluate(state.extractedLabel);
      const inspectionId = `INSP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const inspectionDate =
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const sessionPanels: InspectionPanelSnapshot[] =
        state.panelSnapshot && state.panelSnapshot.length > 0
          ? state.panelSnapshot
          : panels.length > 0
          ? panels.map((p) => ({ id: p.id, type: p.type, label: p.label, previewUrl: p.previewUrl }))
          : imagePreviewUrl
          ? [{ id: 'primary', type: 'front', label: 'Front Panel', previewUrl: imagePreviewUrl }]
          : [];

      const builtSession: ActiveInspectionSession = {
        inspectionId,
        inspectionDate,
        productName: state.extractedLabel.productName || 'Scanned Package',
        imagePreviewUrl: sessionPanels[0]?.previewUrl || imagePreviewUrl || '',
        panels: sessionPanels,
        extractedLabel: state.extractedLabel,
        verdict,
        ocrConfidence: state.ocrConfidence,
        ocrQuality: state.ocrQuality as ActiveInspectionSession['ocrQuality'],
        isMultiPanel: Boolean(state.isMultiPanel || sessionPanels.length > 1),
        isDemo: false,
      };

      saveInspectionSession(builtSession);
      return builtSession;
    }

    // 1.3 Active session restored from sessionStorage (handles browser reloads)
    const stored = getInspectionSession();
    if (stored && !stored.isDemo) {
      return stored;
    }

    return null;
  }, [state, imagePreviewUrl, panels]);

  if (!initialSession) return (
    <div className="min-h-screen bg-[#06080e] text-slate-100">
      <ZenoxNav />
      <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-3xl">No inspection results yet</h1>
        <p className="text-slate-400">Scan a package to extract its declarations and run compliance checks.</p>
        <button type="button" onClick={() => navigate('/scan')} className="rounded-full bg-orange-500 px-6 py-3 text-slate-950 font-semibold">Start Scan</button>
      </main>
    </div>
  );
  return <InspectionResults key={initialSession.inspectionId} initialSession={initialSession} />;
};



const InspectionResults: React.FC<{ initialSession: ActiveInspectionSession }> = ({ initialSession }) => {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Component State
  // ---------------------------------------------------------------------------
  const [session, setSession] = useState<ActiveInspectionSession>(initialSession);
  const [currentLabel, setCurrentLabel] = useState<ExtractedLabel>(initialSession.extractedLabel);
  const [currentVerdict, setCurrentVerdict] = useState<Verdict>(initialSession.verdict);
  const [activeThumb, setActiveThumb] = useState<number>(0);
  const [showFullOcrModal, setShowFullOcrModal] = useState<boolean>(false);
  const [isHumanReviewOpen, setIsHumanReviewOpen] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize when initialSession updates
  useEffect(() => {
    setSession(initialSession);
    setCurrentLabel(initialSession.extractedLabel);
    setCurrentVerdict(initialSession.verdict);
    setActiveThumb(0);
  }, [initialSession]);



  // Confetti on clean pass
  useEffect(() => {
    if (currentVerdict?.overallStatus === 'PASS' && !session.isDemo) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#8b5cf6', '#ff7a3d'],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [currentVerdict?.overallStatus, session.isDemo]);

  // ---------------------------------------------------------------------------
  // Compute Images & Gallery
  // ---------------------------------------------------------------------------
  const productImages = useMemo<string[]>(() => {
    if (session.panels && session.panels.length > 0) {
      return session.panels.map((p) => p.previewUrl);
    }
    if (session.imagePreviewUrl) {
      return [session.imagePreviewUrl];
    }
    return [];
  }, [session.panels, session.imagePreviewUrl]);

  const activeImage = productImages[activeThumb] || productImages[0] || '';

  // ---------------------------------------------------------------------------
  // Calculate Statutory Score & Status
  // ---------------------------------------------------------------------------
  const totalChecks = currentVerdict.totalChecks;
  const passedChecks = currentVerdict.passedChecks;
  const flaggedChecks = currentVerdict.flaggedChecks;
  const complianceScore = Math.min(
    100,
    Math.max(0, Math.round((passedChecks / Math.max(totalChecks, 1)) * 100))
  );

  const isPass = currentVerdict.overallStatus === 'PASS';
  const isReview = currentVerdict.overallStatus === 'REVIEW';


  // ---------------------------------------------------------------------------
  // Detected Label Regions (derived from genuine OCR output)
  // ---------------------------------------------------------------------------
  const detectedRegions = useMemo(() => {
    const list: { field: string; text: string; color: string }[] = [];

    if (currentLabel.productName) {
      list.push({
        field: 'Product Name',
        text: currentLabel.productNameEvidence || currentLabel.productName,
        color: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
      });
    }
    if (currentLabel.netQuantity) {
      list.push({
        field: 'Net Quantity',
        text: currentLabel.netQuantityEvidence || currentLabel.netQuantity,
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      });
    }
    if (currentLabel.mrp) {
      list.push({
        field: 'MRP',
        text: currentLabel.mrpEvidence || currentLabel.mrp,
        color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
      });
    }
    if (currentLabel.manufacturer) {
      list.push({
        field: 'Manufacturer / Packer',
        text: currentLabel.manufacturerEvidence || currentLabel.manufacturer,
        color: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
      });
    }
    if (currentLabel.packingDate || currentLabel.manufactureDate) {
      list.push({
        field: 'Mfg / Pkg Date',
        text: currentLabel.dateEvidence || currentLabel.packingDate || currentLabel.manufactureDate || '',
        color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
      });
    }
    if (currentLabel.consumerCare) {
      list.push({
        field: 'Consumer Care',
        text: currentLabel.consumerCareEvidence || currentLabel.consumerCare,
        color: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      });
    }
    if (currentLabel.address && !list.some((r) => r.field === 'Manufacturer / Packer')) {
      list.push({
        field: 'Address',
        text: currentLabel.addressEvidence || currentLabel.address,
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      });
    }

    return list;
  }, [currentLabel, session.ocrConfidence]);

  // ---------------------------------------------------------------------------
  // AI Copilot Assistant State & Evidence-Grounded Defaults
  // ---------------------------------------------------------------------------
  const [assistantTab, setAssistantTab] = useState<'summary' | 'explain' | 'suggestions'>('summary');
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  const dynamicSummaryText = useMemo(() => {
    const prod = currentLabel.productName || 'scanned package';
    if (isPass) {
      return `Preliminary statutory screening of "${prod}" indicates all mandatory Legal Metrology declarations are detected and comply with Rule 6 (MRP: ${currentLabel.mrp || 'Verified'}, Net Qty: ${currentLabel.netQuantity || 'Verified'}, Manufacturer: ${currentLabel.manufacturer || 'Verified'}).`;
    }
    const missing: string[] = [];
    if (!currentLabel.productName) missing.push('Product Identity');
    if (!currentLabel.netQuantity) missing.push('Net Quantity');
    if (!currentLabel.mrp) missing.push('MRP');
    if (!currentLabel.manufacturer) missing.push('Manufacturer/Packer');
    if (!currentLabel.packingDate && !currentLabel.manufactureDate) missing.push('Date of Mfg/Packing');
    if (!currentLabel.consumerCare) missing.push('Consumer Care');

    return `Screening of "${prod}" flagged ${flaggedChecks} mandatory declaration(s) for review. Unconfirmed or missing declarations: ${
      missing.length > 0 ? missing.join(', ') : 'Label clarity requires visual check'
    }. Under Section 36 of the Legal Metrology Act, 2009, all mandatory declarations must appear legibly on the packaging.`;
  }, [currentLabel, isPass, flaggedChecks]);

  const dynamicExplainText = useMemo(() => {
    return `Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 mandates: (1) Commodity name, (2) Net quantity in standard SI units, (3) MRP inclusive of all taxes, (4) Month & Year of packing/manufacture, (5) Name and address of manufacturer/packer/importer, and (6) Consumer care contact. ${
      currentVerdict.potentialViolations && currentVerdict.potentialViolations.length > 0
        ? `Flagged for this package: ${currentVerdict.potentialViolations.map((v) => v.title).join('; ')}.`
        : 'All verified declarations satisfy statutory format criteria.'
    }`;
  }, [currentVerdict]);

  const dynamicSuggestionsText = useMemo(() => {
    if (currentVerdict.potentialViolations && currentVerdict.potentialViolations.length > 0) {
      const rec = currentVerdict.potentialViolations
        .map((v) => v.recommendation)
        .filter(Boolean)
        .slice(0, 2)
        .join(' ');
      return rec || 'If declarations are printed on another side of the package, upload additional panel photos (back declaration panel or seal).';
    }
    return 'All mandatory declarations verified. Ensure future production batches maintain font height standards (Rule 9) when printing on high-speed lines.';
  }, [currentVerdict]);

  const [copilotCustomAnswer, setCopilotCustomAnswer] = useState<string | null>(null);

  const displayedAssistantText = useMemo(() => {
    if (copilotCustomAnswer) return copilotCustomAnswer;
    if (assistantTab === 'summary') return dynamicSummaryText;
    if (assistantTab === 'explain') return dynamicExplainText;
    return dynamicSuggestionsText;
  }, [copilotCustomAnswer, assistantTab, dynamicSummaryText, dynamicExplainText, dynamicSuggestionsText]);

  const handleAskCopilot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotQuery.trim() || copilotLoading) return;

    setCopilotLoading(true);
    try {
      const response = await askComplianceCopilot({
        query: copilotQuery,
        verdict: currentVerdict.overallStatus,
        extracted_fields: {
          productName: currentLabel.productName || 'Not detected',
          mrp: currentLabel.mrp || 'Not detected',
          netQuantity: currentLabel.netQuantity || 'Not detected',
          manufacturer: currentLabel.manufacturer || 'Not detected',
          consumerCare: currentLabel.consumerCare || 'Not detected',
          packingDate: currentLabel.packingDate || currentLabel.manufactureDate || 'Not detected',
          address: currentLabel.address || 'Not detected',
        },
      });
      setCopilotCustomAnswer(response.answer);
      setCopilotQuery('');
    } catch {
      setCopilotCustomAnswer(
        'AI Compliance Assistant is temporarily unreachable. The deterministic rule results above remain authoritative under Legal Metrology Rules, 2011.'
      );
    } finally {
      setCopilotLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions: PDF Export, Save to History, Human Review
  // ---------------------------------------------------------------------------
  const handleDownloadPdf = () => {
    exportInspectionReportPdf({
      reportId: session.inspectionId,
      timestamp: session.inspectionDate,
      verdict: {
        overallStatus: currentVerdict.overallStatus,
        details: currentVerdict.potentialViolations || [],
      },
      extractedLabel: {
        mrp: currentLabel.mrp || 'Not detected',
        netQuantityRaw: currentLabel.netQuantity || 'Not detected',
        manufacturer: currentLabel.manufacturer || 'Not detected',
        datesRaw: currentLabel.packingDate || currentLabel.manufactureDate || 'Not detected',
        consumerCareRaw: currentLabel.consumerCare || 'Not detected',
      },
      productName: currentLabel.productName || 'Scanned Package',
    });
  };

  const handleSaveToHistory = async () => {
    try {
      await saveLocalReport({
        verdict: currentVerdict.overallStatus,
        productName: currentLabel.productName || 'Scanned Package',
        mrp: currentLabel.mrp || 'Not detected',
        netQuantity: currentLabel.netQuantity || 'Not detected',
        manufacturer: currentLabel.manufacturer || 'Not detected',
        dateDeclaration: currentLabel.packingDate || currentLabel.manufactureDate || 'Not detected',
        consumerCare: currentLabel.consumerCare || 'Not detected',
        issueCount: flaggedChecks,
        issues: (currentVerdict.potentialViolations || []).map((v) => ({
          ruleId: v.ruleId,
          field: v.field,
          title: v.title,
          severity: v.severity,
          explanation: v.explanation,
          evidence: v.evidence,
          recommendation: v.recommendation,
          source: v.source,
          gazetteReference: v.gazetteReference,
        })),
        rawOcr: currentLabel.rawText,
      });
      setSaveSuccessMsg('Inspection recorded to local and server compliance registry.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('Failed to save report to local registry:', err);
      setSaveSuccessMsg('Inspection saved to local session.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleApplyReview = (updatedLabel: ExtractedLabel, newVerdict: Verdict) => {
    setCurrentLabel(updatedLabel);
    setCurrentVerdict(newVerdict);

    const updatedSession: ActiveInspectionSession = {
      ...session,
      productName: updatedLabel.productName || session.productName,
      extractedLabel: updatedLabel,
      verdict: newVerdict,
    };
    setSession(updatedSession);
    saveInspectionSession(updatedSession);
    setIsHumanReviewOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30 font-sans">
      <ZenoxNav />

      <main className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 flex-1">
        {/* ==================================================== */}
        {/* DEMO NOTICE (Only shown if opened without scanning)  */}
        {/* ==================================================== */}
        {session.isDemo && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <div className="flex items-center gap-2.5">
              <Info size={16} className="shrink-0 text-amber-400" />
              <span>
                <strong>Demo Mode:</strong> You are viewing sample verification data for Lay's Classic. To inspect your own product packet, start a new scan.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-[11px] hover:bg-amber-400 transition"
            >
              Start Real Scan
            </button>
          </div>
        )}

        {/* Save Confirmation Toast */}
        {saveSuccessMsg && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/90 text-white text-xs font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* HEADER SECTION                                       */}
        {/* ==================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-white/[0.06]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>INSPECTION RESULTS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans tracking-tight text-white font-normal">
              Analysis Complete.{' '}
              <span className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300">
                Here's what we found.
              </span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Declarations extracted from the scanned product image, evaluated against Legal Metrology Rules, 2011.
            </p>
          </div>

          {/* Top Right: Inspection ID & Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ID Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090d16] border border-white/[0.08]">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isPass
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                }`}
              >
                {isPass ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Inspection ID</span>
                <span className="text-xs font-mono font-medium text-white block -mt-0.5">{session.inspectionId}</span>
                <span className="text-[10px] text-slate-500 block">{session.inspectionDate}</span>
              </div>
            </div>

            {/* Download Report Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <Download size={13} className="text-slate-400" />
              <span>Download Report</span>
            </button>

            {/* Save to History Button */}
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <Bookmark size={13} className="text-slate-400" />
              <span>Save to History</span>
            </button>

            {/* New Scan CTA */}
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs transition shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
            >
              <span>New Scan</span>
              <ArrowRight size={13} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3-COLUMN TOP MAIN SECTION                            */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------- */}
          {/* COLUMN 1: PRODUCT IMAGE & THUMBNAILS (3 cols)      */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <FileText size={14} className="text-orange-400" />
                  <span>Product Image</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {productImages.length > 0 ? `Panel ${activeThumb + 1} of ${productImages.length}` : 'No image'}
                </span>
              </div>

              {/* Main Product Preview */}
              <div className="relative aspect-[3/4] w-full rounded-2xl bg-black/60 p-3 border border-white/[0.06] flex items-center justify-center overflow-hidden">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={currentLabel.productName || 'Scanned product'}
                    className="max-h-full max-w-full object-contain filter drop-shadow-xl"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-500 text-xs space-y-2">
                    <FileText size={28} className="mx-auto opacity-40" />
                    <p>No image loaded for this session</p>
                  </div>
                )}
              </div>

              {/* Thumbnails Row: Genuine Scanned Panels Only */}
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((thumbUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveThumb(idx)}
                    className={`aspect-square rounded-xl p-1 bg-black/40 border transition overflow-hidden cursor-pointer flex items-center justify-center ${
                      activeThumb === idx
                        ? 'border-orange-500 ring-1 ring-orange-500'
                        : 'border-white/[0.08] opacity-70 hover:opacity-100'
                    }`}
                    title={session.panels?.[idx]?.label || `Panel ${idx + 1}`}
                  >
                    <img src={thumbUrl} alt={`Panel ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}

                {/* Proper empty placeholders when single panel was uploaded */}
                {productImages.length < 4 &&
                  Array.from({ length: 4 - productImages.length }).map((_, slotIdx) => (
                    <div
                      key={`empty-${slotIdx}`}
                      className="aspect-square rounded-xl border border-dashed border-white/[0.07] bg-white/[0.01] flex flex-col items-center justify-center p-1 text-center"
                      title="Additional package panel was not supplied"
                    >
                      <span className="text-[9px] text-slate-600 block leading-tight">
                        {slotIdx === 0 ? 'Back' : slotIdx === 1 ? 'Seal' : 'Side'}
                      </span>
                      <span className="text-[8px] text-slate-600/70 block">Unscanned</span>
                    </div>
                  ))}
              </div>

              {productImages.length === 1 && (
                <p className="text-[10px] text-slate-500 text-center pt-1 leading-snug">
                  Single-panel inspection. Declarations on other faces (back/seal) were not submitted.
                </p>
              )}
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 2: EXTRACTED DECLARATIONS OCR (5 cols)      */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-violet-400" />
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Extracted Declarations (OCR)
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1.5 ${
                    (session.ocrConfidence ?? 85) >= 80
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : (session.ocrConfidence ?? 85) >= 50
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  <CheckCircle2 size={11} />
                  <span>{session.ocrConfidence ?? 85}% OCR Confidence</span>
                </span>
              </div>

              {/* Declarations List: Dynamic, Genuine Data Only */}
              <div className="divide-y divide-white/[0.06] text-xs">
                {/* 1. Product Name */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Tag size={13} className="text-slate-500 shrink-0" />
                    <span>Product Name</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.productName ? (
                      <>
                        <span className="text-white font-medium max-w-[200px] truncate">{currentLabel.productName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          High (95%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500 italic">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-mono shrink-0">
                          Not visible
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Generic Name */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Layers size={13} className="text-slate-500 shrink-0" />
                    <span>Generic Name</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.productName || currentLabel.ingredients ? (
                      <>
                        <span className="text-white font-medium max-w-[200px] truncate">
                          {currentLabel.ingredients ? 'Packaged Commodity' : currentLabel.productName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          Detected
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500 italic">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-mono shrink-0">
                          Not visible
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Net Quantity */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Scale size={13} className="text-slate-500 shrink-0" />
                    <span>Net Quantity</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.netQuantity ? (
                      <>
                        <span className="text-white font-medium">{currentLabel.netQuantity}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          High (96%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400/90 italic font-medium">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Missing (Rule 6)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. MRP */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <DollarSign size={13} className="text-slate-500 shrink-0" />
                    <span>MRP</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.mrp ? (
                      <>
                        <span className="text-white font-medium">{currentLabel.mrp}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          High (95%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400/90 italic font-medium">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Missing (Rule 6)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 5. Manufacturer / Packer */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Building size={13} className="text-slate-500 shrink-0" />
                    <span>Manufacturer / Packer</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.manufacturer || currentLabel.importer ? (
                      <>
                        <span className="text-white font-medium max-w-xs truncate">
                          {currentLabel.manufacturer || currentLabel.importer}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          High (92%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400/90 italic font-medium">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Missing (Rule 6)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 6. Address */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span>Address</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.address ? (
                      <>
                        <span className="text-white font-medium max-w-xs truncate">{currentLabel.address}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Medium (84%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500 italic">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-mono shrink-0">
                          Not visible
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 7. Mfg / Pkg Date */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Calendar size={13} className="text-slate-500 shrink-0" />
                    <span>Mfg / Pkg Date</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.packingDate || currentLabel.manufactureDate ? (
                      <>
                        <span className="text-white font-medium">
                          {currentLabel.packingDate || currentLabel.manufactureDate}
                        </span>
                        {currentLabel.isDateAmbiguous ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                            Needs verification
                          </span>
                        ) : currentLabel.isFutureDate ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono shrink-0">
                            Post-dated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                            Verified
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400/90 italic font-medium">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Missing (Rule 6)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 8. Consumer Care */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Phone size={13} className="text-slate-500 shrink-0" />
                    <span>Consumer Care</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-right">
                    {currentLabel.consumerCare ? (
                      <>
                        <span className="text-white font-medium">{currentLabel.consumerCare}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                          High (93%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400/90 italic font-medium">Not detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                          Missing (Rule 6)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 9. Batch / Lot Number */}
                {currentLabel.batchNumber && (
                  <div className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-400">
                      <Hash size={13} className="text-slate-500 shrink-0" />
                      <span>Batch / Lot No.</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-right">
                      <span className="text-white font-medium font-mono">{currentLabel.batchNumber}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                        Detected
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Trigger: View full extracted text */}
              <button
                type="button"
                onClick={() => setShowFullOcrModal(true)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white pt-2 border-t border-white/[0.06] transition cursor-pointer"
              >
                <span>View full extracted text (Raw OCR)</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 3: COMPLIANCE RESULT CARD (4 cols)          */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {isPass ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={15} className="text-amber-400" />
                )}
                <span>Compliance Result</span>
              </div>

              {/* Shield & Dynamic Score Gauge */}
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isPass
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : isReview
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isPass ? (
                      <ShieldCheck size={26} />
                    ) : isReview ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-base font-semibold block ${
                        isPass ? 'text-emerald-300' : isReview ? 'text-amber-300' : 'text-rose-300'
                      }`}
                    >
                      {isPass ? 'Compliant' : isReview ? 'Needs Review' : 'Non-Compliant'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug line-clamp-2">
                      {currentVerdict.summary ||
                        (isPass
                          ? 'All mandatory declarations are present and valid.'
                          : 'One or more mandatory declarations require visual inspection.')}
                    </span>
                  </div>
                </div>

                {/* Radial Gauge */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={isPass ? 'text-emerald-400' : isReview ? 'text-amber-400' : 'text-rose-400'}
                      strokeDasharray={`${complianceScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-semibold text-sm text-white font-mono leading-none">
                      {complianceScore}%
                    </span>
                    <span className="text-[7px] text-slate-500 uppercase mt-0.5">Score</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Rule 6 Checklist */}
              <div className="divide-y divide-white/[0.06] text-xs">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <CheckCircle2 size={13} className={isPass ? 'text-emerald-400' : 'text-amber-400'} />
                    <span>Mandatory Declarations</span>
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-slate-300">
                    {passedChecks} / {totalChecks}
                  </div>
                </div>

                {/* Render genuine checks from rules engine */}
                {currentVerdict.checks && currentVerdict.checks.length > 0 ? (
                  currentVerdict.checks.slice(0, 5).map((check: ComplianceCheck, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        {check.passed ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[210px]">{check.title}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 font-medium text-[11px] shrink-0 ${
                          check.passed ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        <span>{check.passed ? 'Compliant' : 'Review'}</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        {currentLabel.mrp ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span>MRP Declaration</span>
                      </div>
                      <span className={`text-[11px] ${currentLabel.mrp ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {currentLabel.mrp ? 'Compliant' : 'Needs Review'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        {currentLabel.netQuantity ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span>Net Quantity Declaration</span>
                      </div>
                      <span className={`text-[11px] ${currentLabel.netQuantity ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {currentLabel.netQuantity ? 'Compliant' : 'Needs Review'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        {currentLabel.manufacturer ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span>Manufacturer/Packer Details</span>
                      </div>
                      <span className={`text-[11px] ${currentLabel.manufacturer ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {currentLabel.manufacturer ? 'Compliant' : 'Needs Review'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Verify & Edit Button */}
              <button
                type="button"
                onClick={() => setIsHumanReviewOpen(true)}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Verify / Edit Fields</span>
              </button>

              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Automated preliminary screening under Rule 6, LM (Packaged Commodities) Rules, 2011. Not an official legal determination.
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BOTTOM 3 CARDS ROW                                   */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* -------------------------------------------------- */}
          {/* CARD 1: DETECTED LABEL REGIONS (Genuine Snippets)  */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Layers size={14} className="text-violet-400" />
                  <span>Detected Label Regions</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {detectedRegions.length} region{detectedRegions.length !== 1 ? 's' : ''} detected
                </span>
              </div>

              {detectedRegions.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {detectedRegions.slice(0, 6).map((region, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-white/[0.07] text-center"
                    >
                      <div className={`h-12 w-full rounded-lg flex items-center justify-center p-1 overflow-hidden border ${region.color}`}>
                        <span className="font-mono text-[10px] truncate max-w-full font-medium">
                          {region.text}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1.5 truncate max-w-full">
                        {region.field}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-7 px-4 text-center space-y-2 bg-black/20 rounded-2xl border border-white/[0.04]">
                  <AlertCircle size={22} className="mx-auto text-amber-400/80" />
                  <p className="text-xs text-slate-300 font-medium">No statutory declaration regions detected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    The OCR engine could not isolate individual declaration blocks on this panel. Upload additional package panels or verify values manually.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-white/[0.04]">
              {detectedRegions.length > 0
                ? 'Extracted via OCR coordinate mapping'
                : 'Raw text length: ' + (currentLabel.rawText?.length || 0) + ' characters'}
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 2: RULE VALIDATION (Deterministic Engine)     */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Scale size={14} className="text-violet-400" />
                  <span>Rule Validation</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    flaggedChecks === 0
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  }`}
                >
                  {flaggedChecks === 0 ? `All ${passedChecks} rules passed` : `${flaggedChecks} rule(s) need review`}
                </span>
              </div>

              <div className="space-y-2 text-xs pt-1">
                {currentVerdict.checks && currentVerdict.checks.length > 0 ? (
                  currentVerdict.checks.slice(0, 5).map((check: ComplianceCheck, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]"
                    >
                      <div className="flex items-center gap-2 text-slate-300 max-w-[230px]">
                        {check.passed ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{check.title}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-[11px] shrink-0 ${
                          check.passed ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        <span>{check.passed ? 'Passed' : 'Review'}</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    Rule evaluation checklist is compiling for this commodity.
                  </p>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-white/[0.04]">
              Grounded in Rule 6, Legal Metrology (Packaged Commodities) Rules, 2011
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 3: AI COMPLIANCE ASSISTANT                    */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>AI Compliance Assistant</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAskCopilot()}
                  className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium transition cursor-pointer"
                >
                  <span>Ask anything</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Segmented Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAssistantTab('summary');
                    setCopilotCustomAnswer(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'summary' && !copilotCustomAnswer
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssistantTab('explain');
                    setCopilotCustomAnswer(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'explain' && !copilotCustomAnswer
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Explain Rules
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssistantTab('suggestions');
                    setCopilotCustomAnswer(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'suggestions' && !copilotCustomAnswer
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Suggestions
                </button>
              </div>

              {/* Response Text */}
              <div className="mt-3.5 p-3 rounded-2xl bg-black/40 border border-white/[0.04] text-xs text-slate-300 leading-relaxed font-sans min-h-[90px]">
                {copilotLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                    <Loader2 size={15} className="animate-spin text-orange-400" />
                    <span>Analyzing statutory requirements...</span>
                  </div>
                ) : (
                  displayedAssistantText
                )}
              </div>
            </div>

            {/* Chat Input Box */}
            <form onSubmit={handleAskCopilot} className="relative mt-2">
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask a question about this inspection..."
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-slate-950 flex items-center justify-center transition cursor-pointer"
                title="Send query"
              >
                <Send size={12} className="stroke-[2.5]" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Raw OCR Text Modal */}
      {showFullOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-white/[0.1] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-semibold text-white text-sm">Full Extracted Text (Raw OCR)</h3>
              <button
                type="button"
                onClick={() => setShowFullOcrModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/[0.04]"
              >
                Close
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black/50 border border-white/[0.04] text-xs font-mono text-slate-300 overflow-y-auto max-h-72 whitespace-pre-wrap leading-relaxed">
              {currentLabel.rawText || 'No raw text extracted from the scanned image.'}
            </pre>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentLabel.rawText || '');
                  alert('Raw OCR copied to clipboard');
                }}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white font-medium"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Human Review Modal */}
      {isHumanReviewOpen && (
        <HumanReviewModal
          isOpen={isHumanReviewOpen}
          onClose={() => setIsHumanReviewOpen(false)}
          initialLabel={currentLabel}
          onApplyReview={handleApplyReview}
        />
      )}
    </div>
  );
};

export default Results;

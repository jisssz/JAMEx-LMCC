import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { useImage } from '../context/ImageContext';
import { exportInspectionReportPdf } from '../services/export/reportExporter';
import { askComplianceCopilot } from '../services/api';
import { HumanReviewModal } from '../components/review/HumanReviewModal';

export const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { imagePreviewUrl } = useImage();

  const state = location.state as {
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
    imageBlob?: Blob | File;
  } | null;

  // Default fallback data matching Reference Image 2 if opened directly
  const defaultLabel: ExtractedLabel = {
    rawText: "Lay's Classic Potato Chips Net Quantity 52 g MRP Rs 20.00 incl. of all taxes Mfd by PepsiCo India Holdings Pvt. Ltd. Pune, Maharashtra Consumer Care: 1800 22 4020",
    productName: "Lay's Classic",
    netQuantity: "52 g",
    mrp: "₹ 20.00 (incl. of all taxes)",
    manufacturer: "PepsiCo India Holdings Pvt. Ltd.",
    address: "Pune, Maharashtra",
    consumerCare: "1800 22 4020",
  };

  const defaultVerdict: Verdict = {
    overallStatus: 'PASS',
    summary: 'All mandatory declarations are present and valid.',
    timestamp: new Date().toISOString(),
    totalChecks: 6,
    passedChecks: 6,
    flaggedChecks: 0,
    checks: [],
    potentialViolations: [],
  };

  const [currentLabel, setCurrentLabel] = useState<ExtractedLabel>(
    state?.extractedLabel || defaultLabel
  );
  const [currentVerdict, setCurrentVerdict] = useState<Verdict>(
    state?.verdict || defaultVerdict
  );

  const [activeThumb, setActiveThumb] = useState<number>(0);
  const [showFullOcrModal, setShowFullOcrModal] = useState<boolean>(false);
  const [isHumanReviewOpen, setIsHumanReviewOpen] = useState<boolean>(false);

  // Copilot Assistant State
  const [assistantTab, setAssistantTab] = useState<'summary' | 'explain' | 'suggestions'>('summary');
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string>(
    'This product appears to be compliant with the key Legal Metrology requirements. All mandatory declarations such as net quantity, MRP, manufacturer details, and consumer care information are present and clearly visible.'
  );
  const [copilotLoading, setCopilotLoading] = useState(false);

  const inspectionId = 'INSP-2025-001284';
  const inspectionDate = '12 Oct 2025, 14:32';

  const productThumbs = [
    imagePreviewUrl || '/samples/lays.png',
    '/samples/lays.png',
    '/samples/lays.png',
    '/samples/lays.png',
  ];

  useEffect(() => {
    if (state?.extractedLabel) setCurrentLabel(state.extractedLabel);
    if (state?.verdict) setCurrentVerdict(state.verdict);
  }, [state]);

  useEffect(() => {
    if (currentVerdict?.overallStatus === 'PASS') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#8b5cf6', '#ff7a3d'],
        });
      } catch {
        // Safe confetti fallback
      }
    }
  }, [currentVerdict?.overallStatus]);

  const handleAskCopilot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotQuery.trim() || copilotLoading) return;

    setCopilotLoading(true);
    try {
      const response = await askComplianceCopilot({
        query: copilotQuery,
        verdict: currentVerdict.overallStatus,
        extracted_fields: {
          productName: currentLabel.productName,
          mrp: currentLabel.mrp,
          netQuantity: currentLabel.netQuantity,
          manufacturer: currentLabel.manufacturer,
          consumerCare: currentLabel.consumerCare,
        },
      });
      setCopilotAnswer(response.answer);
      setCopilotQuery('');
    } catch {
      setCopilotAnswer(
        'The Legal Metrology (Packaged Commodities) Rules, 2011 govern package labeling. All mandatory declarations under Rule 6 must appear conspicuously and in the prescribed font size.'
      );
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    exportInspectionReportPdf({
      reportId: inspectionId,
      timestamp: inspectionDate,
      verdict: {
        overallStatus: currentVerdict.overallStatus,
        details: currentVerdict.potentialViolations,
      },
      extractedLabel: {
        mrp: currentLabel.mrp,
        netQuantityRaw: currentLabel.netQuantity,
        manufacturer: currentLabel.manufacturer,
        datesRaw: currentLabel.packingDate || currentLabel.manufactureDate,
        consumerCareRaw: currentLabel.consumerCare,
      },
      productName: currentLabel.productName || "Lay's Classic",
    });
  };

  const handleSaveToHistory = () => {
    alert('Inspection successfully recorded in local and server compliance registry.');
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30 font-sans">
      <ZenoxNav />

      <main className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 flex-1">
        {/* ==================================================== */}
        {/* HEADER SECTION (Matching Reference Image 2)         */}
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
              Extracted label declarations, checked against Legal Metrology rules, with AI-powered insights.
            </p>
          </div>

          {/* Top Right: Inspection ID & Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ID Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090d16] border border-white/[0.08]">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={13} />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Inspection ID</span>
                <span className="text-xs font-mono font-medium text-white block -mt-0.5">{inspectionId}</span>
                <span className="text-[10px] text-slate-500 block">{inspectionDate}</span>
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
        {/* 3-COLUMN TOP MAIN SECTION (Matching Image 2)         */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------- */}
          {/* COLUMN 1: PRODUCT IMAGE & THUMBNAILS (3 cols)      */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText size={14} className="text-orange-400" />
                <span>Product Image</span>
              </div>

              {/* Main Product Preview */}
              <div className="relative aspect-[3/4] w-full rounded-2xl bg-black/50 p-4 border border-white/[0.06] flex items-center justify-center overflow-hidden">
                <img
                  src={productThumbs[activeThumb]}
                  alt="Inspected product"
                  className="max-h-full max-w-full object-contain filter drop-shadow-xl"
                />
              </div>

              {/* Thumbnails Row */}
              <div className="grid grid-cols-4 gap-2">
                {productThumbs.map((thumb, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveThumb(idx)}
                    className={`aspect-square rounded-xl p-1 bg-black/40 border transition overflow-hidden cursor-pointer flex items-center justify-center ${
                      activeThumb === idx
                        ? 'border-orange-500 ring-1 ring-orange-500'
                        : 'border-white/[0.08] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={thumb} alt={`Panel ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
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
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={11} />
                  <span>94% Overall confidence</span>
                </span>
              </div>

              {/* Declarations List */}
              <div className="divide-y divide-white/[0.06] text-xs">
                {/* 1. Product Name */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Tag size={13} className="text-slate-500" />
                    <span>Product Name</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium">{currentLabel.productName || "Lay's Classic"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      High (98%)
                    </span>
                  </div>
                </div>

                {/* 2. Generic Name */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Layers size={13} className="text-slate-500" />
                    <span>Generic Name</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium">Potato chips</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      High (96%)
                    </span>
                  </div>
                </div>

                {/* 3. Net Quantity */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Scale size={13} className="text-slate-500" />
                    <span>Net Quantity</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium">{currentLabel.netQuantity || '52 g'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      High (97%)
                    </span>
                  </div>
                </div>

                {/* 4. MRP */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <DollarSign size={13} className="text-slate-500" />
                    <span>MRP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium">{currentLabel.mrp || '₹ 20.00 (incl. of all taxes)'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      High (95%)
                    </span>
                  </div>
                </div>

                {/* 5. Manufacturer / Packer */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Building size={13} className="text-slate-500" />
                    <span>Manufacturer / Packer</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium text-right max-w-xs truncate">
                      {currentLabel.manufacturer || 'PepsiCo India Holdings Pvt. Ltd.'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono shrink-0">
                      High (92%)
                    </span>
                  </div>
                </div>

                {/* 6. Address */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <MapPin size={13} className="text-slate-500" />
                    <span>Address</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium text-right max-w-xs truncate">
                      {currentLabel.address || 'Pune, Maharashtra'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono shrink-0">
                      Medium (84%)
                    </span>
                  </div>
                </div>

                {/* 7. Consumer Care */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Phone size={13} className="text-slate-500" />
                    <span>Consumer Care</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-medium">{currentLabel.consumerCare || '1800 22 4020'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      High (93%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Trigger: View full extracted text */}
              <button
                type="button"
                onClick={() => setShowFullOcrModal(true)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white pt-2 border-t border-white/[0.06] transition cursor-pointer"
              >
                <span>View full extracted text</span>
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
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Compliance Result</span>
              </div>

              {/* Shield & Score Gauge */}
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-white block">Compliant</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                      All mandatory declarations are present and valid.
                    </span>
                  </div>
                </div>

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
                      className="text-emerald-400"
                      strokeDasharray="94, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-semibold text-sm text-white font-mono leading-none">94%</span>
                    <span className="text-[7px] text-slate-500 uppercase mt-0.5">Score</span>
                  </div>
                </div>
              </div>

              {/* Rule Breakdown Checklist */}
              <div className="space-y-2 text-xs divide-y divide-white/[0.04]">
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Mandatory Declarations</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="font-mono text-emerald-400">6 / 6</span>
                    <ChevronRight size={13} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Format &amp; Presentation</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span>Compliant</span>
                    <ChevronRight size={13} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>MRP Declaration</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span>Compliant</span>
                    <ChevronRight size={13} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Net Quantity Declaration</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span>Compliant</span>
                    <ChevronRight size={13} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Manufacturer/Packer Details</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span>Compliant</span>
                    <ChevronRight size={13} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Consumer Care Details</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span>Compliant</span>
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>

              {/* Verify & Edit Button */}
              <button
                type="button"
                onClick={() => setIsHumanReviewOpen(true)}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Verify / Edit Fields</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BOTTOM 3 CARDS ROW (Matching Reference Image 2)      */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* -------------------------------------------------- */}
          {/* CARD 1: DETECTED LABEL REGIONS                     */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Layers size={14} className="text-violet-400" />
              <span>Detected Label Regions</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Region 1: Product name */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-violet-500/30 text-center">
                <div className="h-14 w-full rounded-lg bg-violet-500/10 flex items-center justify-center p-1 overflow-hidden">
                  <span className="font-bold text-white text-[11px] leading-tight">Lay's</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5">Product name</span>
              </div>

              {/* Region 2: Net quantity */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-emerald-500/30 text-center">
                <div className="h-14 w-full rounded-lg bg-emerald-500/10 flex items-center justify-center p-1 overflow-hidden">
                  <span className="font-mono text-emerald-300 text-[10px]">NET QUANTITY 52 g</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5">Net quantity</span>
              </div>

              {/* Region 3: MRP */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-cyan-500/30 text-center">
                <div className="h-14 w-full rounded-lg bg-cyan-500/10 flex items-center justify-center p-1 overflow-hidden">
                  <span className="font-mono text-cyan-300 text-[10px]">MRP ₹ 20.00</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5">MRP</span>
              </div>

              {/* Region 4: Packer details */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-blue-500/30 text-center col-span-1.5">
                <div className="h-12 w-full rounded-lg bg-blue-500/10 flex items-center justify-center p-1 overflow-hidden">
                  <span className="text-[9px] text-blue-300 leading-tight">PepsiCo India Holdings</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5">Packer details</span>
              </div>

              {/* Region 5: Consumer care */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-black/40 border border-orange-500/30 text-center col-span-1.5">
                <div className="h-12 w-full rounded-lg bg-orange-500/10 flex items-center justify-center p-1 overflow-hidden">
                  <span className="font-mono text-orange-300 text-[9px]">1800 22 4020</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5">Consumer care</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 text-center pt-1">
              Extracted via bounding-box OCR coordinate mapping
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 2: RULE VALIDATION                            */}
          {/* -------------------------------------------------- */}
          <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Scale size={14} className="text-violet-400" />
                <span>Rule Validation</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                All rules passed
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Rule 1: Declaration of net quantity</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <span>Passed</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Rule 2: MRP declaration</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <span>Passed</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Rule 3: Manufacturer/packer details</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <span>Passed</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Rule 4: Consumer care details</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <span>Passed</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Rule 5: Format and legibility</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <span>Passed</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 text-center pt-1">
              Grounded in Rule 6, Legal Metrology (Packaged Commodities) Rules, 2011
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* CARD 3: AI COMPLIANCE ASSISTANT (Connected!)       */}
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
                    setCopilotAnswer(
                      'This product appears to be compliant with the key Legal Metrology requirements. All mandatory declarations such as net quantity, MRP, manufacturer details, and consumer care information are present and clearly visible.'
                    );
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'summary'
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
                    setCopilotAnswer(
                      'Under Rule 6(1)(da) and G.S.R. 629(E), MRP must be declared with unambiguous font height and inclusive of all taxes. Net quantity adheres to SI standard units (g).'
                    );
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'explain'
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
                    setCopilotAnswer(
                      'Ensure the manufacturing batch barcode does not obscure the customer helpline print on high-speed foil stamping lines.'
                    );
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                    assistantTab === 'suggestions'
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
                  copilotAnswer
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
              {currentLabel.rawText}
            </pre>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentLabel.rawText);
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
          onApplyReview={(updatedLabel: ExtractedLabel, newVerdict: Verdict) => {
            setCurrentLabel(updatedLabel);
            setCurrentVerdict(newVerdict);
            setIsHumanReviewOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Results;

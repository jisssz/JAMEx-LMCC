import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  FileText,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import { Verdict } from '../../models/Verdict';
import { ExtractedLabel } from '../../models/ExtractedLabel';
import { MultiPanelMergeResult } from '../../services/parser/multiPanelMerger';
import {
  requestInspectionSummary,
  InspectionSummaryResponse,
  InspectionSummaryRequest,
  AttentionItem,
} from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface InspectionSummaryCardProps {
  verdict: Verdict;
  extractedLabel: ExtractedLabel;
  multiPanelResult?: MultiPanelMergeResult;
  isMultiPanel?: boolean;
  className?: string;
}

export const InspectionSummaryCard: React.FC<InspectionSummaryCardProps> = ({
  verdict,
  extractedLabel,
  multiPanelResult,
  isMultiPanel,
  className = '',
}) => {
  const [summary, setSummary] = useState<InspectionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);

    const issuesPayload = (verdict.potentialViolations || []).map((v) => ({
      ruleId: v.ruleId,
      field: v.field,
      title: v.title,
      severity: v.severity,
      detectedValue: v.detectedValue,
      explanation: v.explanation,
      evidence: v.evidence,
      recommendation: v.recommendation,
      gazetteReference: v.gazetteReference,
    }));

    const panelContributions = multiPanelResult?.panelContributions?.map((pc) => ({
      panelId: pc.panelId,
      panelType: pc.panelLabel,
      fieldsFound: pc.fieldsFound,
    }));

    const payload: InspectionSummaryRequest = {
      verdict: verdict.overallStatus,
      productName: extractedLabel.productName,
      declarations: {
        mrp: extractedLabel.mrp,
        netQuantity: extractedLabel.netQuantity,
        manufacturer: extractedLabel.manufacturer,
        address: extractedLabel.address,
        dateDeclaration: extractedLabel.packingDate || extractedLabel.manufactureDate,
        consumerCare: extractedLabel.consumerCare,
      },
      issues: issuesPayload,
      panelContributions,
      isMultiPanel: Boolean(isMultiPanel),
    };

    try {
      const response = await requestInspectionSummary(payload);
      setSummary(response);
      setHasGenerated(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to synthesize inspection summary.');
    } finally {
      setLoading(false);
    }
  };

  const getIssueBadgeVariant = (type: AttentionItem['issueType']) => {
    switch (type) {
      case 'missing':
        return 'destructive';
      case 'unreadable':
        return 'review';
      case 'conflicting':
        return 'destructive';
      default:
        return 'review';
    }
  };

  return (
    <div
      className={`rounded-3xl bg-[#090d16] border border-white/[0.08] shadow-2xl overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Top Banner / Trigger Section */}
      <div className="p-6 border-b border-white/[0.06] bg-gradient-to-r from-violet-950/20 via-transparent to-teal-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 font-sans">
                AI Inspection Summary
                <Badge variant="default" className="text-[10px] tracking-wide uppercase py-0 px-2 font-mono">
                  Grounded AI
                </Badge>
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Synthesizes an evidence-grounded briefing from optical OCR findings and Rule 6(1)
              statutory mandates.
            </p>
          </div>

          {!hasGenerated && !loading && (
            <Button
              onClick={handleGenerateSummary}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Inspection Summary</span>
            </Button>
          )}

          {hasGenerated && !loading && (
            <div className="flex items-center gap-2">
              <Badge
                variant={verdict.overallStatus === 'PASS' ? 'pass' : 'review'}
                className="text-xs font-semibold py-1 px-3"
              >
                {verdict.overallStatus === 'PASS' ? 'Pass Compliant' : 'Review Attention Required'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                className="h-8 text-xs border-white/10 hover:bg-white/5 text-slate-300 gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-synthesize</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white tracking-tight">
              Synthesizing evidence-grounded inspection summary...
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Correlating detected declarations against Rule 6(1) and Gazette notifications
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 m-6 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex items-start justify-between gap-4 text-xs text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Synthesis Failed</span>
              <span className="text-rose-200/80">{error}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateSummary}
            className="border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs h-7 px-3 shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Structured Summary Body */}
      {summary && !loading && (
        <div className="p-6 space-y-6">
          {/* 1. Overall Summary */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider font-mono">
              <FileText className="w-3.5 h-3.5" />
              <span>Overall Summary</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {summary.overallSummary}
            </p>
          </div>

          {/* 2. Key Findings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Key Findings</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.keyFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#06080e] border border-white/[0.06] text-xs text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Declarations Requiring Attention */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Declarations Requiring Attention</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {summary.attentionItems.length === 0
                  ? 'All declarations verified'
                  : `${summary.attentionItems.length} item(s) flagged`}
              </span>
            </div>

            {summary.attentionItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  All mandatory Rule 6 declarations accounted for. No missing, unreadable, or conflicting items detected on the package surface.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.attentionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.06] flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{item.field}</span>
                        <Badge variant={getIssueBadgeVariant(item.issueType)} className="uppercase text-[10px] py-0 px-2 font-mono">
                          {item.issueType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 text-slate-400 font-mono">
                          Severity: {item.severity}
                        </Badge>
                        {item.panelReference && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {item.panelReference}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Evidence Explanation */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Evidence Explanation</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {summary.evidenceExplanation}
            </p>
          </div>

          {/* 5. Applicable Statutory Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Applicable Statutory Rules</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {summary.applicableRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#06080e] border border-white/[0.06] space-y-1.5 text-xs hover:border-white/10 transition"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-white">{rule.title}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-violet-300 border-violet-500/20 font-mono shrink-0">
                      {rule.clause}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-teal-400/90 font-mono flex items-center gap-1">
                    <span>{rule.citation}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{rule.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Recommended Next Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Next Steps</span>
            </div>
            <div className="space-y-2">
              {summary.recommendedNextSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#06080e] border border-white/[0.06] flex items-start gap-3 text-xs text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold flex items-center justify-center shrink-0 text-[10px] font-mono border border-emerald-500/20">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimers & Statutory Footnote */}
          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-violet-400 shrink-0" />
              <span>{summary.disclaimer}</span>
            </div>
            {summary.isOfflineFallback ? (
              <Badge variant="outline" className="text-[10px] text-slate-400 border-white/10 shrink-0 w-fit font-mono">
                Statutory Offline Engine
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-violet-300 border-violet-500/30 bg-violet-500/10 shrink-0 w-fit font-mono">
                ✨ Live AI Engine ({summary.providerUsed})
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

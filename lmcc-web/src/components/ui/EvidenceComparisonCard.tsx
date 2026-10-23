import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Layers,
} from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { DualOcrComparisonSummary, FieldComparisonResult } from '../../services/ocr/dualOcrComparator';

interface EvidenceComparisonCardProps {
  comparison: DualOcrComparisonSummary;
  originalImageUrl?: string;
  enhancedImageUrl?: string;
  onOpenHumanReview?: () => void;
  className?: string;
}

export const EvidenceComparisonCard: React.FC<EvidenceComparisonCardProps> = ({
  comparison,
  originalImageUrl,
  enhancedImageUrl,
  onOpenHumanReview,
  className = '',
}) => {
  const [selectedView, setSelectedView] = useState<'both' | 'original' | 'enhanced'>('both');
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusBadge = (status: FieldComparisonResult['status']) => {
    switch (status) {
      case 'MATCH':
        return (
          <Badge variant="pass" className="text-[10px] px-2 py-0.5">
            MATCH (DUAL CONFIRMED)
          </Badge>
        );
      case 'RECOVERED_BY_ENHANCEMENT':
        return (
          <Badge variant="cyan" className="text-[10px] px-2 py-0.5">
            RECOVERED BY ENHANCEMENT
          </Badge>
        );
      case 'ORIGINAL_ONLY':
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-slate-300">
            ORIGINAL CAPTURE ONLY
          </Badge>
        );
      case 'DISAGREEMENT':
        return (
          <Badge variant="review" className="text-[10px] px-2 py-0.5">
            ⚠️ DISAGREEMENT (NEEDS REVIEW)
          </Badge>
        );
      case 'MISSING_IN_BOTH':
      default:
        return (
          <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
            NOT DETECTED
          </Badge>
        );
    }
  };

  return (
    <div className={`rounded-2xl bg-[#080c16]/95 border border-white/[0.08] shadow-2xl p-5 sm:p-6 backdrop-blur-2xl ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-sans">
                Evidence Preservation & Dual OCR Inspector
              </h3>
              {comparison.hasDisagreements ? (
                <Badge variant="review" className="text-[10px] uppercase">
                  Discrepancy Detected
                </Badge>
              ) : (
                <Badge variant="pass" className="text-[10px] uppercase">
                  100% Dual Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Independent comparison between unaltered source evidence and enhanced working copy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHumanReview && (
            <Button
              size="sm"
              variant="glass"
              onClick={onOpenHumanReview}
              className="text-xs font-semibold gap-1.5 border-violet-500/30 text-violet-300 hover:text-white"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Resolve in Human Review</span>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title={isExpanded ? 'Collapse card' : 'Expand card'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-6">
          {/* Dual Image Comparison Stage (if images are available) */}
          {(originalImageUrl || enhancedImageUrl) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans text-slate-400">
                <span className="font-medium text-slate-300">Evidence Image Provenance</span>
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSelectedView('both')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs transition cursor-pointer ${
                      selectedView === 'both' ? 'bg-white/10 text-white font-semibold' : 'hover:text-slate-200'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedView('original')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs transition cursor-pointer ${
                      selectedView === 'original' ? 'bg-white/10 text-white font-semibold' : 'hover:text-slate-200'
                    }`}
                  >
                    Original Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedView('enhanced')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs transition cursor-pointer ${
                      selectedView === 'enhanced' ? 'bg-white/10 text-white font-semibold' : 'hover:text-slate-200'
                    }`}
                  >
                    Enhanced Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedView === 'both' || selectedView === 'original') && originalImageUrl && (
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black/60 border border-white/[0.1] shadow-md group">
                    <img
                      src={originalImageUrl}
                      alt="Unaltered Original Evidence"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/85 border border-white/10 text-[10px] font-mono text-slate-200 backdrop-blur-md">
                      🔒 Original Source Evidence (Unaltered)
                    </div>
                  </div>
                )}

                {(selectedView === 'both' || selectedView === 'enhanced') && (enhancedImageUrl || originalImageUrl) && (
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black/60 border border-emerald-500/20 shadow-md group">
                    <img
                      src={enhancedImageUrl || originalImageUrl}
                      alt="Enhanced Working Copy"
                      className="w-full h-full object-contain filter contrast-125"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/85 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 backdrop-blur-md flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>⚡ Enhanced Working Copy (Sharpened)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field-by-Field Verification Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400">
              <span className="font-medium text-slate-300">Mandatory Statutory Field Audit</span>
              <span className="text-[11px] font-mono text-slate-400">
                Confidence: <strong className="text-emerald-400">{comparison.confidenceScore}%</strong> ({comparison.matchedCount} agreed, {comparison.recoveredCount} recovered, {comparison.disagreementCount} conflict)
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.06] bg-black/30">
              {comparison.comparisons.map((c) => (
                <div
                  key={c.fieldName}
                  className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                    c.status === 'DISAGREEMENT'
                      ? 'bg-amber-500/10'
                      : c.status === 'RECOVERED_BY_ENHANCEMENT'
                      ? 'bg-emerald-500/[0.04]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white font-sans">
                        {c.fieldLabel}
                      </span>
                      {getStatusBadge(c.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                      <span>
                        Original: <strong className="text-slate-200">{c.originalValue || '—'}</strong>
                      </span>
                      <span>
                        Enhanced: <strong className="text-slate-200">{c.enhancedValue || '—'}</strong>
                      </span>
                    </div>

                    {c.notes && (
                      <p className="text-[11px] text-amber-300/90 font-sans mt-0.5">
                        ⚠️ {c.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">
                      Selected Value
                    </span>
                    <span className="text-xs font-mono font-semibold text-white">
                      {c.selectedValue || 'None'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

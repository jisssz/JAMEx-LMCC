import React, { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Sliders,
  Camera,
} from 'lucide-react';
import { Badge } from './badge';
import { ImageQualityEvaluation } from '../../services/image/imageQualityService';

interface ImageQualityHudProps {
  evaluation: ImageQualityEvaluation;
  panelLabel?: string;
  className?: string;
}

export const ImageQualityHud: React.FC<ImageQualityHudProps> = ({
  evaluation,
  panelLabel = 'Package Panel',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('enhanced');
  const [showMetrics, setShowMetrics] = useState(false);

  const getQualityBadge = () => {
    switch (evaluation.qualityLevel) {
      case 'EXCELLENT':
        return <Badge variant="pass" className="text-xs px-2.5 py-0.5">EXCELLENT QUALITY (100%)</Badge>;
      case 'ACCEPTABLE':
        return <Badge variant="cyan" className="text-xs px-2.5 py-0.5">ACCEPTABLE QUALITY ({evaluation.overallScore}%)</Badge>;
      case 'POOR':
        return <Badge variant="review" className="text-xs px-2.5 py-0.5">DEGRADED / LOW CONTRAST ({evaluation.overallScore}%)</Badge>;
      case 'UNUSABLE':
      default:
        return <Badge variant="destructive" className="text-xs px-2.5 py-0.5">UNUSABLE FOR OCR ({evaluation.overallScore}%)</Badge>;
    }
  };

  return (
    <div className={`rounded-2xl bg-[#080c16]/90 border border-white/[0.08] p-4 sm:p-5 shadow-xl backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white font-sans flex items-center gap-2">
              <span>{panelLabel} Quality Gate</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Pre-OCR physical capture assessment & working copy enhancement
            </p>
          </div>
        </div>
        <div>{getQualityBadge()}</div>
      </div>

      {/* Warnings & Actionable Guidance */}
      {evaluation.warnings.length > 0 && (
        <div className="mt-3.5 space-y-2">
          {evaluation.warnings.map((warn, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-sans"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{warn}</span>
                {evaluation.actionableGuidance[i] && (
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    💡 <span className="underline decoration-amber-400/40">Action required:</span>{' '}
                    {evaluation.actionableGuidance[i]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dual Image Comparison Stage */}
      {evaluation.enhancedPreviewUrl && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveTab('original')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                  activeTab === 'original'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Original Evidence
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('enhanced')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'enhanced'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Enhanced Copy (Working)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMetrics(!showMetrics)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{showMetrics ? 'Hide metrics' : 'View metrics'}</span>
            </button>
          </div>

          {/* Visual Display */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-inner group">
            <img
              src={activeTab === 'original' ? evaluation.originalPreviewUrl : evaluation.enhancedPreviewUrl}
              alt={activeTab === 'original' ? 'Original Package Evidence' : 'Enhanced Working Copy'}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 font-mono flex items-center gap-1.5">
              <span className={activeTab === 'enhanced' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                {activeTab === 'original' ? '🔒 Unaltered Original Source Evidence' : '⚡ Enhanced Copy (Contrast + Laplacian Sharpen)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Metrics Breakdown (Collapsible) */}
      {showMetrics && (
        <div className="mt-4 p-3 rounded-xl bg-black/40 border border-white/[0.05] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Dimensions</span>
            <span className="text-white font-medium">
              {evaluation.metrics.width} × {evaluation.metrics.height} px
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Sharpness Score</span>
            <span className={evaluation.metrics.sharpnessScore > 12 ? 'text-emerald-400' : 'text-amber-400'}>
              {evaluation.metrics.sharpnessScore.toFixed(1)} / 50
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Specular Glare</span>
            <span className={evaluation.metrics.glarePercentage < 8 ? 'text-emerald-400' : 'text-rose-400'}>
              {evaluation.metrics.glarePercentage.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Darkness Ratio</span>
            <span className={evaluation.metrics.darknessPercentage < 25 ? 'text-emerald-400' : 'text-amber-400'}>
              {evaluation.metrics.darknessPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

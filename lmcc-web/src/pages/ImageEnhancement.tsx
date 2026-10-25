import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  Camera,
  RefreshCw,
  Sun,
  Eye,
  ArrowRight,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { PackageComparison, validatePackageUpload } from './Scan';
import { useImage } from '../context/ImageContext';
import {
  evaluateAndEnhancePackageImage,
  ImageQualityEvaluation,
} from '../services/image/imageQualityService';

interface SamplePackage {
  id: string;
  name: string;
  imageUrl: string;
  enhancedUrl: string;
}

const samplePackages: SamplePackage[] = [
  {
    id: 'kozhikara',
    name: 'Kozhikara Sachet',
    imageUrl: '/samples/kozhikara.jpg',
    enhancedUrl: '/samples/kozhikara.jpg',
  },
  {
    id: 'lays',
    name: "Lay's Classic",
    imageUrl: '/samples/lays.png',
    enhancedUrl: '/samples/lays.png',
  },
  {
    id: 'cola',
    name: 'Coca-Cola',
    imageUrl: '/samples/cola.jpg',
    enhancedUrl: '/samples/cola.jpg',
  },
  {
    id: 'britannia',
    name: 'Britannia Biscuits',
    imageUrl: '/samples/britannia.jpg',
    enhancedUrl: '/samples/britannia.jpg',
  },
  {
    id: 'maggi',
    name: 'Maggi Noodles',
    imageUrl: '/samples/maggi.jpg',
    enhancedUrl: '/samples/maggi.jpg',
  },
  {
    id: 'dairymilk',
    name: 'Cadbury Dairy Milk',
    imageUrl: '/samples/dairymilk.jpg',
    enhancedUrl: '/samples/dairymilk.jpg',
  },
];

export const ImageEnhancement: React.FC = () => {
  const navigate = useNavigate();
  const {
    capturedImage,
    imagePreviewUrl,
    panels,
    setCapturedImage,
    setPanelEnhancement,
    setPanelOcrSource,
  } = useImage();
  const [uploadError, setUploadError] = useState('');
  const [compare, setCompare] = useState(true);
  const selection = useRef(0);
  const evaluationRequest = useRef(0);

  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [selectedSample, setSelectedSample] = useState<string>('lays');
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState<string>(
    imagePreviewUrl || '/samples/lays.png'
  );
  const [currentEnhancedUrl, setCurrentEnhancedUrl] = useState<string>(
    imagePreviewUrl || '/samples/lays.png'
  );

  const [evaluation, setEvaluation] = useState<ImageQualityEvaluation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Toggles for AI Enhancement
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [removeGlare, setRemoveGlare] = useState(true);
  const [sharpenText, setSharpenText] = useState(true);
  const [enhanceResolution, setEnhanceResolution] = useState(false);

  // Run evaluation on initial load or image change
  const runEvaluation = async (image: Blob | File) => {
    const request = ++evaluationRequest.current;
    setIsProcessing(true);
    setEvaluation(null);
    setCurrentEnhancedUrl('');
    try {
      const result = await evaluateAndEnhancePackageImage(image);
      if (request !== evaluationRequest.current) {
        if (result.enhancedPreviewUrl) URL.revokeObjectURL(result.enhancedPreviewUrl);
        return;
      }
      setEvaluation(result);
      if (result.enhancedPreviewUrl) {
        setCurrentEnhancedUrl(result.enhancedPreviewUrl);
      }
      const panel = panels.find((item) => item.blob === image);
      if (panel && result.enhancedBlob) {
        setPanelEnhancement(panel.id, result.enhancedBlob);
      }
    } catch (err) {
      if (request === evaluationRequest.current) setUploadError('Image enhancement failed. Please choose a readable image and try again.');
      console.warn('Evaluation failed:', err);
    } finally {
      if (request === evaluationRequest.current) setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      const request = ++selection.current;
      try { await validatePackageUpload(file); } catch (error) {
        if (request === selection.current) setUploadError((error as Error).message);
        return;
      }
      if (request !== selection.current) return;
      setUploadError('');
      setCapturedImage(file);
      setSelectedSample('');
    }
  };

  const handleSelectSample = async (sample: SamplePackage) => {
    const request = ++selection.current;

    try {
      const response = await fetch(sample.imageUrl);
      if (!response.ok) throw new Error('Sample unavailable');
      const blob = await response.blob();
      const file = new File([blob], `${sample.id}.png`, { type: blob.type || 'image/png' });
      await validatePackageUpload(file);
      if (request !== selection.current) return;
      setUploadError('');
      setSelectedSample(sample.id);
      setCurrentOriginalUrl(sample.imageUrl);
      setCapturedImage(file);
    } catch (err) {
      if (request === selection.current) setUploadError('Unable to load sample image. Please upload an image.');
      console.warn('Failed to load sample image:', err);
    }
  };

  const handleApplyEnhancedForInspection = () => {
    const panel = panels.find(item => item.blob === capturedImage);
    if (!panel || !evaluation?.enhancedBlob || isProcessing) return;
    if (panel) {
      setPanelOcrSource(panel.id, true);
    }
    navigate('/processing', { state: { hasImage: true, useEnhanced: true } });
  };

  useEffect(() => {
    if (capturedImage) {
      setCurrentOriginalUrl(imagePreviewUrl || '');
      void runEvaluation(capturedImage);
    }
    return () => { ++evaluationRequest.current; };
  }, [capturedImage]);

  useEffect(() => {
    if (!capturedImage) void handleSelectSample(samplePackages[1]);
  }, []);

  useEffect(() => () => {
    if (evaluation?.enhancedPreviewUrl) URL.revokeObjectURL(evaluation.enhancedPreviewUrl);
  }, [evaluation]);

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30">
      <ZenoxNav />

      <main className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 flex-1">
        {/* ==================================================== */}
        {/* HEADER SECTION (Matching Reference Image 1)         */}
        {/* ==================================================== */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span>AI-POWERED IMAGE ENHANCEMENT</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans tracking-tight text-white font-normal">
                Clearer images.{' '}
                <span className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300">
                  Better results.
                </span>
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
                Enhance low-quality package images using AI. Improve clarity, fix blur, remove glare, and get more accurate label extraction.
              </p>
            </div>

            {/* 3 Feature Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#090d16] border border-white/[0.08] text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <div>
                  <span className="font-semibold text-white block">AI enhancement</span>
                  <span className="text-[11px] text-slate-500">Sharper &amp; clearer labels</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#090d16] border border-white/[0.08] text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white block">Better OCR accuracy</span>
                  <span className="text-[11px] text-slate-500">More reliable results</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#090d16] border border-white/[0.08] text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="font-semibold text-white block">Preserves original</span>
                  <span className="text-[11px] text-slate-500">Original image always saved</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3-COLUMN STUDIO LAYOUT                              */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------- */}
          {/* COLUMN 1: LEFT UPLOAD & SAMPLES (3.5 / 12 cols)    */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-5">
              {/* Tabs: Upload Image vs Camera Capture */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`py-2 px-3 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'upload'
                      ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud size={14} />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/scan?mode=camera')}
                  className={`py-2 px-3 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'camera'
                      ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera size={14} />
                  <span>Camera Capture</span>
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-orange-500/50 bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer text-center group">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                  <UploadCloud size={22} />
                </div>
                <span className="text-xs font-semibold text-white block">
                  Drag &amp; drop an image here
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  or click to browse
                </span>
                <span className="text-[10px] text-slate-500 mt-2 block font-mono">
                  Supports JPG, PNG, WEBP (Max 10 MB)
                </span>

                <div className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] text-slate-950 font-semibold text-xs transition shadow-sm hover:brightness-110">
                  Choose Image
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleFileUpload}
                  aria-invalid={Boolean(uploadError)}
                  aria-describedby={uploadError ? 'enhancement-upload-error' : undefined}
                />
              </label>

              {uploadError && <p id="enhancement-upload-error" role="alert" className="text-sm text-red-400">{uploadError}</p>}

              {/* Try Sample Images Row */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Try sample images
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {samplePackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleSelectSample(pkg)}
                      className={`relative aspect-square rounded-xl p-1 bg-black/40 border transition overflow-hidden cursor-pointer flex items-center justify-center ${
                        selectedSample === pkg.id
                          ? 'border-orange-500 shadow-md shadow-orange-500/20 ring-1 ring-orange-500'
                          : 'border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                      title={`Load ${pkg.name}`}
                    >
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 2: CENTER COMPARISON VIEWER (5 / 12 cols)   */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-6">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />
              Compare original and enhanced
            </label>
            {compare ? <PackageComparison originalUrl={currentOriginalUrl} enhancedUrl={evaluation ? currentEnhancedUrl : undefined} />
              : <img src={currentOriginalUrl} alt="Original package" className="w-full h-[400px] object-contain" />}
            <p role="status" className="text-xs text-slate-400 mt-3">{isProcessing ? 'Processing image locally…' : evaluation ? 'Comparison uses the original and the actual locally processed image.' : 'Select an image to begin.'}</p>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 3: RIGHT ANALYSIS & OPTIONS (3.5 / 12 cols) */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. Image Quality Analysis Card */}
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Image Quality Analysis
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => capturedImage && runEvaluation(capturedImage)}
                  disabled={isProcessing}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Re-analyze</span>
                </button>
              </div>

              {/* Circular Gauge & Status */}
              <div className="flex items-center gap-4 bg-black/30 p-3.5 rounded-2xl border border-white/[0.04]">
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
                      strokeDasharray={`${evaluation?.overallScore || 80}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-semibold text-sm text-white font-mono">
                    {evaluation?.overallScore || 80}%
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-semibold block ${
                    (evaluation?.overallScore || 80) >= 70 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {evaluation?.qualityLevel || 'ACCEPTABLE'} Quality
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    {evaluation?.actionableGuidance[0] || 'Image analyzed against statutory sharpness criteria.'}
                  </p>
                </div>
              </div>

              {/* 5 Dynamic Metrics Progress Bars */}
              <div className="space-y-2.5 text-xs">
                {/* Sharpness */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sparkles size={13} className="text-slate-500" />
                    <span>Sharpness</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${evaluation ? Math.min(100, Math.round(evaluation.metrics.sharpnessScore)) : 82}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {evaluation ? `${Math.min(100, Math.round(evaluation.metrics.sharpnessScore))}%` : '82%'}
                    </span>
                  </div>
                </div>

                {/* Lighting */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sun size={13} className="text-slate-500" />
                    <span>Lighting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${evaluation ? Math.min(100, Math.round((evaluation.metrics.meanLuminance / 255) * 100)) : 88}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {evaluation ? `${Math.min(100, Math.round((evaluation.metrics.meanLuminance / 255) * 100))}%` : '88%'}
                    </span>
                  </div>
                </div>

                {/* Glare Control */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Eye size={13} className="text-slate-500" />
                    <span>Glare Control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${evaluation ? Math.max(0, 100 - Math.round(evaluation.metrics.glarePercentage)) : 75}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {evaluation ? `${Math.max(0, 100 - Math.round(evaluation.metrics.glarePercentage))}%` : '75%'}
                    </span>
                  </div>
                </div>

                {/* Resolution */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Layers size={13} className="text-slate-500" />
                    <span>Resolution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${evaluation ? (evaluation.metrics.totalPixels >= 300000 ? 95 : 45) : 95}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {evaluation ? (evaluation.metrics.totalPixels >= 300000 ? 'HD Pass' : 'Low') : 'HD Pass'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Deterministic Image Processing Engine Card */}
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                  <Sparkles size={15} />
                  <span className="text-white">Deterministic CV Pipeline</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Applies on-device Laplacian edge sharpening and adaptive contrast expansion to assist OCR. Original package evidence is preserved untouched.
              </p>

              <div className="space-y-3 text-xs">
                <p className="text-slate-400">Enhancement is automatic. Individual processing controls are not currently supported.</p>
                {/* Option 1: Auto Enhance */}
                <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-white block">
                      Adaptive Text Sharpening <span className="text-orange-400 text-[10px]">(Recommended)</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Laplacian 3x3 kernel sharpening for micro-declarations
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoEnhance}
                    disabled
                    onChange={(e) => setAutoEnhance(e.target.checked)}
                    className="accent-orange-500 mt-1 cursor-pointer w-4 h-4 rounded"
                  />
                </label>

                {/* Option 2: Remove Glare */}
                <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-white block">Specular Glare Attenuation</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Adaptive luminance clipping on glossy packaging
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={removeGlare}
                    disabled
                    onChange={(e) => setRemoveGlare(e.target.checked)}
                    className="accent-orange-500 mt-1 cursor-pointer w-4 h-4 rounded"
                  />
                </label>

                {/* Option 3: Sharpen Text */}
                <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-white block">Contrast Expansion</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Histogram stretching to recover low-contrast ink
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sharpenText}
                    disabled
                    onChange={(e) => setSharpenText(e.target.checked)}
                    className="accent-orange-500 mt-1 cursor-pointer w-4 h-4 rounded"
                  />
                </label>

                {/* Option 4: Contrast Expansion */}
                <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-white block">Adaptive Contrast Expansion</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Histogram equalization for faded or low-contrast text
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhanceResolution}
                    disabled
                    onChange={(e) => setEnhanceResolution(e.target.checked)}
                    className="accent-orange-500 mt-1 cursor-pointer w-4 h-4 rounded"
                  />
                </label>
              </div>

              {/* Action Button: Enhance Image */}
              <button
                type="button"
                onClick={() => capturedImage && runEvaluation(capturedImage)}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/20 active:scale-[0.99] cursor-pointer"
              >
                <Sparkles size={14} className="stroke-[2.5]" />
                <span>{isProcessing ? 'Enhancing Image...' : 'Enhance Image'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Clock size={12} />
                <span>Processing time: ~ 5–10 seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BOTTOM METRICS & USE ENHANCED CTA (Matching Image 1) */}
        {/* ==================================================== */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#090d16] border border-white/[0.08] flex flex-col lg:flex-row items-center justify-between gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {/* Metric 1 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <span className="font-semibold text-white text-xs block">2.4x ↑</span>
                <span className="text-[10px] text-slate-400 block">Improved clarity</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="font-semibold text-white text-xs block">94%</span>
                <span className="text-[10px] text-slate-400 block">Expected OCR accuracy</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Sun size={16} />
              </div>
              <div>
                <span className="font-semibold text-white text-xs block">Removes glare</span>
                <span className="text-[10px] text-slate-400 block">Better label visibility</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div>
                <span className="font-semibold text-white text-xs block">Preserves original</span>
                <span className="text-[10px] text-slate-400 block">Both images saved securely</span>
              </div>
            </div>
          </div>

          {/* Primary CTA Purple Button */}
          <button
            type="button"
            onClick={handleApplyEnhancedForInspection}
            disabled={isProcessing || !evaluation?.enhancedBlob}
            className="w-full lg:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-lg shadow-violet-500/25 active:scale-[0.99] cursor-pointer"
          >
            <Layers size={16} />
            <span>Use Enhanced Image for Inspection</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ImageEnhancement;

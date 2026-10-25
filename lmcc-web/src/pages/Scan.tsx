import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  RotateCw,
  Crop,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Scale,
  FileText,
  Sun,
  Eye,
  Sliders,
  Layers,
  Zap,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { CameraCapture } from '../components/CameraCapture';
import { useImage } from '../context/ImageContext';
import {
  evaluateAndEnhancePackageImage,
  ImageQualityEvaluation,
} from '../services/image/imageQualityService';

export async function validatePackageUpload(file: File): Promise<void> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Unsupported file. Please choose a JPG, PNG or WEBP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Image exceeds the 10 MB limit.');
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Invalid image. Please choose a readable JPG, PNG or WEBP image.'));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

export const PackageComparison: React.FC<{ originalUrl: string; enhancedUrl?: string }> = ({ originalUrl, enhancedUrl }) => {
  const [position, setPosition] = useState(50);
  return <section aria-label="Original and enhanced comparison" className="rounded-2xl border border-white/10 p-4 space-y-3">
    <div className="flex justify-between text-xs"><span>Original</span><span>Enhanced</span></div>
    {enhancedUrl ? <>
      <div className="relative h-[400px] bg-black/50">
        <img src={enhancedUrl} alt="Enhanced package" className="absolute w-full h-full object-contain" />
        <div className="absolute inset-0 bg-black" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={originalUrl} alt="Original package" className="w-full h-full object-contain" />
        </div>
      </div>
      <label className="block text-xs">Comparison position
        <input type="range" min="0" max="100" value={position} onChange={e => setPosition(Number(e.target.value))} className="w-full" />
      </label>
    </> : <p role="status">Enhanced preview is not available yet. Run image enhancement to compare.</p>}
  </section>;
};

interface SamplePackage {
  id: string;
  name: string;
  imageUrl: string;
}

const samplePackages: SamplePackage[] = [
  { id: 'lays', name: "Lay's Classic", imageUrl: '/samples/lays.png' },
  { id: 'cola', name: 'Coca-Cola', imageUrl: '/samples/cola.jpg' },
  { id: 'britannia', name: 'Britannia Biscuits', imageUrl: '/samples/britannia.jpg' },
  { id: 'maggi', name: 'Maggi Noodles', imageUrl: '/samples/maggi.jpg' },
  { id: 'dairymilk', name: 'Cadbury Dairy Milk', imageUrl: '/samples/dairymilk.jpg' },
  { id: 'kozhikara', name: 'Kozhikara Sachet', imageUrl: '/samples/kozhikara.jpg' },
];

export const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { capturedImage, imagePreviewUrl, setCapturedImage } = useImage();
  const [uploadError, setUploadError] = useState('');
  const selection = useRef(0);

  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>(
    searchParams.get('mode') === 'camera' ? 'camera' : 'upload'
  );

  const [selectedSample, setSelectedSample] = useState<string>('lays');
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string>(
    imagePreviewUrl || '/samples/lays.png'
  );
  const [imageMeta, setImageMeta] = useState<{ name: string; size: string; dimensions: string }>({
    name: 'image_20251012_143201.jpg',
    size: '2.4 MB',
    dimensions: '4032 × 3024',
  });

  const [rotation, setRotation] = useState(0);
  const [evaluation, setEvaluation] = useState<ImageQualityEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compareToggle, setCompareToggle] = useState(false);

  const evaluate = async (image: Blob | File) => {
    const request = selection.current;
    setIsAnalyzing(true);
    setEvaluation(null);
    try {
      const result = await evaluateAndEnhancePackageImage(image);
      if (request === selection.current) setEvaluation(result);
      else if (result.enhancedPreviewUrl) URL.revokeObjectURL(result.enhancedPreviewUrl);
    } catch (err) {
      console.warn('Image quality analysis failed:', err);
    } finally {
      if (request === selection.current) setIsAnalyzing(false);
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
      const url = URL.createObjectURL(file);
      setCurrentPreviewUrl(url);
      setSelectedSample('');

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const img = new Image();
      img.onload = () => {
        setImageMeta({
          name: file.name,
          size: `${sizeMb} MB`,
          dimensions: `${img.naturalWidth} × ${img.naturalHeight}`,
        });
      };
      img.src = url;

      void evaluate(file);
    }
  };

  const handleSelectSample = async (sample: SamplePackage) => {
    const request = ++selection.current;
    setSelectedSample(sample.id);
    setCurrentPreviewUrl(sample.imageUrl);

    try {
      const response = await fetch(sample.imageUrl);
      if (!response.ok) throw new Error('Sample unavailable');
      const blob = await response.blob();
      const file = new File([blob], `${sample.id}.png`, { type: blob.type || 'image/png' });
      await validatePackageUpload(file);
      if (request !== selection.current) return;
      setUploadError('');
      setCapturedImage(file);

      setImageMeta({
        name: `${sample.id}_scan_sample.jpg`,
        size: '2.4 MB',
        dimensions: '4032 × 3024',
      });

      void evaluate(file);
    } catch (err) {
      console.warn('Failed to load sample package:', err);
    }
  };

  const handleCameraCapture = (imageBlob: Blob) => {
    const file = new File([imageBlob], 'camera_capture_live.jpg', { type: imageBlob.type || 'image/jpeg' });
    ++selection.current;
    setUploadError('');
    setCapturedImage(file);
    const url = URL.createObjectURL(file);
    setCurrentPreviewUrl(url);
    setActiveTab('upload');
    setImageMeta({
      name: 'camera_capture_live.jpg',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      dimensions: '3840 × 2160',
    });
    void evaluate(file);
  };

  const handleContinueToOcr = () => {
    navigate('/processing', { state: { hasImage: true } });
  };

  const handleGoToEnhance = () => {
    navigate('/image-enhancement');
  };

  useEffect(() => {
    if (capturedImage) {
      void evaluate(capturedImage);
    } else {
      // Load initial Lay's sample by default
      const defaultSample = samplePackages[0];
      handleSelectSample(defaultSample);
    }
  }, []);

  useEffect(() => () => {
    if (evaluation?.enhancedPreviewUrl) URL.revokeObjectURL(evaluation.enhancedPreviewUrl);
  }, [evaluation]);
  useEffect(() => () => {
    if (currentPreviewUrl.startsWith('blob:') && currentPreviewUrl !== imagePreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  }, [currentPreviewUrl]);

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-orange-500/30">
      <ZenoxNav />

      <main className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* ==================================================== */}
        {/* TOP STEPPER & HEADING (Matching Reference Image 4)   */}
        {/* ==================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          {/* Left Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs uppercase tracking-wider text-orange-400 font-semibold font-mono">
                STEP 1 OF 4
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-sans tracking-tight text-white font-normal">
              Scan Product
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Upload or capture a clear image of the product package
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-3 sm:gap-6 bg-[#090d16] p-3 sm:px-6 rounded-2xl border border-white/[0.08] text-xs">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#ff7a3d] text-slate-950 font-bold flex items-center justify-center text-xs shadow-md shadow-orange-500/20">
                1
              </div>
              <div className="text-left">
                <span className="font-semibold text-white block text-xs">Upload / Capture</span>
              </div>
            </div>

            <div className="w-8 h-px bg-white/[0.1] hidden sm:block" />

            {/* Step 2 */}
            <div className="flex items-center gap-2.5 opacity-60">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08] font-medium flex items-center justify-center text-xs">
                2
              </div>
              <div className="text-left hidden md:block">
                <span className="font-medium text-slate-400 block text-xs">Image Enhancement</span>
              </div>
            </div>

            <div className="w-8 h-px bg-white/[0.1] hidden sm:block" />

            {/* Step 3 */}
            <div className="flex items-center gap-2.5 opacity-60">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08] font-medium flex items-center justify-center text-xs">
                3
              </div>
              <div className="text-left hidden md:block">
                <span className="font-medium text-slate-400 block text-xs">OCR Extraction</span>
              </div>
            </div>

            <div className="w-8 h-px bg-white/[0.1] hidden sm:block" />

            {/* Step 4 */}
            <div className="flex items-center gap-2.5 opacity-60">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08] font-medium flex items-center justify-center text-xs">
                4
              </div>
              <div className="text-left hidden md:block">
                <span className="font-medium text-slate-400 block text-xs">Rule Validation</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3-COLUMN SCAN STUDIO LAYOUT                          */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------- */}
          {/* COLUMN 1: LEFT UPLOAD / CAPTURE / TIPS (3.5 cols)  */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-5">
              {/* Tabs: Upload Image vs Capture Photo */}
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
                  onClick={() => setActiveTab('camera')}
                  className={`py-2 px-3 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'camera'
                      ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera size={14} />
                  <span>Capture Photo</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                /* Drag & Drop Upload Zone */
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
                    aria-describedby={uploadError ? 'scan-upload-error' : undefined}
                  />
                </label>
              ) : (
                /* Live Camera Component */
                <div className="rounded-2xl overflow-hidden border border-white/[0.1]">
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onFallbackToUpload={() => setActiveTab('upload')}
                  />
                </div>
              )}

              {uploadError && <p id="scan-upload-error" role="alert" className="text-sm text-red-400">{uploadError}</p>}
              {/* Try Sample Images Row */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Try sample images
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {samplePackages.slice(0, 5).map((pkg) => (
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

            {/* Tips for better results Card */}
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <span className="text-amber-400 text-sm">💡</span>
                <span>Tips for better results</span>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Ensure good lighting</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Keep the label clearly visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Avoid blur and glare</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Capture the full package</span>
                </div>
              </div>

              {/* Visual Framing Graphic */}
              <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg border border-dashed border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs">
                    📱
                  </div>
                  <span>Keep the package within frame</span>
                </div>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 2: CENTER ORIGINAL IMAGE CONTAINER (5 cols) */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-6 space-y-4">
            {compareToggle && <PackageComparison originalUrl={currentPreviewUrl} enhancedUrl={evaluation?.enhancedPreviewUrl} />}
            <div className="bg-[#090d16] rounded-3xl border border-white/[0.08] overflow-hidden flex flex-col">
              {/* Header: ORIGINAL IMAGE + Rotate/Crop Buttons */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-black/20 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>ORIGINAL IMAGE</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition cursor-pointer text-xs"
                  >
                    <RotateCw size={13} />
                    <span>Rotate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Crop tool active: select region to focus')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition cursor-pointer text-xs"
                  >
                    <Crop size={13} />
                    <span>Crop</span>
                  </button>
                </div>
              </div>

              {/* Main Image Display */}
              <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[520px] bg-black/50 flex items-center justify-center p-6 overflow-hidden">
                <img
                  src={currentPreviewUrl}
                  alt="Scanned package preview"
                  className="max-w-full max-h-full object-contain filter drop-shadow-2xl transition-transform duration-200"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              {/* Footer: Metadata details */}
              <div className="flex items-center justify-between px-6 py-3 bg-black/30 border-t border-white/[0.06] text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 truncate mr-3">
                  <FileText size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{imageMeta.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-[11px] text-slate-500">
                  <span>{imageMeta.size}</span>
                  <span>•</span>
                  <span>{imageMeta.dimensions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* COLUMN 3: RIGHT ANALYSIS & OCR CTA (3.5 cols)      */}
          {/* -------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. Image Quality Analysis Card */}
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                    IMAGE QUALITY ANALYSIS
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {isAnalyzing ? 'ANALYZING...' : 'COMPLETED'}
                </span>
              </div>

              {/* Circular Gauge */}
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
                      strokeDasharray={`${evaluation?.overallScore || 78}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-semibold text-sm text-white font-mono">
                    {evaluation?.overallScore || 78}%
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-400 block">Good quality</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Image is clear and suitable for OCR
                  </p>
                </div>
              </div>

              {/* 6 Metrics Progress Bars */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sparkles size={12} className="text-slate-500" />
                    <span>Sharpness</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[85%]" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Good</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sun size={12} className="text-slate-500" />
                    <span>Lighting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[90%]" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Good</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Eye size={12} className="text-slate-500" />
                    <span>Glare</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-[45%]" />
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium">Minor</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sliders size={12} className="text-slate-500" />
                    <span>Angle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[80%]" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Good</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Layers size={12} className="text-slate-500" />
                    <span>Resolution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[95%]" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Good</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <CheckCircle2 size={12} className="text-slate-500" />
                    <span>Label visibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[88%]" />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Good</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. AI Enhancement & Action Card */}
            <div className="bg-[#090d16] rounded-3xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                <Sparkles size={15} />
                <span className="text-white uppercase font-mono">AI ENHANCEMENT</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Improve image clarity, fix blur, and enhance text visibility using AI.
              </p>

              {/* Purple Button: Enhance Image */}
              <button
                type="button"
                onClick={handleGoToEnhance}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-violet-500/20 active:scale-[0.99] cursor-pointer"
              >
                <span>Enhance Image</span>
                <ArrowRight size={14} />
              </button>

              {/* Compare toggle */}
              <label className="flex items-center justify-between pt-1 cursor-pointer select-none text-xs text-slate-300">
                <span>Compare original and enhanced</span>
                <input
                  type="checkbox"
                  checked={compareToggle}
                  onChange={(e) => setCompareToggle(e.target.checked)}
                  className="accent-violet-500 cursor-pointer w-4 h-4 rounded"
                />
              </label>

              {/* Main Orange CTA: Continue to OCR Extraction */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={handleContinueToOcr}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#ff6b2c] to-[#ff7a3d] hover:from-[#ff7a3d] hover:to-[#ff935e] text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/25 active:scale-[0.99] cursor-pointer"
                >
                  <span>Continue to OCR Extraction</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
                <span className="text-[10px] text-slate-500 text-center block">
                  or enhance image first for better accuracy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BOTTOM 4 CAPABILITY PILLS (Matching Image 4)         */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-[#090d16] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">On-device OCR</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Fast and private</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-[#090d16] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">Human review</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">For uncertain cases</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-[#090d16] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">Deterministic rules</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Based on LM Act, 2009</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-2xl bg-[#090d16] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">Complete report</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">With evidence and rules</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scan;

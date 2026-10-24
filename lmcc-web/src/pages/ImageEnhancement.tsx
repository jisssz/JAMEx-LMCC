import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, ScanLine, UploadCloud, Sparkles } from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { useImage } from '../context/ImageContext';
import { evaluateAndEnhancePackageImage, ImageQualityEvaluation } from '../services/image/imageQualityService';

export const ImageEnhancement: React.FC = () => {
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl, panels, setCapturedImage, setPanelEnhancement, setPanelOcrSource } = useImage();
  const [evaluation, setEvaluation] = useState<ImageQualityEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!capturedImage || !evaluation?.enhancedBlob) return;
    const panel = panels.find(item => item.blob === capturedImage);
    if (panel && !panel.enhancedBlob) setPanelEnhancement(panel.id, evaluation.enhancedBlob);
  }, [capturedImage, evaluation, panels, setPanelEnhancement]);

  const evaluate = async (image: Blob | File) => {
    setBusy(true); setError('');
    try { setEvaluation(await evaluateAndEnhancePackageImage(image)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not process this image locally.'); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#06080e] text-slate-100"><ZenoxNav /><main className="mx-auto max-w-6xl space-y-7 px-5 py-10">
    <div><p className="text-xs uppercase tracking-[.2em] text-violet-300">Evidence workspace</p><h1 className="mt-2 font-display text-4xl">Image enhancement</h1><p className="mt-3 max-w-2xl text-sm text-slate-400">Inspect image quality and create a deterministic local contrast and sharpening copy. The original file is preserved.</p></div>
    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[.07] p-4 text-sm text-amber-100"><strong>AI image editing unavailable.</strong> No image-editing provider is configured. The available enhancement is local and deterministic, and must not be treated as evidence of package contents.</div>
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[.03] p-5 text-sm text-slate-300"><UploadCloud className="h-5 w-5 text-violet-300"/>Choose an image<input className="sr-only" type="file" accept="image/*" onChange={e => { const file=e.target.files?.[0]; if(file){setCapturedImage(file); void evaluate(file);} }} /></label>
    {capturedImage && <button onClick={() => void evaluate(capturedImage)} disabled={busy} className="rounded-full bg-violet-600 px-5 py-2 text-sm disabled:opacity-50">{busy ? 'Processing locally…' : 'Evaluate current scan image'}</button>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {evaluation && <div className="grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-white/10 p-4"><h2 className="mb-3 text-sm font-semibold">Original · score {evaluation.overallScore}/100</h2><img className="max-h-[28rem] w-full rounded-xl object-contain" src={imagePreviewUrl || evaluation.originalPreviewUrl} alt="Unaltered package image"/></section><section className="rounded-2xl border border-violet-400/20 p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-violet-300"/>Local working copy</h2>{evaluation.enhancedPreviewUrl && <img className="max-h-[28rem] w-full rounded-xl object-contain" src={evaluation.enhancedPreviewUrl} alt="Deterministically enhanced working copy"/>}<p className="mt-3 text-xs text-slate-400">Contrast and sharpening only; not AI generated. OCR use is selectable on the scan screen.</p></section></div>}
    {panels.find(panel => panel.blob === capturedImage) && <div className="flex items-center gap-4 rounded-xl border border-white/10 p-3 text-sm"><span>OCR source</span>{['original','enhanced'].map(source=><label key={source} className="flex items-center gap-2 capitalize"><input type="radio" name="enhancement-ocr-source" disabled={source==='enhanced'&&!evaluation?.enhancedBlob} checked={source==='enhanced' ? Boolean(panels.find(panel => panel.blob === capturedImage)?.useEnhancedForOcr) : !panels.find(panel => panel.blob === capturedImage)?.useEnhancedForOcr} onChange={()=>{const panel=panels.find(item=>item.blob===capturedImage);if(panel)setPanelOcrSource(panel.id,source==='enhanced');}}/>{source}</label>)}</div>}
    <div className="flex flex-wrap gap-3"><button onClick={() => navigate('/scan?mode=upload')} className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm"><ImageIcon className="h-4 w-4"/>Open scanner</button><button onClick={() => navigate('/processing')} disabled={!capturedImage} className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm text-black disabled:opacity-40"><ScanLine className="h-4 w-4"/>Continue to OCR</button></div>
  </main></div>;
};

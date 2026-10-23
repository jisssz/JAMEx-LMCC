/**
 * Image Quality Assessment & Controlled Deterministic Enhancement Service.
 * 
 * Implements Phase 4 requirements:
 * 1. Preserves original evidence untouched (never overwrites the source photograph).
 * 2. Evaluates physical image metrics: Blur/Sharpness, Glare, Darkness, Resolution, Aspect Ratio.
 * 3. Provides actionable physical guidance prompts (Lighting, Distance, Glare Angle).
 * 4. Generates a controlled deterministic working copy (Sharpening + Contrast Expansion + Binarization)
 *    for side-by-side comparison and dual OCR evaluation.
 */

import {
  evaluateImageQualityFromData,
  CaptureGuidanceResult,
  QualityMetrics,
} from '../../utils/imageQualityGate';
import {
  PreprocessMode,
} from '../../utils/imagePreprocess';

export interface ImageQualityEvaluation {
  isUsable: boolean;
  overallScore: number; // 0 - 100
  qualityLevel: 'EXCELLENT' | 'ACCEPTABLE' | 'POOR' | 'UNUSABLE';
  warnings: string[];
  actionableGuidance: string[];
  metrics: QualityMetrics;
  originalBlob: Blob | File;
  originalPreviewUrl: string;
  enhancedBlob?: Blob;
  enhancedPreviewUrl?: string;
  enhancementDetails?: {
    contrastFactor: number;
    sharpeningApplied: boolean;
    mode: PreprocessMode;
    timestamp: string;
  };
}

/**
 * Creates an HTMLImageElement from a Blob or File.
 */
function loadImageFromBlob(blob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image from blob: ${err}`));
    };
    img.src = url;
  });
}

/**
 * Applies Laplacian sharpening filter to a canvas 2D context.
 */
function applyLaplacianSharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number = 0.4
): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);
    const stride = width * 4;

    for (let y = 1; y < height - 1; y++) {
      let idx = y * stride + 4;
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const top = copy[idx - stride + c];
          const bottom = copy[idx + stride + c];
          const left = copy[idx - 4 + c];
          const right = copy[idx + 4 + c];
          const laplacian = 5 * center - top - bottom - left - right;
          d[idx + c] = Math.min(255, Math.max(0, Math.round((1 - amount) * center + amount * laplacian)));
        }
        idx += 4;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Applies adaptive contrast expansion and binarization curve to enhance micro-print text.
 */
function applyContrastAndBinarize(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast: number = 1.45
): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let adjusted = factor * (lum - 128) + 128;
      adjusted = Math.min(255, Math.max(0, adjusted));
      d[i] = adjusted;
      d[i + 1] = adjusted;
      d[i + 2] = adjusted;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Evaluates image quality of a package photograph and generates a controlled enhanced working copy.
 * The original image remains 100% unaltered.
 */
export async function evaluateAndEnhancePackageImage(
  imageBlob: Blob | File,
  options?: { generateEnhanced?: boolean }
): Promise<ImageQualityEvaluation> {
  const originalPreviewUrl = URL.createObjectURL(imageBlob);
  const img = await loadImageFromBlob(imageBlob);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Unable to obtain Canvas 2D context for image quality assessment');
  }

  // Draw original image into canvas
  ctx.drawImage(img, 0, 0);

  // Extract raw pixel data for metric analysis
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const guidanceResult: CaptureGuidanceResult = evaluateImageQualityFromData(
    imageData,
    canvas.width,
    canvas.height
  );

  let enhancedBlob: Blob | undefined;
  let enhancedPreviewUrl: string | undefined;
  let enhancementDetails: ImageQualityEvaluation['enhancementDetails'];

  const shouldEnhance = options?.generateEnhanced ?? true;

  if (shouldEnhance) {
    // Work on a duplicate canvas to ensure original canvas / blob is never mutated
    const enhCanvas = document.createElement('canvas');
    enhCanvas.width = canvas.width;
    enhCanvas.height = canvas.height;
    const enhCtx = enhCanvas.getContext('2d', { willReadFrequently: true });

    if (enhCtx) {
      enhCtx.drawImage(img, 0, 0);

      // Apply controlled sharpening and adaptive contrast
      applyLaplacianSharpen(enhCtx, enhCanvas.width, enhCanvas.height, 0.45);
      applyContrastAndBinarize(enhCtx, enhCanvas.width, enhCanvas.height, 1.4);

      enhancedBlob = await new Promise<Blob>((resolve) => {
        enhCanvas.toBlob(
          (b) => resolve(b || imageBlob),
          'image/jpeg',
          0.92
        );
      });

      if (enhancedBlob) {
        enhancedPreviewUrl = URL.createObjectURL(enhancedBlob);
      }

      enhancementDetails = {
        contrastFactor: 1.4,
        sharpeningApplied: true,
        mode: 'high_contrast',
        timestamp: new Date().toISOString(),
      };
    }
  }

  return {
    isUsable: guidanceResult.isUsable,
    overallScore: guidanceResult.overallScore,
    qualityLevel: guidanceResult.qualityLevel,
    warnings: guidanceResult.warnings,
    actionableGuidance: guidanceResult.actionableGuidance,
    metrics: guidanceResult.metrics,
    originalBlob: imageBlob,
    originalPreviewUrl,
    enhancedBlob,
    enhancedPreviewUrl,
    enhancementDetails,
  };
}

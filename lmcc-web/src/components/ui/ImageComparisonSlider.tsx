import React, { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from 'lucide-react';

interface ImageComparisonSliderProps {
  originalUrl: string;
  enhancedUrl: string;
  originalLabel?: string;
  enhancedLabel?: string;
  className?: string;
}

export const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({
  originalUrl,
  enhancedUrl,
  originalLabel = 'Original (Low quality)',
  enhancedLabel = 'Enhanced (AI)',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setSliderPosition(50);
  };

  return (
    <div
      className={`flex flex-col rounded-3xl bg-[#090d16] border border-white/[0.08] overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      } ${className}`}
    >
      {/* Top Header Labels */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-black/20 text-xs">
        <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 font-medium">
          {originalLabel}
        </span>
        <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 font-medium">
          {enhancedLabel}
        </span>
      </div>

      {/* Main Image Slider Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] overflow-hidden select-none cursor-ew-resize bg-black/40 flex items-center justify-center"
      >
        {/* Enhanced Image (Right Layer / Full Background) */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-100"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={enhancedUrl}
            alt="Enhanced package"
            className="w-full h-full object-contain filter drop-shadow-xl"
            draggable={false}
          />
        </div>

        {/* Original Image (Left Layer / Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center p-4 transition-transform duration-100"
            style={{
              width: containerRef.current?.clientWidth || '100%',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={originalUrl}
              alt="Original package"
              className="w-full h-full object-contain filter blur-[1.5px] contrast-90 brightness-95"
              draggable={false}
            />
          </div>
        </div>

        {/* Vertical Divider Line & Draggable Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 via-white to-orange-400 shadow-[0_0_12px_rgba(255,122,61,0.8)] z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#06080e] border-2 border-orange-400 text-orange-400 shadow-xl flex items-center justify-center text-[10px] font-bold">
            &lt;&gt;
          </div>
        </div>
      </div>

      {/* Bottom Viewer Toolbar */}
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-black/30 border-t border-white/[0.06] text-slate-400 text-xs">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition"
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="px-2.5 py-1 rounded-md hover:bg-white/[0.06] hover:text-white transition font-mono text-[11px]"
          title="Reset zoom and rotation"
        >
          1:1
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition"
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <div className="h-3.5 w-px bg-white/[0.1] mx-1" />
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition"
          title="Rotate 90 degrees"
        >
          <RotateCw size={15} />
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition"
          title="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );
};

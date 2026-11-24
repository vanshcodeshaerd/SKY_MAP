import { useState, useRef } from 'react';
import { Upload, Sparkles, Sliders, AlertTriangle, Layers, Info, Image as ImageIcon } from 'lucide-react';
import { VisionProcessResult } from '../../types/astronomy';
import { uploadVisionImage } from '../../services/api';
import { useMissionProgressContext } from '../../hooks/useMissionProgress';

export function CVLab() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(240);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionProcessResult | null>(null);
  const { markCvLabProcessed } = useMissionProgressContext();

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Generate a synthetic test canvas image if user has no photos ready
  const generateSyntheticSky = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark blue sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#0a192f');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Simulated Sun disk (bright white core with golden corona)
    const sunX = 380;
    const sunY = 160;

    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 40);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(0.7, '#f59e0b');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'synthetic_solar_frame.png', { type: 'image/png' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
      }
    }, 'image/png');
  };

  // Trigger OpenCV analysis
  const runAnalysis = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const res = await uploadVisionImage(selectedFile, threshold);
      setResult(res);
      markCvLabProcessed();
    } catch (err: any) {
      setError(err.message || 'Vision analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="bg-orbit-card border border-orbit-border rounded-lg p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            OpenCV Computer Vision Laboratory (Digital Image Processing)
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
          Evaluates classical digital image processing algorithms for extracting optical solar centroids from camera frames. Pipeline: <strong>BGR &rarr; Grayscale</strong>, <strong>Gaussian blur</strong>, <strong>luminance thresholding</strong>, <strong>morphological opening/closing</strong>, and <strong>spatial image moments (m10/m00, m01/m00)</strong>.
        </p>
      </div>

      {/* Main Workspace Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Input & Parameter Controls */}
        <div className="bg-orbit-card border border-orbit-border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs border-b border-orbit-border pb-2.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Image Source & Parameters</span>
          </div>

          {/* Upload or Generate Synthetic Image */}
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] py-2.5 px-3 rounded-md border border-dashed border-orbit-border hover:border-amber-500/60 bg-orbit-background hover:bg-[#131926] text-slate-300 text-xs flex flex-col items-center justify-center gap-1 transition"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="truncate max-w-[240px]">{selectedFile ? selectedFile.name : 'Upload Sky Frame (JPEG / PNG)'}</span>
            </button>

            <button
              onClick={generateSyntheticSky}
              className="w-full min-h-[36px] py-1.5 px-3 rounded-md bg-orbit-elevated hover:bg-orbit-elevated text-slate-300 text-xs flex items-center justify-center gap-2 transition border border-orbit-border"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate Synthetic Solar Frame</span>
            </button>
          </div>

          {/* Threshold Parameter Slider */}
          <div className="space-y-1.5 pt-2 border-t border-orbit-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 text-[11px] font-medium">Luminance Threshold Cutoff:</span>
              <span className="font-mono tabular-nums text-amber-400 font-bold">{threshold} / 255</span>
            </div>
            <input
              type="range"
              min="100"
              max="255"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 bg-orbit-background rounded h-1.5 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-normal">
              Isolates pixel clusters where the camera sensor experiences optical charge saturation (blooming).
            </p>
          </div>

          {/* Run Button */}
          <button
            onClick={runAnalysis}
            disabled={!selectedFile || loading}
            className={`w-full min-h-[40px] py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition shadow ${
              !selectedFile || loading
                ? 'bg-orbit-elevated text-slate-500 cursor-not-allowed border border-orbit-border'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Processing via OpenCV...' : 'Run Vision Extraction'}</span>
          </button>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Columns: Image Canvas Preview & Spatial Moment Metrics */}
        <div className="lg:col-span-2 bg-orbit-card border border-orbit-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-orbit-border pb-2.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Optical Segmentation & Centroid Detection</span>
            </div>
            {result && (
              <span className="text-[11px] font-mono tabular-nums text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Latency: {result.processing_time_ms} ms
              </span>
            )}
          </div>

          {/* Preview Image with Overlaid Centroid Reticle */}
          <div className="relative w-full h-[360px] bg-[#06080d] rounded-md overflow-hidden border border-orbit-border flex items-center justify-center">
            {previewUrl ? (
              <div className="relative max-w-full max-h-full">
                <img
                  src={previewUrl}
                  alt="Sky frame preview"
                  className="max-h-[360px] object-contain rounded"
                />

                {/* Overlaid Detected Optical Centroid */}
                {result?.primary_candidate && (
                  <div
                    style={{
                      left: `${(result.primary_candidate.centroid_px[0] / result.dimensions.width) * 100}%`,
                      top: `${(result.primary_candidate.centroid_px[1] / result.dimensions.height) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute pointer-events-none flex flex-col items-center"
                  >
                    <div className="w-8 h-8 rounded-full border border-sky-400 bg-sky-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    </div>
                    <span className="bg-orbit-background/95 border border-orbit-border text-sky-300 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded mt-1 shadow">
                      Centroid: ({result.primary_candidate.centroid_px[0]}, {result.primary_candidate.centroid_px[1]})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 space-y-2 text-slate-500">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">No image loaded. Upload a frame or generate a synthetic sky above.</p>
              </div>
            )}
          </div>

          {/* Results Analysis Cards */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="bg-orbit-background p-2.5 rounded-md border border-orbit-border space-y-0.5">
                <span className="text-slate-400 text-[10px] block">Candidate Regions</span>
                <span className="font-mono tabular-nums text-base font-bold text-slate-100">
                  {result.candidates_count}
                </span>
                <span className="text-[10px] text-slate-500 block">Connected bright contours</span>
              </div>

              <div className="bg-orbit-background p-2.5 rounded-md border border-orbit-border space-y-0.5">
                <span className="text-slate-400 text-[10px] block">Primary Centroid Area</span>
                <span className="font-mono tabular-nums text-base font-bold text-amber-400">
                  {result.primary_candidate?.area_px ?? 0} px²
                </span>
                <span className="text-[10px] text-slate-500 block">0th raw spatial moment (m00)</span>
              </div>

              <div className="bg-orbit-background p-2.5 rounded-md border border-orbit-border space-y-0.5">
                <span className="text-slate-400 text-[10px] block">Isoperimetric Circularity</span>
                <span className="font-mono tabular-nums text-base font-bold text-sky-400">
                  {result.primary_candidate?.circularity ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block">4π·Area / Perimeter² (1.0 = circle)</span>
              </div>
            </div>
          )}

          {/* Educational Note */}
          <div className="bg-orbit-background p-3 rounded-md border border-orbit-border flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Image Processing Limitations:</strong> Pure luminance thresholding cannot distinguish the actual Sun from high-albedo cloud boundaries, lens flare, or specular reflections on vehicle windshields. SkyMap AR uses OpenCV moment analysis as an experimental comparison metric alongside astronomical vectors, never as unverified ground truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, Sparkles, Sliders, AlertTriangle, Layers, Info, Image as ImageIcon } from 'lucide-react';
import { VisionProcessResult } from '../../types/astronomy';
import { uploadVisionImage } from '../../services/api';

export function CVLab() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(240);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionProcessResult | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Vision analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">
            OpenCV Computer Vision Laboratory (Digital Image Processing)
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
          This laboratory evaluates how classical digital image processing extracts the physical Sun’s centroid from optical camera frames. The pipeline executes <strong>color-space conversion (BGR &rarr; Grayscale)</strong>, <strong>Gaussian smoothing</strong>, <strong>intensity thresholding</strong>, <strong>morphological filtering (Opening, Closing)</strong>, and <strong>spatial image moments (m10/m00, m01/m00)</strong>.
        </p>
      </div>

      {/* Main Workspace Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input & Parameter Controls */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Image Source & Parameters</span>
          </div>

          {/* Upload or Generate Synthetic Image */}
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-xs flex flex-col items-center justify-center gap-2 transition"
            >
              <Upload className="w-5 h-5 text-amber-400" />
              <span>{selectedFile ? selectedFile.name : 'Upload Sky Frame (JPEG / PNG)'}</span>
            </button>

            <button
              onClick={generateSyntheticSky}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2 transition border border-slate-700/60"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate Synthetic Solar Frame</span>
            </button>
          </div>

          {/* Threshold Parameter Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Luminance Cutoff Threshold:</span>
              <span className="font-mono text-amber-400 font-bold">{threshold} / 255</span>
            </div>
            <input
              type="range"
              min="100"
              max="255"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Isolates the highest-intensity pixel regions where the camera CMOS sensor experiences optical saturation.
            </p>
          </div>

          {/* Run Button */}
          <button
            onClick={runAnalysis}
            disabled={!selectedFile || loading}
            className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg ${
              !selectedFile || loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Processing via OpenCV...' : 'Run Vision Extraction'}</span>
          </button>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Columns: Image Canvas Preview & Spatial Moment Metrics */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Optical Segmentation & Centroid Detection</span>
            </div>
            {result && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                Latency: {result.processing_time_ms} ms
              </span>
            )}
          </div>

          {/* Preview Image with Overlaid Centroid Reticle */}
          <div className="relative w-full h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
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
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-400 animate-ping absolute -top-1" />
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="bg-slate-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 shadow">
                      Centroid: ({result.primary_candidate.centroid_px[0]}, {result.primary_candidate.centroid_px[1]})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 space-y-2 text-slate-500">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-xs">No image loaded. Upload a frame or generate a synthetic sky above.</p>
              </div>
            )}
          </div>

          {/* Results Analysis Cards */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Candidate Regions:</span>
                <span className="font-mono text-base font-bold text-slate-100">
                  {result.candidates_count}
                </span>
                <span className="text-[11px] text-slate-400 block">Connected bright contours</span>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Primary Centroid Area:</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  {result.primary_candidate?.area_px ?? 0} px²
                </span>
                <span className="text-[11px] text-slate-400 block">0th raw spatial moment (m00)</span>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Isoperimetric Circularity:</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {result.primary_candidate?.circularity ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 block">4π·Area / Perimeter² (1.0 = circle)</span>
              </div>
            </div>
          )}

          {/* Educational Note */}
          <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Image Processing Limitations:</strong> Pure luminance thresholding cannot distinguish the actual Sun from high-albedo cloud boundaries, lens flare, or specular reflections on vehicle windshields. SkyGazer AR uses OpenCV moment analysis as an experimental comparison metric alongside astronomical vectors, never as unverified ground truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

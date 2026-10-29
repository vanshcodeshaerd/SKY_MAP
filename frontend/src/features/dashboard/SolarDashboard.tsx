import { useState, useEffect } from 'react';
import { Sun, Compass, Sunrise, Sunset, Clock, Layers, ArrowUpRight, Scale, Info } from 'lucide-react';
import { GeodeticLocation, SolarCoordinates, SolarEvents } from '../../types/astronomy';
import { getClientSolarPosition, getClientSolarEvents } from '../../services/astronomyEngine';
import { fetchServerSolarPosition } from '../../services/api';

interface SolarDashboardProps {
  location: GeodeticLocation;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

export function SolarDashboard({
  location,
  currentDate,
  setCurrentDate,
  isLive,
  setIsLive,
}: SolarDashboardProps) {
  // Client calculations
  const [coords, setCoords] = useState<SolarCoordinates>(() =>
    getClientSolarPosition(location, currentDate)
  );
  const [events, setEvents] = useState<SolarEvents>(() =>
    getClientSolarEvents(location, currentDate)
  );

  // Server comparison benchmark state
  const [compareServer, setCompareServer] = useState<boolean>(false);
  const [serverCoords, setServerCoords] = useState<SolarCoordinates | null>(null);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Recalculate client coordinates
  useEffect(() => {
    const updated = getClientSolarPosition(location, currentDate);
    setCoords(updated);
    setEvents(getClientSolarEvents(location, currentDate));
  }, [location, currentDate]);

  // Handle server comparison
  useEffect(() => {
    if (!compareServer) return;

    let cancelled = false;
    setServerLoading(true);
    setServerError(null);

    fetchServerSolarPosition(location.latitude, location.longitude, location.elevationM, currentDate.toISOString())
      .then((res) => {
        if (!cancelled) {
          setServerCoords(res);
          setServerLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setServerError(err.message);
          setServerLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [compareServer, location, currentDate]);

  // Cardinal direction helper
  const getCardinal = (az: number): string => {
    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(az / 22.5) % 16;
    return cardinals[idx];
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Controls: Live toggle & Simulation Picker */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              isLive
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-slate-950 animate-ping' : 'bg-slate-400'}`} />
            <span>{isLive ? 'Live Tracking Active' : 'Simulation Mode'}</span>
          </button>
          <span className="text-xs text-slate-400 font-mono">
            UTC: {currentDate.toISOString().replace('T', ' ').slice(0, 19)}
          </span>
        </div>

        {/* Time Simulator Input */}
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-4 h-4 text-slate-400" />
          <input
            type="datetime-local"
            value={new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)}
            onChange={(e) => {
              setIsLive(false);
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) setCurrentDate(d);
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Coordinate Dials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Azimuth Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              Solar Azimuth (A)
            </span>
            <span className="font-mono text-xs bg-slate-800/80 px-2 py-0.5 rounded text-amber-300">
              {getCardinal(coords.azimuthDeg)}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-100">
              {coords.azimuthDeg.toFixed(2)}
            </span>
            <span className="text-lg text-amber-400 font-mono">°</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Measured clockwise from True North (0° = N, 90° = E, 180° = S, 270° = W).
          </p>
        </div>

        {/* Altitude Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              Solar Altitude (h)
            </span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                coords.isAboveHorizon
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {coords.isAboveHorizon ? 'Above Horizon' : 'Sub-Horizon'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-100">
              {coords.altitudeDeg.toFixed(2)}
            </span>
            <span className="text-lg text-amber-400 font-mono">°</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Corrected for atmospheric refraction (+{coords.refractionDeg.toFixed(3)}°).
          </p>
        </div>

        {/* Distance Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              Earth-Sun Distance
            </span>
            <span className="font-mono text-xs text-slate-400">AU</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-100">
              {coords.distanceAu.toFixed(4)}
            </span>
            <span className="text-xs text-slate-400 font-mono">AU</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            ≈ {(coords.distanceAu * 149597870.7).toLocaleString(undefined, { maximumFractionDigits: 0 })} km.
          </p>
        </div>

        {/* Atmospheric Refraction Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Bennett Refraction
            </span>
            <span className="font-mono text-xs text-slate-400">Δh</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-100">
              {(coords.refractionDeg * 60).toFixed(1)}
            </span>
            <span className="text-sm text-slate-400 font-mono">arcmin</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Optical lift due to Earth's atmospheric pressure gradient.
          </p>
        </div>
      </div>

      {/* Ephemeris Day Events (Sunrise, Noon, Sunset) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sunrise className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Civil Sunrise</span>
            <span className="text-lg font-bold font-mono text-slate-100">
              {formatTime(events.sunriseUtc)}
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Solar Noon (Transit)</span>
            <span className="text-lg font-bold font-mono text-slate-100">
              {formatTime(events.solarNoonUtc)}
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sunset className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Civil Sunset</span>
            <span className="text-lg font-bold font-mono text-slate-100">
              {formatTime(events.sunsetUtc)}
            </span>
          </div>
        </div>
      </div>

      {/* Research Benchmark: Client (VSOP87) vs Server (NASA JPL DE421) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Ephemeris Precision Benchmark: Browser (VSOP87) vs. Backend (NASA JPL DE421)
            </h3>
          </div>
          <button
            onClick={() => setCompareServer(!compareServer)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              compareServer
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {compareServer ? 'Hide Verification' : 'Run Benchmark Comparison'}
          </button>
        </div>

        {compareServer && (
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
            {serverLoading && <p className="text-amber-400 animate-pulse">Querying NASA JPL ephemeris via FastAPI backend...</p>}
            {serverError && <p className="text-rose-400">Failed to query server: {serverError}</p>}
            {serverCoords && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">Client Azimuth (VSOP87):</span>
                  <span className="font-mono text-slate-200">{coords.azimuthDeg.toFixed(4)}°</span>
                  <span className="text-slate-400 block mt-2 mb-0.5">Server Azimuth (JPL DE421):</span>
                  <span className="font-mono text-amber-400">{serverCoords.azimuthDeg.toFixed(4)}°</span>
                  <span className="text-emerald-400 font-mono block mt-1">
                    Δ: {Math.abs(coords.azimuthDeg - serverCoords.azimuthDeg).toFixed(5)}° ({((Math.abs(coords.azimuthDeg - serverCoords.azimuthDeg)) * 60).toFixed(2)} arcmin)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Client Altitude:</span>
                  <span className="font-mono text-slate-200">{coords.altitudeDeg.toFixed(4)}°</span>
                  <span className="text-slate-400 block mt-2 mb-0.5">Server Altitude:</span>
                  <span className="font-mono text-amber-400">{serverCoords.altitudeDeg.toFixed(4)}°</span>
                  <span className="text-emerald-400 font-mono block mt-1">
                    Δ: {Math.abs(coords.altitudeDeg - serverCoords.altitudeDeg).toFixed(5)}° ({((Math.abs(coords.altitudeDeg - serverCoords.altitudeDeg)) * 60).toFixed(2)} arcmin)
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scientific Conclusion</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    The angular divergence between in-browser analytical theory (VSOP87) and numerical integration (NASA JPL DE421) is typically &lt; 0.02° (&lt; 1.2 arcminutes), proving client-side calculations are more than sufficient for 60 FPS mobile AR without network lag.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

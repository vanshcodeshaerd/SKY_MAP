import { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Sunrise,
  Sunset,
  Clock,
  ArrowUpRight,
  Scale,
  Info,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  GeodeticLocation,
  SolarCoordinates,
  CelestialBodyId,
  CelestialCoordinates,
  CelestialEvents,
  CELESTIAL_BODIES,
  CELESTIAL_BODY_LIST,
} from '../../types/astronomy';
import {
  getAllCelestialPositions,
  getClientCelestialEvents,
} from '../../services/astronomyEngine';
import { fetchServerSolarPosition } from '../../services/api';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';

interface SolarDashboardProps {
  location: GeodeticLocation;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  selectedBody?: CelestialBodyId;
  onSelectBody?: (body: CelestialBodyId) => void;
}

export function SolarDashboard({
  location,
  currentDate,
  setCurrentDate,
  isLive,
  setIsLive,
  selectedBody = 'Sun',
  onSelectBody,
}: SolarDashboardProps) {
  // All 9 bodies real-time positions
  const allPositions = useMemo(() => {
    return getAllCelestialPositions(location, currentDate);
  }, [location, currentDate]);

  const activeMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;
  const coords: CelestialCoordinates = allPositions[selectedBody] || allPositions.Sun;

  // Active body rise, culmination, set
  const events: CelestialEvents = useMemo(() => {
    return getClientCelestialEvents(selectedBody, location, currentDate);
  }, [selectedBody, location, currentDate]);

  // Server comparison benchmark state
  const [compareServer, setCompareServer] = useState<boolean>(false);
  const [serverCoords, setServerCoords] = useState<SolarCoordinates | null>(null);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Handle server comparison
  useEffect(() => {
    if (!compareServer) return;

    let cancelled = false;
    setServerLoading(true);
    setServerError(null);

    fetchServerSolarPosition(
      location.latitude,
      location.longitude,
      location.elevationM,
      currentDate.toISOString(),
      selectedBody.toLowerCase()
    )
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
  }, [compareServer, location, currentDate, selectedBody]);

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
      {/* Top Controls: Target Selector Carousel */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
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

        {/* Multi-Body Selector Bar */}
        <div className="pt-2 border-t border-slate-800/80">
          <CelestialBodySelector
            selectedBody={selectedBody}
            onSelectBody={(body) => onSelectBody && onSelectBody(body)}
            allPositions={allPositions}
          />
        </div>
      </div>

      {/* Target Body Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-3xl shadow-inner select-none">
            {activeMeta.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-100">{activeMeta.name}</h2>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {activeMeta.category.replace('_', ' ')}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  coords.isAboveHorizon
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                }`}
              >
                {coords.isAboveHorizon ? 'Visible in Sky' : 'Below Horizon'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">{activeMeta.description}</p>
          </div>
        </div>

        {/* Phase Badge if Moon or illuminated planet */}
        {coords.phaseFraction !== undefined && (
          <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Illumination</span>
            <span className="text-lg font-bold font-mono text-amber-300">
              {Math.round(coords.phaseFraction * 100)}%
            </span>
            {coords.phaseName && (
              <span className="block text-[11px] text-slate-300 font-medium">{coords.phaseName}</span>
            )}
          </div>
        )}
      </div>

      {/* Main Coordinate Dials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Azimuth Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              Topocentric Azimuth
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
            Horizontal compass heading (0° North, 90° East, 180° South, 270° West).
          </p>
        </div>

        {/* Altitude Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Elevation Altitude
            </span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                coords.isAboveHorizon ? 'bg-emerald-950 text-emerald-300' : 'bg-indigo-950 text-indigo-300'
              }`}
            >
              {coords.isAboveHorizon ? 'Above Horizon' : 'Sub-Horizon'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${
                coords.isAboveHorizon ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              {coords.altitudeDeg >= 0 ? '+' : ''}
              {coords.altitudeDeg.toFixed(2)}
            </span>
            <span className="text-lg text-emerald-400 font-mono">°</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Refraction corrected: +{coords.refractionDeg.toFixed(3)}° atmospheric lift.
          </p>
        </div>

        {/* Distance Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              Observer Distance
            </span>
            {coords.magnitude !== undefined && (
              <span className="font-mono text-xs bg-slate-800/80 px-2 py-0.5 rounded text-sky-300">
                Mag {coords.magnitude.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-slate-100">
              {coords.distanceAu < 0.01
                ? Math.round(coords.distanceKm || 0).toLocaleString()
                : coords.distanceAu.toFixed(3)}
            </span>
            <span className="text-xs text-sky-400 font-mono uppercase">
              {coords.distanceAu < 0.01 ? 'km' : 'AU'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {coords.distanceAu < 0.01
              ? 'Lunar orbital distance from observer.'
              : `${(coords.distanceAu * 149597870.7).toLocaleString(undefined, { maximumFractionDigits: 0 })} km from Earth.`}
          </p>
        </div>

        {/* Rise, Transit, Set Events Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-400 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Transit Ephemeris
          </span>
          <div className="space-y-1.5 mt-2 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" /> Rise:
              </span>
              <strong className="text-slate-100">{formatTime(events.riseUtc)}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Peak:
              </span>
              <strong className="text-amber-300">{formatTime(events.culminationUtc)}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sunset className="w-3.5 h-3.5 text-orange-400" /> Set:
              </span>
              <strong className="text-slate-100">{formatTime(events.setUtc)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tonight's Planetary Visibility Matrix Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Solar System Visibility Matrix (Tonight at Observer Location)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Lat: {location.latitude.toFixed(2)}°, Lon: {location.longitude.toFixed(2)}°
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-3">Celestial Body</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Altitude</th>
                <th className="py-2.5 px-3">Azimuth</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Sky Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {CELESTIAL_BODY_LIST.map((body) => {
                const bPos = allPositions[body.id];
                if (!bPos) return null;
                const isTarget = selectedBody === body.id;

                return (
                  <tr
                    key={body.id}
                    className={`transition ${
                      isTarget
                        ? 'bg-amber-500/10 text-white'
                        : 'hover:bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold flex items-center gap-2">
                      <span className="text-base select-none">{body.symbol}</span>
                      <span>{body.name}</span>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-400">{body.category.replace('_', ' ')}</td>
                    <td className="py-3 px-3">
                      <span
                        className={bPos.isAboveHorizon ? 'text-amber-300 font-bold' : 'text-slate-500'}
                      >
                        {bPos.altitudeDeg >= 0 ? '+' : ''}
                        {bPos.altitudeDeg.toFixed(2)}°
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span>{bPos.azimuthDeg.toFixed(1)}° ({getCardinal(bPos.azimuthDeg)})</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {bPos.distanceAu < 0.01
                        ? `${Math.round(bPos.distanceKm || 0).toLocaleString()} km`
                        : `${bPos.distanceAu.toFixed(3)} AU`}
                    </td>
                    <td className="py-3 px-3">
                      {bPos.isAboveHorizon ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-500 border border-slate-800">
                          <XCircle className="w-3 h-3" /> Below Horizon
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectBody && onSelectBody(body.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                          isTarget
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isTarget ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NASA JPL DE421 Ephemeris Benchmark Comparison */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              NASA JPL DE421 Verification Benchmark ({activeMeta.name})
            </h3>
          </div>
          <button
            onClick={() => setCompareServer(!compareServer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              compareServer
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {compareServer ? 'Live Benchmark Active' : 'Run Backend Verification'}
          </button>
        </div>

        {compareServer && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono space-y-3">
            {serverLoading && <p className="text-slate-400 animate-pulse">Calculating NASA JPL DE421 ephemeris vector on FastAPI backend...</p>}
            {serverError && <p className="text-red-400">Backend error: {serverError}</p>}
            {serverCoords && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Client VSOP87 Engine</span>
                  <span className="text-slate-100 font-bold text-sm">
                    Az: {coords.azimuthDeg.toFixed(3)}° | Alt: {coords.altitudeDeg.toFixed(3)}°
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-amber-400 text-[10px] block">NASA JPL DE421 Backend</span>
                  <span className="text-amber-300 font-bold text-sm">
                    Az: {serverCoords.azimuthDeg.toFixed(3)}° | Alt: {serverCoords.altitudeDeg.toFixed(3)}°
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 text-[10px] block">Angular Residual Delta</span>
                  <span className="text-emerald-300 font-bold text-sm">
                    Δ: {(
                      Math.hypot(
                        coords.azimuthDeg - serverCoords.azimuthDeg,
                        coords.altitudeDeg - serverCoords.altitudeDeg
                      ) * 60
                    ).toFixed(2)}{' '}
                    arcmin
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

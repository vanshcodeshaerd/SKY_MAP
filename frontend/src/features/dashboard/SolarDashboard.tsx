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
  EyeOff,
  Calendar,
  MapPin,
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
import { useMissionProgressContext } from '../../hooks/useMissionProgress';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';
import { getPlanetThumbnail } from '../../services/planetTextures';

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
  const { setServerCompareState } = useMissionProgressContext();

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

  useEffect(() => {
    if (!compareServer) {
      setServerCompareState(false, null);
      return;
    }
    if (serverCoords) {
      const deltaDeg = Math.hypot(
        coords.azimuthDeg - serverCoords.azimuthDeg,
        coords.altitudeDeg - serverCoords.altitudeDeg
      );
      setServerCompareState(true, deltaDeg);
    } else {
      setServerCompareState(true, null);
    }
  }, [
    compareServer,
    serverCoords,
    coords.azimuthDeg,
    coords.altitudeDeg,
    setServerCompareState,
  ]);

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

  const activeThumbnail = getPlanetThumbnail(selectedBody, 128);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Compact Organized Observatory Toolbar */}
      <div className="bg-[#111622] border border-[#1e283c] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Mode Toggle & UTC Time */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`min-h-[34px] px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition ${
              isLive
                ? 'bg-[#182234] text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-[#161d2c] text-slate-300 hover:bg-[#1a2335] border border-[#1e283c]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span>{isLive ? 'Real-Time Tracking' : 'Simulation Mode'}</span>
          </button>

          <div className="flex items-center gap-2 text-slate-300 font-mono tabular-nums text-[11px] bg-[#0c1018] px-2.5 py-1.5 rounded border border-[#1a2233]">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>UTC: {currentDate.toISOString().replace('T', ' ').slice(0, 19)}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}° ({location.elevationM}m)
            </span>
          </div>
        </div>

        {/* Right: Simulation Time Input */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
            className="bg-[#0c1018] border border-[#1e283c] rounded px-2.5 py-1 text-slate-200 font-mono tabular-nums text-xs focus:border-amber-500 focus:outline-none"
            aria-label="Simulation Time Selector"
          />
        </div>
      </div>

      {/* 2. Cohesive Celestial Object Selector Bar */}
      <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-3">
        <div className="flex items-center justify-between text-xs mb-2 px-0.5">
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            Celestial Body Selector
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Green dot indicates currently in your sky tonight
          </span>
        </div>
        <CelestialBodySelector
          selectedBody={selectedBody}
          onSelectBody={(body) => onSelectBody && onSelectBody(body)}
          allPositions={allPositions}
        />
      </div>

      {/* 3. Selected Celestial Body Visual Anchor Card */}
      <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Realistic Thumbnail Disc */}
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-black/60 border border-white/15 flex items-center justify-center shadow-lg">
            {activeThumbnail ? (
              <img
                src={activeThumbnail}
                alt={activeMeta.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl select-none">{activeMeta.symbol}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">{activeMeta.name}</h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#161d2c] text-slate-300 border border-[#253147]">
                {activeMeta.category.replace('_', ' ')}
              </span>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded flex items-center gap-1.5 border ${
                  coords.isAboveHorizon
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                    : 'bg-[#161d2c] text-slate-400 border-[#253147]'
                }`}
              >
                {coords.isAboveHorizon ? (
                  <>
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>Visible in Sky</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-500" />
                    <span>Below Horizon</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {activeMeta.description}
            </p>
          </div>
        </div>

        {/* Phase / Illumination Status if present */}
        {coords.phaseFraction !== undefined && (
          <div className="bg-[#0c1018] px-4 py-2.5 rounded-md border border-[#1e283c] text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-mono uppercase block tracking-wider">Illumination</span>
            <span className="text-lg font-bold font-mono tabular-nums text-amber-300">
              {Math.round(coords.phaseFraction * 100)}%
            </span>
            {coords.phaseName && (
              <span className="block text-[11px] text-slate-300 font-medium">{coords.phaseName}</span>
            )}
          </div>
        )}
      </div>

      {/* 4. Grouped Aligned Measurement Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Azimuth Card */}
        <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Azimuth</span>
            </span>
            <span className="font-mono text-[11px] bg-[#161d2c] px-2 py-0.5 rounded text-amber-300 border border-[#253147]">
              {getCardinal(coords.azimuthDeg)} ({Math.round(coords.azimuthDeg)}°)
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold font-mono tabular-nums tracking-tight text-slate-100">
              {coords.azimuthDeg.toFixed(2)}
            </span>
            <span className="text-sm font-mono text-sky-400">°</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-normal">
            Horizontal compass bearing clockwise from True North.
          </p>
        </div>

        {/* Altitude Card */}
        <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Altitude</span>
            </span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                coords.isAboveHorizon
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : 'bg-[#161d2c] text-slate-400 border-[#253147]'
              }`}
            >
              {coords.isAboveHorizon ? 'Above Horizon' : 'Sub-Horizon'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-3xl font-bold font-mono tabular-nums tracking-tight ${
                coords.isAboveHorizon ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              {coords.altitudeDeg >= 0 ? '+' : ''}
              {coords.altitudeDeg.toFixed(2)}
            </span>
            <span className="text-sm font-mono text-sky-400">°</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-normal">
            Bennett refraction lift: +{coords.refractionDeg.toFixed(3)}°.
          </p>
        </div>

        {/* Distance Card */}
        <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Distance</span>
            </span>
            {coords.magnitude !== undefined && (
              <span className="font-mono text-[10px] bg-[#161d2c] px-2 py-0.5 rounded text-slate-300 border border-[#253147]">
                Mag {coords.magnitude.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold font-mono tabular-nums tracking-tight text-slate-100">
              {coords.distanceAu < 0.01
                ? Math.round(coords.distanceKm || 0).toLocaleString()
                : coords.distanceAu.toFixed(3)}
            </span>
            <span className="text-xs font-mono uppercase text-slate-400 ml-1">
              {coords.distanceAu < 0.01 ? 'km' : 'AU'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-normal">
            {coords.distanceAu < 0.01
              ? 'Topocentric distance from observer station.'
              : `${(coords.distanceAu * 149597870.7).toLocaleString(undefined, { maximumFractionDigits: 0 })} km from Earth.`}
          </p>
        </div>

        {/* Transit Ephemeris Card */}
        <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-400 mb-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Transit Ephemeris</span>
          </span>
          <div className="space-y-1.5 mt-1 text-xs font-mono tabular-nums">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" /> Rise:
              </span>
              <strong className="text-slate-100 font-medium">{formatTime(events.riseUtc)}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Peak:
              </span>
              <strong className="text-amber-300 font-medium">{formatTime(events.culminationUtc)}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sunset className="w-3.5 h-3.5 text-amber-500" /> Set:
              </span>
              <strong className="text-slate-100 font-medium">{formatTime(events.setUtc)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Planetary Visibility Matrix Table */}
      <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Solar System Visibility Matrix (Tonight at Observer Location)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Lat: {location.latitude.toFixed(2)}°, Lon: {location.longitude.toFixed(2)}°
          </span>
        </div>

        {/* Desktop View: Full Scannable Matrix Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0c1018] text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-[#1e283c]">
              <tr>
                <th className="py-2 px-3">Celestial Body</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Altitude</th>
                <th className="py-2 px-3 text-right">Azimuth</th>
                <th className="py-2 px-3 text-right">Distance</th>
                <th className="py-2 px-3">Sky Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e283c] font-mono text-[11px]">
              {CELESTIAL_BODY_LIST.map((body) => {
                const bPos = allPositions[body.id];
                if (!bPos) return null;
                const isTarget = selectedBody === body.id;
                const bodyThumb = getPlanetThumbnail(body.id, 40);

                return (
                  <tr
                    key={body.id}
                    className={`transition ${
                      isTarget
                        ? 'bg-[#162033] text-white'
                        : 'hover:bg-[#141b29] text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                        {bodyThumb ? (
                          <img src={bodyThumb} alt={body.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs select-none">{body.symbol}</span>
                        )}
                      </div>
                      <span className="font-sans text-xs">{body.name}</span>
                    </td>
                    <td className="py-2.5 px-3 capitalize text-slate-400 font-sans text-xs">
                      {body.category.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className={bPos.isAboveHorizon ? 'text-sky-300 font-bold' : 'text-slate-500'}>
                        {bPos.altitudeDeg >= 0 ? '+' : ''}
                        {bPos.altitudeDeg.toFixed(2)}°
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">
                      {bPos.azimuthDeg.toFixed(1)}° ({getCardinal(bPos.azimuthDeg)})
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                      {bPos.distanceAu < 0.01
                        ? `${Math.round(bPos.distanceKm || 0).toLocaleString()} km`
                        : `${bPos.distanceAu.toFixed(3)} AU`}
                    </td>
                    <td className="py-2.5 px-3">
                      {bPos.isAboveHorizon ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 font-sans font-medium">
                          <Eye className="w-3 h-3 text-emerald-400" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-[#161d2c] text-slate-500 border border-[#253147] font-sans">
                          <EyeOff className="w-3 h-3 text-slate-600" /> Below Horizon
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectBody && onSelectBody(body.id)}
                        className={`min-h-[28px] px-2.5 py-1 rounded text-[10px] font-sans font-medium transition ${
                          isTarget
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-[#161d2c] hover:bg-[#1d273b] text-slate-300 border border-[#253147]'
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

        {/* Mobile View: Touch-Friendly Scannable Cards */}
        <div className="md:hidden space-y-2">
          {CELESTIAL_BODY_LIST.map((body) => {
            const bPos = allPositions[body.id];
            if (!bPos) return null;
            const isTarget = selectedBody === body.id;
            const bodyThumb = getPlanetThumbnail(body.id, 48);

            return (
              <div
                key={body.id}
                onClick={() => onSelectBody && onSelectBody(body.id)}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  isTarget
                    ? 'bg-[#162033] border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
                    : 'bg-[#0d121c] border-[#1e283c] hover:bg-[#131926]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                      {bodyThumb ? (
                        <img src={bodyThumb} alt={body.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs select-none">{body.symbol}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <span>{body.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal capitalize">
                          ({body.category.replace('_', ' ')})
                        </span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Az: {bPos.azimuthDeg.toFixed(1)}° ({getCardinal(bPos.azimuthDeg)})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-xs">
                      <span className={bPos.isAboveHorizon ? 'text-sky-300' : 'text-slate-500'}>
                        {bPos.altitudeDeg >= 0 ? '+' : ''}{bPos.altitudeDeg.toFixed(1)}°
                      </span>
                    </div>
                    <div className="mt-0.5">
                      {bPos.isAboveHorizon ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 font-medium">
                          <Eye className="w-2.5 h-2.5" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] bg-[#161d2c] text-slate-500 border border-[#253147]">
                          <EyeOff className="w-2.5 h-2.5" /> Below
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#1e283c]/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>
                    Dist:{' '}
                    <strong className="text-slate-300">
                      {bPos.distanceAu < 0.01
                        ? `${Math.round(bPos.distanceKm || 0).toLocaleString()} km`
                        : `${bPos.distanceAu.toFixed(3)} AU`}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBody && onSelectBody(body.id);
                    }}
                    className={`min-h-[30px] px-3 py-1 rounded text-[10px] font-sans font-medium transition ${
                      isTarget
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-[#161d2c] hover:bg-[#1d273b] text-slate-300 border border-[#253147]'
                    }`}
                  >
                    {isTarget ? 'Active' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Secondary Backend Ephemeris Verification Tool */}
      <div className="bg-[#111622] border border-[#1e283c] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                NASA JPL DE421 Ephemeris Verification ({activeMeta.name})
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Local VSOP87 analytical calculations operate with 0ms latency in the browser. Use this tool to verify client accuracy against server-side JPL ephemerides.
            </p>
          </div>
          <button
            onClick={() => setCompareServer(!compareServer)}
            className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition ${
              compareServer
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-[#161d2c] text-slate-300 hover:bg-[#1d273b] border border-[#253147]'
            }`}
          >
            {compareServer ? 'Close Benchmark' : 'Run Backend Verification'}
          </button>
        </div>

        {compareServer && (
          <div className="p-3 rounded-md bg-[#0c1018] border border-[#1e283c] text-xs font-mono space-y-3">
            {serverLoading && <p className="text-slate-400 animate-pulse">Calculating NASA JPL DE421 ephemeris vector via FastAPI...</p>}
            {serverError && (
              <p className="text-amber-400/90 text-[11px]">
                Backend server currently offline. Local VSOP87 client calculations remain 100% operational.
              </p>
            )}
            {serverCoords && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-[#111622] p-2.5 rounded border border-[#1e283c]">
                  <span className="text-slate-400 text-[10px] block">Client VSOP87 Engine</span>
                  <span className="text-slate-100 font-bold text-xs tabular-nums">
                    Az: {coords.azimuthDeg.toFixed(3)}° | Alt: {coords.altitudeDeg.toFixed(3)}°
                  </span>
                </div>
                <div className="bg-[#111622] p-2.5 rounded border border-[#1e283c]">
                  <span className="text-amber-400 text-[10px] block">NASA JPL DE421 Backend</span>
                  <span className="text-amber-300 font-bold text-xs tabular-nums">
                    Az: {serverCoords.azimuthDeg.toFixed(3)}° | Alt: {serverCoords.altitudeDeg.toFixed(3)}°
                  </span>
                </div>
                <div className="bg-[#111622] p-2.5 rounded border border-[#1e283c]">
                  <span className="text-emerald-400 text-[10px] block">Angular Residual Delta</span>
                  <span className="text-emerald-300 font-bold text-xs tabular-nums">
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

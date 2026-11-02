import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  X,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  Zap,
  Globe,
  Radio,
} from 'lucide-react';
import { CelestialBodyId, CelestialCoordinates, CELESTIAL_BODIES } from '../../types/astronomy';
import {
  getPlanetTexture,
  getPlanetBumpMap,
  getSaturnRingTexture,
  loadSolarSystemScopeTexture,
} from '../../services/planetTextures';

interface PlanetDiscoveryModalProps {
  bodyId: CelestialBodyId;
  coordinates?: CelestialCoordinates;
  onClose: () => void;
  onNavigateTo3DExplorer?: (bodyId: CelestialBodyId) => void;
}

export function PlanetDiscoveryModal({
  bodyId,
  coordinates,
  onClose,
  onNavigateTo3DExplorer,
}: PlanetDiscoveryModalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'geology' | 'facts'>('overview');
  const body = CELESTIAL_BODIES[bodyId] || CELESTIAL_BODIES.Sun;

  // Real-time distance and light travel time calculation
  const distanceAu = coordinates?.distanceAu ?? (bodyId === 'Sun' ? 1.0 : 1.5);
  const distanceKm =
    coordinates?.distanceKm ??
    (bodyId === 'Moon' ? 384400 : Math.round(distanceAu * 149597870.7));

  // Light travel time in seconds: t = d / c
  const lightTimeSec = distanceKm / 299792.458;
  const lightTimeFormatted =
    lightTimeSec < 60
      ? `${lightTimeSec.toFixed(1)} seconds`
      : `${(lightTimeSec / 60).toFixed(1)} minutes`;

  // Interactive 3D Planet Preview with Three.js
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 2.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Back rim light for cinematic silhouette
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // Planet Mesh
    const isSun = body.id === 'Sun';
    const radius = 1.65;
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const texture = getPlanetTexture(body.id);
    const bumpMap = getPlanetBumpMap(body.id);

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: isSun ? undefined : bumpMap,
      bumpScale: body.id === 'Moon' || body.id === 'Mercury' ? 0.25 : (body.id === 'Mars' ? 0.2 : 0.06),
      roughness: isSun ? 0.2 : (body.id === 'Moon' || body.id === 'Mercury' ? 0.85 : 0.55),
      metalness: 0.05,
      emissive: isSun ? new THREE.Color(0xf59e0b) : new THREE.Color(0x000000),
      emissiveIntensity: isSun ? 0.9 : 0,
    });

    // Seamlessly upgrade with 2K Solar System Scope texture
    loadSolarSystemScopeTexture(body.id, (realTex) => {
      mat.map = realTex;
      mat.needsUpdate = true;
    });

    const mesh = new THREE.Mesh(geo, mat);

    // Scientifically authentic axial tilt
    if (body.axialTiltDeg !== undefined) {
      mesh.rotation.z = THREE.MathUtils.degToRad(body.axialTiltDeg);
    }
    scene.add(mesh);

    // Saturn Cassini Rings
    if (body.hasRings) {
      const ringGeo = new THREE.RingGeometry(radius * 1.35, radius * 2.45, 64);
      ringGeo.rotateX(Math.PI / 2.7);
      const ringTexture = getSaturnRingTexture();
      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      loadSolarSystemScopeTexture('SaturnRing', (ringTex) => {
        ringMat.map = ringTex;
        ringMat.needsUpdate = true;
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.add(ringMesh);
    }

    // Atmospheric Glow Shell
    if (['Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(body.id)) {
      const atmoGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
      const atmoColor =
        body.id === 'Mars'
          ? 0xef4444
          : body.id === 'Venus'
          ? 0xfef08a
          : body.id === 'Uranus'
          ? 0x38bdf8
          : body.id === 'Neptune'
          ? 0x3b82f6
          : 0xf59e0b;
      const atmoMat = new THREE.MeshBasicMaterial({
        color: atmoColor,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      mesh.add(atmoMesh);
    }

    // Touch/Pointer Drag Interaction for 360 Inspection
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      mesh.rotateY(dx * 0.01);
      mesh.rotation.x += dy * 0.005;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        mesh.rotateY(0.004);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, [body]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-400 to-indigo-500" />

        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{body.symbol}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">{body.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Target Locked
                </span>
              </div>
              <p className="text-xs text-slate-400">{body.scientificInfo.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Pop-Up and Resume AR Scan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* 3D Interactive Planet Canvas Box */}
          <div className="relative w-full h-56 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1.5 pointer-events-none">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Drag to rotate 3D sphere · 2K NASA texture</span>
            </div>
            <div className="absolute top-2 right-3 text-[10px] text-sky-300 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-800 pointer-events-none font-mono">
              Tilt: {body.axialTiltDeg}°
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Distance & Stats</span>
            </button>
            <button
              onClick={() => setActiveTab('geology')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'geology'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Structure & Minerals</span>
            </button>
            <button
              onClick={() => setActiveTab('facts')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'facts'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fun Facts</span>
            </button>
          </div>

          {/* TAB 1: Distance & Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-3 animate-fade-in">
              {/* Distance from Earth Callout */}
              <div className="bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold block">
                    Real-Time Distance from Earth
                  </span>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl font-bold font-mono text-white">
                      {distanceKm > 1000000
                        ? `${(distanceKm / 1000000).toFixed(1)}M km`
                        : `${distanceKm.toLocaleString()} km`}
                    </span>
                    <span className="text-xs text-sky-300 font-mono">({distanceAu.toFixed(3)} AU)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Light Travel Time
                  </span>
                  <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1 justify-end pt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lightTimeFormatted}</span>
                  </span>
                </div>
              </div>

              {/* Physical Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Diameter</span>
                  <span className="text-white font-mono font-medium">{body.scientificInfo.diameterKm.toLocaleString()} km</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Surface Gravity</span>
                  <span className="text-emerald-400 font-mono font-medium">{body.surfaceGravity}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Day Length (Spin)</span>
                  <span className="text-white font-mono font-medium">{body.scientificInfo.dayLength}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Orbital Year</span>
                  <span className="text-white font-mono font-medium">{body.scientificInfo.yearLength}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Temperature</span>
                  <span className="text-amber-300 font-mono font-medium">{body.scientificInfo.temperature}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Known Moons</span>
                  <span className="text-sky-300 font-mono font-medium">{body.scientificInfo.moons} Moons</span>
                </div>
              </div>

              {coordinates && (
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span>Current Az: <strong className="text-amber-400">{coordinates.azimuthDeg.toFixed(1)}°</strong></span>
                  <span>Alt: <strong className={coordinates.altitudeDeg >= 0 ? 'text-emerald-400' : 'text-indigo-400'}>
                    {coordinates.altitudeDeg >= 0 ? '+' : ''}{coordinates.altitudeDeg.toFixed(1)}°
                  </strong></span>
                  <span>Status: <strong className={coordinates.isAboveHorizon ? 'text-emerald-400' : 'text-indigo-400'}>
                    {coordinates.isAboveHorizon ? 'Above Horizon' : 'Sub-Horizon'}
                  </strong></span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Structure & Minerals */}
          {activeTab === 'geology' && (
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Internal Structure Cross-Section</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-amber-400 font-bold text-[11px]">Core: </span>
                    <span className="text-slate-300">{body.composition.core}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-sky-400 font-bold text-[11px]">Mantle: </span>
                    <span className="text-slate-300">{body.composition.mantle}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-emerald-400 font-bold text-[11px]">Crust / Surface: </span>
                    <span className="text-slate-300">{body.composition.crust}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-indigo-400 font-bold text-[11px]">Atmosphere: </span>
                    <span className="text-slate-300">{body.composition.atmosphere}</span>
                  </div>
                </div>
              </div>

              {/* Minerals & Chemical Compounds Tag Cloud */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Key Minerals & Elements Discovered</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {body.mineralsAndElements.map((mineral) => (
                    <span
                      key={mineral}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-950/60 border border-sky-500/30 text-sky-200"
                    >
                      {mineral}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Mind-Blowing Fun Facts */}
          {activeTab === 'facts' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-950 border border-amber-500/30 flex items-start gap-3">
                <span className="text-xl leading-none">💡</span>
                <div>
                  <h5 className="text-xs font-bold text-amber-300">NASA Science Insight</h5>
                  <p className="text-xs text-slate-200 pt-0.5 leading-relaxed">{body.scientificInfo.specialFact}</p>
                </div>
              </div>

              <div className="space-y-2">
                {body.funFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 text-xs leading-relaxed text-slate-300"
                  >
                    <span className="text-amber-400 font-bold font-mono text-sm">#{idx + 1}</span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          {onNavigateTo3DExplorer && (
            <button
              onClick={() => onNavigateTo3DExplorer(body.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 transition flex items-center gap-1.5 border border-slate-700"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Track in 3D Sky Explorer</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <span>Continue Scanning Sky</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

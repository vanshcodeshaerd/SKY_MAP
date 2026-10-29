import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Compass,
  Sun as SunIcon,
  Play,
  Pause,
  Clock,
  Sunrise,
  Sunset,
  Eye,
  Layers,
  AlertCircle
} from 'lucide-react';
import { GeodeticLocation, SolarCoordinates, SolarEvents } from '../../types/astronomy';
import { getClientSolarPosition, getClientSolarEvents, getClientDiurnalPath } from '../../services/astronomyEngine';
import { azAltToEnuVector, enuToThreeJsVector } from '../../services/coordinateTransforms';

interface ThreeSkyExplorerProps {
  location: GeodeticLocation;
  currentDate: Date;
  setCurrentDate?: (d: Date) => void;
  isLive?: boolean;
  setIsLive?: (live: boolean) => void;
}

export function ThreeSkyExplorer({
  location,
  currentDate,
  setCurrentDate,
  isLive = true,
  setIsLive,
}: ThreeSkyExplorerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // References to persistent Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const sunCoronaRef = useRef<THREE.Sprite | null>(null);
  const sunRayRef = useRef<THREE.Line | null>(null);
  const sunProjectionRef = useRef<THREE.Line | null>(null);
  const sunSpriteLabelRef = useRef<THREE.Sprite | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const groundDiscRef = useRef<THREE.Mesh | null>(null);
  const diurnalGroupRef = useRef<THREE.Group | null>(null);

  // Simulation playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10); // minutes per second
  const [groundMode, setGroundMode] = useState<'translucent' | 'solid' | 'wireframe'>('translucent');

  // Calculate current coordinates and daily solar events
  const coords: SolarCoordinates = useMemo(() => {
    return getClientSolarPosition(location, currentDate);
  }, [location, currentDate]);

  const solarEvents: SolarEvents = useMemo(() => {
    return getClientSolarEvents(location, currentDate);
  }, [location, currentDate]);

  // Current day of year for spline recalculation
  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

  // Time in minutes from midnight (0 - 1439)
  const currentMinutes = useMemo(() => {
    return currentDate.getHours() * 60 + currentDate.getMinutes() + currentDate.getSeconds() / 60;
  }, [currentDate]);

  // Handle Time Slider change
  const handleSliderChange = useCallback((minutes: number) => {
    if (setIsLive) setIsLive(false);
    setIsPlaying(false);
    const newDate = new Date(currentDate);
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    newDate.setHours(hours, mins, secs);
    if (setCurrentDate) setCurrentDate(newDate);
  }, [currentDate, setCurrentDate, setIsLive]);

  // Jump to specific time preset
  const jumpToTime = useCallback((targetIso: string | null) => {
    if (!targetIso || !setCurrentDate) return;
    if (setIsLive) setIsLive(false);
    setIsPlaying(false);
    setCurrentDate(new Date(targetIso));
  }, [setCurrentDate, setIsLive]);

  const currentDateRef = useRef(currentDate);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || !setCurrentDate) return;
    const interval = setInterval(() => {
      const next = new Date(currentDateRef.current.getTime() + playbackSpeed * 60 * 1000 * 0.1);
      setCurrentDate(next);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setCurrentDate]);

  // Helper to create glowing sprite texture
  const createCoronaTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 240, 180, 1.0)');
      gradient.addColorStop(0.25, 'rgba(245, 158, 11, 0.7)');
      gradient.addColorStop(0.6, 'rgba(234, 88, 12, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  };

  // Helper to create text sprite
  const createTextSprite = (text: string, color: string = '#F59E0B', size: number = 44) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.font = `bold ${size}px monospace, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 8, 1);
    return sprite;
  };

  // Update Sun Label Sprite Text
  const updateSunLabel = (text: string, color: string = '#FCD34D') => {
    if (!sunSpriteLabelRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect ? ctx.roundRect(16, 24, 224, 80, 12) : ctx.fillRect(16, 24, 224, 80);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    sunSpriteLabelRef.current.material.map = texture;
    sunSpriteLabelRef.current.material.needsUpdate = true;
  };

  // 1. Initial Scene Setup (Mount Once)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 520;

    // A. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 2000);
    camera.position.set(0, 55, 140);
    cameraRef.current = camera;

    // B. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // C. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.minDistance = 25;
    controls.maxDistance = 400;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // D. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xfff5d0, 2.5, 500, 0.5);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // E. Horizon Ground Disc (Z = 0 in ENU -> Y = 0 in Three.js)
    const horizonRadius = 80;
    const horizonGeo = new THREE.CircleGeometry(horizonRadius, 64);
    horizonGeo.rotateX(-Math.PI / 2);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const horizonDisc = new THREE.Mesh(horizonGeo, horizonMat);
    scene.add(horizonDisc);
    groundDiscRef.current = horizonDisc;

    // Outer Horizon Boundary Circle
    const boundaryPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      boundaryPoints.push(new THREE.Vector3(Math.cos(theta) * horizonRadius, 0, Math.sin(theta) * horizonRadius));
    }
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
    const boundaryLine = new THREE.Line(
      boundaryGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    scene.add(boundaryLine);

    // Concentric Compass / Distance Rings on Ground Disc (20, 40, 60, 80)
    [25, 50, 75].forEach((rad) => {
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * rad, 0, Math.sin(theta) * rad));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringLine = new THREE.Line(
        ringGeo,
        new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 })
      );
      scene.add(ringLine);
    });

    // Crosshair Axis Lines on Ground (North-South & East-West)
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -horizonRadius),
      new THREE.Vector3(0, 0, horizonRadius),
      new THREE.Vector3(-horizonRadius, 0, 0),
      new THREE.Vector3(horizonRadius, 0, 0),
    ]);
    const axisLine = new THREE.LineSegments(
      axisGeo,
      new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.6 })
    );
    scene.add(axisLine);

    // F. Cardinal Direction Sprites
    const spriteN = createTextSprite('NORTH', '#ef4444', 40);
    spriteN.position.set(0, 2, -horizonRadius - 8);
    scene.add(spriteN);

    const spriteS = createTextSprite('SOUTH', '#38bdf8', 40);
    spriteS.position.set(0, 2, horizonRadius + 8);
    scene.add(spriteS);

    const spriteE = createTextSprite('EAST', '#f59e0b', 40);
    spriteE.position.set(horizonRadius + 8, 2, 0);
    scene.add(spriteE);

    const spriteW = createTextSprite('WEST', '#f59e0b', 40);
    spriteW.position.set(-horizonRadius - 8, 2, 0);
    scene.add(spriteW);

    const spriteZ = createTextSprite('ZENITH (90°)', '#a855f7', 36);
    spriteZ.position.set(0, horizonRadius + 8, 0);
    scene.add(spriteZ);

    // G. Observer Center Reticle
    const observerGeo = new THREE.CylinderGeometry(0.8, 1.4, 3, 16);
    const observerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const observerMesh = new THREE.Mesh(observerGeo, observerMat);
    observerMesh.position.set(0, 1.5, 0);
    scene.add(observerMesh);

    // Observer Zenith Pole
    const zenithPoleGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, horizonRadius, 0),
    ]);
    const zenithPole = new THREE.Line(
      zenithPoleGeo,
      new THREE.LineDashedMaterial({ color: 0xa855f7, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.35 })
    );
    zenithPole.computeLineDistances();
    scene.add(zenithPole);

    // H. Celestial Sky Dome Wireframe
    const domeGeo = new THREE.SphereGeometry(horizonRadius, 32, 16);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    scene.add(domeMesh);

    // I. Virtual 3D Sun Sphere & Corona
    const sunGeo = new THREE.SphereGeometry(4.8, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4cc });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Corona Sprite Halo
    const coronaTexture = createCoronaTexture();
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coronaSprite = new THREE.Sprite(coronaMat);
    coronaSprite.scale.set(24, 24, 1);
    sunMesh.add(coronaSprite);
    sunCoronaRef.current = coronaSprite;

    // Sun Floating Label
    const sunLabel = createTextSprite('☀️ SUN', '#F59E0B', 32);
    sunLabel.position.set(0, 9, 0);
    sunMesh.add(sunLabel);
    sunSpriteLabelRef.current = sunLabel;

    // J. Sun Direct Vector Ray (Observer -> Sun)
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 40, 0)]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75, linewidth: 2 });
    const sunRay = new THREE.Line(rayGeo, rayMat);
    scene.add(sunRay);
    sunRayRef.current = sunRay;

    // K. Ground Projection Line (Shadow Azimuth Triangle)
    const projGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const projMat = new THREE.Line(
      projGeo,
      new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 2, gapSize: 1, transparent: true, opacity: 0.5 })
    );
    projMat.computeLineDistances();
    scene.add(projMat);
    sunProjectionRef.current = projMat;

    // Group for Diurnal Path Spline Lines
    const diurnalGroup = new THREE.Group();
    scene.add(diurnalGroup);
    diurnalGroupRef.current = diurnalGroup;

    // L. 60 FPS Render Loop with Smooth Damping
    let animId: number;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Subtle Sun corona pulsation
      if (sunCoronaRef.current) {
        const pulse = 22 + 2.5 * Math.sin(time * 0.003);
        sunCoronaRef.current.scale.set(pulse, pulse, 1);
      }

      renderer.render(scene, camera);
    };
    animate(0);

    // M. Responsive Resize Observer
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup when component unmounts
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [location.latitude, location.longitude, location.elevationM]);

  // 2. Diurnal Trajectory Spline Update (Recalculate when Day or Location changes)
  useEffect(() => {
    const diurnalGroup = diurnalGroupRef.current;
    if (!diurnalGroup) return;

    // Clear previous trajectory lines
    while (diurnalGroup.children.length > 0) {
      const child = diurnalGroup.children[0];
      diurnalGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    const waypoints = getClientDiurnalPath(location, currentDate, 10);
    const dayPoints: THREE.Vector3[] = [];
    const nightPoints: THREE.Vector3[] = [];

    waypoints.forEach((wp) => {
      const enu = new THREE.Vector3(wp.vectorEnu[0], wp.vectorEnu[1], wp.vectorEnu[2]);
      const v3 = enuToThreeJsVector(enu, 80);
      if (wp.isVisible) {
        dayPoints.push(v3);
      } else {
        nightPoints.push(v3);
      }
    });

    if (dayPoints.length > 2) {
      const daySpline = new THREE.CatmullRomCurve3(dayPoints);
      const daySplineGeo = new THREE.BufferGeometry().setFromPoints(daySpline.getPoints(120));
      const dayLine = new THREE.Line(
        daySplineGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 })
      );
      diurnalGroup.add(dayLine);
    }

    if (nightPoints.length > 2) {
      const nightSpline = new THREE.CatmullRomCurve3(nightPoints);
      const nightSplineGeo = new THREE.BufferGeometry().setFromPoints(nightSpline.getPoints(120));
      const nightLine = new THREE.Line(
        nightSplineGeo,
        new THREE.LineDashedMaterial({ color: 0x3b82f6, dashSize: 2.5, gapSize: 1.5, transparent: true, opacity: 0.45 })
      );
      nightLine.computeLineDistances();
      diurnalGroup.add(nightLine);
    }
  }, [location, dateKey]);

  // 3. Real-Time Sun Position, Vectors & Material Updates
  useEffect(() => {
    if (!sunMeshRef.current || !sunRayRef.current || !pointLightRef.current) return;

    const currentEnu = azAltToEnuVector(coords.azimuthDeg, coords.altitudeDeg);
    const sunPos = enuToThreeJsVector(currentEnu, 80);

    // Update 3D Sun position
    sunMeshRef.current.position.copy(sunPos);
    pointLightRef.current.position.copy(sunPos);

    // Update Ray from Observer Center to Sun
    sunRayRef.current.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), sunPos]);

    // Update Ground Projection (Azimuth footprint on horizon plane)
    if (sunProjectionRef.current) {
      const groundFootprint = new THREE.Vector3(sunPos.x, 0, sunPos.z);
      sunProjectionRef.current.geometry.setFromPoints([
        new THREE.Vector3(0, 0, 0),
        groundFootprint,
        sunPos,
      ]);
      sunProjectionRef.current.computeLineDistances();
    }

    // Color and visual adaptations based on whether the Sun is Above or Below Horizon
    const isAbove = coords.altitudeDeg >= 0;
    if (isAbove) {
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xfff5cc);
      (sunRayRef.current.material as THREE.LineBasicMaterial).color.setHex(0xf59e0b);
      pointLightRef.current.intensity = 2.5;
      updateSunLabel(`☀️ +${coords.altitudeDeg.toFixed(1)}°`, '#F59E0B');
    } else {
      // Sub-horizon: Dim amber/cyan glow so user can track where the Sun is under the Earth
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(0x6366f1);
      (sunRayRef.current.material as THREE.LineBasicMaterial).color.setHex(0x3b82f6);
      pointLightRef.current.intensity = 0.5;
      updateSunLabel(`🌙 ${coords.altitudeDeg.toFixed(1)}°`, '#818cf8');
    }
  }, [coords]);

  // 4. Ground Opacity Mode Switch
  useEffect(() => {
    if (!groundDiscRef.current) return;
    const mat = groundDiscRef.current.material as THREE.MeshBasicMaterial;
    if (groundMode === 'solid') {
      mat.opacity = 0.85;
      mat.wireframe = false;
    } else if (groundMode === 'translucent') {
      mat.opacity = 0.35;
      mat.wireframe = false;
    } else if (groundMode === 'wireframe') {
      mat.opacity = 0.15;
      mat.wireframe = true;
    }
    mat.needsUpdate = true;
  }, [groundMode]);

  // Camera Presets
  const setCameraView = (type: 'default' | 'top' | 'focusSun' | 'ground') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (type === 'default') {
      camera.position.set(0, 55, 140);
      controls.target.set(0, 0, 0);
    } else if (type === 'top') {
      camera.position.set(0, 180, 0.1);
      controls.target.set(0, 0, 0);
    } else if (type === 'ground') {
      camera.position.set(0, 3, 10);
      controls.target.set(0, 15, -40);
    } else if (type === 'focusSun' && sunMeshRef.current) {
      const sunPos = sunMeshRef.current.position;
      camera.position.set(sunPos.x * 0.4, sunPos.y * 0.4 + 20, sunPos.z * 0.4 + 40);
      controls.target.copy(sunPos);
    }
    controls.update();
  };

  const formatClock = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const isNight = coords.altitudeDeg < 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Night Time Sub-Horizon Alert & Jump to Noon Button */}
      {isNight && (
        <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-900/60 text-indigo-300">
              <AlertCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                Sun is currently below the horizon ({coords.altitudeDeg.toFixed(1)}° altitude)
              </p>
              <p className="text-indigo-300/80 text-[11px]">
                It is currently nighttime at this observer location. The 3D Sun is glowing purple under the translucent ground disc. Jump to daytime or scrub the slider below!
              </p>
            </div>
          </div>
          <button
            onClick={() => jumpToTime(solarEvents.solarNoonUtc)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center gap-2 whitespace-nowrap transition shadow-lg shadow-amber-500/20"
          >
            <SunIcon className="w-4 h-4 fill-slate-950" />
            <span>☀️ Jump to Solar Noon (+60°)</span>
          </button>
        </div>
      )}

      {/* 3D Viewport Card */}
      <div className="glass-panel rounded-2xl overflow-hidden relative border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs space-y-1 shadow-lg">
          <div className="flex items-center gap-2 text-slate-100 font-semibold">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>3D Celestial Horizon Sphere (Three.js)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
            <span>Azimuth: <strong className="text-amber-400">{coords.azimuthDeg.toFixed(2)}°</strong></span>
            <span>Altitude: <strong className={isNight ? 'text-indigo-400' : 'text-amber-400'}>{coords.altitudeDeg.toFixed(2)}°</strong></span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isNight ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800' : 'bg-amber-950/80 text-amber-300 border border-amber-800'}`}>
              {isNight ? 'Sub-Horizon' : 'Above Horizon'}
            </span>
          </div>
        </div>

        {/* Camera Preset Quick Bar */}
        <div className="absolute top-4 right-4 z-10 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 shadow-lg">
          <button
            onClick={() => setCameraView('default')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Angled Perspective View"
          >
            Cinematic (45°)
          </button>
          <button
            onClick={() => setCameraView('top')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Top-down Zenith View"
          >
            Zenith (Top)
          </button>
          <button
            onClick={() => setCameraView('focusSun')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-amber-300 hover:bg-amber-950/60 border border-amber-500/30 transition flex items-center gap-1"
            title="Focus camera directly on the 3D Sun"
          >
            <SunIcon className="w-3 h-3 text-amber-400" />
            Focus Sun
          </button>
          <button
            onClick={() => setCameraView('ground')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Standing at Center Looking Up"
          >
            Observer View
          </button>
        </div>

        {/* Orbit Control Hint */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Left-Drag: <strong>Orbit</strong> | Right-Drag: <strong>Pan</strong> | Scroll: <strong>Zoom</strong></span>
        </div>

        {/* Ground Mode Toggle */}
        <div className="absolute bottom-4 right-4 z-10 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Ground Disc:</span>
          {(['translucent', 'solid', 'wireframe'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGroundMode(mode)}
              className={`px-2 py-0.5 rounded capitalize text-[10px] transition ${
                groundMode === mode
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Three.js Canvas Container */}
        <div
          ref={mountRef}
          className="w-full h-[540px] cursor-grab active:cursor-grabbing select-none"
        />
      </div>

      {/* Interactive 24-Hour Time Slider & Motion Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause Orbit' : 'Play Orbit Animation'}</span>
            </button>

            {/* Playback speed selector */}
            {isPlaying && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Speed:</span>
                {[5, 15, 60].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      playbackSpeed === s ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}m/s
                  </button>
                ))}
              </div>
            )}

            {/* Real-time Live Sync Toggle */}
            <button
              onClick={() => {
                if (setIsLive) setIsLive(true);
                setIsPlaying(false);
                if (setCurrentDate) setCurrentDate(new Date());
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>{isLive ? 'Live Clock Synced' : 'Sync Real-Time'}</span>
            </button>
          </div>

          {/* Quick Sun Event Jump Presets */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpToTime(solarEvents.sunriseUtc)}
              disabled={!solarEvents.sunriseUtc}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Jump to Sunrise"
            >
              <Sunrise className="w-3.5 h-3.5 text-amber-400" />
              <span>Sunrise</span>
            </button>

            <button
              onClick={() => jumpToTime(solarEvents.solarNoonUtc)}
              disabled={!solarEvents.solarNoonUtc}
              className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 transition font-semibold disabled:opacity-50"
              title="Jump to Solar Noon (Peak Sun Altitude)"
            >
              <SunIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Solar Noon (Peak)</span>
            </button>

            <button
              onClick={() => jumpToTime(solarEvents.sunsetUtc)}
              disabled={!solarEvents.sunsetUtc}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Jump to Sunset"
            >
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
              <span>Sunset</span>
            </button>
          </div>
        </div>

        {/* 24-Hour Timeline Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulation Time:</span>
              <strong className="text-amber-300 text-sm">{formatClock(currentMinutes)}</strong>
            </span>
            <span className="text-slate-500 text-[11px]">
              Drag slider to glide the 3D Sun across 24h diurnal trajectory
            </span>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={1439}
              step={1}
              value={Math.round(currentMinutes)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>

          {/* Scale Markers */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
            <span>00:00 (Midnight)</span>
            <span>06:00 (Dawn)</span>
            <span className="text-amber-400 font-bold">12:00 (Noon)</span>
            <span>18:00 (Dusk)</span>
            <span>23:59</span>
          </div>
        </div>
      </div>
    </div>
  );
}

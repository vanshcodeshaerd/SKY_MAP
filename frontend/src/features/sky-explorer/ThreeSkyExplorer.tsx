import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Compass,
  Play,
  Pause,
  Clock,
  Sunrise,
  Sunset,
  Eye,
  Layers,
  AlertCircle,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import {
  GeodeticLocation,
  DiurnalWaypoint,
  CelestialBodyId,
  CelestialCoordinates,
  CelestialEvents,
  CELESTIAL_BODIES,
  CELESTIAL_BODY_LIST,
} from '../../types/astronomy';
import {
  getAllCelestialPositions,
  getClientCelestialDiurnalPath,
  getClientCelestialEvents,
} from '../../services/astronomyEngine';
import { azAltToEnuVector, enuToThreeJsVector } from '../../services/coordinateTransforms';
import { getPlanetTexture, getSaturnRingTexture } from '../../services/planetTextures';
import { calculateStarPositions, CONSTELLATION_DEFS, CalculatedStar } from '../../services/starCatalog';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';

interface ThreeSkyExplorerProps {
  location: GeodeticLocation;
  currentDate: Date;
  setCurrentDate?: (d: Date) => void;
  isLive?: boolean;
  setIsLive?: (live: boolean) => void;
  selectedBody?: CelestialBodyId;
  onSelectBody?: (body: CelestialBodyId) => void;
}

export function ThreeSkyExplorer({
  location,
  currentDate,
  setCurrentDate,
  isLive = true,
  setIsLive,
  selectedBody = 'Sun',
  onSelectBody,
}: ThreeSkyExplorerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // References to persistent Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dictionary of meshes and labels for all 9 bodies
  const bodyMeshesRef = useRef<Record<CelestialBodyId, THREE.Mesh | null>>({
    Sun: null,
    Moon: null,
    Mercury: null,
    Venus: null,
    Mars: null,
    Jupiter: null,
    Saturn: null,
    Uranus: null,
    Neptune: null,
  });

  const bodyLabelsRef = useRef<Record<CelestialBodyId, THREE.Sprite | null>>({
    Sun: null,
    Moon: null,
    Mercury: null,
    Venus: null,
    Mars: null,
    Jupiter: null,
    Saturn: null,
    Uranus: null,
    Neptune: null,
  });

  const sunCoronaRef = useRef<THREE.Sprite | null>(null);
  const activeRayRef = useRef<THREE.Line | null>(null);
  const activeProjectionRef = useRef<THREE.Line | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const groundDiscRef = useRef<THREE.Mesh | null>(null);
  const diurnalGroupRef = useRef<THREE.Group | null>(null);
  const constellationsGroupRef = useRef<THREE.Group | null>(null);

  // Visual toggles & settings
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10);
  const [groundMode, setGroundMode] = useState<'translucent' | 'solid' | 'wireframe'>('translucent');
  const [showAllBodies, setShowAllBodies] = useState<boolean>(true);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [isCloseUp, setIsCloseUp] = useState<boolean>(false);

  const activeBodyMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;

  // Real-time planetary positions
  const allPositions = useMemo(() => {
    return getAllCelestialPositions(location, currentDate);
  }, [location, currentDate]);

  const activeCoords: CelestialCoordinates = allPositions[selectedBody] || allPositions.Sun;

  // Real-time rise/culmination/set events
  const bodyEvents: CelestialEvents = useMemo(() => {
    return getClientCelestialEvents(selectedBody, location, currentDate);
  }, [selectedBody, location, currentDate]);

  const dateKey = `${selectedBody}-${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

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

  // Playback timer loop
  const currentDateRef = useRef(currentDate);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    if (!isPlaying || !setCurrentDate) return;
    const interval = setInterval(() => {
      const next = new Date(currentDateRef.current.getTime() + playbackSpeed * 60 * 1000 * 0.1);
      setCurrentDate(next);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setCurrentDate]);

  // Corona texture generator
  const createCoronaTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 240, 180, 1.0)');
    gradient.addColorStop(0.25, 'rgba(245, 158, 11, 0.7)');
    gradient.addColorStop(0.6, 'rgba(234, 88, 12, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  };

  // Text sprite creator
  const createTextSprite = (text: string, color: string = '#F59E0B', size: number = 44) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

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

  // Update Body Label Sprite
  const updateBodyLabel = (bodyId: CelestialBodyId, text: string, color: string = '#FCD34D') => {
    const sprite = bodyLabelsRef.current[bodyId];
    if (!sprite) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
    ctx.roundRect ? ctx.roundRect(14, 20, 228, 88, 14) : ctx.fillRect(14, 20, 228, 88);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
  };

  // 1. Initial Scene Setup (Mount Once)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 560;

    // A. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 2500);
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
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 8;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // D. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xfff5d0, 2.5, 600, 0.5);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // E. 2,500 Starfield Particles (Deep Space)
    const starCount = 2500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x93c5fd),
      new THREE.Color(0xfef08a),
      new THREE.Color(0xfca5a5),
      new THREE.Color(0xe0f2fe),
    ];

    for (let i = 0; i < starCount; i++) {
      // Uniform point on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 250 + Math.random() * 50;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // F. Constellation Lines Group
    const constGroup = new THREE.Group();
    scene.add(constGroup);
    constellationsGroupRef.current = constGroup;

    // G. Horizon Ground Disc
    const horizonRadius = 80;
    const horizonGeo = new THREE.CircleGeometry(horizonRadius, 64);
    horizonGeo.rotateX(-Math.PI / 2);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0x070d1d,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const horizonDisc = new THREE.Mesh(horizonGeo, horizonMat);
    scene.add(horizonDisc);
    groundDiscRef.current = horizonDisc;

    // Outer Horizon Boundary
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

    // Compass Rings
    [25, 50, 75].forEach((rad) => {
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * rad, 0, Math.sin(theta) * rad));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringLine = new THREE.Line(
        ringGeo,
        new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 })
      );
      scene.add(ringLine);
    });

    // Crosshair Lines
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

    // H. Cardinal Direction Sprites
    const spriteN = createTextSprite('NORTH (0°)', '#ef4444', 36);
    spriteN.position.set(0, 2, -horizonRadius - 8);
    scene.add(spriteN);

    const spriteS = createTextSprite('SOUTH (180°)', '#38bdf8', 36);
    spriteS.position.set(0, 2, horizonRadius + 8);
    scene.add(spriteS);

    const spriteE = createTextSprite('EAST (90°)', '#f59e0b', 36);
    spriteE.position.set(horizonRadius + 8, 2, 0);
    scene.add(spriteE);

    const spriteW = createTextSprite('WEST (270°)', '#f59e0b', 36);
    spriteW.position.set(-horizonRadius - 8, 2, 0);
    scene.add(spriteW);

    const spriteZ = createTextSprite('ZENITH (90°)', '#a855f7', 36);
    spriteZ.position.set(0, horizonRadius + 8, 0);
    scene.add(spriteZ);

    // Observer Center Reticle
    const observerGeo = new THREE.CylinderGeometry(0.8, 1.4, 3, 16);
    const observerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const observerMesh = new THREE.Mesh(observerGeo, observerMat);
    observerMesh.position.set(0, 1.5, 0);
    scene.add(observerMesh);

    // I. Instantiate All 9 Celestial Bodies with Authentic Procedural Textures
    CELESTIAL_BODY_LIST.forEach((body) => {
      const geo = new THREE.SphereGeometry(body.sizeRadius, 48, 48);
      const texture = getPlanetTexture(body.id);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      bodyMeshesRef.current[body.id] = mesh;

      // Special Saturn Cassini Ring Plane
      if (body.hasRings) {
        const ringGeo = new THREE.RingGeometry(body.sizeRadius * 1.35, body.sizeRadius * 2.5, 64);
        ringGeo.rotateX(Math.PI / 2.7);
        const ringTexture = getSaturnRingTexture();
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        mesh.add(ringMesh);
      }

      // Special Sun Corona Halo
      if (body.id === 'Sun') {
        const coronaTexture = createCoronaTexture();
        const coronaMat = new THREE.SpriteMaterial({
          map: coronaTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const coronaSprite = new THREE.Sprite(coronaMat);
        coronaSprite.scale.set(26, 26, 1);
        mesh.add(coronaSprite);
        sunCoronaRef.current = coronaSprite;
      }

      // Floating Name/Altitude Sprite
      const label = createTextSprite(`${body.symbol} ${body.name}`, body.color, 32);
      label.position.set(0, body.sizeRadius + 4, 0);
      mesh.add(label);
      bodyLabelsRef.current[body.id] = label;
    });

    // J. Active Target Direct Vector Ray
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 40, 0)]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8, linewidth: 2 });
    const activeRay = new THREE.Line(rayGeo, rayMat);
    scene.add(activeRay);
    activeRayRef.current = activeRay;

    // K. Active Target Ground Projection Line
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
    activeProjectionRef.current = projMat;

    // Group for Diurnal Path Spline Lines
    const diurnalGroup = new THREE.Group();
    scene.add(diurnalGroup);
    diurnalGroupRef.current = diurnalGroup;

    // L. 60 FPS Render Loop
    let animId: number;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Slow axial rotation for planets to reveal photorealistic surface details
      CELESTIAL_BODY_LIST.forEach((body) => {
        const m = bodyMeshesRef.current[body.id];
        if (m) m.rotation.y += 0.003;
      });

      // Pulsing Sun Corona
      if (sunCoronaRef.current) {
        const pulse = 24 + 3.0 * Math.sin(time * 0.003);
        sunCoronaRef.current.scale.set(pulse, pulse, 1);
      }

      renderer.render(scene, camera);
    };
    animate(0);

    // M. Responsive Resize Observer
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

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

  // 2. Real Constellations Geometry & Lines Rendering
  useEffect(() => {
    const constGroup = constellationsGroupRef.current;
    if (!constGroup) return;

    while (constGroup.children.length > 0) {
      const child = constGroup.children[0];
      constGroup.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!showConstellations) return;

    // Calculate real star positions for current time and location
    const starsMap: Map<string, CalculatedStar> = calculateStarPositions(location, currentDate, 80);

    const linePoints: THREE.Vector3[] = [];

    CONSTELLATION_DEFS.forEach((c) => {
      c.lines.forEach(([idA, idB]) => {
        const sA = starsMap.get(idA);
        const sB = starsMap.get(idB);
        if (sA && sB) {
          linePoints.push(sA.threeJsPos, sB.threeJsPos);
        }
      });
    });

    if (linePoints.length > 0) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      constGroup.add(lines);
    }
  }, [location, currentDate, showConstellations]);

  // 3. Diurnal Trajectory Spline Update for Currently Selected Body
  useEffect(() => {
    const diurnalGroup = diurnalGroupRef.current;
    if (!diurnalGroup) return;

    while (diurnalGroup.children.length > 0) {
      const child = diurnalGroup.children[0];
      diurnalGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    const waypoints: DiurnalWaypoint[] = getClientCelestialDiurnalPath(selectedBody, location, currentDate, 10);
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

    const activeColor = new THREE.Color(activeBodyMeta.color);

    if (dayPoints.length > 2) {
      const daySpline = new THREE.CatmullRomCurve3(dayPoints);
      const daySplineGeo = new THREE.BufferGeometry().setFromPoints(daySpline.getPoints(120));
      const dayLine = new THREE.Line(
        daySplineGeo,
        new THREE.LineBasicMaterial({ color: activeColor, transparent: true, opacity: 0.95 })
      );
      diurnalGroup.add(dayLine);
    }

    if (nightPoints.length > 2) {
      const nightSpline = new THREE.CatmullRomCurve3(nightPoints);
      const nightSplineGeo = new THREE.BufferGeometry().setFromPoints(nightSpline.getPoints(120));
      const nightLine = new THREE.Line(
        nightSplineGeo,
        new THREE.LineDashedMaterial({ color: 0x3b82f6, dashSize: 2.5, gapSize: 1.5, transparent: true, opacity: 0.4 })
      );
      nightLine.computeLineDistances();
      diurnalGroup.add(nightLine);
    }
  }, [selectedBody, location, dateKey, activeBodyMeta.color]);

  // 4. Real-Time Position Updates for ALL 9 Bodies
  useEffect(() => {
    CELESTIAL_BODY_LIST.forEach((body) => {
      const mesh = bodyMeshesRef.current[body.id];
      if (!mesh) return;

      const pos = allPositions[body.id];
      if (!pos) return;

      mesh.visible = showAllBodies || body.id === selectedBody;

      const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
      const v3 = enuToThreeJsVector(enu, 80);
      mesh.position.copy(v3);

      const sign = pos.altitudeDeg >= 0 ? '+' : '';
      const labelText = `${body.symbol} ${body.name} (${sign}${pos.altitudeDeg.toFixed(1)}°)`;
      updateBodyLabel(body.id, labelText, pos.isAboveHorizon ? body.color : '#64748B');
    });

    // Update active body ray and ground projection
    if (activeRayRef.current && activeProjectionRef.current && pointLightRef.current) {
      const activePos = allPositions[selectedBody];
      if (activePos) {
        const enu = azAltToEnuVector(activePos.azimuthDeg, activePos.altitudeDeg);
        const v3 = enuToThreeJsVector(enu, 80);

        pointLightRef.current.position.copy(v3);
        pointLightRef.current.intensity = activePos.isAboveHorizon ? 2.5 : 0.4;

        activeRayRef.current.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), v3]);
        (activeRayRef.current.material as THREE.LineBasicMaterial).color.set(activeBodyMeta.color);

        const groundFootprint = new THREE.Vector3(v3.x, 0, v3.z);
        activeProjectionRef.current.geometry.setFromPoints([
          new THREE.Vector3(0, 0, 0),
          groundFootprint,
          v3,
        ]);
        activeProjectionRef.current.computeLineDistances();
      }
    }
  }, [allPositions, selectedBody, showAllBodies, activeBodyMeta.color]);

  // 5. Ground Opacity Mode Switch
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
  const setCameraView = (type: 'default' | 'top' | 'focusBody' | 'closeUp' | 'ground') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (type === 'default') {
      camera.position.set(0, 55, 140);
      controls.target.set(0, 0, 0);
      setIsCloseUp(false);
    } else if (type === 'top') {
      camera.position.set(0, 180, 0.1);
      controls.target.set(0, 0, 0);
      setIsCloseUp(false);
    } else if (type === 'ground') {
      camera.position.set(0, 3, 10);
      controls.target.set(0, 15, -40);
      setIsCloseUp(false);
    } else if (type === 'focusBody') {
      const mesh = bodyMeshesRef.current[selectedBody];
      if (mesh) {
        const p = mesh.position;
        camera.position.set(p.x * 0.45, p.y * 0.45 + 18, p.z * 0.45 + 35);
        controls.target.copy(p);
        setIsCloseUp(false);
      }
    } else if (type === 'closeUp') {
      const mesh = bodyMeshesRef.current[selectedBody];
      if (mesh) {
        const p = mesh.position;
        // Cinematic macro camera close-up to inspect realistic craters/clouds/rings
        const offset = activeBodyMeta.sizeRadius * 3.2;
        camera.position.set(p.x + offset * 0.5, p.y + offset * 0.3, p.z + offset);
        controls.target.copy(p);
        setIsCloseUp(true);
      }
    }
    controls.update();
  };

  const formatClock = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const isBelowHorizon = activeCoords.altitudeDeg < 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Planetary Carousel Selector Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Solar System Celestial Bodies</span>
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

      {/* Sub-Horizon Notice */}
      {isBelowHorizon && (
        <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-900/60 text-indigo-300">
              <AlertCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                {activeBodyMeta.symbol} {activeBodyMeta.name} is currently below the horizon ({activeCoords.altitudeDeg.toFixed(1)}°)
              </p>
              <p className="text-indigo-300/80 text-[11px]">
                {activeBodyMeta.name} is shining beneath the translucent ground disc. Jump to its peak culmination transit or scrub the slider below!
              </p>
            </div>
          </div>
          <button
            onClick={() => jumpToTime(bodyEvents.culminationUtc)}
            disabled={!bodyEvents.culminationUtc}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center gap-2 whitespace-nowrap transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <span>Jump to {activeBodyMeta.name} Peak</span>
          </button>
        </div>
      )}

      {/* 3D Viewport Card - Responsive Height & Edge-to-Edge Canvas */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden relative border border-slate-800 bg-slate-950 shadow-2xl h-[65vh] min-h-[440px] max-h-[720px]">
        {/* Top Info Bar - Responsive Layout */}
        <div className="absolute top-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-800 text-xs shadow-lg max-w-[60vw] sm:max-w-none">
          <div className="flex items-center gap-1.5 text-slate-100 font-semibold truncate">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {activeBodyMeta.symbol} {activeBodyMeta.name}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold hidden sm:inline-block ${
                isBelowHorizon
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              }`}
            >
              {isBelowHorizon ? 'Sub-Horizon' : 'Visible'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-slate-300 font-mono text-[10px] sm:text-[11px] pt-0.5">
            <span>
              Az: <strong className="text-amber-400">{activeCoords.azimuthDeg.toFixed(1)}°</strong>
            </span>
            <span>
              Alt:{' '}
              <strong className={isBelowHorizon ? 'text-indigo-400' : 'text-emerald-400'}>
                {activeCoords.altitudeDeg >= 0 ? '+' : ''}
                {activeCoords.altitudeDeg.toFixed(1)}°
              </strong>
            </span>
            <span className="hidden md:inline">
              Dist:{' '}
              <strong className="text-slate-200">
                {activeCoords.distanceAu < 0.01
                  ? `${(activeCoords.distanceKm || 0).toLocaleString()} km`
                  : `${activeCoords.distanceAu.toFixed(3)} AU`}
              </strong>
            </span>
          </div>
        </div>

        {/* Camera Preset Quick Bar - Responsive Scrollable Bar */}
        <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-lg max-w-[38vw] sm:max-w-none overflow-x-auto scrollbar-none">
          <button
            onClick={() => setCameraView('default')}
            className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition whitespace-nowrap"
          >
            45° Orbit
          </button>
          <button
            onClick={() => setCameraView('focusBody')}
            className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-amber-300 hover:bg-amber-950/60 border border-amber-500/30 transition whitespace-nowrap"
          >
            Focus
          </button>
          <button
            onClick={() => setCameraView('closeUp')}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition flex items-center gap-1 whitespace-nowrap ${
              isCloseUp
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-amber-400 hover:bg-slate-800 border border-amber-500/30'
            }`}
            title="Inspect 3D Surface"
          >
            <ZoomIn className="w-3 h-3" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          <button
            onClick={() => setShowConstellations(!showConstellations)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition whitespace-nowrap ${
              showConstellations
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showConstellations ? '✨ Stars ON' : 'Stars OFF'}
          </button>
          <button
            onClick={() => setShowAllBodies(!showAllBodies)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition whitespace-nowrap ${
              showAllBodies
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showAllBodies ? 'All' : 'Solo'}
          </button>
        </div>

        {/* Orbit Control Hint */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] text-slate-300 flex items-center gap-1.5 shadow-md">
          <Eye className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">Drag to Orbit 360° · Scroll to Zoom · Click Planet to Target</span>
          <span className="sm:hidden">Touch & Drag to Orbit 360°</span>
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
          className="w-full h-[560px] cursor-grab active:cursor-grabbing select-none"
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
              <span>{isPlaying ? 'Pause Motion' : 'Play Motion Animation'}</span>
            </button>

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

          {/* Quick Body Event Jump Presets */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpToTime(bodyEvents.riseUtc)}
              disabled={!bodyEvents.riseUtc}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Sunrise className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeBodyMeta.name} Rise</span>
            </button>

            <button
              onClick={() => jumpToTime(bodyEvents.culminationUtc)}
              disabled={!bodyEvents.culminationUtc}
              className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 transition font-semibold disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Peak Transit</span>
            </button>

            <button
              onClick={() => jumpToTime(bodyEvents.setUtc)}
              disabled={!bodyEvents.setUtc}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
              <span>{activeBodyMeta.name} Set</span>
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
              Drag slider to glide {activeBodyMeta.name} along its 24h diurnal arc
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

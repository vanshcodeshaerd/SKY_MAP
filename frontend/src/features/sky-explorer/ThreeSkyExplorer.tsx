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
  HelpCircle,
  Globe,
  Info,
  User,
  Crosshair,
  BookOpen,
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
import {
  getPlanetTexture,
  getPlanetBumpMap,
  getSaturnRingTexture,
  loadSolarSystemScopeTexture,
} from '../../services/planetTextures';
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
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const avatarTelescopeRef = useRef<THREE.Group | null>(null);

  // Perspective Mode: 'map' (Whole 3D Celestial Map) vs 'human' (First-Person Stargazer POV)
  const [perspectiveMode, setPerspectiveMode] = useState<'map' | 'human'>('map');
  const perspectiveModeRef = useRef<'map' | 'human'>('map');
  const humanAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: Math.PI, pitch: 0.35 });
  const [humanHeadingDeg, setHumanHeadingDeg] = useState<number>(180);
  const [humanPitchDeg, setHumanPitchDeg] = useState<number>(20);
  const [humanFov, setHumanFov] = useState<number>(55);

  // Scale & Depth Radii (proportional AU progression for True Depth Mode)
  const BODY_DEPTH_RADII: Record<CelestialBodyId, number> = useMemo(() => ({
    Moon: 38,
    Mercury: 52,
    Venus: 66,
    Sun: 80,
    Mars: 96,
    Jupiter: 118,
    Saturn: 140,
    Uranus: 162,
    Neptune: 182,
  }), []);

  // Visual toggles & settings
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10);
  const [groundMode, setGroundMode] = useState<'translucent' | 'solid' | 'wireframe'>('translucent');
  const [showAllBodies, setShowAllBodies] = useState<boolean>(true);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [isCloseUp, setIsCloseUp] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'dome' | 'depth'>('dome');
  const [showSpatialGuide, setShowSpatialGuide] = useState<boolean>(false);
  const [showDossier, setShowDossier] = useState<boolean>(false);

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

  // Build Procedural 3D Human Stargazer Avatar with Dynamic Telescope
  const buildStargazerAvatar = () => {
    const avatar = new THREE.Group();

    // High-contrast materials for space observer
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // slate-800 space suit
      roughness: 0.5,
      metalness: 0.2,
    });
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // glowing cyan trim
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });

    // 1. Boots & Legs
    [-0.22, 0.22].forEach((x) => {
      // Boot
      const bootGeo = new THREE.BoxGeometry(0.24, 0.18, 0.44);
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(x, 0.09, 0.05);
      avatar.add(boot);

      // Leg
      const legGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.82, 12);
      const leg = new THREE.Mesh(legGeo, suitMat);
      leg.position.set(x, 0.52, 0);
      avatar.add(leg);

      // Knee pad
      const padGeo = new THREE.BoxGeometry(0.18, 0.14, 0.12);
      const pad = new THREE.Mesh(padGeo, trimMat);
      pad.position.set(x, 0.52, 0.11);
      avatar.add(pad);
    });

    // 2. Belt & Pelvis
    const beltGeo = new THREE.CylinderGeometry(0.33, 0.31, 0.16, 16);
    const belt = new THREE.Mesh(beltGeo, trimMat);
    belt.position.set(0, 0.96, 0);
    avatar.add(belt);

    // 3. Torso / Explorer Jacket
    const torsoGeo = new THREE.BoxGeometry(0.68, 0.74, 0.42);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.set(0, 1.4, 0);
    avatar.add(torso);

    // Glowing Chest Emblem
    const emblemGeo = new THREE.CircleGeometry(0.09, 16);
    const emblem = new THREE.Mesh(emblemGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
    emblem.position.set(0, 1.48, 0.22);
    avatar.add(emblem);

    // Life support pack
    const packGeo = new THREE.BoxGeometry(0.48, 0.58, 0.22);
    const pack = new THREE.Mesh(packGeo, bootMat);
    pack.position.set(0, 1.42, -0.3);
    avatar.add(pack);

    // 4. Head & Helmet Visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.95, 0);

    const helmetGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const helmet = new THREE.Mesh(helmetGeo, suitMat);
    headGroup.add(helmet);

    // Glowing Golden/Amber Face Visor
    const visorGeo = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI, 0, Math.PI / 1.6);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.02, 0.06);
    headGroup.add(visor);
    avatar.add(headGroup);

    // 5. Left Arm holding holographic star chart tablet
    const leftArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.55, 12);
    const leftArm = new THREE.Mesh(leftArmGeo, suitMat);
    leftArm.position.set(-0.42, 1.35, 0.15);
    leftArm.rotation.x = Math.PI / 3;
    avatar.add(leftArm);

    const tabletGeo = new THREE.BoxGeometry(0.28, 0.04, 0.38);
    const tablet = new THREE.Mesh(tabletGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    tablet.position.set(-0.42, 1.42, 0.36);
    tablet.rotation.x = -Math.PI / 6;
    avatar.add(tablet);

    // 6. Right Arm & Celestial Telescope (aims dynamically)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.42, 1.5, 0);

    const telescopeGroup = new THREE.Group();

    // Telescope Brass Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.3, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, brassMat);
    barrel.position.set(0, 0, 0.65);
    telescopeGroup.add(barrel);

    // Objective Lens
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.15, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lens = new THREE.Mesh(lensGeo, trimMat);
    lens.position.set(0, 0, 1.25);
    telescopeGroup.add(lens);

    // Light beam from lens
    const beamPts = [new THREE.Vector3(0, 0, 1.3), new THREE.Vector3(0, 0, 4.5)];
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPts);
    const beamLine = new THREE.Line(
      beamGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    telescopeGroup.add(beamLine);

    rightArmPivot.add(telescopeGroup);
    avatar.add(rightArmPivot);

    return { group: avatar, telescope: telescopeGroup, head: headGroup };
  };

  // 1. Initial Scene Setup (Mount Once)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 560;

    // A. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 3500);
    camera.position.set(0, 55, 140);
    cameraRef.current = camera;

    // B. WebGL Renderer - Solid deep space background (alpha: false ensures true pitch black)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x030712, 1.0);
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

    // E2. 2,500 Starfield Particles (Deep Space)
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

    // Celestial Sky Hemisphere (Upper Dome = Visible Sky Above Horizon)
    const skyDomeGeo = new THREE.SphereGeometry(horizonRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const skyDomeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.035,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDomeMesh = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    scene.add(skyDomeMesh);

    // Altitude parallel circles at +30° and +60°
    [30, 60].forEach((altDeg) => {
      const altRad = THREE.MathUtils.degToRad(altDeg);
      const ringRad = horizonRadius * Math.cos(altRad);
      const ringY = horizonRadius * Math.sin(altRad);
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * ringRad, ringY, Math.sin(theta) * ringRad));
      }
      const altRingGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const altRingLine = new THREE.Line(
        altRingGeo,
        new THREE.LineDashedMaterial({ color: 0x0284c7, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.3 })
      );
      altRingLine.computeLineDistances();
      scene.add(altRingLine);

      const altLabel = createTextSprite(`+${altDeg}° Altitude`, '#38bdf8', 26);
      altLabel.position.set(0, ringY + 1.5, -ringRad);
      altLabel.scale.set(14, 7, 1);
      scene.add(altLabel);
    });

    const horizonPlaneLabel = createTextSprite('HORIZON PLANE (0° ALTITUDE)', '#0ea5e9', 28);
    horizonPlaneLabel.position.set(0, 1.8, -horizonRadius + 14);
    horizonPlaneLabel.scale.set(20, 10, 1);
    scene.add(horizonPlaneLabel);

    // H. Center Observation Platform & Animated 3D Stargazer Avatar
    const centerGroup = new THREE.Group();
    scene.add(centerGroup);

    // 1. Sleek Glass Observation Deck
    const deckGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.3, 48);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      transparent: true,
      opacity: 0.85,
      metalness: 0.85,
      roughness: 0.2,
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, 0, 0);
    centerGroup.add(deckMesh);

    // Outer Illuminated Neon Compass Rim on Deck
    const deckRimGeo = new THREE.RingGeometry(4.9, 5.2, 64);
    deckRimGeo.rotateX(-Math.PI / 2);
    const deckRimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    deckMesh.add(new THREE.Mesh(deckRimGeo, deckRimMat));

    // Concentric Inner Glowing Target Rings on Platform
    [1.6, 3.2].forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r - 0.05, r + 0.05, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      deckMesh.add(new THREE.Mesh(ringGeo, ringMat));
    });

    // 2. The 3D Animated Stargazer Avatar Person
    const { group: avatarMesh, telescope } = buildStargazerAvatar();
    avatarMesh.position.set(0, 0.15, 0);
    centerGroup.add(avatarMesh);
    avatarGroupRef.current = avatarMesh;
    avatarTelescopeRef.current = telescope;

    // 3. Vertical Laser Beacon from Stargazer to Zenith
    const beaconPts = [new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(0, 78, 0)];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPts);
    const beaconLine = new THREE.Line(
      beaconGeo,
      new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 2.0,
        gapSize: 1.5,
        transparent: true,
        opacity: 0.35,
      })
    );
    beaconLine.computeLineDistances();
    centerGroup.add(beaconLine);

    // 4. Floating 3D Text Badges Above Stargazer Avatar
    const youAreHereSprite = createTextSprite('👤 YOU (Stargazer Observer)', '#38bdf8', 34);
    youAreHereSprite.position.set(0, 3.4, 0);
    youAreHereSprite.scale.set(16, 8, 1);
    centerGroup.add(youAreHereSprite);

    const latStr = location.latitude >= 0 ? `${location.latitude.toFixed(2)}°N` : `${Math.abs(location.latitude).toFixed(2)}°S`;
    const lonStr = location.longitude >= 0 ? `${location.longitude.toFixed(2)}°E` : `${Math.abs(location.longitude).toFixed(2)}°W`;
    const coordsSprite = createTextSprite(`GPS: ${latStr}, ${lonStr}`, '#facc15', 28);
    coordsSprite.position.set(0, 2.6, 0);
    coordsSprite.scale.set(14, 7, 1);
    centerGroup.add(coordsSprite);

    // I. Instantiate All 9 Celestial Bodies with Authentic Procedural Textures, 2K Solar System Scope Upgrade & Axial Tilt
    CELESTIAL_BODY_LIST.forEach((body) => {
      const geo = new THREE.SphereGeometry(body.sizeRadius, 64, 64);
      const texture = getPlanetTexture(body.id);
      const bumpMap = getPlanetBumpMap(body.id);

      const isSun = body.id === 'Sun';
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: isSun ? undefined : bumpMap,
        bumpScale: body.id === 'Moon' || body.id === 'Mercury' ? 0.35 : (body.id === 'Mars' ? 0.25 : 0.08),
        roughness: isSun ? 0.2 : (body.id === 'Moon' || body.id === 'Mercury' ? 0.85 : 0.6),
        metalness: 0.05,
        emissive: isSun ? new THREE.Color(0xf59e0b) : new THREE.Color(0x000000),
        emissiveIntensity: isSun ? 0.8 : 0,
      });

      // Seamlessly upgrade to authentic 2K Solar System Scope texture when available
      loadSolarSystemScopeTexture(body.id, (realTex) => {
        mat.map = realTex;
        mat.needsUpdate = true;
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Scientifically accurate axial tilt
      if (body.axialTiltDeg !== undefined) {
        mesh.rotation.z = THREE.MathUtils.degToRad(body.axialTiltDeg);
      }

      scene.add(mesh);
      bodyMeshesRef.current[body.id] = mesh;

      // Realistic Atmospheric Glow Shell for Earth, Venus, Mars, Gas Giants
      if (['Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(body.id)) {
        const atmoGeo = new THREE.SphereGeometry(body.sizeRadius * 1.05, 32, 32);
        const atmoColor = body.id === 'Mars' ? 0xef4444 : (body.id === 'Venus' ? 0xfef08a : (body.id === 'Uranus' ? 0x38bdf8 : (body.id === 'Neptune' ? 0x3b82f6 : 0xf59e0b)));
        const atmoMat = new THREE.MeshBasicMaterial({
          color: atmoColor,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
        });
        const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
        mesh.add(atmoMesh);
      }

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
        loadSolarSystemScopeTexture('SaturnRing', (ringTex) => {
          ringMat.map = ringTex;
          ringMat.needsUpdate = true;
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

      // Only run OrbitControls when in 3D Map mode to prevent it overriding First-Person camera look
      if (perspectiveModeRef.current === 'map') {
        controls.update();
      } else {
        // Human POV: Keep camera pinned to observer eye level (y = 1.85) looking in human direction
        const { yaw, pitch } = humanAnglesRef.current;
        camera.position.set(0, 1.85, 0);
        const lookX = Math.sin(yaw) * Math.cos(pitch);
        const lookY = Math.sin(pitch);
        const lookZ = -Math.cos(yaw) * Math.cos(pitch);
        camera.lookAt(new THREE.Vector3(lookX, 1.85 + lookY, lookZ));
      }

      // Slow axial rotation for planets along their tilted polar axis to reveal authentic surface details
      CELESTIAL_BODY_LIST.forEach((body) => {
        const m = bodyMeshesRef.current[body.id];
        if (m) m.rotateY(0.003);
      });

      // Stargazer Avatar subtle breathing & dynamic celestial aiming
      if (avatarGroupRef.current) {
        if (perspectiveModeRef.current === 'map') {
          avatarGroupRef.current.visible = true;
          avatarGroupRef.current.position.y = 0.15 + Math.sin(time * 0.003) * 0.02;

          // Smoothly rotate the avatar to face the target body's azimuth
          const targetAzRad = THREE.MathUtils.degToRad(-activeCoords.azimuthDeg + 180);
          avatarGroupRef.current.rotation.y = THREE.MathUtils.lerp(avatarGroupRef.current.rotation.y, targetAzRad, 0.05);

          // Tilt telescope to point at target body altitude
          if (avatarTelescopeRef.current) {
            const targetAltRad = THREE.MathUtils.degToRad(Math.max(-10, activeCoords.altitudeDeg));
            avatarTelescopeRef.current.rotation.x = THREE.MathUtils.lerp(avatarTelescopeRef.current.rotation.x, -targetAltRad, 0.05);
          }
        } else {
          // Hide avatar in Human POV mode so user has unobstructed first-person view
          avatarGroupRef.current.visible = false;
        }
      }

      // Pulsing Sun Corona
      if (sunCoronaRef.current) {
        const pulse = 24 + 3.0 * Math.sin(time * 0.003);
        sunCoronaRef.current.scale.set(pulse, pulse, 1);
      }

      renderer.render(scene, camera);
    };
    animate(0);

    // M. Pointer Listeners for First-Person Look & Zoom in Human POV
    let isDragging = false;
    let lastPointer = { x: 0, y: 0 };
    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      if (perspectiveModeRef.current !== 'human') return;
      isDragging = true;
      lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (perspectiveModeRef.current !== 'human' || !isDragging) return;
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      lastPointer = { x: e.clientX, y: e.clientY };

      // Invert dy so dragging UP tilts the camera UP towards Zenith
      humanAnglesRef.current.yaw -= dx * 0.0035;
      humanAnglesRef.current.pitch -= dy * 0.0035;
      // Clamp pitch from looking at horizon to straight up at Zenith
      humanAnglesRef.current.pitch = Math.max(-0.25, Math.min(Math.PI / 2 - 0.02, humanAnglesRef.current.pitch));

      const { yaw, pitch } = humanAnglesRef.current;
      camera.position.set(0, 1.85, 0);
      const lookX = Math.sin(yaw) * Math.cos(pitch);
      const lookY = Math.sin(pitch);
      const lookZ = -Math.cos(yaw) * Math.cos(pitch);
      camera.lookAt(new THREE.Vector3(lookX, 1.85 + lookY, lookZ));

      let heading = (THREE.MathUtils.radToDeg(yaw) % 360 + 360) % 360;
      setHumanHeadingDeg(Math.round(heading));
      setHumanPitchDeg(Math.round(THREE.MathUtils.radToDeg(pitch)));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (perspectiveModeRef.current !== 'human') return;
      e.preventDefault();
      camera.fov = Math.max(15, Math.min(85, camera.fov + e.deltaY * 0.04));
      camera.updateProjectionMatrix();
      setHumanFov(Math.round(camera.fov));
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // N. Responsive Resize Observer
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
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
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

    const activeRadius = scaleMode === 'depth' ? BODY_DEPTH_RADII[selectedBody] : 80;

    waypoints.forEach((wp) => {
      const enu = new THREE.Vector3(wp.vectorEnu[0], wp.vectorEnu[1], wp.vectorEnu[2]);
      const v3 = enuToThreeJsVector(enu, activeRadius);
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
  }, [selectedBody, location, dateKey, activeBodyMeta.color, scaleMode, BODY_DEPTH_RADII]);

  // 4. Real-Time Position Updates for ALL 9 Bodies with Collision Avoidance
  useEffect(() => {
    CELESTIAL_BODY_LIST.forEach((body) => {
      const mesh = bodyMeshesRef.current[body.id];
      if (!mesh) return;

      const pos = allPositions[body.id];
      if (!pos) return;

      mesh.visible = showAllBodies || body.id === selectedBody;

      const bodyRadius = scaleMode === 'depth' ? BODY_DEPTH_RADII[body.id] : 80;
      const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
      const v3 = enuToThreeJsVector(enu, bodyRadius);
      mesh.position.copy(v3);

      const sign = pos.altitudeDeg >= 0 ? '+' : '';
      const labelText = `${body.symbol} ${body.name} (${sign}${pos.altitudeDeg.toFixed(1)}°)`;
      updateBodyLabel(body.id, labelText, pos.isAboveHorizon ? body.color : '#64748B');
    });

    // Intelligent Label Staggering & Collision Avoidance
    // Group bodies that are close in Azimuth & Altitude so their labels don't overlap into unreadable text
    const visibleBodies = CELESTIAL_BODY_LIST.filter((b) => showAllBodies || b.id === selectedBody);
    const placedLabels: { az: number; alt: number; offset: number }[] = [];

    // Sort by altitude ascending
    const sorted = [...visibleBodies].sort((a, b) => {
      const altA = allPositions[a.id]?.altitudeDeg ?? 0;
      const altB = allPositions[b.id]?.altitudeDeg ?? 0;
      return altA - altB;
    });

    sorted.forEach((body) => {
      const pos = allPositions[body.id];
      const label = bodyLabelsRef.current[body.id];
      if (!pos || !label) return;

      let yOffset = body.sizeRadius + 4.2;

      for (const placed of placedLabels) {
        const dAz = Math.abs(pos.azimuthDeg - placed.az);
        const azDiff = Math.min(dAz, 360 - dAz);
        const altDiff = Math.abs(pos.altitudeDeg - placed.alt);

        // If angular distance is less than 15° azimuth and 12° altitude, stagger vertically
        if (azDiff < 15 && altDiff < 12) {
          yOffset = Math.max(yOffset, placed.offset + 5.5);
        }
      }

      placedLabels.push({ az: pos.azimuthDeg, alt: pos.altitudeDeg, offset: yOffset });
      label.position.set(0, yOffset, 0);
    });

    // Update active body ray and ground projection
    if (activeRayRef.current && activeProjectionRef.current && pointLightRef.current) {
      const activePos = allPositions[selectedBody];
      if (activePos) {
        const activeRadius = scaleMode === 'depth' ? BODY_DEPTH_RADII[selectedBody] : 80;
        const enu = azAltToEnuVector(activePos.azimuthDeg, activePos.altitudeDeg);
        const v3 = enuToThreeJsVector(enu, activeRadius);

        pointLightRef.current.position.copy(v3);
        pointLightRef.current.intensity = activePos.isAboveHorizon ? 2.5 : 0.4;

        // Line-of-sight ray originating from stargazer telescope (y = 1.5) to celestial target
        activeRayRef.current.geometry.setFromPoints([new THREE.Vector3(0, 1.5, 0), v3]);
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
  }, [allPositions, selectedBody, showAllBodies, activeBodyMeta.color, scaleMode, BODY_DEPTH_RADII]);

  // 5. Perspective Mode Switch Handler (Whole Map vs Human POV)
  useEffect(() => {
    perspectiveModeRef.current = perspectiveMode;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (perspectiveMode === 'human') {
      controls.enabled = false;
      if (avatarGroupRef.current) avatarGroupRef.current.visible = false;

      // Initialize orientation looking towards selected active celestial body
      const initYaw = THREE.MathUtils.degToRad(activeCoords.azimuthDeg);
      const initPitch = THREE.MathUtils.degToRad(Math.max(-10, activeCoords.altitudeDeg));
      humanAnglesRef.current = { yaw: initYaw, pitch: initPitch };

      camera.position.set(0, 1.85, 0);
      const lookX = Math.sin(initYaw) * Math.cos(initPitch);
      const lookY = Math.sin(initPitch);
      const lookZ = -Math.cos(initYaw) * Math.cos(initPitch);
      camera.lookAt(new THREE.Vector3(lookX, 1.85 + lookY, lookZ));

      setHumanHeadingDeg(Math.round(activeCoords.azimuthDeg));
      setHumanPitchDeg(Math.round(activeCoords.altitudeDeg));
    } else {
      controls.enabled = true;
      if (avatarGroupRef.current) avatarGroupRef.current.visible = true;
      camera.fov = 50;
      camera.updateProjectionMatrix();
      camera.position.set(0, 55, 140);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [perspectiveMode]);

  // Turn First-Person Stargazer View directly to look at selected target
  const snapHumanToBody = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const targetYaw = THREE.MathUtils.degToRad(activeCoords.azimuthDeg);
    const targetPitch = THREE.MathUtils.degToRad(Math.max(-10, activeCoords.altitudeDeg));
    humanAnglesRef.current = { yaw: targetYaw, pitch: targetPitch };

    camera.position.set(0, 1.85, 0);
    const lookX = Math.sin(targetYaw) * Math.cos(targetPitch);
    const lookY = Math.sin(targetPitch);
    const lookZ = -Math.cos(targetYaw) * Math.cos(targetPitch);
    camera.lookAt(new THREE.Vector3(lookX, 1.85 + lookY, lookZ));

    setHumanHeadingDeg(Math.round(activeCoords.azimuthDeg));
    setHumanPitchDeg(Math.round(activeCoords.altitudeDeg));
  };

  // 6. Ground Opacity Mode Switch
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
  const setCameraView = (type: 'default' | 'top' | 'focusBody' | 'closeUp' | 'ground' | 'avatarCenter') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (perspectiveMode !== 'map') {
      setPerspectiveMode('map');
      controls.enabled = true;
      if (avatarGroupRef.current) avatarGroupRef.current.visible = true;
    }

    if (type === 'default') {
      camera.position.set(0, 55, 140);
      controls.target.set(0, 0, 0);
      setIsCloseUp(false);
    } else if (type === 'avatarCenter') {
      camera.position.set(0, 5, 10);
      controls.target.set(0, 1.5, 0);
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
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden relative border border-slate-800 bg-[#030712] shadow-2xl h-[65vh] min-h-[440px] max-h-[720px]">
        {/* Top Info Bar - Coordinates & Planet Scientific Dossier Toggle */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5 max-w-[280px] sm:max-w-xs">
          <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-800 text-xs shadow-lg w-full">
            <div className="flex items-center justify-between gap-2">
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
              <button
                onClick={() => setShowDossier(!showDossier)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                  showDossier
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-amber-400 border border-amber-500/30 hover:bg-slate-800'
                }`}
                title="Scientific Planet Dossier & Facts"
              >
                <BookOpen className="w-3 h-3" />
                <span>{showDossier ? 'Hide Facts' : 'Planet Facts'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-slate-300 font-mono text-[10px] sm:text-[11px] pt-1">
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

          {/* Planet Dossier / Scientific Fact Card */}
          {showDossier && activeBodyMeta.scientificInfo && (
            <div className="bg-slate-950/95 backdrop-blur-xl p-3.5 rounded-2xl border border-amber-500/40 text-xs shadow-2xl w-full max-w-sm space-y-2.5 animate-fade-in text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{activeBodyMeta.symbol}</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">{activeBodyMeta.name} Dossier</h4>
                    <span className="text-[10px] text-amber-400 font-medium">{activeBodyMeta.scientificInfo.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDossier(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Diameter</span>
                  <span className="text-white font-mono font-medium">{activeBodyMeta.scientificInfo.diameterKm.toLocaleString()} km</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Distance from Sun</span>
                  <span className="text-white font-mono font-medium">{activeBodyMeta.scientificInfo.distanceFromSunKm}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Rotation (Day)</span>
                  <span className="text-white font-mono font-medium">{activeBodyMeta.scientificInfo.dayLength}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Orbital Period (Year)</span>
                  <span className="text-white font-mono font-medium">{activeBodyMeta.scientificInfo.yearLength}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Temperature</span>
                  <span className="text-amber-300 font-mono font-medium">{activeBodyMeta.scientificInfo.temperature}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Moons & Axial Tilt</span>
                  <span className="text-sky-300 font-mono font-medium">
                    {activeBodyMeta.scientificInfo.moons} moons · {activeBodyMeta.axialTiltDeg}° tilt
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[10px] text-amber-200/90 leading-relaxed">
                💡 <strong className="text-amber-300">NASA Science Fact:</strong> {activeBodyMeta.scientificInfo.specialFact}
              </div>
            </div>
          )}
        </div>

        {/* Human POV Reticle & Heading Tape */}
        {perspectiveMode === 'human' && (
          <>
            {/* Center Crosshairs */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="relative flex items-center justify-center opacity-60">
                <Crosshair className="w-8 h-8 text-sky-400" />
                <div className="absolute w-2 h-2 rounded-full bg-amber-400" />
              </div>
            </div>

            {/* Compass Heading & Elevation Ribbon */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-500/40 text-[11px] font-mono flex items-center gap-3 shadow-lg text-sky-200">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <strong>{humanHeadingDeg}°</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span>
                Elevation:{' '}
                <strong className={humanPitchDeg >= 0 ? 'text-emerald-400' : 'text-indigo-400'}>
                  {humanPitchDeg >= 0 ? '+' : ''}
                  {humanPitchDeg}°
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Zoom: {humanFov}° FOV</span>
            </div>

            {/* First-Person Action Quick Bar */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg">
              {/* Perspective Mode Switcher */}
              <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700 mr-1 shrink-0">
                <button
                  onClick={() => setPerspectiveMode('map')}
                  className="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition whitespace-nowrap"
                  title="Switch to Whole 3D Celestial Map"
                >
                  <Globe className="w-3 h-3" />
                  <span>3D Map</span>
                </button>
                <button
                  onClick={() => setPerspectiveMode('human')}
                  className="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold bg-sky-500 text-slate-950 shadow-sm flex items-center gap-1 transition whitespace-nowrap"
                  title="Human POV (Stargazer)"
                >
                  <User className="w-3 h-3" />
                  <span>Human POV</span>
                </button>
              </div>

              <button
                onClick={snapHumanToBody}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap"
                title={`Turn view directly to ${activeBodyMeta.name}`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Face</span> {activeBodyMeta.name}
              </button>

              <div className="hidden sm:flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-800">
                {[
                  { label: '1x Wide', fov: 65 },
                  { label: '2x Mid', fov: 40 },
                  { label: '5x Tele', fov: 18 },
                ].map((z) => (
                  <button
                    key={z.label}
                    onClick={() => {
                      if (!cameraRef.current) return;
                      cameraRef.current.fov = z.fov;
                      cameraRef.current.updateProjectionMatrix();
                      setHumanFov(z.fov);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                      humanFov === z.fov
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Interaction Guide */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-500/30 text-[10px] text-slate-300 shadow-md whitespace-nowrap flex items-center gap-1.5">
              <span>👆 Drag on screen to turn 360° & tilt up · Scroll/Pinch to zoom in</span>
            </div>
          </>
        )}

        {/* Camera Preset & Scale Quick Bar (Map Mode) */}
        {perspectiveMode === 'map' && (
          <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-lg max-w-[65vw] sm:max-w-none overflow-x-auto scrollbar-none">
            {/* Perspective Mode Switcher */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700 mr-1 shrink-0">
              <button
                onClick={() => setPerspectiveMode('map')}
                className="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1 transition whitespace-nowrap"
                title="Whole 3D Celestial Map"
              >
                <Globe className="w-3 h-3" />
                <span>3D Map</span>
              </button>
              <button
                onClick={() => setPerspectiveMode('human')}
                className="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition whitespace-nowrap"
                title="Switch to Human POV (Stargazer)"
              >
                <User className="w-3 h-3" />
                <span>Human POV</span>
              </button>
            </div>

            {/* Scale Mode Selector */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 mr-1">
              <button
                onClick={() => setScaleMode('dome')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition whitespace-nowrap ${
                  scaleMode === 'dome'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dome View: Projects all bodies onto 80-unit celestial sky sphere"
              >
                Dome View
              </button>
              <button
                onClick={() => setScaleMode('depth')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition whitespace-nowrap ${
                  scaleMode === 'depth'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="3D Depth: Arranges bodies radially by astronomical distance (AU) to eliminate overlap"
              >
                3D Depth
              </button>
            </div>

            <button
              onClick={() => setCameraView('default')}
              className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition whitespace-nowrap"
            >
              45° Orbit
            </button>
            <button
              onClick={() => setCameraView('avatarCenter')}
              className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-sky-300 hover:bg-sky-950/60 border border-sky-500/30 transition whitespace-nowrap flex items-center gap-1"
              title="Focus on Stargazer Person"
            >
              <User className="w-3 h-3 text-sky-400" />
              <span>Person</span>
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
            <button
              onClick={() => setShowSpatialGuide(!showSpatialGuide)}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition flex items-center gap-1 whitespace-nowrap ${
                showSpatialGuide
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-sky-300 hover:bg-slate-800 border border-sky-500/30'
              }`}
              title="How to Read Spatial 3D Map"
            >
              <HelpCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        )}

        {/* Spatial Guide Overlay Card */}
        {showSpatialGuide && (
          <div className="absolute top-16 right-3 z-30 bg-slate-950/95 backdrop-blur-xl p-3.5 rounded-2xl border border-sky-500/40 text-xs shadow-2xl max-w-xs space-y-2.5 animate-fade-in text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sky-300 flex items-center gap-1.5 text-xs">
                <Info className="w-4 h-4 text-sky-400" />
                <span>How to Read 3D Sky Map</span>
              </span>
              <button
                onClick={() => setShowSpatialGuide(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">👤</span>
                <div>
                  <strong className="text-white">Center Stargazer:</strong> The 3D person in the middle represents YOU standing at your real GPS coordinates, with their telescope dynamically aiming at the active planet.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">👀</span>
                <div>
                  <strong className="text-sky-300">Human POV:</strong> Switch to First-Person view to see through the stargazer's eyes! Drag around 360° to scan the horizon and look up at the stars.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">🧭</span>
                <div>
                  <strong className="text-sky-300">Cyan Disc (Horizon):</strong> The local ground plane. Everything <span className="text-emerald-400 font-semibold">above</span> is visible in your sky right now; everything <span className="text-indigo-400 font-semibold">below</span> is under the horizon.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">☀️</span>
                <div>
                  <strong className="text-amber-300">Golden Arc:</strong> 24-hour diurnal trajectory of the active celestial body across the sky.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">📏</span>
                <div>
                  <strong className="text-white">Scale Modes:</strong>
                  <ul className="list-disc list-inside text-slate-400 pl-1 pt-0.5 space-y-0.5">
                    <li><strong className="text-amber-400">Dome View:</strong> Projects all bodies onto equal celestial sky sphere.</li>
                    <li><strong className="text-amber-400">3D Depth:</strong> Spaces planets radially by true astronomical distance (AU).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
          style={{ touchAction: 'none' }}
          className="w-full h-[560px] cursor-grab active:cursor-grabbing select-none touch-none"
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

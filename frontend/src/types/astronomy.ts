/**
 * Astronomical and System Data Types for SkyGazer AR & Solar System Sky Map.
 */

export type CelestialBodyId =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

export interface CelestialBodyInfo {
  id: CelestialBodyId;
  name: string;
  symbol: string;
  color: string;
  textColor: string;
  emissiveColor: string;
  sizeRadius: number; // rendering radius in Three.js
  axialTiltDeg: number; // authentic astronomical axial tilt
  orbitSpeed: number; // relative orbital velocity
  hasRings?: boolean;
  category: 'star' | 'moon' | 'terrestrial' | 'gas_giant' | 'ice_giant';
  description: string;
  scientificInfo: {
    type: string;
    diameterKm: number;
    distanceFromSunKm: string;
    dayLength: string;
    yearLength: string;
    temperature: string;
    moons: number;
    specialFact: string;
  };
}

export const CELESTIAL_BODIES: Record<CelestialBodyId, CelestialBodyInfo> = {
  Sun: {
    id: 'Sun',
    name: 'Sun',
    symbol: '☀️',
    color: '#F59E0B',
    textColor: 'text-amber-400',
    emissiveColor: '#FFF3BF',
    sizeRadius: 4.8,
    axialTiltDeg: 7.25,
    orbitSpeed: 0,
    category: 'star',
    description: 'G-type main-sequence star holding 99.86% of the Solar System mass.',
    scientificInfo: {
      type: 'G-type Main-Sequence Star',
      diameterKm: 1392700,
      distanceFromSunKm: '0 km (Center)',
      dayLength: '27 Earth days (equator)',
      yearLength: '230 million years (galactic orbit)',
      temperature: 'Surface 5,500 °C · Core 15,000,000 °C',
      moons: 0,
      specialFact: 'Holds 99.86% of the solar system’s total mass · Age 4.6 billion years.',
    },
  },
  Moon: {
    id: 'Moon',
    name: 'Moon',
    symbol: '🌕',
    color: '#E2E8F0',
    textColor: 'text-slate-200',
    emissiveColor: '#FFFFFF',
    sizeRadius: 3.4,
    axialTiltDeg: 1.54,
    orbitSpeed: 0.38,
    category: 'moon',
    description: 'Earth’s only natural satellite, exhibiting cyclical phases and oceanic tidal lock.',
    scientificInfo: {
      type: 'Natural Satellite',
      diameterKm: 3475,
      distanceFromSunKm: '384,400 km from Earth',
      dayLength: '29.5 Earth days (synodic)',
      yearLength: '27.3 Earth days (sidereal)',
      temperature: '−130 °C to 120 °C',
      moons: 0,
      specialFact: 'Fifth largest satellite in the Solar System; tidally locked so the same face always points to Earth.',
    },
  },
  Mercury: {
    id: 'Mercury',
    name: 'Mercury',
    symbol: '☿',
    color: '#94A3B8',
    textColor: 'text-slate-400',
    emissiveColor: '#CBD5E1',
    sizeRadius: 1.8,
    axialTiltDeg: 0.03,
    orbitSpeed: 0.48,
    category: 'terrestrial',
    description: 'Innermost rocky planet, heavily cratered with Caloris Basin and extreme temperature swings.',
    scientificInfo: {
      type: 'Terrestrial Planet',
      diameterKm: 4879,
      distanceFromSunKm: '57.9 million km',
      dayLength: '59 Earth days',
      yearLength: '88 days',
      temperature: '−173 °C to 427 °C',
      moons: 0,
      specialFact: 'Smallest planet in the solar system, dense metallic iron core making up 85% of its radius.',
    },
  },
  Venus: {
    id: 'Venus',
    name: 'Venus',
    symbol: '♀',
    color: '#FEF08A',
    textColor: 'text-yellow-200',
    emissiveColor: '#FEF9C3',
    sizeRadius: 2.5,
    axialTiltDeg: 177.0,
    orbitSpeed: 0.35,
    category: 'terrestrial',
    description: 'Hottest planet with runaway greenhouse effect and retrograde backward rotation.',
    scientificInfo: {
      type: 'Terrestrial Planet',
      diameterKm: 12104,
      distanceFromSunKm: '108.2 million km',
      dayLength: '243 Earth days (spins backwards)',
      yearLength: '225 days',
      temperature: '465 °C',
      moons: 0,
      specialFact: 'Rotates clockwise in retrograde; day length exceeds its entire year!',
    },
  },
  Mars: {
    id: 'Mars',
    name: 'Mars',
    symbol: '♂',
    color: '#EF4444',
    textColor: 'text-red-400',
    emissiveColor: '#FCA5A5',
    sizeRadius: 2.2,
    axialTiltDeg: 25.19,
    orbitSpeed: 0.24,
    category: 'terrestrial',
    description: 'Red planet with rusty iron-oxide dust, Valles Marineris canyon, and polar ice caps.',
    scientificInfo: {
      type: 'Terrestrial Planet',
      diameterKm: 6779,
      distanceFromSunKm: '227.9 million km',
      dayLength: '24 h 37 min',
      yearLength: '687 days',
      temperature: 'Avg −63 °C',
      moons: 2,
      specialFact: 'Home to Olympus Mons (tallest planetary volcano) and Valles Marineris (canyon 4,000 km long).',
    },
  },
  Jupiter: {
    id: 'Jupiter',
    name: 'Jupiter',
    symbol: '♃',
    color: '#FB923C',
    textColor: 'text-orange-400',
    emissiveColor: '#FDBA74',
    sizeRadius: 4.0,
    axialTiltDeg: 3.13,
    orbitSpeed: 0.13,
    category: 'gas_giant',
    description: 'Largest gas giant in the Solar System with turbulent cloud bands and the Great Red Spot.',
    scientificInfo: {
      type: 'Gas Giant',
      diameterKm: 139820,
      distanceFromSunKm: '778.5 million km',
      dayLength: '9 h 56 min',
      yearLength: '11.9 Earth years',
      temperature: 'Clouds −110 °C',
      moons: 95,
      specialFact: 'Mass is 2.5 times that of all other planets combined; Great Red Spot storm is wider than Earth.',
    },
  },
  Saturn: {
    id: 'Saturn',
    name: 'Saturn',
    symbol: '♄',
    color: '#FDE047',
    textColor: 'text-yellow-300',
    emissiveColor: '#FEF08A',
    sizeRadius: 3.4,
    hasRings: true,
    axialTiltDeg: 26.73,
    orbitSpeed: 0.10,
    category: 'gas_giant',
    description: 'Ringed gas giant celebrated for majestic icy rings and polar hexagon storm.',
    scientificInfo: {
      type: 'Gas Giant',
      diameterKm: 116460,
      distanceFromSunKm: '1.43 billion km',
      dayLength: '10 h 42 min',
      yearLength: '29.4 Earth years',
      temperature: 'Clouds −140 °C',
      moons: 146,
      specialFact: 'Lowest density of all planets (0.687 g/cm³); would float on a cosmic ocean of water.',
    },
  },
  Uranus: {
    id: 'Uranus',
    name: 'Uranus',
    symbol: '⛢',
    color: '#38BDF8',
    textColor: 'text-sky-400',
    emissiveColor: '#7DD3FC',
    sizeRadius: 2.8,
    axialTiltDeg: 97.77,
    orbitSpeed: 0.07,
    category: 'ice_giant',
    description: 'Pale cyan methane ice giant rotating completely on its side.',
    scientificInfo: {
      type: 'Ice Giant',
      diameterKm: 50724,
      distanceFromSunKm: '2.87 billion km',
      dayLength: '17 h 14 min',
      yearLength: '84 Earth years',
      temperature: 'Clouds −195 °C',
      moons: 28,
      specialFact: 'Extreme 97.8° axial tilt means its poles experience 42 years of continuous daylight then darkness.',
    },
  },
  Neptune: {
    id: 'Neptune',
    name: 'Neptune',
    symbol: '♆',
    color: '#3B82F6',
    textColor: 'text-blue-400',
    emissiveColor: '#93C5FD',
    sizeRadius: 2.7,
    axialTiltDeg: 28.32,
    orbitSpeed: 0.055,
    category: 'ice_giant',
    description: 'Distant deep-azure ice giant with Great Dark Spot and supersonic winds.',
    scientificInfo: {
      type: 'Ice Giant',
      diameterKm: 49244,
      distanceFromSunKm: '4.5 billion km',
      dayLength: '16 h 6 min',
      yearLength: '165 Earth years',
      temperature: 'Clouds −200 °C',
      moons: 16,
      specialFact: 'Fastest winds recorded in the Solar System, exceeding 2,000 km/h (1,200 mph).',
    },
  },
};

export const CELESTIAL_BODY_LIST: CelestialBodyInfo[] = Object.values(CELESTIAL_BODIES);

export interface GeodeticLocation {
  latitude: number;   // -90 to +90 deg
  longitude: number;  // -180 to +180 deg
  elevationM: number; // Elevation in meters
}

export interface SolarCoordinates {
  azimuthDeg: number;       // 0 = North, 90 = East, 180 = South, 270 = West
  altitudeDeg: number;      // -90 to +90 deg (apparent, refraction-corrected)
  geometricAltitudeDeg: number;
  refractionDeg: number;
  distanceAu: number;
  isAboveHorizon: boolean;
  timestampUtc: string;
}

export interface CelestialCoordinates extends SolarCoordinates {
  bodyId: CelestialBodyId;
  name: string;
  symbol: string;
  color: string;
  magnitude?: number;
  phaseFraction?: number; // 0.0 to 1.0 (illumination fraction)
  phaseAngleDeg?: number;
  phaseName?: string;
  distanceKm?: number;
}

export interface SolarEvents {
  sunriseUtc: string | null;
  solarNoonUtc: string | null;
  sunsetUtc: string | null;
}

export interface CelestialEvents {
  riseUtc: string | null;
  culminationUtc: string | null;
  setUtc: string | null;
}

export interface DiurnalWaypoint {
  timeUtc: string;
  azimuthDeg: number;
  altitudeDeg: number;
  vectorEnu: [number, number, number];
  isVisible: boolean;
}

export interface DeviceOrientationState {
  alpha: number | null; // Compass heading (yaw, 0 to 360)
  beta: number | null;  // Front-back pitch (-180 to 180)
  gamma: number | null; // Left-right roll (-90 to 90)
  compassHeading?: number | null; // True compass heading clockwise from North (0 to 360)
  cameraPitch?: number | null;    // Elevation above horizon (-90 to +90)
  cameraRoll?: number | null;     // Sideways roll (-180 to +180)
  absolute: boolean;
  compassAccuracy?: number;
  isSupported: boolean;
  permissionGranted: boolean;
}

export interface ManualCalibration {
  azimuthNudgeDeg: number;  // Offset added to orientation heading (-15 to +15)
  altitudeNudgeDeg: number; // Offset added to pitch (-15 to +15)
  fieldOfViewDeg: number;   // Camera vertical FOV (40 to 80 deg)
  declinationDeg: number;   // Magnetic declination correction (-30 to +30)
}

export interface VisionCandidate {
  centroid_px: [number, number];
  area_px: number;
  circularity: number;
}

export interface VisionProcessResult {
  filename: string;
  dimensions: { width: number; height: number };
  processing_time_ms: number;
  candidates_count: number;
  primary_candidate: VisionCandidate | null;
  all_candidates: VisionCandidate[];
}

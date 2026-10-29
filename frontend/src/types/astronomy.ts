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
  hasRings?: boolean;
  category: 'star' | 'moon' | 'terrestrial' | 'gas_giant' | 'ice_giant';
  description: string;
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
    category: 'star',
    description: 'Yellow dwarf star at the center of the Solar System.',
  },
  Moon: {
    id: 'Moon',
    name: 'Moon',
    symbol: '🌕',
    color: '#E2E8F0',
    textColor: 'text-slate-200',
    emissiveColor: '#FFFFFF',
    sizeRadius: 3.4,
    category: 'moon',
    description: 'Earth’s only natural satellite, exhibiting cyclical phases.',
  },
  Mercury: {
    id: 'Mercury',
    name: 'Mercury',
    symbol: '☿',
    color: '#94A3B8',
    textColor: 'text-slate-400',
    emissiveColor: '#CBD5E1',
    sizeRadius: 1.8,
    category: 'terrestrial',
    description: 'Innermost planet, heavily cratered and closest to the Sun.',
  },
  Venus: {
    id: 'Venus',
    name: 'Venus',
    symbol: '♀',
    color: '#FEF08A',
    textColor: 'text-yellow-200',
    emissiveColor: '#FEF9C3',
    sizeRadius: 2.5,
    category: 'terrestrial',
    description: 'Brightest natural object in the night sky with a dense CO2 atmosphere.',
  },
  Mars: {
    id: 'Mars',
    name: 'Mars',
    symbol: '♂',
    color: '#EF4444',
    textColor: 'text-red-400',
    emissiveColor: '#FCA5A5',
    sizeRadius: 2.2,
    category: 'terrestrial',
    description: 'The Red Planet, with iron oxide dust and thin atmosphere.',
  },
  Jupiter: {
    id: 'Jupiter',
    name: 'Jupiter',
    symbol: '♃',
    color: '#FB923C',
    textColor: 'text-orange-400',
    emissiveColor: '#FDBA74',
    sizeRadius: 4.0,
    category: 'gas_giant',
    description: 'Largest planet in the Solar System with prominent cloud bands.',
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
    category: 'gas_giant',
    description: 'Gas giant celebrated for its extensive and majestic ring system.',
  },
  Uranus: {
    id: 'Uranus',
    name: 'Uranus',
    symbol: '⛢',
    color: '#38BDF8',
    textColor: 'text-sky-400',
    emissiveColor: '#7DD3FC',
    sizeRadius: 2.8,
    category: 'ice_giant',
    description: 'Ice giant with pale cyan methane hue and extreme axial tilt.',
  },
  Neptune: {
    id: 'Neptune',
    name: 'Neptune',
    symbol: '♆',
    color: '#3B82F6',
    textColor: 'text-blue-400',
    emissiveColor: '#93C5FD',
    sizeRadius: 2.7,
    category: 'ice_giant',
    description: 'Distant deep-blue ice giant with supersonic atmospheric winds.',
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

/**
 * Navigational Star Catalog and Constellation Geometry.
 * Provides real celestial equatorial coordinates (RA/Dec) and converts them into
 * instantaneous topocentric Alt/Az horizontal vectors with atmospheric refraction.
 */

import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';
import { GeodeticLocation } from '../types/astronomy';
import { azAltToEnuVector, enuToThreeJsVector } from './coordinateTransforms';

export interface CatalogStar {
  id: string;
  name: string;
  raHours: number;    // Right Ascension (0 to 24 hours)
  decDeg: number;     // Declination (-90 to +90 degrees)
  mag: number;        // Apparent visual magnitude
  spectralColor: string; // RGB hex based on B-V color index
  constellation: string;
}

export interface ConstellationDef {
  id: string;
  name: string;
  lines: [string, string][]; // Star ID pairs
}

// 45 Major Bright Navigational Stars
export const BRIGHT_STARS: CatalogStar[] = [
  // Orion
  { id: 'betelgeuse', name: 'Betelgeuse', raHours: 5.919, decDeg: 7.407, mag: 0.5, spectralColor: '#FFA07A', constellation: 'Orion' },
  { id: 'rigel', name: 'Rigel', raHours: 5.242, decDeg: -8.201, mag: 0.13, spectralColor: '#B0E0E6', constellation: 'Orion' },
  { id: 'bellatrix', name: 'Bellatrix', raHours: 5.418, decDeg: 6.349, mag: 1.64, spectralColor: '#E0FFFF', constellation: 'Orion' },
  { id: 'saiph', name: 'Saiph', raHours: 5.795, decDeg: -9.669, mag: 2.07, spectralColor: '#B0E0E6', constellation: 'Orion' },
  { id: 'alnitak', name: 'Alnitak', raHours: 5.679, decDeg: -1.942, mag: 1.77, spectralColor: '#E0FFFF', constellation: 'Orion' },
  { id: 'alnilam', name: 'Alnilam', raHours: 5.603, decDeg: -1.201, mag: 1.69, spectralColor: '#E0FFFF', constellation: 'Orion' },
  { id: 'mintaka', name: 'Mintaka', raHours: 5.533, decDeg: -0.299, mag: 2.23, spectralColor: '#E0FFFF', constellation: 'Orion' },

  // Canis Major
  { id: 'sirius', name: 'Sirius', raHours: 6.752, decDeg: -16.716, mag: -1.46, spectralColor: '#F0F8FF', constellation: 'Canis Major' },

  // Canis Minor
  { id: 'procyon', name: 'Procyon', raHours: 7.652, decDeg: 5.224, mag: 0.38, spectralColor: '#FFFACD', constellation: 'Canis Minor' },

  // Ursa Minor
  { id: 'polaris', name: 'Polaris', raHours: 2.530, decDeg: 89.264, mag: 1.98, spectralColor: '#FFF8DC', constellation: 'Ursa Minor' },

  // Ursa Major (Big Dipper)
  { id: 'dubhe', name: 'Dubhe', raHours: 11.062, decDeg: 61.751, mag: 1.79, spectralColor: '#FFD700', constellation: 'Ursa Major' },
  { id: 'merak', name: 'Merak', raHours: 11.031, decDeg: 56.382, mag: 2.37, spectralColor: '#F0F8FF', constellation: 'Ursa Major' },
  { id: 'phecda', name: 'Phecda', raHours: 11.897, decDeg: 53.694, mag: 2.44, spectralColor: '#F0F8FF', constellation: 'Ursa Major' },
  { id: 'megrez', name: 'Megrez', raHours: 12.257, decDeg: 57.032, mag: 3.31, spectralColor: '#F0F8FF', constellation: 'Ursa Major' },
  { id: 'alioth', name: 'Alioth', raHours: 12.900, decDeg: 55.959, mag: 1.77, spectralColor: '#F0F8FF', constellation: 'Ursa Major' },
  { id: 'mizar', name: 'Mizar', raHours: 13.398, decDeg: 54.925, mag: 2.23, spectralColor: '#F0F8FF', constellation: 'Ursa Major' },
  { id: 'alkaid', name: 'Alkaid', raHours: 13.792, decDeg: 49.313, mag: 1.86, spectralColor: '#B0E0E6', constellation: 'Ursa Major' },

  // Cassiopeia ('W')
  { id: 'schedar', name: 'Schedar', raHours: 0.675, decDeg: 56.537, mag: 2.23, spectralColor: '#FFA500', constellation: 'Cassiopeia' },
  { id: 'caph', name: 'Caph', raHours: 0.152, decDeg: 59.149, mag: 2.27, spectralColor: '#FFFACD', constellation: 'Cassiopeia' },
  { id: 'gamma_cas', name: 'Navi', raHours: 0.945, decDeg: 60.716, mag: 2.15, spectralColor: '#B0E0E6', constellation: 'Cassiopeia' },
  { id: 'ruchbah', name: 'Ruchbah', raHours: 1.429, decDeg: 60.235, mag: 2.68, spectralColor: '#F0F8FF', constellation: 'Cassiopeia' },
  { id: 'segin', name: 'Segin', raHours: 1.905, decDeg: 63.670, mag: 3.37, spectralColor: '#B0E0E6', constellation: 'Cassiopeia' },

  // Summer Triangle (Lyra, Aquila, Cygnus)
  { id: 'vega', name: 'Vega', raHours: 18.615, decDeg: 38.783, mag: 0.03, spectralColor: '#F0FFFF', constellation: 'Lyra' },
  { id: 'altair', name: 'Altair', raHours: 19.846, decDeg: 8.868, mag: 0.77, spectralColor: '#F0F8FF', constellation: 'Aquila' },
  { id: 'deneb', name: 'Deneb', raHours: 20.690, decDeg: 45.280, mag: 1.25, spectralColor: '#F0F8FF', constellation: 'Cygnus' },

  // Cygnus Cross
  { id: 'sadr', name: 'Sadr', raHours: 20.373, decDeg: 40.256, mag: 2.23, spectralColor: '#FFFACD', constellation: 'Cygnus' },
  { id: 'gienah_cyg', name: 'Gienah', raHours: 20.769, decDeg: 33.970, mag: 2.48, spectralColor: '#FFD700', constellation: 'Cygnus' },
  { id: 'albirio', name: 'Albireo', raHours: 19.512, decDeg: 27.959, mag: 3.05, spectralColor: '#FFA500', constellation: 'Cygnus' },

  // Taurus
  { id: 'aldebaran', name: 'Aldebaran', raHours: 4.598, decDeg: 16.509, mag: 0.85, spectralColor: '#FF7F50', constellation: 'Taurus' },
  { id: 'elnath', name: 'Elnath', raHours: 5.438, decDeg: 28.607, mag: 1.65, spectralColor: '#B0E0E6', constellation: 'Taurus' },

  // Gemini
  { id: 'castor', name: 'Castor', raHours: 7.576, decDeg: 31.888, mag: 1.58, spectralColor: '#F0F8FF', constellation: 'Gemini' },
  { id: 'pollux', name: 'Pollux', raHours: 7.755, decDeg: 28.026, mag: 1.14, spectralColor: '#FFA500', constellation: 'Gemini' },

  // Scorpius
  { id: 'antares', name: 'Antares', raHours: 16.490, decDeg: -26.432, mag: 1.06, spectralColor: '#FF4500', constellation: 'Scorpius' },
  { id: 'shaula', name: 'Shaula', raHours: 17.560, decDeg: -37.103, mag: 1.62, spectralColor: '#B0E0E6', constellation: 'Scorpius' },

  // Boötes & Virgo
  { id: 'arcturus', name: 'Arcturus', raHours: 14.261, decDeg: 19.182, mag: -0.05, spectralColor: '#FFA500', constellation: 'Bootes' },
  { id: 'spica', name: 'Spica', raHours: 13.419, decDeg: -11.161, mag: 0.98, spectralColor: '#B0E0E6', constellation: 'Virgo' },

  // Leo
  { id: 'regulus', name: 'Regulus', raHours: 10.139, decDeg: 11.967, mag: 1.36, spectralColor: '#B0E0E6', constellation: 'Leo' },
  { id: 'denebola', name: 'Denebola', raHours: 11.817, decDeg: 14.572, mag: 2.14, spectralColor: '#F0F8FF', constellation: 'Leo' },

  // Auriga
  { id: 'capella', name: 'Capella', raHours: 5.278, decDeg: 45.997, mag: 0.08, spectralColor: '#FFD700', constellation: 'Auriga' },

  // Southern Navigational
  { id: 'canopus', name: 'Canopus', raHours: 6.399, decDeg: -52.695, mag: -0.74, spectralColor: '#F0F8FF', constellation: 'Carina' },
  { id: 'fomalhaut', name: 'Fomalhaut', raHours: 22.960, decDeg: -29.622, mag: 1.17, spectralColor: '#F0F8FF', constellation: 'Piscis Austrinus' },
  { id: 'achernar', name: 'Achernar', raHours: 1.628, decDeg: -57.236, mag: 0.45, spectralColor: '#B0E0E6', constellation: 'Eridanus' },
];

// Constellation line stick figures
export const CONSTELLATION_DEFS: ConstellationDef[] = [
  {
    id: 'Orion',
    name: 'Orion (The Hunter)',
    lines: [
      ['betelgeuse', 'bellatrix'],
      ['bellatrix', 'rigel'],
      ['rigel', 'saiph'],
      ['saiph', 'betelgeuse'],
      ['alnitak', 'alnilam'],
      ['alnilam', 'mintaka'],
      ['betelgeuse', 'alnitak'],
      ['bellatrix', 'mintaka'],
    ],
  },
  {
    id: 'UrsaMajor',
    name: 'Ursa Major (Big Dipper)',
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    id: 'Cassiopeia',
    name: 'Cassiopeia (The Queen)',
    lines: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
  {
    id: 'Cygnus',
    name: 'Cygnus (The Northern Cross)',
    lines: [
      ['deneb', 'sadr'],
      ['sadr', 'albirio'],
      ['sadr', 'gienah_cyg'],
    ],
  },
  {
    id: 'SummerTriangle',
    name: 'Summer Triangle Asterism',
    lines: [
      ['vega', 'deneb'],
      ['deneb', 'altair'],
      ['altair', 'vega'],
    ],
  },
  {
    id: 'Gemini',
    name: 'Gemini (The Twins)',
    lines: [
      ['castor', 'pollux'],
    ],
  },
  {
    id: 'Taurus',
    name: 'Taurus (The Bull)',
    lines: [
      ['aldebaran', 'elnath'],
    ],
  },
];

export interface CalculatedStar {
  star: CatalogStar;
  azimuthDeg: number;
  altitudeDeg: number;
  isAboveHorizon: boolean;
  enuVector: THREE.Vector3;
  threeJsPos: THREE.Vector3;
}

/**
 * Calculates instantaneous topocentric Alt/Az horizontal positions and 3D vectors
 * for all catalog stars for a specific observer location and time.
 */
export function calculateStarPositions(
  location: GeodeticLocation,
  date: Date = new Date(),
  domeRadius: number = 79.5
): Map<string, CalculatedStar> {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevationM);
  const result = new Map<string, CalculatedStar>();

  for (const s of BRIGHT_STARS) {
    const hor = Astronomy.Horizon(date, observer, s.raHours, s.decDeg, 'normal');
    const enu = azAltToEnuVector(hor.azimuth, hor.altitude);
    const v3 = enuToThreeJsVector(enu, domeRadius);

    result.set(s.id, {
      star: s,
      azimuthDeg: hor.azimuth,
      altitudeDeg: hor.altitude,
      isAboveHorizon: hor.altitude >= 0,
      enuVector: enu,
      threeJsPos: v3,
    });
  }

  return result;
}

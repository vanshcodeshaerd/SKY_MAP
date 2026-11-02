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

export interface CelestialBodyComposition {
  core: string;
  mantle: string;
  crust: string;
  atmosphere: string;
}

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
  surfaceGravity: string;
  composition: CelestialBodyComposition;
  mineralsAndElements: string[];
  funFacts: string[];
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
    surfaceGravity: '274.0 m/s² (28.0g — 28× Earth gravity)',
    composition: {
      core: 'Nuclear fusion core (dense ionized hydrogen & helium plasma under 250 billion atm pressure)',
      mantle: 'Radiative zone (photons take ~100,000 years to migrate outward) & Convective envelope',
      crust: 'Photosphere (~500 km thick visible boundary with granular convection cells)',
      atmosphere: 'Chromosphere and Corona extending millions of km into space (1–3 million °C solar plasma)',
    },
    mineralsAndElements: ['Hydrogen (73.4%)', 'Helium (24.8%)', 'Oxygen (0.77%)', 'Carbon (0.29%)', 'Iron (0.16%)', 'Neon (0.12%)'],
    funFacts: [
      'About 1.3 million Earths could fit inside the volume of the Sun.',
      'The Sun converts 600 million tons of hydrogen into helium every second, losing 4 million tons as pure energy.',
      'Light generated in the solar core takes up to 100,000 years to reach the surface, but then only 8.3 minutes to reach Earth!',
    ],
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
    surfaceGravity: '1.62 m/s² (0.166g — you weigh 83% less!)',
    composition: {
      core: 'Small metallic iron core (~350 km radius) alloyed with nickel and sulfur',
      mantle: 'Rigid silicate-rich lithospheric mantle of olivine, orthopyroxene, and clinopyroxene',
      crust: 'Anorthosite regolith crust (60 km near side, 100 km far side) pulverized by billions of years of impacts',
      atmosphere: 'Near-vacuum exosphere (helium, argon, neon, and sodium traces without weather)',
    },
    mineralsAndElements: ['Anorthosite (Plagioclase)', 'Basalt (Lunar Maria)', 'Ilmenite (Titanium ore)', 'Olivine', 'Pyroxene', 'Water Ice (Polar Traps)'],
    funFacts: [
      'Footprints left by Apollo astronauts will stay visible for millions of years with no wind or rain to erode them.',
      'The Moon is tidally locked to Earth, meaning humanity only ever sees 59% of its surface from the ground.',
      'The Moon is slowly drifting away from Earth at a steady rate of 3.8 cm (1.5 inches) per year.',
    ],
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
    surfaceGravity: '3.70 m/s² (0.38g — jump 2.6× higher!)',
    composition: {
      core: 'Enormous metallic iron core making up 85% of planetary radius, partially molten',
      mantle: 'Thin silicate rocky mantle (~400 km thick) compressed by planetary cooling',
      crust: 'Dense silicate crust marked by impact craters and long thrust faults (scarps)',
      atmosphere: 'Extremely thin exosphere containing oxygen, sodium, hydrogen, helium, and potassium',
    },
    mineralsAndElements: ['Metallic Iron & Nickel', 'Magnesium Silicates', 'Enstatite', 'Sulfur Compounds', 'Graphite (Carbon Crust)', 'Water Ice (Polar craters)'],
    funFacts: [
      'Despite daytime temperatures reaching 430 °C, water ice survives inside permanently shadowed polar craters.',
      'A single solar day on Mercury lasts 176 Earth days — twice as long as its entire 88-day orbital year!',
      'Mercury has shrunk by about 7 km in radius as its colossal iron core gradually cooled and solidified.',
    ],
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
    surfaceGravity: '8.87 m/s² (0.90g — almost identical to Earth)',
    composition: {
      core: 'Central metallic iron-nickel core (~3,000 km radius), dynamo currently dormant',
      mantle: 'Silicate rock mantle churning with massive internal convective heat plumes',
      crust: 'Single unbroken basaltic crust dominated by volcanic plains, lava flows, and tesserae',
      atmosphere: 'Crushing 96.5% Carbon Dioxide atmosphere with sulfuric acid aerosol clouds (92 atm pressure)',
    },
    mineralsAndElements: ['Basalt (Volcanic rock)', 'Pyrite & Hematite', 'Magnetite', 'Sulfuric Acid Droplets', 'Carbon Dioxide (96.5%)', 'Nitrogen (3.5%)'],
    funFacts: [
      'Venus is hotter than Mercury despite being nearly twice as far from the Sun, due to an extreme runaway greenhouse effect.',
      'Venus spins in retrograde (clockwise) so slowly that its day (243 Earth days) is longer than its orbital year (225 days)!',
      'The surface atmospheric pressure equals the crushing pressure 900 meters (3,000 ft) beneath Earth’s oceans.',
    ],
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
    surfaceGravity: '3.72 m/s² (0.38g — jump 2.6× higher!)',
    composition: {
      core: 'Dense metallic core of iron, nickel, and sulfur (~1,800 km radius), partially fluid',
      mantle: 'Silicate mantle rich in olivine and peridotite with extinct volcanic conduits',
      crust: 'Basaltic crust enriched in iron oxide (rust) dust, varying from 10 km to 50 km thick',
      atmosphere: 'Thin atmosphere: 95.3% Carbon Dioxide, 2.6% Nitrogen, 1.9% Argon, surface pressure 6.1 mbar',
    },
    mineralsAndElements: ['Hematite (Rust Fe₂O₃)', 'Basalt', 'Smectite Clays', 'Perchlorates (Salts)', 'Water Ice & CO₂ Dry Ice', 'Gypsum & Sulfates'],
    funFacts: [
      'Home to Olympus Mons, the tallest volcano in the Solar System — 22 km high (nearly 3× Mount Everest)!',
      'Valles Marineris is a colossal canyon system 4,000 km long, stretching the distance from New York to Los Angeles.',
      'Sunsets on Mars glow an eerie electric blue because fine dust particles scatter red light and let blue pass through.',
    ],
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
    surfaceGravity: '24.79 m/s² (2.53g — you would feel 2.5× heavier)',
    composition: {
      core: 'Dense diffuse core of rock, metal, and high-pressure ice (12–25 Earth masses)',
      mantle: 'Vast ocean of liquid metallic hydrogen conducting colossal electrical currents',
      crust: 'Gradual transition from liquid molecular hydrogen ocean to deep gaseous atmosphere',
      atmosphere: 'Dynamic cloud belts of ammonia crystals, ammonium hydrosulfide, water vapor, and phosphine',
    },
    mineralsAndElements: ['Hydrogen (89.8%)', 'Helium (10.2%)', 'Liquid Metallic Hydrogen', 'Ammonia Ice Crystals', 'Water Vapor', 'Methane & Phosphine'],
    funFacts: [
      'Jupiter acts as a cosmic shield for Earth, using its massive gravitational pull to swallow or deflect incoming comets.',
      'The Great Red Spot is a counter-clockwise anticyclonic storm that has raged for over 350 years and could swallow Earth whole.',
      'Jupiter has 95 officially confirmed moons; its moon Ganymede is larger than Mercury and has its own magnetic field.',
    ],
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
    surfaceGravity: '10.44 m/s² (1.07g — almost identical to Earth gravity)',
    composition: {
      core: 'Dense core of iron, nickel, silicates, and high-pressure water/ammonia ices (~15 Earth masses)',
      mantle: 'Fluid metallic hydrogen envelope generating Saturn’s symmetric magnetic field',
      crust: 'Deep layer of liquid molecular hydrogen and helium rain droplets',
      atmosphere: 'Hazy golden atmosphere of molecular hydrogen (96%) and helium (3%) with ammonia clouds',
    },
    mineralsAndElements: ['Water Ice (99% of Rings)', 'Molecular Hydrogen (96%)', 'Helium (3%)', 'Ammonia Ice', 'Tholins (Organic compounds)', 'Silicate Dust'],
    funFacts: [
      'Saturn has the lowest density of any planet (0.687 g/cm³) — it would literally float in a giant cosmic bathtub of water!',
      'Saturn’s rings span 282,000 km across, yet they are remarkably razor-thin, averaging only 10 to 30 meters in thickness.',
      'Saturn possesses 146 confirmed moons, the highest count in the solar system, including Titan with rivers of liquid methane.',
    ],
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
    surfaceGravity: '8.69 m/s² (0.89g — jump 12% higher!)',
    composition: {
      core: 'Small rocky core composed of iron, nickel, and silicates (~0.55 Earth masses)',
      mantle: 'Vast, dense supercritical icy mantle of water, ammonia, and methane under millions of atmospheres',
      crust: 'Supercritical ionic ocean where extreme temperature and pressure split methane into pure diamond rain',
      atmosphere: 'Pale cyan upper atmosphere: Hydrogen (82.5%), Helium (15.2%), and Methane (2.3%)',
    },
    mineralsAndElements: ['Methane Gas & Crystals (CH₄)', 'Water Ice & Superionic Water', 'Ammonia Ice (NH₃)', 'Hydrogen & Helium Gas', 'Solid Carbon Diamonds', 'Hydrogen Sulfide'],
    funFacts: [
      'Uranus spins on its side with an axial tilt of 97.8°, meaning its poles face the Sun directly for 42 years at a time!',
      'Deep inside Uranus, extreme pressures compress carbon into literal diamond precipitation that sinks to the core.',
      'Uranus holds the record for the coldest recorded planetary atmosphere in the Solar System at −224 °C (−371 °F).',
    ],
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
    surfaceGravity: '11.15 m/s² (1.14g — slightly heavier than Earth)',
    composition: {
      core: 'Rocky and metallic core of iron, nickel, and magnesium silicates (~1.2 Earth masses)',
      mantle: 'Hot, dense, electrically conductive fluid mantle of water, ammonia, and methane molecules',
      crust: 'Deep fluid mantle transition region where hydrocarbon compression precipitates solid diamond crystals',
      atmosphere: 'Rich azure blue atmosphere: Hydrogen (80%), Helium (19%), Methane (1.5%) with high-altitude methane cirrus clouds',
    },
    mineralsAndElements: ['Methane Ice Cirrus', 'Supercritical Water & Ammonia', 'Silicate Minerals (Core)', 'Molecular Hydrogen & Helium', 'Solid Diamond Crystals', 'Ammonia Hydrosulfide'],
    funFacts: [
      'Neptune features the fastest recorded winds in the solar system, clocking speeds over 2,100 km/h (1,300 mph).',
      'Neptune was discovered through mathematical prediction by Urbain Le Verrier before it was ever seen through a telescope.',
      'Its moon Triton orbits backward (retrograde) and shoots active liquid nitrogen geysers 8 km up into the vacuum of space!',
    ],
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

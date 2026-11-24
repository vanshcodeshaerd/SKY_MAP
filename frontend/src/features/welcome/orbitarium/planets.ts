export type OrbitariumPlanet = {
  name: string;
  texture: string;
  radius: number;
  distance: number;
  orbitSpeed: number;
  spin: number;
  tilt: number;
  type: string;
  description: string;
  facts: { label: string; value: string }[];
  ring?: boolean;
};

export type OrbitariumInfo = {
  name: string;
  type: string;
  description: string;
  facts: { label: string; value: string }[];
};

export const ORBITARIUM_SUN: OrbitariumInfo = {
  name: 'Sun',
  type: 'G-type main-sequence star',
  description:
    'The Sun is a nearly perfect sphere of hot plasma at the centre of our solar system. Nuclear fusion in its core turns about 600 million tonnes of hydrogen into helium every second, releasing the energy that lights and warms every planet.',
  facts: [
    { label: 'Diameter', value: '1,392,700 km' },
    { label: 'Surface temp', value: '5,500 °C' },
    { label: 'Core temp', value: '15 million °C' },
    { label: 'Age', value: '4.6 billion years' },
    { label: 'Mass', value: '99.86% of the solar system' },
    { label: 'Light to Earth', value: '8 min 20 s' },
  ],
};

/** Planet atlas data (Orbitarium / Solar System Scope textures, CC BY 4.0). */
export const ORBITARIUM_PLANETS: OrbitariumPlanet[] = [
  {
    name: 'Mercury',
    texture: '/textures/mercury.jpg',
    radius: 0.38,
    distance: 6,
    orbitSpeed: 0.48,
    spin: 0.02,
    tilt: 0.03,
    type: 'Terrestrial planet',
    description:
      'The smallest planet and closest to the Sun. Mercury has almost no atmosphere, so its cratered surface swings from scorching days to freezing nights.',
    facts: [
      { label: 'Diameter', value: '4,879 km' },
      { label: 'Distance from Sun', value: '57.9 million km' },
      { label: 'Day length', value: '59 Earth days' },
      { label: 'Year length', value: '88 Earth days' },
      { label: 'Temperature', value: '−173 to 427 °C' },
      { label: 'Moons', value: '0' },
    ],
  },
  {
    name: 'Venus',
    texture: '/textures/venus_surface.jpg',
    radius: 0.95,
    distance: 8.5,
    orbitSpeed: 0.35,
    spin: -0.01,
    tilt: 177,
    type: 'Terrestrial planet',
    description:
      "Earth's 'twin' in size, but wrapped in thick carbon-dioxide clouds that trap heat, making it the hottest planet. It spins backwards compared to most planets.",
    facts: [
      { label: 'Diameter', value: '12,104 km' },
      { label: 'Distance from Sun', value: '108.2 million km' },
      { label: 'Day length', value: '243 Earth days' },
      { label: 'Year length', value: '225 Earth days' },
      { label: 'Surface temp', value: '465 °C' },
      { label: 'Moons', value: '0' },
    ],
  },
  {
    name: 'Earth',
    texture: '/textures/earth_daymap.jpg',
    radius: 1,
    distance: 11.5,
    orbitSpeed: 0.3,
    spin: 0.5,
    tilt: 23.4,
    type: 'Terrestrial planet',
    description:
      'Our home — the only known world with liquid water on its surface and life. About 71% of the surface is ocean, protected by a nitrogen-oxygen atmosphere.',
    facts: [
      { label: 'Diameter', value: '12,742 km' },
      { label: 'Distance from Sun', value: '149.6 million km' },
      { label: 'Day length', value: '24 hours' },
      { label: 'Year length', value: '365.25 days' },
      { label: 'Avg. temp', value: '15 °C' },
      { label: 'Moons', value: '1' },
    ],
  },
  {
    name: 'Mars',
    texture: '/textures/mars.jpg',
    radius: 0.53,
    distance: 14.5,
    orbitSpeed: 0.24,
    spin: 0.48,
    tilt: 25.2,
    type: 'Terrestrial planet',
    description:
      'The Red Planet gets its colour from iron oxide dust. It hosts Olympus Mons, the tallest volcano in the solar system, and ancient riverbeds hinting at a watery past.',
    facts: [
      { label: 'Diameter', value: '6,779 km' },
      { label: 'Distance from Sun', value: '227.9 million km' },
      { label: 'Day length', value: '24 h 37 min' },
      { label: 'Year length', value: '687 Earth days' },
      { label: 'Avg. temp', value: '−63 °C' },
      { label: 'Moons', value: '2' },
    ],
  },
  {
    name: 'Jupiter',
    texture: '/textures/jupiter.jpg',
    radius: 2.6,
    distance: 20,
    orbitSpeed: 0.13,
    spin: 1.2,
    tilt: 3.1,
    type: 'Gas giant',
    description:
      'The largest planet — more than twice as massive as all others combined. Its Great Red Spot is a storm bigger than Earth that has raged for centuries.',
    facts: [
      { label: 'Diameter', value: '139,820 km' },
      { label: 'Distance from Sun', value: '778.5 million km' },
      { label: 'Day length', value: '9 h 56 min' },
      { label: 'Year length', value: '11.9 Earth years' },
      { label: 'Cloud temp', value: '−110 °C' },
      { label: 'Moons', value: '95' },
    ],
  },
  {
    name: 'Saturn',
    texture: '/textures/saturn.jpg',
    radius: 2.2,
    distance: 27,
    orbitSpeed: 0.1,
    spin: 1.1,
    tilt: 26.7,
    ring: true,
    type: 'Gas giant',
    description:
      'Famous for its spectacular rings of ice and rock. Saturn is so light it would float in water, and it has the most known moons of any planet.',
    facts: [
      { label: 'Diameter', value: '116,460 km' },
      { label: 'Distance from Sun', value: '1.43 billion km' },
      { label: 'Day length', value: '10 h 42 min' },
      { label: 'Year length', value: '29.4 Earth years' },
      { label: 'Cloud temp', value: '−140 °C' },
      { label: 'Moons', value: '146' },
    ],
  },
  {
    name: 'Uranus',
    texture: '/textures/uranus.jpg',
    radius: 1.6,
    distance: 33,
    orbitSpeed: 0.07,
    spin: -0.7,
    tilt: 97.8,
    type: 'Ice giant',
    description:
      'An ice giant that rotates on its side, likely after an ancient collision. Methane in its atmosphere gives it a pale cyan colour.',
    facts: [
      { label: 'Diameter', value: '50,724 km' },
      { label: 'Distance from Sun', value: '2.87 billion km' },
      { label: 'Day length', value: '17 h 14 min' },
      { label: 'Year length', value: '84 Earth years' },
      { label: 'Cloud temp', value: '−195 °C' },
      { label: 'Moons', value: '28' },
    ],
  },
  {
    name: 'Neptune',
    texture: '/textures/neptune.jpg',
    radius: 1.55,
    distance: 38.5,
    orbitSpeed: 0.055,
    spin: 0.75,
    tilt: 28.3,
    type: 'Ice giant',
    description:
      'The farthest planet, a deep-blue world with the fastest winds in the solar system — over 2,000 km/h. It was found by mathematics before it was seen.',
    facts: [
      { label: 'Diameter', value: '49,244 km' },
      { label: 'Distance from Sun', value: '4.5 billion km' },
      { label: 'Day length', value: '16 h 6 min' },
      { label: 'Year length', value: '165 Earth years' },
      { label: 'Cloud temp', value: '−200 °C' },
      { label: 'Moons', value: '16' },
    ],
  },
];

export function orbitariumNameToBodyId(name: string): string {
  return name;
}

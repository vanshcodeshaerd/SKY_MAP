export interface HistoricalContext {
  origin: string;
  culturalAge: string;
  bestMonths: string;
  seasonalVisibility: string;
  mythology: string;
}

const PTOLEMY_ORIGIN =
  'Cataloged by Claudius Ptolemy in the Almagest (c. 150 CE), with roots in Babylonian and Greek astronomy.';
const BAYER_ORIGIN =
  'Introduced by Johann Bayer in Uranometria (1603) following early European celestial charting of the southern sky.';
const PLANCIUS_ORIGIN =
  'Defined by Dutch cartographer Petrus Plancius (late 16th – early 17th century) and popularized in Uranometria (1603).';
const LACAILLE_ORIGIN =
  'Created by French astronomer Nicolas-Louis de Lacaille (1751–1752) during his southern sky survey from the Cape of Good Hope.';
const HEVELIUS_ORIGIN =
  'Introduced by Polish astronomer Johannes Hevelius in Firmamentum Sobiescianum (1687/1690) to fill gaps between ancient patterns.';

export const IAU_STANDARDIZATION_NOTE =
  'Constellations are human-defined sky regions, not physically formed objects. The IAU adopted the 88-constellation list in 1922, approved official boundaries in 1928, and published them in 1930 (Eugène Delporte).';

// 48 Ptolemaic constellations
const PTOLEMAIC_IDS = new Set([
  'And', 'Aqr', 'Aql', 'Ara', 'Ari', 'Aur', 'Boo', 'Cnc', 'CMa', 'CMi',
  'Cap', 'Cas', 'Cen', 'Cep', 'Cet', 'CrA', 'CrB', 'Crv', 'Crt', 'Cyg',
  'Del', 'Dra', 'Equ', 'Eri', 'Gem', 'Her', 'Hya', 'Leo', 'Lep', 'Lib',
  'Lup', 'Lyr', 'Oph', 'Ori', 'Peg', 'Per', 'Psc', 'PsA', 'Sge', 'Sgr',
  'Sco', 'Ser', 'Tau', 'Tri', 'UMa', 'UMi', 'Vir', 'Pup', 'Vel', 'Car',
]);

// Bayer / Plancius 16th-17th century southern constellations
const BAYER_IDS = new Set([
  'Aps', 'Cha', 'Dor', 'Gru', 'Hyi', 'Ind', 'Mus', 'Pav', 'Phe', 'Tuc', 'TrA', 'Vol',
  'Cam', 'Col', 'Mon',
]);

// Hevelius 1687/1690 constellations
const HEVELIUS_IDS = new Set([
  'CVn', 'Lac', 'LMi', 'Lyn', 'Sct', 'Sex', 'Vul',
]);

// Lacaille 1751-1752 constellations
const LACAILLE_IDS = new Set([
  'Ant', 'Cae', 'Cir', 'For', 'Hor', 'Men', 'Mic', 'Nor', 'Oct', 'Pic', 'Pyx', 'Ret', 'Scl', 'Tel',
]);

const SPECIFIC_LORE: Record<string, Partial<HistoricalContext>> = {
  Ori: {
    origin: 'Mesopotamian ("True Shepherd of Anu", c. 1000 BCE) and Homeric Greek astronomy; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~3,000+ years (Mesopotamian/Greek tradition); 104 years since 1922 IAU standardization.',
    bestMonths: 'December – February',
    seasonalVisibility: 'Northern Winter / Southern Summer',
    mythology: 'Orion, the giant huntsman of Greek mythology, stands facing Taurus with his belt of three supergiants (Alnitak, Alnilam, Mintaka).',
  },
  UMa: {
    origin: 'Prehistoric circumpolar sky lore across Eurasian and Indigenous cultures; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: 'At least ~2,500–4,000+ years in written records (likely older); 104 years since 1922 IAU standardization.',
    bestMonths: 'March – May',
    seasonalVisibility: 'Circumpolar (Northern Hemisphere)',
    mythology: 'The Great Bear (Big Dipper asterism), whose pointer stars Dubhe and Merak lead directly to Polaris.',
  },
  UMi: {
    origin: 'Attributed to Thales of Miletus (c. 600 BCE) as a Phoenician navigation guide; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~2,600 years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'May – July (visible year-round in north)',
    seasonalVisibility: 'Circumpolar (Northern Hemisphere)',
    mythology: 'The Little Bear, anchoring the north celestial pole at Polaris.',
  },
  Cas: {
    origin: 'Ancient Greek and Arabic sky lore; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~2,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'October – December',
    seasonalVisibility: 'Circumpolar (Northern Hemisphere)',
    mythology: 'Queen Cassiopeia seated on her throne, forming a distinctive "W" or "M" asterism across the Milky Way.',
  },
  Tau: {
    origin: 'Babylonian ("Bull of Heaven", MUL.APIN c. 1000 BCE) and Bronze Age traditions; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~3,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'December – February',
    seasonalVisibility: 'Northern Winter / Zodiac',
    mythology: 'The Bull charging Orion, home to the red giant Aldebaran, the Hyades, and the Pleiades star cluster (M45).',
  },
  Sco: {
    origin: 'Babylonian ("MUL.GIR.TAB", c. 1000 BCE) and Greek astronomy; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~3,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'June – August',
    seasonalVisibility: 'Northern Summer / Southern Winter',
    mythology: 'The Scorpion sent by Gaia against Orion; anchored by the red supergiant Antares ("Rival of Mars").',
  },
  Leo: {
    origin: 'Mesopotamian ("Great Lion", c. 1000 BCE) and Egyptian/Greek astronomy; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~3,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'March – May',
    seasonalVisibility: 'Northern Spring / Zodiac',
    mythology: 'The Nemean Lion slain by Heracles, marked by the "Sickle" asterism and bright blue-white Regulus.',
  },
  Cyg: {
    origin: 'Greek astronomy (Almagest c. 150 CE) and older Eurasian Milky Way bird traditions.',
    culturalAge: '~2,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'July – September',
    seasonalVisibility: 'Northern Summer',
    mythology: 'The Swan (Northern Cross) flying along the Milky Way, anchored by supergiant Deneb.',
  },
  Lyr: {
    origin: 'Babylonian and Greek astronomy; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~2,000+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'June – September',
    seasonalVisibility: 'Northern Summer',
    mythology: 'The Lyre of Orpheus, anchored by Vega—one of the brightest stars in the sky and part of the Summer Triangle.',
  },
  CMa: {
    origin: 'Mesopotamian ("Arrow/Bow") and Greek astronomy; cataloged by Ptolemy (c. 150 CE).',
    culturalAge: '~2,500+ years documented; 104 years since 1922 IAU standardization.',
    bestMonths: 'January – March',
    seasonalVisibility: 'Northern Winter / Southern Summer',
    mythology: 'Orion’s Great Dog, featuring Sirius—the brightest star in Earth’s night sky (8.6 light years away).',
  },
  Cru: {
    origin: 'Separated from Centaurus by European navigators (16th century) and formalized by Augustin Royer (1679).',
    culturalAge: '~350–500 years as an independent constellation; 104 years since 1922 IAU standardization.',
    bestMonths: 'April – June',
    seasonalVisibility: 'Southern Hemisphere (Circumpolar)',
    mythology: 'The Southern Cross, smallest of the 88 IAU constellations and the primary celestial pointer to the south celestial pole.',
  },
};

export function getConstellationHistory(id: string, fallbackMythology?: string): HistoricalContext {
  const custom = SPECIFIC_LORE[id];
  if (custom) {
    return {
      origin: custom.origin!,
      culturalAge: custom.culturalAge!,
      bestMonths: custom.bestMonths!,
      seasonalVisibility: custom.seasonalVisibility!,
      mythology: custom.mythology!,
    };
  }

  if (PTOLEMAIC_IDS.has(id)) {
    return {
      origin: PTOLEMY_ORIGIN,
      culturalAge: '~1,875+ years since Ptolemy’s Almagest (c. 150 CE); 104 years since 1922 IAU standardization.',
      bestMonths: 'Seasonal (varies by RA)',
      seasonalVisibility: 'Classical Ptolemaic Sky',
      mythology: fallbackMythology ?? 'Classical Greco-Babylonian constellation standardized by the IAU.',
    };
  }
  if (BAYER_IDS.has(id)) {
    return {
      origin: id === 'Cam' || id === 'Mon' || id === 'Col' ? PLANCIUS_ORIGIN : BAYER_ORIGIN,
      culturalAge: '~420 years (early 17th century); 104 years since 1922 IAU standardization.',
      bestMonths: 'Southern / Winter Sky',
      seasonalVisibility: 'Early Modern Celestial Cartography',
      mythology: fallbackMythology ?? 'Defined during early European southern-hemisphere celestial surveys.',
    };
  }
  if (HEVELIUS_IDS.has(id)) {
    return {
      origin: HEVELIUS_ORIGIN,
      culturalAge: '~335 years (1687/1690); 104 years since 1922 IAU standardization.',
      bestMonths: 'Northern Summer / Spring',
      seasonalVisibility: 'Northern Hemisphere',
      mythology: fallbackMythology ?? 'Introduced by Johannes Hevelius to chart faint stars between classical constellations.',
    };
  }
  if (LACAILLE_IDS.has(id)) {
    return {
      origin: LACAILLE_ORIGIN,
      culturalAge: '~274 years (1751–1752); 104 years since 1922 IAU standardization.',
      bestMonths: 'Southern Sky',
      seasonalVisibility: 'Southern Hemisphere',
      mythology: fallbackMythology ?? 'Named by Nicolas-Louis de Lacaille after scientific instruments and arts.',
    };
  }

  return {
    origin: 'Standardized by the International Astronomical Union (1922–1930).',
    culturalAge: 'Origin date uncertain; 104 years since 1922 IAU standardization.',
    bestMonths: 'Year-round (latitude dependent)',
    seasonalVisibility: 'IAU Standardized Region',
    mythology: fallbackMythology ?? 'Official IAU constellation.',
  };
}

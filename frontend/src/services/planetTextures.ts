/**
 * Procedural photorealistic planetary texture generator using HTML5 Canvas & Three.js.
 * Produces authentic surface detail for Sun, Moon, and all Solar System planets without external asset dependencies.
 */

import * as THREE from 'three';

// Cache generated textures to avoid re-rendering canvases
const textureCache: Map<string, THREE.CanvasTexture> = new Map();

/**
 * Creates high-detail procedural Sun texture with turbulent solar granules and flares.
 */
export function getSunTexture(): THREE.CanvasTexture {
  if (textureCache.has('sun')) return textureCache.get('sun')!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base fiery gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#FFF5BA');
  grad.addColorStop(0.3, '#F59E0B');
  grad.addColorStop(0.7, '#D97706');
  grad.addColorStop(1, '#92400E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Solar convective granules noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 2 + Math.random() * 8;
    const alpha = 0.15 + Math.random() * 0.35;
    ctx.fillStyle = Math.random() > 0.4 ? `rgba(255, 250, 200, ${alpha})` : `rgba(180, 50, 10, ${alpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solar flares and active magnetic filaments
  ctx.strokeStyle = 'rgba(255, 255, 220, 0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    let cx = Math.random() * canvas.width;
    let cy = Math.random() * canvas.height;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 6; j++) {
      cx += (Math.random() - 0.5) * 60;
      cy += (Math.random() - 0.5) * 30;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('sun', texture);
  return texture;
}

/**
 * Creates photorealistic lunar texture with basaltic maria, highland craters, and ray systems.
 */
export function getMoonTexture(): THREE.CanvasTexture {
  if (textureCache.has('moon')) return textureCache.get('moon')!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base lunar highlands silvery-gray
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dark lunar basaltic maria (Ocean of Storms, Sea of Tranquility, Sea of Serenity)
  const maria = [
    { x: 300, y: 220, rx: 140, ry: 100, rot: 0.2 },
    { x: 480, y: 200, rx: 110, ry: 90, rot: -0.1 },
    { x: 580, y: 260, rx: 90, ry: 70, rot: 0.3 },
    { x: 420, y: 320, rx: 100, ry: 80, rot: 0.1 },
    { x: 700, y: 240, rx: 80, ry: 60, rot: -0.2 },
    { x: 180, y: 280, rx: 90, ry: 80, rot: 0.4 },
  ];

  ctx.fillStyle = '#475569';
  maria.forEach((m) => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, m.rx, m.ry, 0, 0, Math.PI * 2);
    ctx.filter = 'blur(16px)';
    ctx.fill();
    ctx.restore();
  });
  ctx.filter = 'none';

  // Impact craters with dark centers and bright ejecta rims
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 2 + Math.random() * 12;

    // Crater shadow
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Crater illuminated rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.9, 0, Math.PI);
    ctx.stroke();
  }

  // Tycho-like prominent ray crater
  const tychoX = 460;
  const tychoY = 380;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const len = 60 + Math.random() * 140;
    ctx.beginPath();
    ctx.moveTo(tychoX, tychoY);
    ctx.lineTo(tychoX + Math.cos(angle) * len, tychoY + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('moon', texture);
  return texture;
}

/**
 * Creates realistic Mercury texture (cratered, rocky, airless).
 */
export function getMercuryTexture(): THREE.CanvasTexture {
  if (textureCache.has('mercury')) return textureCache.get('mercury')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#64748B';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 1 + Math.random() * 6;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(30, 41, 59, 0.6)' : 'rgba(203, 213, 225, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('mercury', texture);
  return texture;
}

/**
 * Creates thick, swirling sulfuric acid atmosphere texture for Venus.
 */
export function getVenusTexture(): THREE.CanvasTexture {
  if (textureCache.has('venus')) return textureCache.get('venus')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.3, '#FDE047');
  grad.addColorStop(0.7, '#EAB308');
  grad.addColorStop(1, '#CA8A04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Atmospheric super-rotating zonal bands
  ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * canvas.height;
    const h = 4 + Math.random() * 16;
    ctx.fillRect(0, y, canvas.width, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('venus', texture);
  return texture;
}

/**
 * Creates realistic Mars surface with red iron-oxide plains, Valles Marineris canyon, and white polar caps.
 */
export function getMarsTexture(): THREE.CanvasTexture {
  if (textureCache.has('mars')) return textureCache.get('mars')!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rust-orange base terrain
  ctx.fillStyle = '#C2410C';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dark volcanic basalt regions (Syrtis Major, Acidalia Planitia)
  ctx.fillStyle = '#7C2D12';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(
      150 + i * 110,
      220 + (i % 3) * 40,
      80 + Math.random() * 40,
      50 + Math.random() * 30,
      Math.random() * 0.5,
      0,
      Math.PI * 2
    );
    ctx.filter = 'blur(12px)';
    ctx.fill();
  }
  ctx.filter = 'none';

  // Valles Marineris canyon rift
  ctx.strokeStyle = '#431407';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 260);
  ctx.bezierCurveTo(450, 250, 550, 280, 650, 265);
  ctx.stroke();

  // White carbon-dioxide polar ice caps
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 10, 220, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height - 10, 200, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('mars', texture);
  return texture;
}

/**
 * Creates photorealistic Jupiter texture with alternating equatorial cloud bands and Great Red Spot.
 */
export function getJupiterTexture(): THREE.CanvasTexture {
  if (textureCache.has('jupiter')) return textureCache.get('jupiter')!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Alternating belts and zones
  const colors = [
    '#FDE68A', '#F59E0B', '#D97706', '#B45309',
    '#FFFBEB', '#92400E', '#78350F', '#FDE68A',
    '#B45309', '#D97706', '#F59E0B', '#FEF3C7',
  ];

  const bandHeight = canvas.height / colors.length;
  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, idx * bandHeight, canvas.width, bandHeight);
  });

  // Atmospheric turbulence & eddy swirls
  for (let y = 40; y < canvas.height - 40; y += 12) {
    ctx.strokeStyle = y % 24 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(110, 30, 5, 0.35)';
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.quadraticCurveTo(x + 20, y + (Math.random() - 0.5) * 16, x + 40, y);
    }
    ctx.stroke();
  }

  // The Great Red Spot (giant anticyclonic storm in Southern Hemisphere)
  const spotX = 640;
  const spotY = 320;
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 55, 34, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Spot inner swirling core
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.ellipse(spotX - 4, spotY, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('jupiter', texture);
  return texture;
}

/**
 * Creates Saturn body texture with delicate muted golden atmospheric latitudinal banding.
 */
export function getSaturnTexture(): THREE.CanvasTexture {
  if (textureCache.has('saturn')) return textureCache.get('saturn')!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.2, '#FDE047');
  grad.addColorStop(0.5, '#EAB308');
  grad.addColorStop(0.8, '#FACC15');
  grad.addColorStop(1, '#CA8A04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle latitudinal bands
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * canvas.height;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(161, 98, 7, 0.2)';
    ctx.fillRect(0, y, canvas.width, 3 + Math.random() * 12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('saturn', texture);
  return texture;
}

/**
 * Creates multi-ring texture with the prominent Cassini Division gap for Saturn's rings.
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (textureCache.has('saturn_rings')) return textureCache.get('saturn_rings')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient across ring width (from inner C Ring to outer A Ring)
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, 'rgba(160, 130, 90, 0.1)'); // Inner C ring (translucent)
  grad.addColorStop(0.18, 'rgba(215, 185, 140, 0.7)'); // B ring inner
  grad.addColorStop(0.55, 'rgba(240, 215, 170, 0.95)'); // B ring bright outer edge
  grad.addColorStop(0.57, 'rgba(0, 0, 0, 0.05)'); // Cassini Division gap!
  grad.addColorStop(0.63, 'rgba(0, 0, 0, 0.05)'); // Cassini Division gap!
  grad.addColorStop(0.65, 'rgba(210, 185, 145, 0.85)'); // A ring inner
  grad.addColorStop(0.92, 'rgba(195, 170, 130, 0.7)'); // Encke gap & A ring outer
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Vacuum space

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fine ringlet striations
  for (let x = 30; x < canvas.width - 20; x += 4) {
    if (x > 280 && x < 330) continue; // Keep Cassini division clean
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(80, 50, 20, 0.15)';
    ctx.fillRect(x, 0, 2, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('saturn_rings', texture);
  return texture;
}

/**
 * Creates cyan methane atmosphere texture for Uranus.
 */
export function getUranusTexture(): THREE.CanvasTexture {
  if (textureCache.has('uranus')) return textureCache.get('uranus')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#7DD3FC');
  grad.addColorStop(0.5, '#38BDF8');
  grad.addColorStop(1, '#0284C7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('uranus', texture);
  return texture;
}

/**
 * Creates deep azure blue texture for Neptune with dynamic white methane cirrus cloud streaks.
 */
export function getNeptuneTexture(): THREE.CanvasTexture {
  if (textureCache.has('neptune')) return textureCache.get('neptune')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#60A5FA');
  grad.addColorStop(0.4, '#2563EB');
  grad.addColorStop(0.7, '#1D4ED8');
  grad.addColorStop(1, '#1E40AF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White high-altitude methane clouds
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const y = 80 + i * 16;
    ctx.beginPath();
    ctx.moveTo(100 + i * 30, y);
    ctx.bezierCurveTo(200, y - 6, 320, y + 6, 440, y);
    ctx.stroke();
  }

  // The Great Dark Spot
  ctx.fillStyle = '#172554';
  ctx.beginPath();
  ctx.ellipse(320, 140, 35, 20, -0.1, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('neptune', texture);
  return texture;
}

/**
 * Retrieves the appropriate procedural canvas texture for any Solar System celestial body.
 */
export function getPlanetTexture(bodyId: string): THREE.CanvasTexture {
  switch (bodyId) {
    case 'Sun':
      return getSunTexture();
    case 'Moon':
      return getMoonTexture();
    case 'Mercury':
      return getMercuryTexture();
    case 'Venus':
      return getVenusTexture();
    case 'Mars':
      return getMarsTexture();
    case 'Jupiter':
      return getJupiterTexture();
    case 'Saturn':
      return getSaturnTexture();
    case 'Uranus':
      return getUranusTexture();
    case 'Neptune':
      return getNeptuneTexture();
    default:
      return getMoonTexture();
  }
}

// In-memory cache for high-resolution 3D planet appearance thumbnails
const thumbnailCache: Map<string, string> = new Map();

/**
 * Generates an authentic, photorealistic 2D miniature representation of the celestial body
 * for Star Walk / SkyView HUD targeting and AR/VR display with 3D spherical shading and ring systems.
 */
export function getPlanetThumbnail(bodyId: string, size: number = 96): string {
  const cacheKey = `${bodyId}_${size}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;

  ctx.clearRect(0, 0, size, size);

  if (bodyId === 'Sun') {
    // Solar Corona & Flare Rays
    const corona = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, size * 0.49);
    corona.addColorStop(0, 'rgba(255, 230, 100, 0.95)');
    corona.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');
    corona.addColorStop(0.8, 'rgba(239, 68, 68, 0.2)');
    corona.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2);
    ctx.fill();

    // Solar Disc with Limb Darkening
    const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    disc.addColorStop(0, '#FFFFFF');
    disc.addColorStop(0.3, '#FEF08A');
    disc.addColorStop(0.7, '#F59E0B');
    disc.addColorStop(1, '#B45309');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (bodyId === 'Saturn') {
    // Back half of Saturn's Rings (drawn behind planet)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35); // Realistic orbital tilt
    const ringMajor = radius * 2.3;
    const ringMinor = radius * 0.65;

    // Draw back arc of ring
    ctx.beginPath();
    ctx.ellipse(0, 0, ringMajor, ringMinor, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(217, 180, 130, 0.85)';
    ctx.lineWidth = radius * 0.45;
    ctx.stroke();

    // Cassini Division in back
    ctx.beginPath();
    ctx.ellipse(0, 0, ringMajor * 0.82, ringMinor * 0.82, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(10, 15, 25, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Saturn's Shaded Globe
    const globe = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
    globe.addColorStop(0, '#FEF3C7');
    globe.addColorStop(0.5, '#FCD34D');
    globe.addColorStop(0.8, '#D97706');
    globe.addColorStop(1, '#451A03');
    ctx.fillStyle = globe;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Saturn's Cloud Belts
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.clip();
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 83, 9, 0.25)' : 'rgba(254, 243, 199, 0.2)';
      ctx.fillRect(cx - radius, cy + i * 5 - 2, radius * 2, 4);
    }
    ctx.restore();

    // Front half of Saturn's Rings (drawn over planet)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, ringMajor, ringMinor, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(235, 205, 155, 0.95)';
    ctx.lineWidth = radius * 0.45;
    ctx.stroke();

    // Cassini Division in front
    ctx.beginPath();
    ctx.ellipse(0, 0, ringMajor * 0.82, ringMinor * 0.82, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(10, 15, 25, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else {
    // Generic Spherical Shaded Planet
    const lightX = cx - radius * 0.35;
    const lightY = cy - radius * 0.35;

    // Atmospheric Aura Glow
    const aura = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.35);
    let auraColor = 'rgba(148, 163, 184, 0.25)';
    if (bodyId === 'Mars') auraColor = 'rgba(239, 68, 68, 0.3)';
    else if (bodyId === 'Venus') auraColor = 'rgba(254, 240, 138, 0.4)';
    else if (bodyId === 'Jupiter') auraColor = 'rgba(245, 158, 11, 0.25)';
    else if (bodyId === 'Uranus') auraColor = 'rgba(56, 189, 248, 0.35)';
    else if (bodyId === 'Neptune') auraColor = 'rgba(59, 130, 246, 0.4)';

    aura.addColorStop(0, auraColor);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Base Sphere with 3D Lighting
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const sphereGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.05, cx, cy, radius * 1.05);

    if (bodyId === 'Moon') {
      sphereGrad.addColorStop(0, '#F1F5F9');
      sphereGrad.addColorStop(0.5, '#CBD5E1');
      sphereGrad.addColorStop(0.8, '#475569');
      sphereGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Dark Basaltic Maria Patches
      ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - 3, cy - 4, 7, 5, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 4, cy - 2, 6, 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx - 2, cy + 6, 8, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Tycho Ray Crater
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(cx - 3, cy + 9, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (bodyId === 'Mars') {
      sphereGrad.addColorStop(0, '#FCA5A5');
      sphereGrad.addColorStop(0.5, '#EF4444');
      sphereGrad.addColorStop(0.8, '#991B1B');
      sphereGrad.addColorStop(1, '#450A0A');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Dark Canyons / Syrtis Major
      ctx.fillStyle = 'rgba(69, 10, 10, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx + 1, cy + 2, 8, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // White North Polar Ice Cap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - radius + 3, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bodyId === 'Jupiter') {
      sphereGrad.addColorStop(0, '#FEF3C7');
      sphereGrad.addColorStop(0.4, '#FDE68A');
      sphereGrad.addColorStop(0.7, '#D97706');
      sphereGrad.addColorStop(1, '#451A03');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Cloud Belts
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(146, 64, 14, 0.4)' : 'rgba(254, 243, 199, 0.3)';
        ctx.fillRect(cx - radius, cy + i * 4.5 - 1.5, radius * 2, 3);
      }

      // Great Red Spot
      ctx.fillStyle = '#B91C1C';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + 5, 4.5, 3, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (bodyId === 'Venus') {
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.3, '#FEF08A');
      sphereGrad.addColorStop(0.7, '#EAB308');
      sphereGrad.addColorStop(1, '#713F12');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    } else if (bodyId === 'Mercury') {
      sphereGrad.addColorStop(0, '#E2E8F0');
      sphereGrad.addColorStop(0.4, '#94A3B8');
      sphereGrad.addColorStop(0.8, '#475569');
      sphereGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    } else if (bodyId === 'Uranus') {
      sphereGrad.addColorStop(0, '#E0F2FE');
      sphereGrad.addColorStop(0.4, '#38BDF8');
      sphereGrad.addColorStop(0.8, '#0284C7');
      sphereGrad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    } else if (bodyId === 'Neptune') {
      sphereGrad.addColorStop(0, '#93C5FD');
      sphereGrad.addColorStop(0.4, '#3B82F6');
      sphereGrad.addColorStop(0.8, '#1D4ED8');
      sphereGrad.addColorStop(1, '#172554');
      ctx.fillStyle = sphereGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Great Dark Spot
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy - 2, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/png');
  thumbnailCache.set(cacheKey, dataUrl);
  return dataUrl;
}


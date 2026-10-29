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

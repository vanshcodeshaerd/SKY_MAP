/**
 * Orbitarium Planet Atlas — interactive 3D solar system (ported from orbitarium-planet-atlas).
 * Same layout, controls, and panels as the original Lovable project.
 */

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera, ChevronRight, Compass, LayoutGrid, Sparkles, Sun as SunIcon } from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import {
  ORBITARIUM_PLANETS,
  ORBITARIUM_SUN,
  type OrbitariumInfo,
  type OrbitariumPlanet,
} from './planets';

type Info = OrbitariumInfo;

function useTex(url: string) {
  const t = useLoader(THREE.TextureLoader, url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 512; x++) {
    const n = Math.sin(x * 0.35) * 0.2 + Math.sin(x * 0.07) * 0.3 + Math.random() * 0.25;
    const a =
      x < 40 ? 0 : x > 500 ? 0 : Math.max(0, Math.min(1, 0.45 + n)) * (x > 300 && x < 320 ? 0.15 : 1);
    g.fillStyle = `rgba(${210 + n * 30},${190 + n * 30},${150 + n * 20},${a})`;
    g.fillRect(x, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Ring({ inner, outer }: { inner: number; outer: number }) {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 128);
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    return g;
  }, [inner, outer]);
  const tex = useMemo(ringTexture, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function planetToInfo(p: OrbitariumPlanet): Info {
  return {
    name: p.name,
    type: p.type,
    description: p.description,
    facts: p.facts,
  };
}

function PlanetMesh({
  p,
  onSelect,
  speed,
}: {
  p: OrbitariumPlanet;
  onSelect: (info: Info) => void;
  speed: number;
}) {
  const orbit = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const angle = useRef(Math.random() * Math.PI * 2);
  const tex = useTex(p.texture);
  const [hover, setHover] = useState(false);
  useFrame((_, d) => {
    const dt = Math.min(d, 0.05) * speed;
    angle.current += p.orbitSpeed * dt * 0.5;
    orbit.current?.position.set(
      Math.cos(angle.current) * p.distance,
      0,
      Math.sin(angle.current) * p.distance
    );
    if (body.current) body.current.rotation.y += p.spin * dt;
  });
  const pts = useMemo(
    () =>
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return [Math.cos(a) * p.distance, 0, Math.sin(a) * p.distance] as [number, number, number];
      }),
    [p.distance]
  );
  return (
    <>
      <Line
        points={pts}
        color={hover ? '#f5c27a' : '#5a6a8a'}
        lineWidth={hover ? 1.5 : 0.6}
        transparent
        opacity={0.5}
      />
      <group ref={orbit}>
        <group rotation={[0, 0, THREE.MathUtils.degToRad(p.tilt)]}>
          <mesh
            ref={body}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(planetToInfo(p));
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHover(false);
              document.body.style.cursor = '';
            }}
          >
            <sphereGeometry args={[p.radius, 64, 64]} />
            <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
          </mesh>
          {p.ring && <Ring inner={p.radius * 1.25} outer={p.radius * 2.3} />}
        </group>
      </group>
    </>
  );
}

function SunMesh({ onSelect }: { onSelect: () => void }) {
  const tex = useTex('/textures/sun.jpg');
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.03;
  });
  return (
    <group>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[3.5, 64, 64]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh scale={1.18}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial
          color="#ffb347"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight intensity={900} distance={0} decay={1.6} color="#fff4e0" />
    </group>
  );
}

function Stars() {
  const tex = useTex('/textures/stars_milky_way.jpg');
  return (
    <mesh>
      <sphereGeometry args={[400, 64, 64]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} color="#888888" />
    </mesh>
  );
}

const TRACKABLE = new Set<string>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]);

type AppTab = 'dashboard' | 'sky3d' | 'ar' | 'cvlab';

export interface OrbitariumSolarSystemProps {
  onNavigate: (tab: AppTab) => void;
  onOpenBodyInAr: (bodyId: CelestialBodyId) => void;
  onOpenMissionHub: () => void;
}

export function OrbitariumSolarSystem({
  onNavigate,
  onOpenBodyInAr,
  onOpenMissionHub,
}: OrbitariumSolarSystemProps) {
  const [info, setInfo] = useState<Info | null>(null);
  const [speed, setSpeed] = useState(1);

  const navItems: Info[] = [
    ORBITARIUM_SUN,
    ...ORBITARIUM_PLANETS.map(planetToInfo),
  ];

  return (
    <div className="orbitarium-root relative h-[100dvh] w-full overflow-hidden bg-orbit-background text-orbit-foreground">
      <Canvas
        camera={{ position: [0, 28, 52], fov: 50 }}
        onPointerMissed={() => setInfo(null)}
        className="!absolute inset-0"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.08} />
        <Suspense fallback={null}>
          <Stars />
          <SunMesh onSelect={() => setInfo(ORBITARIUM_SUN)} />
          {ORBITARIUM_PLANETS.map((p) => (
            <PlanetMesh key={p.name} p={p} speed={speed} onSelect={setInfo} />
          ))}
        </Suspense>
        <OrbitControls enablePan={false} minDistance={8} maxDistance={120} />
      </Canvas>

      <header className="pointer-events-none absolute left-0 top-0 z-20 p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.4em] text-orbit-primary">Explore</p>
        <h1 className="font-orbitarium-display text-4xl text-orbit-foreground md:text-6xl">
          The Solar System
        </h1>
        <p className="mt-2 max-w-sm text-sm text-orbit-muted-foreground">
          Drag to rotate, scroll to zoom. Tap the Sun or any planet to learn about it.
        </p>
      </header>

      <div className="absolute top-4 right-4 z-30 flex flex-wrap items-center justify-end gap-2 pointer-events-auto max-w-[min(100%,24rem)]">
        <button
          type="button"
          onClick={onOpenMissionHub}
          className="inline-flex items-center gap-1.5 rounded-full border border-orbit-border bg-orbit-card-80 px-3 py-1.5 text-[11px] backdrop-blur text-orbit-foreground hover:border-orbit-primary"
        >
          <Sparkles className="w-3.5 h-3.5 text-orbit-primary" />
          Missions
        </button>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 rounded-full border border-orbit-primary bg-orbit-primary px-3 py-1.5 text-[11px] font-semibold text-orbit-primary-foreground"
        >
          SkyMap AR
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <nav className="absolute bottom-0 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-2 p-4 pb-5 pointer-events-auto">
        {navItems.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setInfo(p)}
            className={`rounded-full border px-3 py-1 text-xs backdrop-blur transition ${
              info?.name === p.name
                ? 'border-orbit-primary bg-orbit-primary text-orbit-primary-foreground'
                : 'border-orbit-border bg-orbit-card-60 text-orbit-foreground hover:border-orbit-primary'
            }`}
          >
            {p.name}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-xs text-orbit-muted-foreground">
          Speed
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
            className="accent-orbit-primary w-20 md:w-28"
          />
        </label>
      </nav>

      {info && (
        <aside className="absolute right-4 top-4 z-20 w-[calc(100%-2rem)] max-w-sm animate-fade-in rounded-2xl border border-orbit-border bg-orbit-card-80 p-6 shadow-2xl backdrop-blur-xl md:right-8 md:top-8 max-h-[calc(100dvh-6rem)] overflow-y-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => setInfo(null)}
            aria-label="Close"
            className="absolute right-4 top-3 text-xl text-orbit-muted-foreground hover:text-orbit-foreground"
          >
            ×
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-orbit-primary">{info.type}</p>
          <h2 className="font-orbitarium-display text-4xl text-orbit-card-foreground">{info.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-orbit-muted-foreground">{info.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {info.facts.map((f) => (
              <div
                key={f.label}
                className="rounded-lg border border-orbit-border bg-orbit-background-40 p-3"
              >
                <dt className="text-[10px] uppercase tracking-wider text-orbit-muted-foreground">
                  {f.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-orbit-card-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 pt-4 border-t border-orbit-border space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-orbit-muted-foreground">
              SkyMap AR observatory
            </p>
            {TRACKABLE.has(info.name) && (
              <button
                type="button"
                onClick={() => onOpenBodyInAr(info.name as CelestialBodyId)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-orbit-primary-90 text-orbit-primary-foreground text-sm font-medium"
              >
                <Camera className="w-4 h-4" />
                Track in AR
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <BridgeBtn icon={SunIcon} label="Dashboard" onClick={() => onNavigate('dashboard')} />
              <BridgeBtn icon={Camera} label="AR" onClick={() => onNavigate('ar')} />
              <BridgeBtn icon={Compass} label="3D" onClick={() => onNavigate('sky3d')} />
              <BridgeBtn icon={LayoutGrid} label="CV Lab" onClick={() => onNavigate('cvlab')} />
            </div>
          </div>
        </aside>
      )}

      <p className="absolute bottom-16 right-4 z-10 text-[10px] text-orbit-muted-foreground pointer-events-none">
        Textures: Solar System Scope (CC BY 4.0)
      </p>
    </div>
  );
}

function BridgeBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof SunIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-orbit-border bg-orbit-background-50 text-[11px] text-orbit-foreground hover:border-orbit-primary"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

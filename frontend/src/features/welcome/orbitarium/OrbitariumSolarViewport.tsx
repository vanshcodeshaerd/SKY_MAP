import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  ORBITARIUM_PLANETS,
  ORBITARIUM_SUN,
  type OrbitariumInfo,
  type OrbitariumPlanet,
} from './planets';

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return coarse;
}

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

function planetToInfo(p: OrbitariumPlanet): OrbitariumInfo {
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
  onSelect: (info: OrbitariumInfo) => void;
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

const NAV_ITEMS: OrbitariumInfo[] = [
  ORBITARIUM_SUN,
  ...ORBITARIUM_PLANETS.map(planetToInfo),
];

export interface OrbitariumSolarViewportProps {
  selected: OrbitariumInfo | null;
  onSelect: (info: OrbitariumInfo | null) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  /** Tighter camera for welcome hero. */
  compact?: boolean;
  /** Edge-to-edge canvas so stars continue under left copy (no color seam). */
  fullBleed?: boolean;
  sceneShiftX?: number;
  /** Planet picker anchored to right side only. */
  controlsAnchor?: 'full' | 'right';
}

function SolarSystemScene({
  shiftX,
  speed,
  onSelect,
}: {
  shiftX: number;
  speed: number;
  onSelect: (info: OrbitariumInfo | null) => void;
}) {
  return (
    <group position={[shiftX, 0, 0]}>
      <Stars />
      <SunMesh onSelect={() => onSelect(ORBITARIUM_SUN)} />
      {ORBITARIUM_PLANETS.map((p) => (
        <PlanetMesh key={p.name} p={p} speed={speed} onSelect={onSelect} />
      ))}
    </group>
  );
}

export function OrbitariumSolarViewport({
  selected,
  onSelect,
  speed,
  onSpeedChange,
  compact = false,
  fullBleed = false,
  sceneShiftX = 0,
  controlsAnchor = 'full',
}: OrbitariumSolarViewportProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const coarse = useCoarsePointer();

  const camY = compact ? 24 : 28;
  const camZ = compact ? 38 : 52;
  const minDist = compact ? 6 : 8;
  const maxDist = compact ? 72 : 120;
  const shift = fullBleed ? sceneShiftX : 0;

  const navClass =
    controlsAnchor === 'right'
      ? 'absolute bottom-0 left-[38%] right-0 z-10 pointer-events-auto sm:left-[40%] lg:left-[42%]'
      : 'absolute bottom-0 left-0 right-0 z-10 pointer-events-auto';

  return (
    <div
      className={`touch-none select-none ${fullBleed ? 'absolute inset-0' : 'absolute inset-0'}`}
      style={{ background: 'transparent' }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [shift, camY, camZ], fov: compact ? 42 : 50 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        onPointerMissed={() => onSelect(null)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        <ambientLight intensity={0.08} />
        <Suspense fallback={null}>
          <SolarSystemScene shiftX={shift} speed={speed} onSelect={onSelect} />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          target={[shift, 0, 0]}
          enablePan={false}
          enableZoom={!coarse}
          minDistance={minDist}
          maxDistance={maxDist}
          rotateSpeed={coarse ? 0.45 : 0.65}
        />
      </Canvas>

      {coarse && (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 pointer-events-auto">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => {
              controlsRef.current?.dollyIn(1.12);
              controlsRef.current?.update();
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-orbit-border bg-orbit-card-80 text-orbit-foreground text-lg"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => {
              controlsRef.current?.dollyOut(1.12);
              controlsRef.current?.update();
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-orbit-border bg-orbit-card-80 text-orbit-foreground text-lg"
          >
            −
          </button>
        </div>
      )}

      <nav className={navClass}>
        <div className="flex overflow-x-auto gap-1 px-2 py-2 scrollbar-none">
          {NAV_ITEMS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onSelect(p)}
              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] backdrop-blur ${
                selected?.name === p.name
                  ? 'border-orbit-primary bg-orbit-primary text-orbit-primary-foreground'
                  : 'border-orbit-border/80 bg-orbit-card-60 text-orbit-foreground'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-center gap-2 pb-2 text-[10px] text-orbit-muted-foreground">
          Orbit speed
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={speed}
            onChange={(e) => onSpeedChange(+e.target.value)}
            className="accent-orbit-primary w-20"
          />
        </label>
      </nav>
    </div>
  );
}

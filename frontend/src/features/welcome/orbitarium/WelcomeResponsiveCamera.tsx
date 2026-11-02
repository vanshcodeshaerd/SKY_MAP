import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { WelcomeViewportLayout } from './useWelcomeViewportLayout';

export function WelcomeResponsiveCamera({
  layout,
  controlsRef,
}: {
  layout: WelcomeViewportLayout;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(layout.shiftX, layout.camY, layout.camZ);
    if ('fov' in camera && typeof camera.fov === 'number') {
      camera.fov = layout.fov;
      camera.updateProjectionMatrix();
    }
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(layout.shiftX, 0, 0);
      controls.minDistance = layout.minDist;
      controls.maxDistance = layout.maxDist;
      controls.update();
    }
  }, [layout, camera, controlsRef]);

  return null;
}

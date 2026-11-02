import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { WelcomeViewportLayout } from './useWelcomeViewportLayout';
import * as THREE from 'three';

/** Same left-copy / right-solar framing on phone, tablet, and desktop. */
export function WelcomeResponsiveCamera({
  layout,
  controlsRef,
}: {
  layout: WelcomeViewportLayout;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    camera.position.set(0, layout.camY, layout.camZ);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = layout.fov;

      const shift =
        layout.tier === 'desktop' ? 0.22 : layout.tier === 'tablet' ? 0.17 : 0.14;
      const xOffset = -Math.round(size.width * shift);
      camera.setViewOffset(size.width, size.height, xOffset, 0, size.width, size.height);
      camera.updateProjectionMatrix();
    }

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.minDistance = layout.minDist;
      controls.maxDistance = layout.maxDist;
      controls.update();
    }
  }, [layout, camera, size, controlsRef]);

  return null;
}

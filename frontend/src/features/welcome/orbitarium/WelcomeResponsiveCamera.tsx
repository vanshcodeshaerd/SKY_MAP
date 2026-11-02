import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { WelcomeViewportLayout } from './useWelcomeViewportLayout';
import * as THREE from 'three';

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

      if (layout.tier === 'desktop') {
        // Shift camera view offset so solar system is placed gracefully on the right
        const xOffset = -Math.round(size.width * 0.22);
        camera.setViewOffset(size.width, size.height, xOffset, 0, size.width, size.height);
      } else if (layout.tier === 'tablet') {
        const xOffset = -Math.round(size.width * 0.15);
        camera.setViewOffset(size.width, size.height, xOffset, 0, size.width, size.height);
      } else {
        camera.clearViewOffset();
      }

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

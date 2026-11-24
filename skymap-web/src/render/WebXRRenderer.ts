import { WebGLRenderer } from './WebGLRenderer.ts';
import type { RenderMode, RenderOptions, SkySceneData } from './types.ts';

/** WebXR immersive VR — stars at optical infinity (direction only, no binocular offset). */
export class WebXRRenderer extends WebGLRenderer {
  private xrSession: XRSession | null = null;

  async init(container: HTMLElement, options: RenderOptions): Promise<void> {
    await super.init(container, options);
  }

  async enterVR(): Promise<boolean> {
    if (!navigator.xr) return false;
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) return false;
    this.xrSession = await navigator.xr.requestSession('immersive-vr');
    return true;
  }

  render(sceneData: SkySceneData, cameraMatrix: number[][]): void {
    super.render(sceneData, cameraMatrix);
  }

  async exitVR(): Promise<void> {
    await this.xrSession?.end();
    this.xrSession = null;
  }

  setMode(mode: RenderMode): void {
    super.setMode(mode === 'VR_STEREO' ? 'VR_STEREO' : mode);
  }
}
import type { IRenderer } from './IRenderer.ts';
import type { RenderMode, RenderOptions, SkySceneData } from './types.ts';

export class WebGLRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private options: RenderOptions;
  private three: typeof import('three') | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private scene: import('three').Scene | null = null;
  private camera: import('three').PerspectiveCamera | null = null;
  private points: import('three').Points | null = null;

  constructor(options: RenderOptions) {
    this.options = options;
  }

  async init(container: HTMLElement, options: RenderOptions): Promise<void> {
    this.options = options;
    this.three = await import('three');
    const THREE = this.three;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl-canvas';
    this.canvas.className = 'absolute inset-0 pointer-events-none';
    container.prepend(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000);
    this.camera.position.z = 0.01;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 0.03, color: 0xffffff, sizeAttenuation: true });
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  setMode(mode: RenderMode): void {
    this.options.mode = mode;
    if (this.canvas) this.canvas.style.display = mode === 'AR' ? 'none' : 'block';
  }

  resize(width: number, height: number): void {
    if (this.renderer && this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  render(sceneData: SkySceneData, _cameraMatrix: number[][]): void {
    if (!this.three || !this.renderer || !this.scene || !this.camera || !this.points) return;
    if (!sceneData.visibility.stars || !this.options.showStars) {
      this.points.geometry.setAttribute('position', new this.three.BufferAttribute(new Float32Array(0), 3));
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const visible = sceneData.stars.filter((s) => s.onScreen);
    const positions = new Float32Array(visible.length * 3);
    const sizes = new Float32Array(visible.length);
    for (let i = 0; i < visible.length; i++) {
      const ndcX = (visible[i].x / window.innerWidth - 0.5) * 2;
      const ndcY = -(visible[i].y / window.innerHeight - 0.5) * 2;
      positions[i * 3] = ndcX;
      positions[i * 3 + 1] = ndcY;
      positions[i * 3 + 2] = -1;
      sizes[i] = Math.max(0.5, 4 - visible[i].magnitude) * 0.01;
    }
    this.points.geometry.setAttribute('position', new this.three.BufferAttribute(positions, 3));
    (this.points.material as import('three').PointsMaterial).size = 0.025;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
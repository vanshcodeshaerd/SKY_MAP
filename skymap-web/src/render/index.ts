import type { IRenderer } from './IRenderer.ts';
import type { RenderOptions } from './types.ts';
import { Canvas2DRenderer } from './Canvas2DRenderer.ts';
import { WebGLRenderer } from './WebGLRenderer.ts';

export type Backend = 'canvas' | 'webgl';

export async function createRenderer(
  backend: Backend,
  container: HTMLElement,
  options: RenderOptions
): Promise<IRenderer> {
  const renderer: IRenderer =
    backend === 'webgl' ? new WebGLRenderer(options) : new Canvas2DRenderer();
  await renderer.init(container, options);
  return renderer;
}

export { Canvas2DRenderer, WebGLRenderer };
export type { IRenderer } from './IRenderer.ts';
export type { SkySceneData, RenderMode, RenderOptions } from './types.ts';
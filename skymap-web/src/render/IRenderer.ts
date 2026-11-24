import type { RenderMode, RenderOptions, SkySceneData } from './types.ts';

export interface IRenderer {
  init(container: HTMLElement, options: RenderOptions): Promise<void>;
  render(sceneData: SkySceneData, cameraMatrix: number[][]): void;
  resize(width: number, height: number): void;
  setMode(mode: RenderMode): void;
  dispose(): void;
}
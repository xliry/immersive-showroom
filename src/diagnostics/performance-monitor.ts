import type * as THREE from 'three';

export class PerformanceMonitor {
  private last = performance.now();
  private frames = 0;
  private fps = 0;

  constructor(
    private element: HTMLElement,
    private renderer: THREE.WebGLRenderer,
    enabled: boolean,
  ) {
    this.element.hidden = !enabled;
  }

  update(now: number, pose: { x: number; y: number; z: number }) {
    if (this.element.hidden) return;
    this.frames++;
    if (now - this.last < 500) return;
    this.fps = this.frames * 1000 / (now - this.last);
    this.frames = 0;
    this.last = now;
    const memory = this.renderer.info.memory;
    this.element.textContent =
      `FPS ${this.fps.toFixed(0)}\nGEO ${memory.geometries} TEX ${memory.textures}\n` +
      `POSE ${pose.x.toFixed(2)} ${pose.y.toFixed(2)} ${pose.z.toFixed(2)}`;
  }
}

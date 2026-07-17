import * as THREE from 'three';
import type { SplatLoaderController } from './create-splat-loader';
import type { VehicleController } from './load-vehicle';

export class TransitionController {
  private startedAt = -1;
  private completed = false;

  constructor(
    private splats: SplatLoaderController,
    private vehicle: VehicleController,
    private durationMs: number,
    private onComplete: () => void,
  ) {}

  start(timeMs: number) {
    if (this.startedAt < 0) this.startedAt = timeMs;
  }

  update(timeMs: number) {
    if (this.startedAt < 0 || this.completed) return;
    const raw = THREE.MathUtils.clamp((timeMs - this.startedAt) / this.durationMs, 0, 1);
    const eased = raw * raw * (3 - 2 * raw);
    this.splats.setDissolve(eased);
    this.vehicle.setReveal(THREE.MathUtils.smoothstep(raw, 0.08, 0.9));
    if (raw === 1) {
      this.completed = true;
      this.splats.dispose();
      this.onComplete();
    }
  }
}

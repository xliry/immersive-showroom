export type ViewerPose = { x: number; y: number; z: number };

export class PoseSmoother {
  current: ViewerPose = { x: 0, y: 0, z: 1 };
  target: ViewerPose = { ...this.current };

  setTarget(pose: ViewerPose) {
    this.target = {
      x: Math.abs(pose.x) < 0.025 ? 0 : Math.max(-1, Math.min(1, pose.x)),
      y: Math.abs(pose.y) < 0.025 ? 0 : Math.max(-1, Math.min(1, pose.y)),
      z: Math.max(0.72, Math.min(1.32, pose.z)),
    };
  }

  neutral() {
    this.target = { x: 0, y: 0, z: 1 };
  }

  update(deltaSeconds: number) {
    const xy = 1 - Math.exp(-deltaSeconds * 8.5);
    const z = 1 - Math.exp(-deltaSeconds * 5.5);
    this.current.x += (this.target.x - this.current.x) * xy;
    this.current.y += (this.target.y - this.current.y) * xy;
    this.current.z += (this.target.z - this.current.z) * z;
    return this.current;
  }
}

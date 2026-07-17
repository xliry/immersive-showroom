import * as THREE from 'three';

export type CameraViewId = 'exterior' | 'cockpit' | 'rear' | 'detail';

export type CameraView = {
  id: CameraViewId;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  parallaxScale: number;
  screenHalfHeight: number;
};

export type CameraRigPose = Omit<CameraView, 'id'>;

export class CameraViewController {
  readonly current: CameraRigPose;
  private readonly views = new Map<CameraViewId, CameraView>();
  private target: CameraView;

  constructor(views: CameraView[]) {
    views.forEach((view) => this.views.set(view.id, view));
    const exterior = this.views.get('exterior');
    if (!exterior) throw new Error('Exterior camera view is required');
    this.target = exterior;
    this.current = {
      position: exterior.position.clone(),
      quaternion: exterior.quaternion.clone(),
      parallaxScale: exterior.parallaxScale,
      screenHalfHeight: exterior.screenHalfHeight,
    };
  }

  select(id: CameraViewId) {
    const view = this.views.get(id);
    if (view) this.target = view;
  }

  update(deltaSeconds: number) {
    const positionBlend = 1 - Math.exp(-deltaSeconds * 2.6);
    const rotationBlend = 1 - Math.exp(-deltaSeconds * 3.4);
    this.current.position.lerp(this.target.position, positionBlend);
    this.current.quaternion.slerp(this.target.quaternion, rotationBlend);
    this.current.parallaxScale = THREE.MathUtils.lerp(
      this.current.parallaxScale,
      this.target.parallaxScale,
      positionBlend,
    );
    this.current.screenHalfHeight = THREE.MathUtils.lerp(
      this.current.screenHalfHeight,
      this.target.screenHalfHeight,
      positionBlend,
    );
  }
}

import * as THREE from 'three';
import { VIEW } from '../config';
import type { CameraRigPose } from '../scene/camera-view-controller';
import type { ViewerPose } from './smoothing';

const DEFAULT_RIG: CameraRigPose = {
  position: new THREE.Vector3(0, 0, VIEW.eyeDistance),
  quaternion: new THREE.Quaternion(),
  parallaxScale: 1,
  screenHalfHeight: VIEW.screenHalfHeight,
};
const eyeOffset = new THREE.Vector3();

export function applyOffAxisProjection(
  camera: THREE.PerspectiveCamera,
  pose: ViewerPose,
  aspect: number,
  rig: CameraRigPose = DEFAULT_RIG,
  screenScale = 1,
) {
  const eyeX = pose.x * VIEW.maxX * rig.parallaxScale;
  const eyeY = pose.y * VIEW.maxY * rig.parallaxScale;
  const eyeZ = THREE.MathUtils.clamp(VIEW.eyeDistance * pose.z, VIEW.minZ, VIEW.maxZ);
  const halfH = rig.screenHalfHeight * screenScale;
  const halfW = halfH * aspect;
  const near = VIEW.near;

  const left = near * (-halfW - eyeX) / eyeZ;
  const right = near * (halfW - eyeX) / eyeZ;
  const bottom = near * (-halfH - eyeY) / eyeZ;
  const top = near * (halfH - eyeY) / eyeZ;
  if (![left, right, bottom, top].every(Number.isFinite) || left >= right || bottom >= top) return;

  eyeOffset
    .set(eyeX, eyeY, (eyeZ - VIEW.eyeDistance) * rig.parallaxScale)
    .applyQuaternion(rig.quaternion);
  camera.position.copy(rig.position).add(eyeOffset);
  camera.quaternion.copy(rig.quaternion);
  camera.projectionMatrix.makePerspective(left, right, top, bottom, near, VIEW.far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

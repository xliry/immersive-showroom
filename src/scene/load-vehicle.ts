import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ASSETS, VEHICLE, VIEW } from '../config';
import type { CameraView } from './camera-view-controller';

export type VehicleController = {
  object: THREE.Group;
  cameraViews: CameraView[];
  setReveal(value: number): void;
  dispose(): void;
};

export async function loadVehicle(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  onProgress: (value: number, label: string) => void,
): Promise<VehicleController> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>>((resolve, reject) => {
    loader.load(
      ASSETS.vehicle,
      resolve,
      (event) => {
        const determinate = event.total > 0;
        onProgress(determinate ? (event.loaded / event.total) * 0.82 : 0.32, 'LOADING VEHICLE');
      },
      reject,
    );
  });
  onProgress(0.87, 'DECODING VEHICLE');

  const placement = new THREE.Group();
  const centering = new THREE.Group();
  placement.name = 'vehicle-placement';
  centering.name = 'vehicle-centering';
  placement.add(centering);
  centering.add(gltf.scene);

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  gltf.scene.position.copy(center).multiplyScalar(-1);
  centering.scale.setScalar(VEHICLE.targetExtent / Math.max(size.x, size.y, size.z));
  placement.position.set(...VEHICLE.position);
  placement.rotation.y = VEHICLE.yaw;
  scene.add(placement);
  placement.updateMatrixWorld(true);

  const worldPoint = (x: number, y: number, z: number) =>
    gltf.scene.localToWorld(new THREE.Vector3(x, y, z));
  const lookQuaternion = (position: THREE.Vector3, target: THREE.Vector3) =>
    new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 1, 0)),
    );
  const cockpitPosition = worldPoint(-0.17, 0.53, -0.02);
  const cockpitTarget = worldPoint(-0.17, 0.39, -0.72);
  const rearPosition = worldPoint(-0.12, 0.5, 0.38);
  const rearTarget = worldPoint(-0.12, 0.44, -0.95);
  const detailPosition = worldPoint(-0.85, 0.35, -1.05);
  const detailTarget = worldPoint(-0.33, 0.16, -0.55);
  const cameraViews: CameraView[] = [
    {
      id: 'exterior',
      position: new THREE.Vector3(0, 0, VIEW.eyeDistance),
      quaternion: new THREE.Quaternion(),
      parallaxScale: 1,
      screenHalfHeight: VIEW.screenHalfHeight,
    },
    {
      id: 'cockpit',
      position: cockpitPosition,
      quaternion: lookQuaternion(cockpitPosition, cockpitTarget),
      parallaxScale: 0.13,
      screenHalfHeight: 12,
    },
    {
      id: 'rear',
      position: rearPosition,
      quaternion: lookQuaternion(rearPosition, rearTarget),
      parallaxScale: 0.1,
      screenHalfHeight: 10.5,
    },
    {
      id: 'detail',
      position: detailPosition,
      quaternion: lookQuaternion(detailPosition, detailTarget),
      parallaxScale: 0.22,
      screenHalfHeight: 9,
    },
  ];

  const materialState = new Map<THREE.Material & { opacity: number }, number>();
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((base) => {
      const material = base as THREE.Material & { opacity: number };
      if (materialState.has(material)) return;
      materialState.set(material, material.opacity);
      material.transparent = true;
      material.opacity = 0;
      material.needsUpdate = true;
    });
  });

  onProgress(0.93, 'COMPILING SHADERS');
  await renderer.compileAsync(scene, camera);
  onProgress(0.93, 'VEHICLE DATA READY');

  return {
    object: placement,
    cameraViews,
    setReveal(value) {
      const eased = 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 3);
      materialState.forEach((opacity, material) => {
        material.opacity = opacity * eased;
      });
    },
    dispose() {
      scene.remove(placement);
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}

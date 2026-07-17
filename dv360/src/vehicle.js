import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const WIDTH = __WIDTH__;
const HEIGHT = __HEIGHT__;
const canvas = document.getElementById('vehicle');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(HEIGHT === 250 ? 25 : 31, WIDTH / HEIGHT, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.setClearColor(0x000000, 0);

scene.add(new THREE.HemisphereLight(0xdffff0, 0x06150e, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 4.1);
key.position.set(-3, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x00ff99, 3.4);
rim.position.set(4, 2, -4);
scene.add(rim);

const root = new THREE.Group();
scene.add(root);
const state = {
  yaw: 2.57,
  targetYaw: 2.57,
  scale: HEIGHT === 250 ? 1.24 : 1.08,
  targetScale: HEIGHT === 250 ? 1.24 : 1.08,
  pointerX: 0,
  pointerY: 0,
  view: 'exterior',
};

camera.position.set(0, 0.2, 3.15);
camera.lookAt(0, 0.18, 0);
const exteriorPosition = new THREE.Vector3(0, 0.2, 3.15);
const exteriorTarget = new THREE.Vector3(0, 0.18, 0);
const cockpitPosition = new THREE.Vector3(-0.17, HEIGHT === 250 ? 0.51 : 0.47, -0.02);
const cockpitTarget = new THREE.Vector3(-0.17, HEIGHT === 250 ? 0.38 : 0.34, -0.72);
const cameraTargetQuaternion = new THREE.Quaternion();
const lookMatrix = new THREE.Matrix4();
const up = new THREE.Vector3(0, 1, 0);
let loadedModel = null;

function selectView(name) {
  const base = HEIGHT === 250 ? 1.24 : 1.08;
  state.view = name;
  if (name === 'profile') {
    state.targetYaw = Math.PI / 2;
    state.targetScale = base * .96;
  } else if (name === 'detail') {
    state.targetYaw = 2.48;
    state.targetScale = base * 1.46;
  } else if (name === 'interior') {
    state.targetYaw = 0;
    state.targetScale = base;
  } else {
    state.targetYaw = 2.57;
    state.targetScale = base;
  }
}

window.addEventListener('creative-view', (event) => selectView(event.detail.name));
document.getElementById('creative').addEventListener('pointermove', (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  state.pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
  state.pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2;
});
document.getElementById('creative').addEventListener('pointerleave', () => {
  state.pointerX = 0;
  state.pointerY = 0;
});

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.parse(decodeBase64('__MODEL_DATA__'), '', (gltf) => {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  model.position.y += size.y * .13;
  model.scale.setScalar(1.55 / Math.max(size.x, size.y, size.z));
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });
  });
  root.add(model);
  loadedModel = model;
  window.setTimeout(() => document.body.classList.add('model-ready'), 3300);
}, (error) => console.error('Vehicle model failed', error));

const started = performance.now();
function frame(now) {
  const elapsed = Math.min((now - started) / 1000, 29);
  state.yaw += (state.targetYaw - state.yaw) * .07;
  state.scale += (state.targetScale - state.scale) * .07;
  root.rotation.y = state.view === 'interior' ? 0 : state.yaw + state.pointerX * .08;
  root.rotation.x = state.view === 'interior' ? 0 : state.pointerY * .025;
  root.scale.setScalar(state.scale);
  root.position.x = state.view === 'interior' ? 0 : (HEIGHT === 250 ? .66 : .38) + (state.targetScale > 1.3 ? .1 : 0);
  root.position.y = state.view === 'interior' ? 0 : HEIGHT === 250 ? -.05 : -.08;
  root.rotation.z = Math.sin(elapsed * .5) * .004;
  root.updateMatrixWorld(true);

  if (state.view === 'interior' && loadedModel) {
    const position = loadedModel.localToWorld(cockpitPosition.clone());
    const target = loadedModel.localToWorld(cockpitTarget.clone());
    camera.position.lerp(position, .14);
    lookMatrix.lookAt(camera.position, target, up);
    cameraTargetQuaternion.setFromRotationMatrix(lookMatrix);
    camera.quaternion.slerp(cameraTargetQuaternion, .16);
    const interiorFov = HEIGHT === 250 ? 62 : 47;
    camera.fov += (interiorFov - camera.fov) * .12;
  } else {
    camera.position.lerp(exteriorPosition, .12);
    lookMatrix.lookAt(camera.position, exteriorTarget, up);
    cameraTargetQuaternion.setFromRotationMatrix(lookMatrix);
    camera.quaternion.slerp(cameraTargetQuaternion, .14);
    const exteriorFov = HEIGHT === 250 ? 25 : 31;
    camera.fov += (exteriorFov - camera.fov) * .12;
  }
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

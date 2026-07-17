import * as THREE from 'three';
import { VIEW } from '../config';
import { createRoom } from './create-room';

export function createScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010403);
  scene.fog = new THREE.FogExp2(0x010604, 0.012);

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, VIEW.near, VIEW.far);
  camera.position.set(0, 0, VIEW.eyeDistance);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(camera);
  const cameraFill = new THREE.PointLight(0xe5fff5, 78, 24, 1.6);
  cameraFill.position.set(0, 0.5, 1.5);
  camera.add(cameraFill);
  scene.add(createRoom());

  scene.add(new THREE.HemisphereLight(0xd9fff0, 0x041008, 1.7));
  const key = new THREE.SpotLight(0xffffff, 1500, 90, Math.PI / 5, 0.5, 1.2);
  key.position.set(-10, 18, 12);
  key.target.position.set(4, -4, -27);
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0x00ff88, 420, 55, 1.7);
  rim.position.set(16, 4, -15);
  scene.add(rim);

  return { scene, camera, renderer };
}

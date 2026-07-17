import './styles.css';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { ResponsiveCreative } from './ad/responsive-creative';
import { createRoom } from './scene/create-room';
import { VEHICLE, VIEW } from './config';

const VARIANTS = [
  { name: 'ORBIT WAKE', note: 'ELLIPTICAL ENERGY TRACE' },
  { name: 'LIQUID SWEEP', note: 'TRAVELING SURFACE WAVE' },
  { name: 'VORTEX BLOOM', note: 'ROTATIONAL CURL FIELD' },
  { name: 'BREATHING AURA', note: 'RADIAL INHALE / EXHALE' },
  { name: 'SCAN ASSEMBLE', note: 'SEQUENTIAL FORM RESOLVE' },
  { name: 'TWIN MAGNET', note: 'DUAL FIGURE-EIGHT FORCE' },
] as const;

const params = new URLSearchParams(location.search);
const variantIndex = THREE.MathUtils.clamp(Number(params.get('variant') ?? '1') - 1, 0, VARIANTS.length - 1);
const variant = VARIANTS[variantIndex];
const preview = params.get('preview') === '1';
const textureSize = preview ? 128 : 256;
const particleCount = textureSize * textureSize;

const canvas = document.getElementById('experience-canvas') as HTMLCanvasElement;
const progressBar = document.getElementById('progress-bar') as HTMLElement;
const stageLabel = document.getElementById('stage-label') as HTMLElement;
const loadingNote = document.querySelector('.loading-note') as HTMLElement;
const adLine = document.querySelector('.ad-line') as HTMLElement;
const responsive = new ResponsiveCreative();

document.body.classList.add('particle-flow-lab');
document.body.dataset.state = 'loading';
document.body.dataset.variant = String(variantIndex + 1);
document.title = `Accent ${variant.name}`;
stageLabel.textContent = `${String(variantIndex + 1).padStart(2, '0')} / ${variant.name}`;
loadingNote.textContent = `${variant.note} / AUTO`;
adLine.textContent = variant.name;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010403);
scene.fog = new THREE.FogExp2(0x010604, 0.011);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, VIEW.near, VIEW.far);
camera.position.set(0, 0, VIEW.eyeDistance);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = preview ? 1.2 : 1.28;
scene.add(createRoom());

const positionShader = /* glsl */`
  uniform float uFrame;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(texturePosition, uv).xyz;
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    gl_FragColor = vec4(position + velocity * uFrame, 1.0);
  }
`;

const velocityShader = /* glsl */`
  uniform sampler2D uOriginalPosition;
  uniform float uTime;
  uniform float uFrame;
  uniform float uVariant;

  float pulse(float value, float center, float width) {
    float x = (value - center) / width;
    return exp(-x * x);
  }
  vec3 safeNormal(vec3 value) { return value / max(length(value), 0.0001); }
  vec3 repel(vec3 position, vec3 center, float radius, float power) {
    vec3 offset = position - center;
    float falloff = smoothstep(radius, 0.0, length(offset));
    return safeNormal(offset) * falloff * power;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(texturePosition, uv).xyz;
    vec3 original = texture2D(uOriginalPosition, uv).xyz;
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    float seed = texture2D(uOriginalPosition, uv).w;
    float frame = clamp(uFrame, 0.25, 1.8);
    vec3 toShape = original - position;
    float shapeDistance = length(toShape);
    vec3 force = toShape * 0.030;
    float t = uTime;

    if (uVariant < 1.5) {
      vec3 center = vec3(sin(t * 0.74) * 0.9, sin(t * 1.11 + 1.2) * 0.38, cos(t * 0.74) * 0.7);
      force += repel(position, center, 0.58, 0.016);
      float wake = pulse(length(position - center), 0.66, 0.17);
      force += safeNormal(vec3(-center.z, 0.16, center.x)) * wake * 0.005;
    } else if (uVariant < 2.5) {
      float phase = original.x * 6.2 - t * 2.35 + seed * 1.7;
      float band = pulse(sin(phase), 0.0, 0.34);
      force += vec3(sin(phase * 0.47) * 0.001, sin(phase) * 0.0075, cos(phase * 0.72) * 0.0045) * (0.28 + band);
    } else if (uVariant < 3.5) {
      vec3 radial = vec3(position.x, 0.0, position.z);
      vec3 curl = safeNormal(vec3(-radial.z, 0.0, radial.x));
      float bloom = 0.45 + 0.55 * sin(t * 1.18 + original.y * 5.0 + seed * 6.2831);
      force += curl * (0.002 + bloom * 0.0045);
      force.y += bloom * 0.0035 - 0.0017;
    } else if (uVariant < 4.5) {
      float breath = sin(t * 1.32 + seed * 0.5);
      float shell = pulse(length(original), 0.78 + breath * 0.11, 0.22);
      force += safeNormal(original) * breath * (0.005 + shell * 0.012);
      force += safeNormal(original - position) * shell * 0.003;
    } else if (uVariant < 5.5) {
      float scan = sin(t * 0.72) * 1.15;
      float band = pulse(original.x, scan, 0.18);
      float resolved = smoothstep(scan - 0.18, scan + 0.25, original.x);
      force = toShape * mix(0.018, 0.034, resolved);
      force += vec3(0.0, sin(seed * 37.0 + t * 2.7), cos(seed * 23.0 - t * 2.0)) * (1.0 - resolved) * 0.002;
      force += safeNormal(vec3(0.25, sin(seed * 9.0), cos(seed * 11.0))) * band * 0.009;
    } else {
      vec3 a = vec3(sin(t * 0.92) * 0.82, sin(t * 1.84) * 0.34, cos(t * 0.92) * 0.55);
      vec3 b = vec3(-sin(t * 0.92) * 0.82, -sin(t * 1.84 + 0.8) * 0.34, -cos(t * 0.92) * 0.55);
      force += repel(position, a, 0.68, 0.031);
      force += repel(position, b, 0.68, 0.031);
      force += safeNormal(b - a) * sin(t * 2.1 + seed * 6.2831) * 0.0045;
    }

    float damping = pow(mix(0.89, 0.94, clamp(shapeDistance, 0.0, 1.0)), frame);
    velocity *= damping;
    velocity += force * frame;
    float speed = length(velocity);
    if (speed > 0.055) velocity *= 0.055 / speed;
    gl_FragColor = vec4(velocity, 1.0);
  }
`;

const particleVertexShader = /* glsl */`
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uPixelRatio;
  uniform float uVariant;
  varying vec3 vColor;
  varying float vAlpha;
  vec3 palette(float variant, float energy) {
    vec3 a; vec3 b;
    if (variant < 1.5) { a = vec3(0.06, 0.82, 0.38); b = vec3(0.72, 1.00, 0.86); }
    else if (variant < 2.5) { a = vec3(0.05, 0.52, 0.88); b = vec3(0.38, 1.00, 0.96); }
    else if (variant < 3.5) { a = vec3(0.62, 0.18, 0.94); b = vec3(0.70, 1.00, 0.62); }
    else if (variant < 4.5) { a = vec3(0.12, 0.76, 0.48); b = vec3(1.00, 0.82, 0.38); }
    else if (variant < 5.5) { a = vec3(0.05, 0.72, 0.38); b = vec3(0.94, 1.00, 0.98); }
    else { a = vec3(0.94, 0.18, 0.68); b = vec3(0.20, 0.96, 1.00); }
    return mix(a, b, energy);
  }
  void main() {
    vec3 positionFromTexture = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;
    float energy = smoothstep(0.001, 0.032, length(velocity));
    vec4 mvPosition = modelViewMatrix * vec4(positionFromTexture, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp((1.5 + energy * 3.5) * uPixelRatio * (70.0 / max(-mvPosition.z, 1.0)), 1.2, 7.0);
    vColor = palette(uVariant, energy);
    vAlpha = 0.40 + energy * 0.60;
  }
`;

const particleFragmentShader = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float radial = length(gl_PointCoord - 0.5) * 2.0;
    float halo = smoothstep(1.0, 0.0, radial);
    float core = smoothstep(0.28, 0.0, radial);
    float alpha = (halo * 0.42 + core) * vAlpha;
    if (alpha < 0.018) discard;
    gl_FragColor = vec4(vColor * (1.08 + core), alpha);
  }
`;

let compute: GPUComputationRenderer | null = null;
let positionVariable: ReturnType<GPUComputationRenderer['addVariable']> | null = null;
let velocityVariable: ReturnType<GPUComputationRenderer['addVariable']> | null = null;
let particleMaterial: THREE.ShaderMaterial | null = null;
let particles: THREE.Points | null = null;
let previousTime = performance.now();
let readyAt = 0;

function seeded(index: number, channel: number) {
  const value = Math.sin((index + 1) * (12.9898 + channel * 19.19)) * 43758.5453;
  return value - Math.floor(value);
}
function setTexturePosition(data: Float32Array, index: number, x: number, y: number, z: number, seed: number) {
  const offset = index * 4;
  data[offset] = x; data[offset + 1] = y; data[offset + 2] = z; data[offset + 3] = seed;
}

async function loadParticles() {
  const response = await fetch('/assets/hyundai-accent-particles.bin');
  if (!response.ok) throw new Error(`Particle asset failed: ${response.status}`);
  const source = new Float32Array(await response.arrayBuffer());
  const sourceCount = source.length / 3;
  compute = new GPUComputationRenderer(textureSize, textureSize, renderer);
  const positionTexture = compute.createTexture();
  const velocityTexture = compute.createTexture();
  const originalTexture = compute.createTexture();
  const positions = positionTexture.image.data as Float32Array;
  const velocities = velocityTexture.image.data as Float32Array;
  const originals = originalTexture.image.data as Float32Array;

  for (let index = 0; index < particleCount; index += 1) {
    const sourceIndex = Math.floor(index * sourceCount / particleCount);
    const sourceOffset = sourceIndex * 3;
    const x = source[sourceOffset]; const y = source[sourceOffset + 1]; const z = source[sourceOffset + 2];
    const seed = seeded(index, 0);
    setTexturePosition(originals, index, x, y, z, seed);
    const theta = seeded(index, 1) * Math.PI * 2;
    const phi = Math.acos(seeded(index, 2) * 2 - 1);
    const radius = 0.22 + seeded(index, 3) * 1.15;
    setTexturePosition(positions, index, x + Math.sin(phi) * Math.cos(theta) * radius, y + Math.cos(phi) * radius, z + Math.sin(phi) * Math.sin(theta) * radius, seed);
    setTexturePosition(velocities, index, 0, 0, 0, 1);
  }

  positionVariable = compute.addVariable('texturePosition', positionShader, positionTexture);
  velocityVariable = compute.addVariable('textureVelocity', velocityShader, velocityTexture);
  compute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
  compute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
  positionVariable.material.uniforms.uFrame = { value: 1 };
  velocityVariable.material.uniforms.uOriginalPosition = { value: originalTexture };
  velocityVariable.material.uniforms.uTime = { value: 0 };
  velocityVariable.material.uniforms.uFrame = { value: 1 };
  velocityVariable.material.uniforms.uVariant = { value: variantIndex + 1 };
  const error = compute.init();
  if (error) throw new Error(error);

  const geometry = new THREE.BufferGeometry();
  const uvs = new Float32Array(particleCount * 2);
  for (let index = 0; index < particleCount; index += 1) {
    const x = index % textureSize; const y = Math.floor(index / textureSize);
    uvs[index * 2] = (x + 0.5) / textureSize; uvs[index * 2 + 1] = (y + 0.5) / textureSize;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uPositionTexture: { value: compute.getCurrentRenderTarget(positionVariable).texture },
      uVelocityTexture: { value: compute.getCurrentRenderTarget(velocityVariable).texture },
      uPixelRatio: { value: 1 }, uVariant: { value: variantIndex + 1 },
    },
    vertexShader: particleVertexShader, fragmentShader: particleFragmentShader,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  particles = new THREE.Points(geometry, particleMaterial);
  particles.name = `accent-auto-gpgpu-${variantIndex + 1}`;
  particles.frustumCulled = false;
  particles.scale.setScalar(VEHICLE.targetExtent / 2);
  particles.position.set(...VEHICLE.position);
  particles.rotation.y = VEHICLE.yaw;
  scene.add(particles);
  readyAt = performance.now();
}

function resize() {
  responsive.update();
  const pixelRatio = Math.min(devicePixelRatio, preview ? 1 : innerWidth < 900 ? 1.3 : 1.65);
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(innerHeight, 1); camera.updateProjectionMatrix();
  if (particleMaterial) particleMaterial.uniforms.uPixelRatio.value = pixelRatio;
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((time) => {
  const seconds = time * 0.001;
  const frame = THREE.MathUtils.clamp((time - previousTime) / (1000 / 60), 0.25, 1.8);
  previousTime = time;
  if (compute && positionVariable && velocityVariable && particleMaterial && particles) {
    positionVariable.material.uniforms.uFrame.value = frame;
    velocityVariable.material.uniforms.uFrame.value = frame;
    velocityVariable.material.uniforms.uTime.value = seconds;
    compute.compute();
    particleMaterial.uniforms.uPositionTexture.value = compute.getCurrentRenderTarget(positionVariable).texture;
    particleMaterial.uniforms.uVelocityTexture.value = compute.getCurrentRenderTarget(velocityVariable).texture;
    particles.rotation.x = Math.sin(seconds * 0.31 + variantIndex) * 0.012;
    particles.rotation.y = VEHICLE.yaw + Math.sin(seconds * 0.21 + variantIndex * 0.7) * 0.065;
    particles.rotation.z = Math.sin(seconds * 0.17) * 0.008;
    const elapsed = Math.max(0, (time - readyAt) * 0.001);
    const gather = Math.min(1, 1 - Math.exp(-elapsed * 0.7));
    const activity = gather < 0.995 ? gather : 0.94 + Math.sin(seconds * 1.4) * 0.05;
    progressBar.style.opacity = String(0.45 + activity * 0.55);
  }
  renderer.render(scene, camera);
});

void loadParticles().then(resize).catch((error) => {
  console.error(error); stageLabel.textContent = 'GPGPU PARTICLE FIELD ERROR';
});

import * as THREE from 'three';
import { ASSETS, DEBUG, POINT_CLOUD_LAB, VEHICLE } from '../config';

const FORMATION_MS = 3800;
const POINT_COUNT = 70_000;

const vertexShader = /* glsl */`
  attribute vec3 aScatter;
  attribute float aSeed;
  uniform float uTime;
  uniform float uFormation;
  uniform float uDissolve;
  uniform float uPixelRatio;
  varying float vGlow;
  varying float vAlpha;

  void main() {
    float eased = 1.0 - pow(1.0 - uFormation, 3.0);
    float living = sin(uFormation * 3.14159265);
    vec3 p = position + aScatter * (1.0 - eased);
    float phase = aSeed * 6.283185 + uTime * (0.7 + aSeed * 0.45);
    p += vec3(
      sin(phase * 1.17),
      cos(phase * 1.41),
      sin(phase * 0.83)
    ) * (0.028 + aSeed * 0.035) * living;
    p.y += sin(uTime * 0.78 + position.x * 8.0 + aSeed * 18.0) * 0.009 * eased;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float perspective = 74.0 / max(-mvPosition.z, 1.0);
    gl_PointSize = clamp((1.15 + aSeed * 1.45) * uPixelRatio * perspective, 1.0, 5.2);
    vGlow = smoothstep(0.0, 1.0, eased) * (0.42 + aSeed * 0.58);
    vAlpha = (1.0 - uDissolve) * (0.45 + eased * 0.5);
  }
`;

const fragmentShader = /* glsl */`
  varying float vGlow;
  varying float vAlpha;

  void main() {
    float radial = length(gl_PointCoord - 0.5) * 2.0;
    float halo = smoothstep(1.0, 0.0, radial);
    float core = smoothstep(0.3, 0.0, radial);
    float alpha = (halo * 0.36 + core) * vAlpha;
    if (alpha < 0.018) discard;
    vec3 green = vec3(0.0, 0.72, 0.38);
    vec3 mint = vec3(0.74, 1.0, 0.88);
    vec3 color = mix(green, mint, clamp(vGlow + core * 0.3, 0.0, 1.0));
    gl_FragColor = vec4(color * (1.05 + core * 0.5), alpha);
  }
`;

export type SplatLoaderController = {
  object: THREE.Group;
  ready: Promise<void>;
  formed: Promise<void>;
  startFormation(): void;
  getFormationProgress(): number;
  setProgress(progress: number): void;
  update(timeMs: number): void;
  setDissolve(value: number): void;
  dispose(): void;
};

function seeded(index: number, channel: number) {
  const value = Math.sin((index + 1) * (12.9898 + channel * 19.19)) * 43758.5453;
  return value - Math.floor(value);
}

export function createSplatLoader(scene: THREE.Scene): SplatLoaderController {
  const placement = new THREE.Group();
  placement.name = 'dv360-point-cloud-loader';
  placement.position.set(...VEHICLE.position);
  placement.rotation.y = VEHICLE.yaw;
  scene.add(placement);

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFormation: { value: 0 },
      uDissolve: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'accent-dv360-point-cloud';
  points.frustumCulled = false;
  points.visible = false;
  points.scale.setScalar(VEHICLE.targetExtent / 2);
  placement.add(points);

  let formationStarted = false;
  let formationStartedAt = 0;
  let formationProgress = 0;
  let dissolve = 0;
  let disposed = false;
  let formationComplete = false;
  let resolveFormed!: () => void;
  const formed = new Promise<void>((resolve) => { resolveFormed = resolve; });

  const ready = fetch(ASSETS.particles)
    .then((response) => {
      if (!response.ok) throw new Error(`Point cloud failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((buffer) => {
      if (disposed) return;
      const source = new Float32Array(buffer);
      const sourceCount = source.length / 3;
      const positions = new Float32Array(POINT_COUNT * 3);
      const scatter = new Float32Array(POINT_COUNT * 3);
      const seeds = new Float32Array(POINT_COUNT);

      for (let index = 0; index < POINT_COUNT; index += 1) {
        const sourceIndex = Math.floor(index * sourceCount / POINT_COUNT);
        const sourceOffset = sourceIndex * 3;
        const offset = index * 3;
        positions[offset] = source[sourceOffset];
        positions[offset + 1] = source[sourceOffset + 1];
        positions[offset + 2] = source[sourceOffset + 2];

        const seed = seeded(index, 0);
        const theta = seeded(index, 1) * Math.PI * 2;
        const phi = Math.acos(seeded(index, 2) * 2 - 1);
        const radius = 0.18 + seeded(index, 3) * 0.62;
        scatter[offset] = Math.sin(phi) * Math.cos(theta) * radius;
        scatter[offset + 1] = Math.cos(phi) * radius * 0.46;
        scatter[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius * 0.72;
        seeds[index] = seed;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      geometry.computeBoundingSphere();
      points.visible = true;
      if (DEBUG) console.info('DV360 point-cloud loader ready', { points: POINT_COUNT });
    });

  return {
    object: placement,
    ready,
    formed,
    startFormation() {
      formationStarted = true;
      formationStartedAt = performance.now();
    },
    getFormationProgress() {
      return formationProgress;
    },
    setProgress() {
      // Asset progress remains controlled by the main boot sequence.
    },
    setDissolve(value) {
      dissolve = THREE.MathUtils.clamp(value, 0, 1);
    },
    update(timeMs) {
      if (disposed) return;
      material.uniforms.uTime.value = timeMs * 0.001;
      material.uniforms.uDissolve.value = dissolve;
      material.uniforms.uPixelRatio.value = Math.min(devicePixelRatio, 2);

      if (formationStarted) {
        const raw = THREE.MathUtils.clamp((timeMs - formationStartedAt) / FORMATION_MS, 0, 1);
        formationProgress = raw * raw * (3 - 2 * raw);
      }
      material.uniforms.uFormation.value = formationProgress;

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const motion = reduced ? 0 : 1 - dissolve;
      placement.position.x = VEHICLE.position[0] + Math.sin(timeMs * 0.00028) * 0.11 * motion;
      placement.position.y = VEHICLE.position[1] + Math.cos(timeMs * 0.00035) * 0.07 * motion;
      placement.rotation.x = Math.sin(timeMs * 0.00031) * 0.005 * motion;
      placement.rotation.y = VEHICLE.yaw + Math.sin(timeMs * 0.00021) * 0.035 * motion;
      placement.rotation.z = Math.sin(timeMs * 0.00017) * 0.004 * motion;

      if (!formationComplete && formationProgress >= 0.999) {
        formationComplete = true;
        resolveFormed();
      }

      if (POINT_CLOUD_LAB && formationComplete) {
        const pulse = 0.94 + Math.sin(timeMs * 0.0011) * 0.045;
        material.uniforms.uFormation.value = pulse;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(placement);
      geometry.dispose();
      material.dispose();
      placement.clear();
    },
  };
}

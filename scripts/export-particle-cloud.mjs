import fs from 'node:fs';
import * as THREE from 'three';

const SOURCE = 'public/assets/hyundai-accent-2013.glb';
const TARGET = 'public/assets/hyundai-accent-particles.bin';
const TARGET_COUNT = 70_000;

const bytes = fs.readFileSync(SOURCE);
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim());
const binaryOffset = 20 + jsonLength + 8;
const binary = bytes.subarray(binaryOffset);
const componentSizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const typeCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const componentCount = typeCounts[accessor.type];
  const componentSize = componentSizes[accessor.componentType];
  const stride = view.byteStride || componentCount * componentSize;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const values = new Array(accessor.count);

  for (let row = 0; row < accessor.count; row += 1) {
    const offset = start + row * stride;
    const value = new Array(componentCount);
    for (let component = 0; component < componentCount; component += 1) {
      const cursor = offset + component * componentSize;
      value[component] = accessor.componentType === 5126
        ? binary.readFloatLE(cursor)
        : accessor.componentType === 5125
          ? binary.readUInt32LE(cursor)
          : accessor.componentType === 5123
            ? binary.readUInt16LE(cursor)
            : binary.readUInt8(cursor);
    }
    values[row] = value;
  }
  return values;
}

let randomState = 0x6d2b79f5;
function random() {
  randomState = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  randomState ^= randomState + Math.imul(randomState ^ (randomState >>> 7), 61 | randomState);
  return ((randomState ^ (randomState >>> 14)) >>> 0) / 4294967296;
}

const samples = [];
const bounds = new THREE.Box3();
let seen = 0;

function localMatrix(node) {
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix);
  return new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(node.translation || [0, 0, 0]),
    new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(node.scale || [1, 1, 1]),
  );
}

function collect(point) {
  bounds.expandByPoint(point);
  seen += 1;
  if (samples.length < TARGET_COUNT) {
    samples.push(point.clone());
    return;
  }
  const candidate = Math.floor(random() * seen);
  if (candidate < TARGET_COUNT) samples[candidate].copy(point);
}

function visitNode(index, parentMatrix) {
  const node = json.nodes[index];
  const worldMatrix = parentMatrix.clone().multiply(localMatrix(node));
  if (node.mesh !== undefined) {
    for (const primitive of json.meshes[node.mesh].primitives) {
      const positions = readAccessor(primitive.attributes.POSITION);
      for (const position of positions) {
        collect(new THREE.Vector3(...position).applyMatrix4(worldMatrix));
      }
    }
  }
  for (const child of node.children || []) visitNode(child, worldMatrix);
}

for (const root of json.scenes[json.scene || 0].nodes) {
  visitNode(root, new THREE.Matrix4());
}

const center = bounds.getCenter(new THREE.Vector3());
const size = bounds.getSize(new THREE.Vector3());
const scale = 2 / Math.max(size.x, size.y, size.z);
const output = Buffer.allocUnsafe(samples.length * 3 * Float32Array.BYTES_PER_ELEMENT);
samples.forEach((sample, index) => {
  sample.sub(center).multiplyScalar(scale);
  output.writeFloatLE(sample.x, (index * 3) * 4);
  output.writeFloatLE(sample.y, (index * 3 + 1) * 4);
  output.writeFloatLE(sample.z, (index * 3 + 2) * 4);
});
fs.writeFileSync(TARGET, output);
console.log(JSON.stringify({ sourceVertices: seen, exportedParticles: samples.length, bytes: output.length }));


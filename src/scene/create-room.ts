import * as THREE from 'three';
import { ROOM } from '../config';

const green = new THREE.Color(0x00ff88);

function gridPlane(width: number, height: number, divisions: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= divisions; i++) {
    const x = (i / divisions - 0.5) * width;
    const y = (i / divisions - 0.5) * height;
    points.push(new THREE.Vector3(-width / 2, y, 0), new THREE.Vector3(width / 2, y, 0));
    points.push(new THREE.Vector3(x, -height / 2, 0), new THREE.Vector3(x, height / 2, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: green,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geometry, material);
}

export function createRoom() {
  const room = new THREE.Group();
  room.name = 'neon-showroom';
  const { width, height, depth } = ROOM;

  const floor = gridPlane(width, depth, 12);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -height / 2 + 0.02, -depth / 2);
  room.add(floor);

  const ceiling = gridPlane(width, depth, 12);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height / 2, -depth / 2);
  room.add(ceiling);

  const back = gridPlane(width, height, 12);
  back.position.z = -depth;
  room.add(back);

  const left = gridPlane(depth, height, 12);
  left.rotation.y = Math.PI / 2;
  left.position.set(-width / 2, 0, -depth / 2);
  room.add(left);

  const right = gridPlane(depth, height, 12);
  right.rotation.y = -Math.PI / 2;
  right.position.set(width / 2, 0, -depth / 2);
  room.add(right);

  const floorSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshPhysicalMaterial({
      color: 0x020806,
      metalness: 0.8,
      roughness: 0.28,
      transparent: true,
      opacity: 0.72,
    }),
  );
  floorSurface.rotation.x = -Math.PI / 2;
  floorSurface.position.set(0, -height / 2, -depth / 2);
  room.add(floorSurface);

  const corners = [
    [-width / 2, height / 2, 0], [width / 2, height / 2, 0],
    [width / 2, -height / 2, 0], [-width / 2, -height / 2, 0],
    [-width / 2, height / 2, -depth], [width / 2, height / 2, -depth],
    [width / 2, -height / 2, -depth], [-width / 2, -height / 2, -depth],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const edgePoints = edges.flatMap(([a, b]) => [corners[a], corners[b]]);
  room.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(edgePoints),
    new THREE.LineBasicMaterial({ color: green, transparent: true, opacity: 0.78 }),
  ));
  return room;
}

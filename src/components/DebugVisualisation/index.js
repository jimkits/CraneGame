import * as THREE from 'three';
import { ARM_SEGS } from '../Crane/index.js';
import { CASE_W, CASE_D } from '../../constants.js';

const wireMat = color =>
  new THREE.MeshBasicMaterial({ color, wireframe: true, depthTest: false });

export function buildDebugColliders(game) {
  // One set of wireframe spheres per prize (green)
  game._debugPrizeSets = game.prizes.map(prize => ({
    prize,
    meshes: prize.colliderShapes.map(s => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(s.r, 8, 6), wireMat(0x00ff00));
      mesh.userData.offset = new THREE.Vector3(s.x, s.y, s.z);
      game.scene.add(mesh);
      return mesh;
    }),
  }));

  // Crane housing cylinder (red): halfHeight=0.175, radius=0.13
  game._debugCraneMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.35, 12),
    wireMat(0xff4444)
  );
  game.scene.add(game._debugCraneMesh);

  // Cabinet prize-area floor collider (cyan): cuboid(CASE_W/2, 0.03, CASE_D/2) at y=0.03
  game._debugFloorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(CASE_W, 0.06, CASE_D),
    wireMat(0x00ccff)
  );
  game._debugFloorMesh.position.set(0, 0.03, 0);
  game.scene.add(game._debugFloorMesh);

  // Arm capsule wireframes (orange) — 9 capsules (3 segments × 3 arms)
  game._debugArmMeshes = game.crane.armColliders.map((_, idx) => {
    const seg = ARM_SEGS[idx % ARM_SEGS.length];
    const segLen = Math.sqrt((seg.by - seg.ay) ** 2 + (seg.bz - seg.az) ** 2);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(seg.r, segLen, 4, 8),
      wireMat(0xff8800)
    );
    game.scene.add(mesh);
    return mesh;
  });
}

export function updateDebugColliders(game) {
  const q = new THREE.Quaternion();
  game._debugPrizeSets.forEach(({ prize, meshes }) => {
    const alive = game.prizes.includes(prize);
    meshes.forEach(mesh => {
      mesh.visible = alive && game.showColliders;
      if (!alive) return;
      const pos = prize.body.translation();
      const rot = prize.body.rotation();
      q.set(rot.x, rot.y, rot.z, rot.w);
      const off = mesh.userData.offset.clone().applyQuaternion(q);
      mesh.position.set(pos.x + off.x, pos.y + off.y, pos.z + off.z);
    });
  });
  game._debugFloorMesh.visible = game.showColliders;
  game._debugCraneMesh.visible = game.showColliders;
  game._debugCraneMesh.position.set(game.crane.craneX, game.crane.clawY, game.crane.craneZ);
  game._debugArmMeshes.forEach((mesh, i) => {
    mesh.visible = game.showColliders;
    const t = game.crane.armColliders[i].translation();
    const r = game.crane.armColliders[i].rotation();
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
  });
}

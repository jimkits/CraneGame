import * as THREE from 'three';
import { m, castAll } from '../../utils/materials.js';

export function makeCat(bodyCol, bellyCol) {
  const g  = new THREE.Group();
  const bm = m(bodyCol, 0.93), lm = m(bellyCol, 0.93), dk = m(0x111111, 0.6);

  // Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), bm);
  torso.scale.y = 1.15; g.add(torso);

  // Belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), lm);
  belly.position.set(0, -0.03, 0.17); belly.scale.z = 0.38; g.add(belly);

  // Head (slightly wide)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), bm);
  head.position.y = 0.34; head.scale.set(1.1, 0.95, 1.0); g.add(head);

  // Pointy ears
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.17, 4), bm);
    ear.position.set(s*0.17, 0.53, 0); ear.rotation.z = s*0.15; g.add(ear);
    const ie = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.1, 4), lm);
    ie.position.set(s*0.17, 0.53, 0.026); ie.rotation.z = s*0.15; g.add(ie);
  });

  // Cheek puffs
  [-1,1].forEach(s => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), lm);
    c.position.set(s*0.065, 0.3, 0.157); g.add(c);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.04, 3), m(0xff7799, 0.85));
  nose.position.set(0, 0.322, 0.21); nose.rotation.x = Math.PI; g.add(nose);

  // Eyes (slightly narrow = cat-like)
  [-1,1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 7), dk);
    eye.position.set(s*0.08, 0.386, 0.166); eye.scale.set(0.6, 1.0, 0.7); g.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 5, 5), m(0xffffff,0.1));
    hl.position.set(s*0.08+0.012, 0.391, 0.178); g.add(hl);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.35, 4, 10), bm);
  tail.position.set(0.15, -0.18, -0.2); tail.rotation.z = -0.8; tail.rotation.x = -0.5; g.add(tail);

  // Arms
  [-1,1].forEach(s => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.17, 4, 8), bm);
    arm.position.set(s*0.26, 0.0, 0.08); arm.rotation.z = s*0.6; arm.rotation.x = 0.4; g.add(arm);
  });

  castAll(g); return g;
}

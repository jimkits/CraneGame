import * as THREE from 'three';
import { m, castAll } from '../../utils/materials.js';

export function makeBear(bodyCol, bellyCol) {
  const g  = new THREE.Group();
  const bm = m(bodyCol, 0.95), lm = m(bellyCol, 0.95), dk = m(0x111111, 0.6);

  // Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), bm);
  torso.scale.y = 1.15; g.add(torso);

  // Tummy patch
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lm);
  tummy.position.set(0, -0.04, 0.18); tummy.scale.z = 0.4; g.add(tummy);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 10), bm);
  head.position.y = 0.34; g.add(head);

  // Ears
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), bm);
    ear.position.set(s*0.15, 0.49, 0); g.add(ear);
    const ie  = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), lm);
    ie.position.set(s*0.15, 0.49, 0.05); g.add(ie);
  });

  // Muzzle
  const mz = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 7), lm);
  mz.position.set(0, 0.3, 0.155); mz.scale.set(1.3, 0.75, 0.55); g.add(mz);

  // Eyes + highlight
  [-1,1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 7), dk);
    eye.position.set(s*0.075, 0.38, 0.168); g.add(eye);
    const hl  = new THREE.Mesh(new THREE.SphereGeometry(0.009, 5, 5), m(0xffffff,0.1));
    hl.position.set(s*0.075+0.01, 0.385, 0.178); g.add(hl);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), dk);
  nose.position.set(0, 0.325, 0.228); g.add(nose);

  // Arms
  [-1,1].forEach(s => {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bm);
    arm.position.set(s*0.29, 0.04, 0.06); arm.scale.set(0.55, 0.7, 0.6); g.add(arm);
  });

  castAll(g); return g;
}

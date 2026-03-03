import * as THREE from 'three';
import { m, castAll } from '../../utils/materials.js';

export function makeBunny(bodyCol, bellyCol) {
  const g  = new THREE.Group();
  const bm = m(bodyCol, 0.95), lm = m(bellyCol, 0.95), dk = m(0x111111, 0.6);
  const nose_m = m(0xff7799, 0.9);

  // Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), bm);
  torso.scale.y = 1.2; g.add(torso);

  // Tummy
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lm);
  tummy.position.set(0, -0.03, 0.17); tummy.scale.z = 0.4; g.add(tummy);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10), bm);
  head.position.y = 0.32; g.add(head);

  // Long floppy ears
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.28, 4, 10), bm);
    ear.position.set(s*0.095, 0.62, 0); ear.rotation.z = s*0.12; g.add(ear);
    const ie  = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.2, 4, 8), lm);
    ie.position.set(s*0.095, 0.62, 0.03); ie.rotation.z = s*0.12; g.add(ie);
  });

  // Muzzle
  const mz = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), lm);
  mz.position.set(0, 0.29, 0.145); mz.scale.set(1.2, 0.7, 0.5); g.add(mz);

  // Eyes
  [-1,1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 7), dk);
    eye.position.set(s*0.07, 0.36, 0.158); g.add(eye);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), nose_m);
  nose.position.set(0, 0.305, 0.215); g.add(nose);

  // Fluffy tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), m(0xffffff, 0.98));
  tail.position.set(0, 0.05, -0.22); g.add(tail);

  castAll(g); return g;
}

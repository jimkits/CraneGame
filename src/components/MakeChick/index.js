import * as THREE from 'three';
import { m, castAll } from '../../utils/materials.js';

export function makeChick() {
  const g  = new THREE.Group();
  const ym = m(0xffdd44, 0.88), om = m(0xff9922, 0.75), dk = m(0x111111, 0.6);

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), ym); g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), ym);
  head.position.y = 0.31; g.add(head);

  // Beak (two cones)
  const bu = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 5), om);
  bu.position.set(0, 0.308, 0.178); bu.rotation.x = -Math.PI/2 + 0.28; g.add(bu);
  const bl = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.06, 5), om);
  bl.position.set(0, 0.272, 0.188); bl.rotation.x = Math.PI/2 - 0.28; g.add(bl);

  // Eyes
  [-1,1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 7), dk);
    eye.position.set(s*0.09, 0.346, 0.136); g.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 5, 5), m(0xffffff,0.1));
    hl.position.set(s*0.09+0.01, 0.351, 0.147); g.add(hl);
  });

  // Head tufts
  for (let i=0;i<3;i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), ym);
    t.position.set((i-1)*0.04, 0.465, 0.01); t.rotation.x = (i-1)*-0.18; g.add(t);
  }

  // Wings
  [-1,1].forEach(s => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), m(0xffcc33, 0.88));
    w.position.set(s*0.27, -0.02, 0); w.scale.set(0.38, 0.65, 0.55); g.add(w);
  });

  // Feet
  [-1,1].forEach(s => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), om);
    f.position.set(s*0.1, -0.26, 0.07); f.scale.set(1.5, 0.5, 1.0); g.add(f);
  });

  castAll(g); return g;
}

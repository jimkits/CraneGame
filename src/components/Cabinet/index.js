import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { m, emissive } from '../../utils/materials.js';
import { CASE_W, CASE_D, CASE_H, CAB_H, DROP_X, DROP_Z, BIN_W, BIN_D } from '../../constants.js';

export function buildCabinet(scene, world) {
  // Color scheme: classic Japanese crane machine
  const CAB_COLOR  = 0xddddee; // near-white cabinet body
  const TRIM_COLOR = 0x2255dd; // blue trim/accents
  const PANEL_COLOR= 0x1144cc; // blue header panel

  const cabMat  = m(CAB_COLOR,  0.75, 0.15);
  const trimMat = m(TRIM_COLOR, 0.45, 0.5);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbbddff, transparent: true, opacity: 0.13,
    roughness: 0.0, transmission: 0.94, thickness: 0.15,
    side: THREE.DoubleSide,
  });

  // ── GLASS PRIZE AREA ──
  const W = CASE_W, D = CASE_D, H = CASE_H;

  // Prize area floor (dark blue-grey) — split into 4 pieces leaving a hole at the win zone
  const pfMat = m(0x2244aa, 0.7, 0.1);
  const holeX0 = DROP_X - BIN_W / 2, holeX1 = DROP_X + BIN_W / 2;
  const holeZ0 = DROP_Z - BIN_D / 2, holeZ1 = DROP_Z + BIN_D / 2;
  [
    // [cx, cz, sx, sz]
    [ (-W/2 + holeX0) / 2,          0,                       holeX0 + W/2,     D        ], // left
    [ (holeX1 + W/2)  / 2,          0,                       W/2 - holeX1,     D        ], // right
    [ DROP_X,                        (-D/2 + holeZ0) / 2,     BIN_W,            holeZ0 + D/2 ], // back-centre
    [ DROP_X,                        (holeZ1 + D/2)  / 2,     BIN_W,            D/2 - holeZ1 ], // front-centre
  ].forEach(([cx, cz, sx, sz]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), pfMat);
    mesh.position.set(cx, 0.03, cz); mesh.receiveShadow = true;
    scene.add(mesh);
  });

  const pfBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  pfBody.setTranslation({ x:0, y:0.03, z:0 }, true);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(W/2, 0.03, D/2).setFriction(0.5).setRestitution(0.15),
    pfBody
  );

  // Glass side walls + physics
  [
    [0,         H/2,  D/2,  W, H, 0.04],
    [0,         H/2, -D/2,  W, H, 0.04],
    [-W/2,      H/2,  0,    0.04, H, D],
    [ W/2,      H/2,  0,    0.04, H, D],
  ].forEach(([px,py,pz,sx,sy,sz]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), glassMat);
    mesh.position.set(px,py,pz); scene.add(mesh);
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    b.setTranslation({ x:px, y:py, z:pz }, true);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx/2, sy/2, sz/2).setFriction(0.5).setRestitution(0.15),
      b
    );
  });

  // Chrome corner pillars
  const pillarMat = m(0xccccdd, 0.2, 0.95);
  [[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]].forEach(([cx,cz]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, H, 0.09), pillarMat);
    p.position.set(cx, H/2, cz); p.castShadow = true; scene.add(p);
  });

  // Horizontal frame rails
  [[0,H,-D/2],[0,H,D/2]].forEach(([x,y,z]) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W+0.09, 0.09, 0.09), pillarMat);
    r.position.set(x,y,z); scene.add(r);
  });
  [[-W/2,H,0],[W/2,H,0]].forEach(([x,y,z]) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, D+0.09), pillarMat);
    r.position.set(x,y,z); scene.add(r);
  });

  // ── INTERIOR LIGHTING ──
  const ledMat = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xfff5ee, emissiveIntensity:3 });
  const ledX = new THREE.Mesh(new THREE.BoxGeometry(W-0.15, 0.04, 0.05), ledMat);
  ledX.position.set(0, H-0.05, -D/2+0.07); scene.add(ledX);
  const ledX2 = ledX.clone(); ledX2.position.z = D/2-0.07; scene.add(ledX2);
  const ledZ = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, D-0.15), ledMat);
  ledZ.position.set(-W/2+0.07, H-0.05, 0); scene.add(ledZ);
  const ledZ2 = ledZ.clone(); ledZ2.position.x = W/2-0.07; scene.add(ledZ2);

  const iLight = new THREE.PointLight(0xeef5ff, 4, 6);
  iLight.position.set(0, H-0.6, 0); scene.add(iLight);
  const iLight2 = new THREE.PointLight(0xfff8f0, 2.5, 5);
  iLight2.position.set(0, 0.8, 0); scene.add(iLight2);

  // ── WIN ZONE — glass collection bin ──
  const BIN_T = 0.05;
  const halfBW = BIN_W / 2, halfBD = BIN_D / 2;
  const binFloorY = -0.8;
  const BIN_H = 0.66 - binFloorY; // top stays at same height, bin sinks lower
  const wallCY    = binFloorY + BIN_H / 2;

  // Glowing floor pad
  const padMat = new THREE.MeshStandardMaterial({ color:0xffdd00, emissive:0xffaa00, emissiveIntensity:4 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(BIN_W, 0.012, BIN_D), padMat);
  pad.position.set(DROP_X, binFloorY + 0.006, DROP_Z); scene.add(pad);

  // Glass walls — dark tinted so the bin reads as a distinct zone
  const binGlass = new THREE.MeshPhysicalMaterial({
    color: 0x112233, transparent: true, opacity: 0.55,
    roughness: 0.05, transmission: 0.35, thickness: 0.2,
    side: THREE.DoubleSide,
  });
  [
    // [cx, cz, sx, sz]   front / back / left / right
    [ DROP_X,              DROP_Z + halfBD + BIN_T/2,  BIN_W + BIN_T*2, BIN_T  ],
    [ DROP_X,              DROP_Z - halfBD - BIN_T/2,  BIN_W + BIN_T*2, BIN_T  ],
    [ DROP_X - halfBW - BIN_T/2,  DROP_Z,              BIN_T,           BIN_D  ],
    [ DROP_X + halfBW + BIN_T/2,  DROP_Z,              BIN_T,           BIN_D  ],
  ].forEach(([cx, cz, sx, sz]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, BIN_H, sz), binGlass);
    mesh.position.set(cx, wallCY, cz); scene.add(mesh);
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    b.setTranslation({ x:cx, y:wallCY, z:cz }, true);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx/2, BIN_H/2, sz/2).setFriction(0.5).setRestitution(0.15),
      b
    );
  });

  const winLight = new THREE.PointLight(0xffcc00, 3.5, 2.5);
  winLight.position.set(DROP_X, 1.0, DROP_Z); scene.add(winLight);

  // ── CABINET BODY ──
  const cabW = W + 0.3, cabD = D + 0.3;

  const body = new THREE.Mesh(new THREE.BoxGeometry(cabW, CAB_H, cabD), cabMat);
  body.position.y = -CAB_H/2; body.castShadow = true; body.receiveShadow = true;
  scene.add(body);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(cabW+0.01, 0.18, cabD+0.01), trimMat);
  stripe.position.y = -0.09; scene.add(stripe);

  const bStripe = new THREE.Mesh(new THREE.BoxGeometry(cabW+0.01, 0.18, cabD+0.01), trimMat);
  bStripe.position.y = -CAB_H+0.09; scene.add(bStripe);

  // Prize chute
  const chuteH = 0.55, chuteW = 0.9;
  const chuteMat = m(0x111122, 0.95);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(chuteW, chuteH, 0.18), chuteMat);
  chute.position.set(0, -CAB_H + chuteH/2 + 0.12, cabD/2 + 0.01);
  scene.add(chute);

  const cf = new THREE.Mesh(new THREE.BoxGeometry(chuteW+0.12, chuteH+0.1, 0.06), pillarMat);
  cf.position.set(0, -CAB_H + chuteH/2 + 0.12, cabD/2 + 0.1);
  scene.add(cf);

  // Control panel
  const cpMat = m(0x111133, 0.85);
  const cp = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.06, 0.65), cpMat);
  cp.position.set(0, -0.08, cabD/2 - 0.33); cp.rotation.x = 0.22; scene.add(cp);

  // Joystick
  const jbMat = m(0x222244, 0.75);
  const jBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 12), jbMat);
  jBase.position.set(-0.65, 0.03, cabD/2-0.22); scene.add(jBase);
  const jShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10), m(0x333355,0.6));
  jShaft.position.set(-0.65, 0.18, cabD/2-0.22); scene.add(jShaft);
  const jBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), m(0xff1133,0.35,0.2));
  jBall.position.set(-0.65, 0.3, cabD/2-0.22); scene.add(jBall);

  // Drop button
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), m(0xffcc00,0.4,0.1));
  btn.position.set(0.65, 0.04, cabD/2-0.22); scene.add(btn);
  const btnRim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), m(0x333333,0.7));
  btnRim.position.set(0.65, 0.01, cabD/2-0.22); scene.add(btnRim);

  // Coin slot
  const coinSlotMat = m(0x333344, 0.9);
  const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), coinSlotMat);
  coinSlot.position.set(0, -CAB_H*0.4, cabD/2+0.15); scene.add(coinSlot);
  const coinSlotFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), pillarMat);
  coinSlotFrame.position.set(0, -CAB_H*0.4, cabD/2+0.16); scene.add(coinSlotFrame);

  // ── HEADER / MARQUEE ──
  const headerH = 0.85, headerW = cabW, headerD = cabD;
  const headerMat = m(PANEL_COLOR, 0.55, 0.1);
  const header = new THREE.Mesh(new THREE.BoxGeometry(headerW, headerH, headerD), headerMat);
  header.position.y = H + headerH/2; header.castShadow = true; scene.add(header);

  const marqMat = m(0x3366ff, 0.4, 0.15);
  const marq = new THREE.Mesh(new THREE.BoxGeometry(headerW-0.1, headerH-0.1, 0.05), marqMat);
  marq.position.set(0, H + headerH/2, headerD/2 + 0.04); scene.add(marq);

  const nm1 = emissive(0xffdd00, 4);
  const nm2 = emissive(0xffffff, 3);
  [0.18, 0.06, -0.06].forEach((yo, i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(headerW-0.35, 0.045, 0.02), i===1 ? nm2 : nm1);
    bar.position.set(0, H + headerH/2 + yo, headerD/2 + 0.07); scene.add(bar);
  });

  const mLight = new THREE.PointLight(0x4488ff, 2.5, 3);
  mLight.position.set(0, H + headerH*0.6, 0); scene.add(mLight);


  return { winLight };
}

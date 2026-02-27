import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const CASE_W  = 3.6;   // glass prize-area width
const CASE_D  = 3.0;   // glass prize-area depth
const CASE_H  = 4.2;   // glass prize-area height  (Y: 0 → CASE_H)
const CAB_H   = 2.2;   // solid cabinet body below glass (Y: -CAB_H → 0)
const CLAW_MIN_Y = 0.55;
const CLAW_MAX_Y = CASE_H - 0.2;
const CRANE_SPEED   = 2.8;
const CLAW_DROP_SPD = 3.5;
const CLAW_RISE_SPD = 4.2;
const GRAB_RADIUS   = 0.72;
const DROP_X = 1.1;
const DROP_Z = 1.0;
const STATE  = { IDLE:0, DROPPING:1, GRABBING:2, RISING:3, RETURNING:4, RELEASING:5 };

// ─────────────────────────────────────────────
// Material helpers
// ─────────────────────────────────────────────
const m = (color, rough = 0.9, metal = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const emissive = (color, intensity = 2) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });

// ─────────────────────────────────────────────
// Plush Prize Builders
// ─────────────────────────────────────────────
function castAll(group) {
  group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
}

function makeBear(bodyCol, bellyCol) {
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

function makeBunny(bodyCol, bellyCol) {
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

function makeChick() {
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

function makeCat(bodyCol, bellyCol) {
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

// ─────────────────────────────────────────────
// Prize class
// ─────────────────────────────────────────────
const PRIZE_DEFS = [
  { fn: () => makeBear(0xff8899, 0xffddee) },   // pink bear
  { fn: () => makeBunny(0xaaccff, 0xddeeff) },  // blue bunny
  { fn: () => makeBear(0xbb88ee, 0xddccff) },   // purple bear
  { fn: () => makeChick() },                    // yellow chick
  { fn: () => makeCat(0xffaa55, 0xffddbb) },    // orange cat
  { fn: () => makeBunny(0x99eedd, 0xccfff5) },  // mint bunny
  { fn: () => makeBear(0x885533, 0xddaa88) },   // brown bear
  { fn: () => makeCat(0x9999aa, 0xddddee) },    // grey cat
  { fn: () => makeBunny(0xffaacc, 0xffddee) },  // pink bunny
  { fn: () => makeBear(0x66aaff, 0xccddff) },   // blue bear
  { fn: () => makeChick() },                    // another chick
  { fn: () => makeCat(0xee7766, 0xffccbb) },    // red-orange cat
];

class Prize {
  constructor(scene, world, pos, defIndex) {
    this.scene   = scene;
    this.world   = world;
    this.grabbed = false;
    this.won     = false;

    this.mesh = PRIZE_DEFS[defIndex].fn();
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 0.5,
      shape: new CANNON.Sphere(0.27),
      linearDamping: 0.45,
      angularDamping: 0.6,
    });
    this.body.position.set(pos.x, pos.y, pos.z);
    world.addBody(this.body);
  }

  syncMesh() {
    if (this.grabbed || this.won) return;
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }

  remove() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
  }
}

// ─────────────────────────────────────────────
// Main Game
// ─────────────────────────────────────────────
class CraneGame {
  constructor() {
    this.clock        = new THREE.Clock();
    this.state        = STATE.IDLE;
    this.score        = 0;
    this.prizes       = [];
    this.grabbedPrize = null;
    this.craneX = 0; this.craneZ = 0;
    this.clawY  = CLAW_MAX_Y;
    this.clawOpenT    = 1;
    this.grabTimer    = 0;
    this.releaseTimer = 0;
    this.returnTarget = { x:0, z:0 };
    this.returningHome = false;
    this.keys = {};
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupPhysics();
    this.buildEnvironment();
    this.buildCabinet();
    this.buildCrane();
    this.spawnPrizes();
    this.setupInput();
    this.animate();
  }

  // ── Renderer ──────────────────────────────
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);
    Object.assign(this.renderer.domElement.style, { position:'absolute', top:'0', left:'0' });
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  // ── Scene + Camera + Lights ───────────────
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090914);
    this.scene.fog = new THREE.FogExp2(0x090914, 0.032);

    // Camera: front-right diagonal — like watching a real crane machine
    this.camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 80);
    this.camera.position.set(6.5, 4.5, 8.0);
    this.camera.lookAt(0, 1.5, 0);

    // Ambient
    this.scene.add(new THREE.AmbientLight(0x8899cc, 0.55));

    // Main overhead shadow light
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(3, 12, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    Object.assign(sun.shadow.camera, { near:0.5, far:35, left:-8, right:8, top:8, bottom:-8 });
    this.scene.add(sun);

    // Neon arcade accent lights (outside machine)
    const pink = new THREE.PointLight(0xff00aa, 2.2, 14);
    pink.position.set(-5, 5, 2); this.scene.add(pink);
    const blue = new THREE.PointLight(0x0066ff, 2.2, 14);
    blue.position.set(5, 5, -3); this.scene.add(blue);
  }

  // ── Physics ───────────────────────────────
  setupPhysics() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 12;
  }

  // ── Floor + Arcade Environment ────────────
  buildEnvironment() {
    // Physics ground
    const gnd = new CANNON.Body({ mass:0 });
    gnd.addShape(new CANNON.Plane());
    gnd.quaternion.setFromEuler(-Math.PI/2, 0, 0);
    gnd.position.y = -CAB_H;
    this.world.addBody(gnd);

    // Checkerboard floor using canvas texture
    const size = 512, tile = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    for (let y=0; y<size/tile; y++) {
      for (let x=0; x<size/tile; x++) {
        ctx.fillStyle = (x+y)%2===0 ? '#141428' : '#1e1e38';
        ctx.fillRect(x*tile, y*tile, tile, tile);
      }
    }
    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 6);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.position.y = -CAB_H;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back wall
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e0e22, roughness: 1.0 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), wallMat);
    backWall.position.set(0, 5, -10);
    this.scene.add(backWall);

    // Neon floor strip lights (decorative)
    const stripMat = emissive(0x6600ff, 3);
    [-4, 4].forEach(x => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 12), stripMat);
      strip.position.set(x, -CAB_H+0.02, 0);
      this.scene.add(strip);
    });
  }

  // ── Full Cabinet Build ────────────────────
  buildCabinet() {
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

    // Prize area floor (dark blue-grey)
    const pfMat = m(0x2244aa, 0.7, 0.1);
    const pFloor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), pfMat);
    pFloor.position.y = 0.03; pFloor.receiveShadow = true;
    this.scene.add(pFloor);

    const pfBody = new CANNON.Body({ mass:0 });
    pfBody.addShape(new CANNON.Box(new CANNON.Vec3(W/2, 0.03, D/2)));
    pfBody.position.set(0, 0.03, 0);
    this.world.addBody(pfBody);

    // Glass side walls + physics
    [
      [0,         H/2,  D/2,  W, H, 0.04],
      [0,         H/2, -D/2,  W, H, 0.04],
      [-W/2,      H/2,  0,    0.04, H, D],
      [ W/2,      H/2,  0,    0.04, H, D],
    ].forEach(([px,py,pz,sx,sy,sz]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), glassMat);
      mesh.position.set(px,py,pz); this.scene.add(mesh);
      const b = new CANNON.Body({ mass:0 });
      b.addShape(new CANNON.Box(new CANNON.Vec3(sx/2,sy/2,sz/2)));
      b.position.set(px,py,pz); this.world.addBody(b);
    });

    // Chrome corner pillars
    const pillarMat = m(0xccccdd, 0.2, 0.95);
    [[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]].forEach(([cx,cz]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, H, 0.09), pillarMat);
      p.position.set(cx, H/2, cz); p.castShadow = true; this.scene.add(p);
    });

    // Horizontal frame rails
    [[0,H,-D/2],[0,H,D/2]].forEach(([x,y,z]) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(W+0.09, 0.09, 0.09), pillarMat);
      r.position.set(x,y,z); this.scene.add(r);
    });
    [[-W/2,H,0],[W/2,H,0]].forEach(([x,y,z]) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, D+0.09), pillarMat);
      r.position.set(x,y,z); this.scene.add(r);
    });

    // ── INTERIOR LIGHTING ──
    // LED strip across top of prize area (warm white glow)
    const ledMat = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xfff5ee, emissiveIntensity:3 });
    const ledX = new THREE.Mesh(new THREE.BoxGeometry(W-0.15, 0.04, 0.05), ledMat);
    ledX.position.set(0, H-0.05, -D/2+0.07); this.scene.add(ledX);
    const ledX2 = ledX.clone(); ledX2.position.z = D/2-0.07; this.scene.add(ledX2);
    const ledZ = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, D-0.15), ledMat);
    ledZ.position.set(-W/2+0.07, H-0.05, 0); this.scene.add(ledZ);
    const ledZ2 = ledZ.clone(); ledZ2.position.x = W/2-0.07; this.scene.add(ledZ2);

    // Interior point light (bright cool white)
    const iLight = new THREE.PointLight(0xeef5ff, 4, 6);
    iLight.position.set(0, H-0.6, 0); this.scene.add(iLight);
    const iLight2 = new THREE.PointLight(0xfff8f0, 2.5, 5);
    iLight2.position.set(0, 0.8, 0); this.scene.add(iLight2);

    // ── WIN ZONE INDICATOR (floor of prize area) ──
    const ringGeo = new THREE.TorusGeometry(0.38, 0.035, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color:0xffdd00, emissive:0xffaa00, emissiveIntensity:4 });
    this.winRing = new THREE.Mesh(ringGeo, ringMat);
    this.winRing.rotation.x = -Math.PI/2;
    this.winRing.position.set(DROP_X, 0.07, DROP_Z); this.scene.add(this.winRing);

    const starMat = new THREE.MeshStandardMaterial({ color:0xffee00, emissive:0xffcc00, emissiveIntensity:5 });
    const starMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 5), starMat);
    starMesh.position.set(DROP_X, 0.07, DROP_Z); this.scene.add(starMesh);

    this.winLight = new THREE.PointLight(0xffcc00, 3.5, 2.5);
    this.winLight.position.set(DROP_X, 1.0, DROP_Z); this.scene.add(this.winLight);

    // ── CABINET BODY (below glass) ──
    const cabW = W + 0.3, cabD = D + 0.3;

    // Main body block (white)
    const body = new THREE.Mesh(new THREE.BoxGeometry(cabW, CAB_H, cabD), cabMat);
    body.position.y = -CAB_H/2; body.castShadow = true; body.receiveShadow = true;
    this.scene.add(body);

    // Blue accent stripe running around the body (just below the glass)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(cabW+0.01, 0.18, cabD+0.01), trimMat);
    stripe.position.y = -0.09; this.scene.add(stripe);

    // Blue bottom stripe
    const bStripe = new THREE.Mesh(new THREE.BoxGeometry(cabW+0.01, 0.18, cabD+0.01), trimMat);
    bStripe.position.y = -CAB_H+0.09; this.scene.add(bStripe);

    // Prize chute opening (dark recessed slot at front-bottom)
    const chuteH = 0.55, chuteW = 0.9;
    const chuteMat = m(0x111122, 0.95);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(chuteW, chuteH, 0.18), chuteMat);
    chute.position.set(0, -CAB_H + chuteH/2 + 0.12, cabD/2 + 0.01);
    this.scene.add(chute);

    // Chute door frame (chrome trim)
    const cf = new THREE.Mesh(new THREE.BoxGeometry(chuteW+0.12, chuteH+0.1, 0.06), pillarMat);
    cf.position.set(0, -CAB_H + chuteH/2 + 0.12, cabD/2 + 0.1);
    this.scene.add(cf);

    // Control panel (top of cabinet body, angled front section)
    const cpMat = m(0x111133, 0.85);
    const cp = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.06, 0.65), cpMat);
    cp.position.set(0, -0.08, cabD/2 - 0.33); cp.rotation.x = 0.22; this.scene.add(cp);

    // Ball-top joystick
    const jbMat = m(0x222244, 0.75);
    const jBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 12), jbMat);
    jBase.position.set(-0.65, 0.03, cabD/2-0.22); this.scene.add(jBase);
    const jShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10), m(0x333355,0.6));
    jShaft.position.set(-0.65, 0.18, cabD/2-0.22); this.scene.add(jShaft);
    const jBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), m(0xff1133,0.35,0.2));
    jBall.position.set(-0.65, 0.3, cabD/2-0.22); this.scene.add(jBall);

    // Drop button (big red/yellow)
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), m(0xffcc00,0.4,0.1));
    btn.position.set(0.65, 0.04, cabD/2-0.22); this.scene.add(btn);
    const btnRim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), m(0x333333,0.7));
    btnRim.position.set(0.65, 0.01, cabD/2-0.22); this.scene.add(btnRim);

    // Coin slot
    const coinSlotMat = m(0x333344, 0.9);
    const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), coinSlotMat);
    coinSlot.position.set(0, -CAB_H*0.4, cabD/2+0.15); this.scene.add(coinSlot);
    const coinSlotFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), pillarMat);
    coinSlotFrame.position.set(0, -CAB_H*0.4, cabD/2+0.16); this.scene.add(coinSlotFrame);

    // ── HEADER / MARQUEE ──
    const headerH = 0.85, headerW = cabW, headerD = cabD;
    const headerMat = m(PANEL_COLOR, 0.55, 0.1);
    const header = new THREE.Mesh(new THREE.BoxGeometry(headerW, headerH, headerD), headerMat);
    header.position.y = H + headerH/2; header.castShadow = true; this.scene.add(header);

    // Marquee front face (lighter blue)
    const marqMat = m(0x3366ff, 0.4, 0.15);
    const marq = new THREE.Mesh(new THREE.BoxGeometry(headerW-0.1, headerH-0.1, 0.05), marqMat);
    marq.position.set(0, H + headerH/2, headerD/2 + 0.04); this.scene.add(marq);

    // Neon "CRANE GAME" lines on marquee (simulated with glowing bars)
    const nm1 = emissive(0xffdd00, 4);
    const nm2 = emissive(0xffffff, 3);
    [0.18, 0.06, -0.06].forEach((yo, i) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(headerW-0.35, 0.045, 0.02), i===1 ? nm2 : nm1);
      bar.position.set(0, H + headerH/2 + yo, headerD/2 + 0.07); this.scene.add(bar);
    });

    // Marquee light (illuminates from inside header)
    const mLight = new THREE.PointLight(0x4488ff, 2.5, 3);
    mLight.position.set(0, H + headerH*0.6, 0); this.scene.add(mLight);

    // Blue neon tubes running up the cabinet sides
    const neonTubeL = emissive(0x0099ff, 4);
    [-cabW/2-0.06, cabW/2+0.06].forEach(x => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, H+CAB_H+headerH, 8), neonTubeL);
      tube.position.set(x, (H+CAB_H+headerH)/2 - CAB_H, 0); this.scene.add(tube);
    });
  }

  // ── Crane Rail + Trolley + Cable + Claw ───
  buildCrane() {
    const metalMat = m(0x999aaa, 0.2, 0.9);
    const darkMat2  = m(0x444455, 0.4, 0.7);

    // X-axis fixed rail
    const railX = new THREE.Mesh(new THREE.BoxGeometry(CASE_W+0.15, 0.1, 0.1), metalMat);
    railX.position.set(0, CASE_H + 0.12, 0); this.scene.add(railX);

    // Z-axis trolley rail (slides along X)
    this.railZ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, CASE_D), metalMat);
    this.scene.add(this.railZ);

    // Trolley block
    this.trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), darkMat2);
    this.scene.add(this.trolley);

    // Cable mesh (scaled each frame)
    this.cableMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1, 7),
      m(0x888899, 0.25, 0.85)
    );
    this.scene.add(this.cableMesh);

    // Claw group
    this.clawGroup = new THREE.Group();
    this.scene.add(this.clawGroup);
    this.buildClaw();
    this.syncCraneVisuals();
  }

  buildClaw() {
    const clawMat = m(0xbbbbcc, 0.15, 0.95);

    // Central hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.16, 14), clawMat);
    this.clawGroup.add(hub);

    // Reinforcement ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 20), clawMat);
    ring.position.y = -0.04; this.clawGroup.add(ring);

    // 4 arms (N/E/S/W)
    this.clawPivots = [];
    for (let i=0; i<4; i++) {
      const theta = (i/4) * Math.PI * 2;
      const outer = new THREE.Group();
      outer.rotation.y = theta;
      outer.position.set(Math.sin(theta)*0.1, -0.08, Math.cos(theta)*0.1);
      this.clawGroup.add(outer);

      const inner = new THREE.Group();
      outer.add(inner);
      this.clawPivots.push(inner);

      // Arm shaft
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.065), clawMat);
      shaft.position.y = -0.22; inner.add(shaft);

      // Fingertip hook
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.04, 0.13, 8), clawMat);
      tip.position.y = -0.465; tip.rotation.x = 0.42; inner.add(tip);
    }
    this.applyClawOpen(this.clawOpenT);
  }

  applyClawOpen(t) {
    this.clawOpenT = t;
    const OPEN  = -Math.PI / 3.0;
    const CLOSE =  Math.PI / 12;
    const angle = THREE.MathUtils.lerp(CLOSE, OPEN, t);
    this.clawPivots.forEach(p => { p.rotation.x = angle; });
  }

  syncCraneVisuals() {
    this.trolley.position.set(this.craneX, CASE_H + 0.22, this.craneZ);
    this.railZ.position.set(this.craneX, CASE_H + 0.18, 0);
    const topY = CASE_H + 0.2;
    const len  = topY - this.clawY;
    this.cableMesh.scale.y = Math.max(0.01, len);
    this.cableMesh.position.set(this.craneX, this.clawY + len/2, this.craneZ);
    this.clawGroup.position.set(this.craneX, this.clawY, this.craneZ);
  }

  // ── Prizes ────────────────────────────────
  spawnPrizes() {
    PRIZE_DEFS.forEach((_, i) => {
      const layer = Math.floor(i / 4);
      const x = (Math.random() - 0.5) * (CASE_W - 1.1);
      const z = (Math.random() - 0.5) * (CASE_D - 1.0);
      const y = 0.5 + layer * 1.0;
      this.prizes.push(new Prize(this.scene, this.world, { x, y, z }, i));
    });
  }

  // ── Input ─────────────────────────────────
  setupInput() {
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code==='Space' && this.state===STATE.IDLE) {
        e.preventDefault();
        this.state = STATE.DROPPING;
        this.applyClawOpen(1);
      }
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  // ── UI helpers ────────────────────────────
  showMessage(text, secs=2.0) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._mt);
    this._mt = setTimeout(() => el.classList.remove('show'), secs*1000);
  }
  setStateBar(t) { document.getElementById('state-bar').textContent = t; }
  setScore(n)    { document.getElementById('score').textContent = `SCORE: ${n}`; }

  // ── Grab attempt ─────────────────────────
  tryGrab() {
    let best = null, bestD = GRAB_RADIUS;
    this.prizes.forEach(p => {
      if (p.grabbed || p.won) return;
      const dx = p.body.position.x - this.craneX;
      const dy = p.body.position.y - this.clawY;
      const dz = p.body.position.z - this.craneZ;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < bestD) { best = p; bestD = d; }
    });
    if (best) {
      this.grabbedPrize = best;
      best.grabbed = true;
      best.body.mass = 0;
      best.body.updateMassProperties();
      best.body.velocity.setZero();
      best.body.angularVelocity.setZero();
      this.showMessage('Got one!', 1.5);
    } else {
      this.showMessage('Missed!', 1.5);
    }
  }

  // ── Main update ───────────────────────────
  update(dt) {
    this.world.step(1/60, dt, 3);
    this.prizes.forEach(p => p.syncMesh());

    // Win-ring pulse
    const pulse = 1 + 0.18 * Math.sin(Date.now() * 0.004);
    this.winRing.scale.set(pulse, pulse, 1);
    this.winLight.intensity = 2.5 + 1.5 * Math.sin(Date.now() * 0.005);

    // Attach grabbed prize under claw
    if (this.grabbedPrize) {
      const gp = this.grabbedPrize;
      gp.body.position.set(this.craneX, this.clawY - 0.36, this.craneZ);
      gp.body.velocity.setZero();
      gp.mesh.position.copy(gp.body.position);
    }

    switch(this.state) {
      case STATE.IDLE:      this.tickIdle(dt);      break;
      case STATE.DROPPING:  this.tickDropping(dt);  break;
      case STATE.GRABBING:  this.tickGrabbing(dt);  break;
      case STATE.RISING:    this.tickRising(dt);    break;
      case STATE.RETURNING: this.tickReturning(dt); break;
      case STATE.RELEASING: this.tickReleasing(dt); break;
    }

    this.syncCraneVisuals();
  }

  tickIdle(dt) {
    this.setStateBar('WASD / Arrows — move  |  SPACE — drop claw');
    const lim = Math.min(CASE_W, CASE_D) / 2 - 0.32;
    const sp  = CRANE_SPEED * dt;
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) this.craneX = Math.max(-lim, this.craneX-sp);
    if (this.keys['ArrowRight'] || this.keys['KeyD']) this.craneX = Math.min( lim, this.craneX+sp);
    if (this.keys['ArrowUp']    || this.keys['KeyW']) this.craneZ = Math.max(-lim, this.craneZ-sp);
    if (this.keys['ArrowDown']  || this.keys['KeyS']) this.craneZ = Math.min( lim, this.craneZ+sp);
  }

  tickDropping(dt) {
    this.setStateBar('Dropping...');
    this.clawY -= CLAW_DROP_SPD * dt;
    if (this.clawY <= CLAW_MIN_Y) {
      this.clawY = CLAW_MIN_Y;
      this.state = STATE.GRABBING;
      this.grabTimer = 0.55;
    }
  }

  tickGrabbing(dt) {
    this.setStateBar('Grabbing...');
    this.grabTimer -= dt;
    this.applyClawOpen(Math.max(0, this.grabTimer / 0.55));
    if (this.grabTimer <= 0) { this.tryGrab(); this.state = STATE.RISING; }
  }

  tickRising(dt) {
    this.setStateBar(this.grabbedPrize ? 'Rising — got a prize!' : 'Rising...');
    this.clawY += CLAW_RISE_SPD * dt;
    if (this.clawY >= CLAW_MAX_Y) {
      this.clawY = CLAW_MAX_Y;
      this.returnTarget  = this.grabbedPrize ? { x:DROP_X, z:DROP_Z } : { x:0, z:0 };
      this.returningHome = !this.grabbedPrize;
      this.state = STATE.RETURNING;
    }
  }

  tickReturning(dt) {
    this.setStateBar(this.returningHome ? 'Returning...' : 'Moving to drop zone...');
    const sp = CRANE_SPEED * dt;
    const dx = this.returnTarget.x - this.craneX;
    const dz = this.returnTarget.z - this.craneZ;
    const d  = Math.sqrt(dx*dx + dz*dz);
    if (d < 0.06) {
      this.craneX = this.returnTarget.x; this.craneZ = this.returnTarget.z;
      if (this.returningHome) { this.state = STATE.IDLE; }
      else { this.releaseTimer = 0.55; this.state = STATE.RELEASING; }
    } else {
      this.craneX += dx/d * sp; this.craneZ += dz/d * sp;
    }
  }

  tickReleasing(dt) {
    this.setStateBar('Releasing...');
    this.releaseTimer -= dt;
    this.applyClawOpen(1 - Math.max(0, this.releaseTimer / 0.55));
    if (this.releaseTimer <= 0) {
      if (this.grabbedPrize) {
        const p = this.grabbedPrize;
        p.grabbed = false; p.won = true;
        p.body.mass = 0.5; p.body.updateMassProperties();
        p.body.velocity.set(0, -3, 0);
        this.grabbedPrize = null;
        this.score++;
        this.setScore(this.score);
        this.showMessage(`🎉 +1 Prize!  Total: ${this.score}`, 2.5);
        setTimeout(() => {
          const i = this.prizes.indexOf(p);
          if (i !== -1) { p.remove(); this.prizes.splice(i, 1); }
        }, 1800);
      }
      this.applyClawOpen(1);
      this.returnTarget  = { x:0, z:0 };
      this.returningHome = true;
      this.state = STATE.RETURNING;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

new CraneGame();

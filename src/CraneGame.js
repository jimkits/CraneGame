import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  CASE_W, CASE_D, CASE_H,
  CLAW_MIN_Y, CLAW_MAX_Y,
  CRANE_SPEED, CLAW_DROP_SPD, CLAW_RISE_SPD,
  GRAB_RADIUS, DROP_X, DROP_Z, BIN_W, BIN_D,
  STATE,
} from './constants.js';
import { buildEnvironment } from './components/Environment/index.js';
import { buildCabinet }     from './components/Cabinet/index.js';
import { Crane }            from './components/Crane/index.js';
import { Prize, PRIZE_DEFS } from './components/Prize/index.js';

export class CraneGame {
  constructor() {
    this.clock        = new THREE.Clock();
    this.state        = STATE.IDLE;
    this.score        = 0;
    this.prizes       = [];
    this.grabbedPrize = null;
    this.returnTarget  = { x:0, z:0 };
    this.returningHome = false;
    this.grabTimer    = 0;
    this.releaseTimer = 0;
    this.keys = {};
    this.camFront  = new THREE.Vector3(0, 2.5, 9.5);
    this.camSide   = new THREE.Vector3(9.5, 2.5, 0);
    this.camLookAt = new THREE.Vector3(0, 1.5, 0);
    this.cameraBlend = 0;
    this.difficulty = 'normal';
    this.paused     = false;
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupPhysics();
    buildEnvironment(this.scene, this.world);
    const { winLight } = buildCabinet(this.scene, this.world);
    this.winLight = winLight;
    this.crane = new Crane(this.scene, this.world);
    this.spawnPrizes();
    this.setupInput();
    this.setupOptionsMenu();
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

    this.camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 80);
    this.camera.position.set(0, 2.5, 9.5);
    this.camera.lookAt(0, 1.5, 0);

    this.scene.add(new THREE.AmbientLight(0x8899cc, 0.55));

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(3, 12, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    Object.assign(sun.shadow.camera, { near:0.5, far:35, left:-8, right:8, top:8, bottom:-8 });
    this.scene.add(sun);

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

  // ── Prizes ────────────────────────────────
  spawnPrizes() {
    const inBin = (x, z) =>
      Math.abs(x - DROP_X) < BIN_W / 2 + 0.35 &&
      Math.abs(z - DROP_Z) < BIN_D / 2 + 0.35;

    PRIZE_DEFS.forEach((_, i) => {
      let x, z;
      do {
        x = (Math.random() - 0.5) * (CASE_W - 1.0);
        z = (Math.random() - 0.5) * (CASE_D - 0.9);
      } while (inBin(x, z));

      // Stagger heights so prizes fall in and collide naturally.
      // Cap well below CLAW_MAX_Y (4.0) so no prize overlaps the claw body on spawn.
      const y = 0.5 + Math.floor(i / 4) * 0.75 + Math.random() * 0.3;
      this.prizes.push(new Prize(this.scene, this.world, { x, y, z }, i));
    });
  }

  // ── Won-prize floor detection ─────────────
  checkWonPrizes() {
    // Prize sphere centre rests at floor_top (0.06) + radius (0.27) = 0.33.
    // Trigger a hair above that so removal fires on first contact.
    const FLOOR_Y = 0.36;
    this.prizes = this.prizes.filter(p => {
      if (!p.won) return true;
      if (p.body.position.y < FLOOR_Y &&
          Math.abs(p.body.position.x - DROP_X) < BIN_W / 2 &&
          Math.abs(p.body.position.z - DROP_Z) < BIN_D / 2) {
        p.remove();
        return false;
      }
      return true;
    });
  }

  // ── Input ─────────────────────────────────
  setupInput() {
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code==='Space' && this.state===STATE.IDLE) {
        e.preventDefault();
        this.state = STATE.DROPPING;
        this.crane.applyClawOpen(1);
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
    const cbp = this.crane.clawBody.position;
    this.prizes.forEach(p => {
      if (p.grabbed || p.won) return;
      const dx = p.body.position.x - cbp.x;
      const dy = p.body.position.y - cbp.y;
      const dz = p.body.position.z - cbp.z;
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
      best.body.collisionResponse = false;
      this.showMessage('Got one!', 1.5);
    } else {
      this.showMessage('Missed!', 1.5);
    }
  }

  // ── Camera glide ──────────────────────────
  updateCamera(dt) {
    const target = this.keys['ShiftLeft'] ? 1 : 0;
    this.cameraBlend += (target - this.cameraBlend) * Math.min(1, 5.0 * dt);
    this.camera.position.lerpVectors(this.camFront, this.camSide, this.cameraBlend);
    this.camera.lookAt(this.camLookAt);
  }

  // ── Main update ───────────────────────────
  update(dt) {
    this.updateCamera(dt);
    // Drive physics before every sub-step so the spring applies each step,
    // not just the first (cannon-es clears forces after each internal step).
    const numSteps = Math.min(3, Math.max(1, Math.round(dt * 60)));
    for (let i = 0; i < numSteps; i++) {
      this.crane.drivePhysics();
      this.world.step(1/60);
    }
    this.prizes.forEach(p => p.syncMesh());
    this.checkWonPrizes();

    this.winLight.intensity = 2.5 + 1.5 * Math.sin(Date.now() * 0.005);

    // Attach grabbed prize under claw — use physics body's actual position
    if (this.grabbedPrize) {
      const gp  = this.grabbedPrize;
      const cbp = this.crane.clawBody.position;
      gp.body.position.set(cbp.x, cbp.y - 0.36, cbp.z);
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

    this.crane.sync();
  }

  tickIdle(dt) {
    this.setStateBar('WASD / Arrows — move  |  SPACE — drop claw');
    const lim = Math.min(CASE_W, CASE_D) / 2 - 0.32;
    const sp  = CRANE_SPEED * dt;
    const b   = this.cameraBlend;

    // Right axis lerps from +X (front view) to -Z (side view).
    // Forward axis lerps from -Z (front view) to -X (side view).
    const rX =  (1 - b),  rZ = -b;
    const fX = -b,        fZ = -(1 - b);

    let dx = 0, dz = 0;
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) { dx -= rX * sp; dz -= rZ * sp; }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx += rX * sp; dz += rZ * sp; }
    if (this.keys['ArrowUp']    || this.keys['KeyW']) { dx += fX * sp; dz += fZ * sp; }
    if (this.keys['ArrowDown']  || this.keys['KeyS']) { dx -= fX * sp; dz -= fZ * sp; }

    this.crane.craneX = Math.max(-lim, Math.min(lim, this.crane.craneX + dx));
    this.crane.craneZ = Math.max(-lim, Math.min(lim, this.crane.craneZ + dz));
  }

  tickDropping(dt) {
    this.setStateBar('Dropping...');
    this.crane.clawY -= CLAW_DROP_SPD * dt;
    if (this.crane.clawY <= CLAW_MIN_Y) {
      this.crane.clawY = CLAW_MIN_Y;
      this.state = STATE.GRABBING;
      this.grabTimer = 0.55;
    }
  }

  tickGrabbing(dt) {
    this.setStateBar('Grabbing...');
    this.grabTimer -= dt;
    this.crane.applyClawOpen(Math.max(0, this.grabTimer / 0.55));
    if (this.grabTimer <= 0) { this.tryGrab(); this.state = STATE.RISING; }
  }

  tickRising(dt) {
    if (this.grabbedPrize) this._checkPrizeDrop(dt);
    this.setStateBar(this.grabbedPrize ? 'Rising — got a prize!' : 'Rising...');
    this.crane.clawY += CLAW_RISE_SPD * dt;
    if (this.crane.clawY >= CLAW_MAX_Y) {
      this.crane.clawY = CLAW_MAX_Y;
      this.returnTarget  = { x:DROP_X, z:DROP_Z };
      this.returningHome = !this.grabbedPrize;
      this.state = STATE.RETURNING;
    }
  }

  tickReturning(dt) {
    if (this.grabbedPrize) this._checkPrizeDrop(dt);
    this.setStateBar(this.returningHome ? 'Returning...' : 'Moving to drop zone...');
    const sp = CRANE_SPEED * dt;
    const dx = this.returnTarget.x - this.crane.craneX;
    const dz = this.returnTarget.z - this.crane.craneZ;
    const d  = Math.sqrt(dx*dx + dz*dz);
    if (d < 0.06) {
      this.crane.craneX = this.returnTarget.x; this.crane.craneZ = this.returnTarget.z;
      if (this.returningHome) { this.state = STATE.IDLE; }
      else { this.releaseTimer = 0.55; this.state = STATE.RELEASING; }
    } else {
      this.crane.craneX += dx/d * sp; this.crane.craneZ += dz/d * sp;
    }
  }

  tickReleasing(dt) {
    this.setStateBar('Releasing...');
    this.releaseTimer -= dt;
    this.crane.applyClawOpen(1 - Math.max(0, this.releaseTimer / 0.55));
    if (this.releaseTimer <= 0) {
      if (this.grabbedPrize) {
        const p = this.grabbedPrize;
        p.grabbed = false; p.won = true;
        p.body.collisionResponse = true;
        p.body.mass = 2.5; p.body.updateMassProperties();
        p.body.velocity.set(0, -3, 0);
        this.grabbedPrize = null;
        this.score++;
        this.setScore(this.score);
        this.showMessage(`🎉 +1 Prize!  Total: ${this.score}`, 2.5);
      }
      this.crane.applyClawOpen(1);
      this.returnTarget  = { x:DROP_X, z:DROP_Z };
      this.returningHome = true;
      this.state = STATE.RETURNING;
    }
  }

  setupOptionsMenu() {
    const DESCS = {
      easy:   'Prize rarely slips from the claw',
      normal: 'Prize may slip occasionally',
      hard:   'Prize slips often — hold your breath!',
    };
    const overlay = document.getElementById('options-overlay');
    const descEl  = document.getElementById('diff-desc');
    const btns    = document.querySelectorAll('.diff-btn');

    document.getElementById('options-btn').addEventListener('click', () => {
      this.paused = true;
      overlay.classList.remove('hidden');
    });
    document.getElementById('options-close').addEventListener('click', () => {
      overlay.classList.add('hidden');
      this.paused = false;
    });
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.difficulty = btn.dataset.diff;
        btns.forEach(b => b.classList.toggle('active', b === btn));
        descEl.textContent = DESCS[this.difficulty];
      });
    });
  }

  dropGrabbedPrize() {
    const p = this.grabbedPrize;
    p.grabbed = false;
    p.body.collisionResponse = true;
    p.body.mass = 2.5;
    p.body.updateMassProperties();
    p.body.velocity.set(0, -2, 0);
    this.crane.applyClawOpen(1);
    this.grabbedPrize = null;
    this.returningHome = true;
    this.showMessage('Slipped away!', 1.5);
  }

  _checkPrizeDrop(dt) {
    const rates = { easy: 0.03, normal: 0.15, hard: 0.45 };
    if (Math.random() < (rates[this.difficulty] ?? 0.15) * dt) {
      this.dropGrabbedPrize();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.paused) this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

import * as THREE from 'three';
import {
  CASE_W, CASE_D,
  CLAW_MAX_Y,
  DROP_X, DROP_Z, BIN_W, BIN_D,
  STATE,
} from './constants.js';
import { buildEnvironment }  from './components/Environment/index.js';
import { buildCabinet }      from './components/Cabinet/index.js';
import { Crane }             from './components/Crane/index.js';
import { Prize, PRIZE_DEFS } from './components/Prize/index.js';
import { setupRenderer, setupScene, setupPhysics } from './components/SceneSetup/index.js';
import { updateCraneContact }  from './components/ContactDetection/index.js';
import { buildDebugColliders, updateDebugColliders } from './components/DebugVisualisation/index.js';
import { buildSilhouettes } from './components/Silhouettes/index.js';
import {
  tickIdle, tickDropping, tickGrabbing,
  tickRising, tickReturning, tickReleasing,
} from './components/StateMachine/index.js';

export class CraneGame {
  constructor() {
    this.clock         = new THREE.Clock();
    this.state         = STATE.IDLE;
    this.score         = 0;
    this.prizes        = [];
    this.grabbedPrize  = null;
    this.returnTarget  = { x: 0, z: 0 };
    this.returningHome = false;
    this.grabTimer     = 0;
    this.releaseTimer  = 0;
    this.keys          = {};
    this.camFront      = new THREE.Vector3(0, 2.5, 9.5);
    this.camSide       = new THREE.Vector3(9.5, 2.5, 0);
    this.camLookAt     = new THREE.Vector3(0, 1.5, 0);
    this.cameraBlend   = 0;
    this.paused        = false;
    this.showColliders = false;
    this.craneInContact = false;
    this.init().catch(err => console.error('Init failed:', err));
  }

  async init() {
    setupRenderer(this);
    setupScene(this);
    await setupPhysics(this);
    buildEnvironment(this.scene, this.world);
    const { winLight } = buildCabinet(this.scene, this.world);
    this.winLight  = winLight;
    this.crane = new Crane(this.scene, this.world);
    this.silhouettes = buildSilhouettes(this.scene);
    this.spawnPrizes();
    buildDebugColliders(this);
    this.setupInput();
    this.animate();
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

      const y = 0.5 + Math.floor(i / 4) * 0.75 + Math.random() * 0.3;
      this.prizes.push(new Prize(this.scene, this.world, { x, y, z }, i));
    });
  }

  // ── Won-prize removal: triggered when prize reaches the bin floor ──
  checkWonPrizes() {
    this.prizes = this.prizes.filter(p => {
      if (!p.won) return true;
      if (p.body.translation().y < -0.55) {
        p.remove();
        this.score++;
        this.setScore(this.score);
        this.showMessage(`🎉 +1 Prize!  Total: ${this.score}`, 2.5);
        return false;
      }
      return true;
    });
  }

  // ── Input ─────────────────────────────────
  setupInput() {
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.state === STATE.IDLE) {
        e.preventDefault();
        this._triggerDrop();
      }
      if (e.code === 'KeyP') { this.showColliders = !this.showColliders; }
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });

    const hold = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart',  e => { e.preventDefault(); this.keys[key] = true;  }, { passive: false });
      el.addEventListener('touchend',    e => { e.preventDefault(); this.keys[key] = false; }, { passive: false });
      el.addEventListener('touchcancel', () => { this.keys[key] = false; });
    };
    hold('btn-up',    'ArrowUp');
    hold('btn-down',  'ArrowDown');
    hold('btn-left',  'ArrowLeft');
    hold('btn-right', 'ArrowRight');

    const dropBtn = document.getElementById('btn-drop');
    if (dropBtn) {
      dropBtn.addEventListener('touchstart', e => { e.preventDefault(); this._triggerDrop(); }, { passive: false });
    }

    const viewBtn = document.getElementById('btn-view');
    if (viewBtn) {
      viewBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        this.keys['ShiftLeft'] = !this.keys['ShiftLeft'];
        viewBtn.classList.toggle('active', !!this.keys['ShiftLeft']);
      }, { passive: false });
    }
  }

  _triggerDrop() {
    if (this.state === STATE.IDLE) {
      this.state = STATE.DROPPING;
      this.crane.applyClawOpen(1);
    }
  }

  // ── UI helpers ────────────────────────────
  showMessage(text, secs = 2.0) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._mt);
    this._mt = setTimeout(() => el.classList.remove('show'), secs * 1000);
  }
  setScore(n) { document.getElementById('score').textContent = `SCORE: ${n}`; }

  // ── Camera glide ──────────────────────────
  updateCamera(dt) {
    const target = this.keys['ShiftLeft'] ? 1 : 0;
    this.cameraBlend += (target - this.cameraBlend) * Math.min(1, 5.0 * dt);
    this.camera.position.lerpVectors(this.camFront, this.camSide, this.cameraBlend);
    this.camera.lookAt(this.camLookAt);
  }

  // ── Main update ───────────────────────────
  update(dt) {
    if (!this.crane || !this.world) return;
    this.updateCamera(dt);
    if (this.silhouettes) this.silhouettes.update(dt);
    const numSteps = Math.min(3, Math.max(1, Math.round(dt * 60)));
    for (let i = 0; i < numSteps; i++) {
      this.crane.drivePhysics();
      this.world.step();
    }
    this.prizes.forEach(p => p.syncMesh());
    this.checkWonPrizes();
    updateDebugColliders(this);


    updateCraneContact(this);

    switch (this.state) {
      case STATE.IDLE:      tickIdle(this, dt);      break;
      case STATE.DROPPING:  tickDropping(this, dt);  break;
      case STATE.GRABBING:  tickGrabbing(this, dt);  break;
      case STATE.RISING:    tickRising(this, dt);    break;
      case STATE.RETURNING: tickReturning(this, dt); break;
      case STATE.RELEASING: tickReleasing(this, dt); break;
    }

    // Attach grabbed prize under the claw each frame.
    if (this.grabbedPrize) {
      const gp  = this.grabbedPrize;
      const cbp = this.crane.clawBody.translation();
      const tx = cbp.x, ty = cbp.y - 0.55, tz = cbp.z;
      gp.body.setTranslation({ x: tx, y: ty, z: tz }, true);
      gp.body.setLinvel({ x:0, y:0, z:0 }, true);
      gp.mesh.position.set(tx, ty, tz);
    }

    this.crane.sync();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    try {
      if (!this.paused) this.update(dt);
    } catch (e) {
      console.error('update error:', e);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

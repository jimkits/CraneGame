import {
  CASE_W, CASE_D,
  CLAW_MAX_Y,
  CRANE_SPEED, CLAW_DROP_SPD, CLAW_RISE_SPD,
  DROP_X, DROP_Z,
  STATE,
} from '../../constants.js';

export function tickIdle(game, dt) {
  const lim = Math.min(CASE_W, CASE_D) / 2 - 0.32;
  const sp  = CRANE_SPEED * dt;
  const b   = game.cameraBlend;

  // Right axis lerps from +X (front view) to -Z (side view).
  // Forward axis lerps from -Z (front view) to -X (side view).
  const rX =  (1 - b),  rZ = -b;
  const fX = -b,        fZ = -(1 - b);

  let dx = 0, dz = 0;
  if (game.keys['ArrowLeft']  || game.keys['KeyA']) { dx -= rX * sp; dz -= rZ * sp; }
  if (game.keys['ArrowRight'] || game.keys['KeyD']) { dx += rX * sp; dz += rZ * sp; }
  if (game.keys['ArrowUp']    || game.keys['KeyW']) { dx += fX * sp; dz += fZ * sp; }
  if (game.keys['ArrowDown']  || game.keys['KeyS']) { dx -= fX * sp; dz -= fZ * sp; }

  game.crane.craneX = Math.max(-lim, Math.min(lim, game.crane.craneX + dx));
  game.crane.craneZ = Math.max(-lim, Math.min(lim, game.crane.craneZ + dz));
}

export function tickDropping(game, dt) {
  if (game.craneInContact) {
    game.state = STATE.GRABBING;
    game.grabTimer = 0.55;
    return;
  }
  game.crane.clawY -= CLAW_DROP_SPD * dt;
  const minY = game.crane.getMinClawY();
  if (game.crane.clawY <= minY) {
    game.crane.clawY = minY;
    game.state = STATE.GRABBING;
    game.grabTimer = 0.55;
  }
}

export function tickGrabbing(game, dt) {
  game.grabTimer -= dt;
  game.crane.applyClawOpen(Math.max(0, game.grabTimer / 0.55));
  if (game.grabTimer <= 0) { tryGrab(game); game.state = STATE.RISING; }
}

export function tickRising(game, dt) {
  game.crane.clawY += CLAW_RISE_SPD * dt;
  if (game.crane.clawY >= CLAW_MAX_Y) {
    game.crane.clawY = CLAW_MAX_Y;
    game.returnTarget  = { x: DROP_X, z: DROP_Z };
    game.returningHome = !game.grabbedPrize;
    game.state = STATE.RETURNING;
  }
}

export function tickReturning(game, dt) {
  const sp = CRANE_SPEED * dt;
  const dx = game.returnTarget.x - game.crane.craneX;
  const dz = game.returnTarget.z - game.crane.craneZ;
  const d  = Math.sqrt(dx * dx + dz * dz);
  if (d < 0.06) {
    game.crane.craneX = game.returnTarget.x; game.crane.craneZ = game.returnTarget.z;
    if (game.returningHome) { game.crane.applyClawOpen(1); game.state = STATE.IDLE; }
    else { game.releaseTimer = 0.55; game.state = STATE.RELEASING; }
  } else {
    game.crane.craneX += dx / d * sp; game.crane.craneZ += dz / d * sp;
  }
}

export function tickReleasing(game, dt) {
  game.releaseTimer -= dt;
  game.crane.applyClawOpen(1 - Math.max(0, game.releaseTimer / 0.55));
  if (game.releaseTimer <= 0) {
    if (game.grabbedPrize) {
      const p = game.grabbedPrize;
      p.grabbed = false; p.won = true;
      // Colliders stay disabled so the prize falls through the floor into the bin shaft.
      // Zero damping so it doesn't decelerate over the longer fall distance.
      p.body.setLinearDamping(-1);
      p.body.setGravityScale(1, true);
      p.body.setLinvel({ x:0, y:-3, z:0 }, true);
      game.grabbedPrize = null;
    }
    game.crane.applyClawOpen(1);
    game.returnTarget  = { x: DROP_X, z: DROP_Z };
    game.returningHome = true;
    game.state = STATE.RETURNING;
  }
}

// ── Grab attempt ─────────────────────────────────────────────────────────────
// A prize is caught if it lies inside all 3 arm sectors in the XZ plane.
// For each arm i (at 120° intervals), the prize's projection onto the arm's
// outward direction must be ≤ arm inner-face radius + prize torso radius.
function tryGrab(game) {
  const PRIZE_TORSO_R = 0.22;
  const threshold     = game.crane.getArmCatchRadius() + PRIZE_TORSO_R;
  const cpos          = game.crane.clawBody.translation();

  let best = null, bestD = Infinity;
  game.prizes.forEach(p => {
    if (p.grabbed || p.won) return;
    const pos = p.body.translation();
    const dx = pos.x - cpos.x, dz = pos.z - cpos.z;

    for (let i = 0; i < 3; i++) {
      const theta = (i / 3) * Math.PI * 2;
      if (dx * Math.sin(theta) + dz * Math.cos(theta) > threshold) return;
    }

    const d = Math.sqrt(dx * dx + dz * dz + (pos.y - cpos.y) ** 2);
    if (d < bestD) { best = p; bestD = d; }
  });

  if (best) {
    game.grabbedPrize = best;
    best.grabbed = true;
    best.body.setGravityScale(0, true);
    best.body.setLinvel({ x:0, y:0, z:0 }, true);
    best.setCollidersEnabled(false);
  }
}

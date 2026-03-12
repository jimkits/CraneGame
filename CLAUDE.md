# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

```bash
node server.js
# then open http://localhost:8080
```

No build step or `npm install` required. Three.js and Rapier are loaded from CDN via an importmap in `index.html`. The server is a minimal static file server — any local HTTP server works as a substitute.

## Architecture

### Entry flow
`index.html` → `game.js` → `new CraneGame()` → async `init()` which sets up renderer, scene, physics (awaits `RAPIER.init()`), builds all scene components, spawns prizes, wires input, then starts the `requestAnimationFrame` loop.

### State machine (`src/CraneGame.js`)
The core game loop runs a 6-state machine: `IDLE → DROPPING → GRABBING → RISING → RETURNING → RELEASING`. Each state has a `tick*()` method. Transitions are:
- Space key in IDLE → DROPPING
- Housing contacts a prize (or floor reached) → GRABBING
- Grab timer expires → calls `tryGrab()` → RISING
- Fully risen → RETURNING (to win-zone if prize grabbed, to home if missed)
- At win-zone → RELEASING; at home without prize → IDLE

### Physics / rendering split
Every frame, `update()` runs `numSteps` Rapier sub-steps (1–3 depending on `dt`), then calls `prize.syncMesh()` on all prizes to copy physics positions to Three.js meshes. The crane uses a **kinematic** physics body (`setNextKinematicTranslation`) — its position is set directly, not simulated. Prizes are **dynamic** bodies.

A grabbed prize has gravity scale 0, colliders disabled, and its position is set manually each frame to `clawBody.translation() - 0.55` on Y. When released into the win zone, colliders remain disabled and linear damping is zeroed so the prize falls freely through the floor hole into the bin shaft.

### Crane component (`src/components/Crane/index.js`)
Holds all crane visual state: `craneX/Z` (XZ position), `clawY` (vertical), `clawOpenT` (0=closed, 1=open), `clawTiltQ` (quaternion for contact tilt). `sync()` must be called each frame to push these values to Three.js meshes. `applyClawOpen(t)` animates the 3 finger pivots between OPEN/CLOSE angles.

Key methods:
- **`getMinClawY(floorY=0.06)`** — dynamically computes the minimum safe `clawY` from the current arm pivot angle so arm tips never penetrate the floor. Replaces the old static `CLAW_MIN_Y` constant.
- **`getArmCatchRadius()`** — returns the inner-face radial distance of the arm at the elbow (start of last arm segment), used by `tryGrab` to determine the catch zone.

### Crane physics colliders (`src/components/Crane/index.js`)
The claw body has two types of colliders, both attached to the kinematic `clawBody`:
- **Housing cylinder** (`this.housingCollider`) — collides with prizes. Used for contact detection (`updateCraneContact`) and stored for reference. Membership: default groups.
- **3 × 3 arm capsules** (`this.armColliders[]`) — 9 capsules tracing the curved arm shape, updated every frame in `syncArmColliders()`. **Set to collision group 0x0004 which excludes prize group 0x0002** — arm capsules pass through prizes entirely. They only interact with static world geometry (floor/walls).

Do NOT change the arm collision groups without updating the prize collision groups in `Prize/index.js` to match.

### Collision groups
Two custom groups are defined (prize group 0x0002, arm group 0x0004):
- **Arm capsules**: membership=0x0004, filter=0xFFFD (all except prizes) — arms pass through prizes
- **Prize colliders**: membership=0x0002, filter=0xFFFB (all except arms) — prizes ignore arms
- **Housing / world / static**: default groups (0xFFFF) — collide with everything

This lets the crane descend through a pile of prizes and only trigger contact via the housing body.

### Contact detection (`src/components/ContactDetection/index.js`)
Physics-based via `world.contactPair(housingCollider, prizeCollider, cb)`. Iterates all prizes, checks housing↔prize contact, sets `game.craneInContact = true` and `game.craneContactPrize` (nearest hit). Also drives claw tilt toward the nearest contacted prize.

### Grab detection (`src/components/StateMachine/index.js` — `tryGrab`)
Geometric, not physics-based. At grab time (arms fully closed), iterates all prizes and checks whether the prize XZ position lies inside all 3 arm sectors:

For each arm `i` at `theta = i/3 * 2π`, the prize must satisfy:
```
dx·sin(θ) + dz·cos(θ) ≤ getArmCatchRadius() + PRIZE_TORSO_R
```
where `(dx, dz)` is the prize offset from `clawBody` in XZ. The closest prize passing all 3 checks is grabbed. This is more reliable than re-checking physics contact, which can fail if the prize drifts during the 0.55 s grab timer.

### Prize colliders (`src/components/Prize/index.js`)
Each prize has **compound colliders** — 4 sphere colliders per prize (torso, head, 2 limbs), stored in `this.colliders[]`. Shapes are defined per type in `COLLIDER_SHAPES`. `setCollidersEnabled(bool)` enables/disables all at once.

Prize colliders use group 0x0002 with filter 0xFFFB (ignoring arm capsules). When a prize is grabbed, colliders are disabled. When released into the win zone, colliders remain disabled so the prize falls through the floor.

### Win zone and prize removal (`src/CraneGame.js` — `checkWonPrizes`)
Won prizes (colliders disabled, linear damping 0) fall through the prize-area floor and down a bin shaft (`binFloorY = -0.8`). `checkWonPrizes` removes a prize and fires the score/message when `body.translation().y < -0.55`.

The prize-area floor mesh is split into 4 pieces leaving a visual hole at the win zone (`DROP_X ± BIN_W/2`, `DROP_Z ± BIN_D/2`). The physics floor collider remains a single block — only won prizes (disabled colliders) fall through.

### Debug visualisation (P key)
`buildDebugColliders()` creates wireframe meshes for all prize spheres (green), crane housing cylinder (red), arm capsules (orange), and the floor collider (cyan). Updated each frame in `updateDebugColliders()`.

### Adding a new prize type
1. Create `src/components/Make<Name>/index.js` exporting a `make<Name>()` function that returns a `THREE.Group`.
2. Add a `COLLIDER_SHAPES` entry in `src/components/Prize/index.js` (torso + head + limbs as sphere `{ r, x, y, z, mass }`).
3. Add entries to `PRIZE_DEFS` with the `type` field matching the `COLLIDER_SHAPES` key.

### Key constants (`src/constants.js`)
- `CLAW_MAX_Y` — maximum claw height (top of travel)
- `DROP_X` / `DROP_Z` — win-zone position (where prizes are released)
- `BIN_W` / `BIN_D` — win zone bin footprint (used for floor hole cutout)
- `STATE` — the state enum shared across the game
- `CLAW_MIN_Y` — defined but no longer used; floor stop is now computed by `crane.getMinClawY()`


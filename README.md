# 3D Crane Game

> This project was written entirely using [Claude Code](https://claude.ai/claude-code).

A browser-based 3D crane/claw machine game built with Three.js and Rapier physics.

![Version](https://img.shields.io/badge/version-1.0.0-brightgreen) ![Three.js](https://img.shields.io/badge/Three.js-r160-black) ![Physics](https://img.shields.io/badge/Rapier-0.12-orange) ![Platform](https://img.shields.io/badge/platform-browser-green)

## Controls

| Key       | Action                  |
| --------- | ----------------------- |
| `W` / `↑` | Move crane forward      |
| `S` / `↓` | Move crane back         |
| `A` / `←` | Move crane left         |
| `D` / `→` | Move crane right        |
| `Space`   | Drop the claw           |
| `L-Shift` | Toggle side camera view |

## How to Play

1. Use WASD or arrow keys to position the crane over a prize
2. Press **Space** to drop the claw
3. The claw descends until the housing body contacts a prize or the arms reach the floor
4. If a prize is inside all 3 arm fingers when they close, it's grabbed
5. The crane carries it to the **glowing gold win zone** and releases it
6. The prize falls through the floor into the bin shaft — your score goes up when it lands
7. Repeat!

## Running the Game

### Option A — Built-in Node server (recommended)

```bash
node server.js
```

Then open `http://localhost:8080` in your browser.

### Option B — Other local servers

ES modules require a server to load correctly in most browsers.

```bash
# Node (via npx)
npx serve .

# Python
python -m http.server 8080
```

### Option C — Open directly

Some browsers (Firefox) allow opening `index.html` directly from disk. Just double-click `index.html` or drag it into your browser.

## Project Structure

```
CraneGame/
├── index.html              # HTML shell, UI overlay, import map
├── game.js                 # Entry point — imports and starts CraneGame
├── server.js               # Minimal Node.js static file server (port 8080)
└── src/
    ├── constants.js        # Shared constants and STATE enum
    ├── CraneGame.js        # Main game class — renderer, scene, physics, state machine
    ├── utils/
    │   └── materials.js    # Three.js material helpers (m, emissive, castAll)
    └── components/
        ├── Cabinet/        # Cabinet body, glass walls, marquee, win zone
        ├── Crane/          # Crane class — rail, trolley, cable, claw, position state
        ├── Environment/    # Floor, back wall, neon strip lights
        ├── MakeBear/       # Bear plush builder
        ├── MakeBunny/      # Bunny plush builder
        ├── MakeCat/        # Cat plush builder
        ├── MakeChick/      # Chick plush builder
        └── Prize/          # Prize class + PRIZE_DEFS spawn list
```

## Tech Stack

| Library                         | Version | Purpose                                       |
| ------------------------------- | ------- | --------------------------------------------- |
| [Three.js](https://threejs.org) | r160    | 3D rendering, scene, camera, lighting         |
| [Rapier](https://rapier.rs)     | 0.12    | Rigid body physics — prizes, claw, collisions |

Both libraries are loaded from CDN — no build step or `npm install` required.

## Features

- 3-fingered claw with open/close animation
- 12 physics-simulated plush toy prizes — bears, bunnies, chicks, and cats built from 3D geometry
- Glass case with neon arcade lighting
- Crane rail + trolley + cable visuals
- Glowing win zone with deep bin shaft — prizes fall through a floor hole when won
- Score tracker and on-screen messages
- State machine: Idle → Dropping → Grabbing → Rising → Returning → Releasing
- Arm-geometry grab detection: a prize is caught only when all 3 fingers close around it
- Collision groups: claw arms pass through prizes; only the housing body triggers descent stop and contact detection

## Changelog

### v1.1.0

| Feature                                          | Detail                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physics engine migrated from Cannon-es to Rapier | Replaced [Cannon-es 0.20](https://github.com/pmndrs/cannon-es) with [Rapier 0.12](https://rapier.rs) (`@dimforge/rapier3d-compat`), a physics engine written in Rust and compiled to WebAssembly, providing significantly faster simulation via WASM and accurate contact normals |
| Camera blend                                     | Hold Left-Shift to glide to a side view                                                                                                                                                                                                                                           |
| Component modules                                | Codebase split into Cabinet, Crane, Environment, Prize                                                                                                                                                                                                                            |
| Arm pass-through physics                         | Claw arm capsules use collision groups to pass through prizes entirely; only the central housing cylinder triggers descent stop and contact detection                                                                                                                             |
| Geometric grab detection                         | `tryGrab` checks all 3 arm sectors using `getArmCatchRadius()` (elbow inner-face geometry) instead of re-querying physics contacts, which was unreliable after the grab timer                                                                                                     |
| Dynamic floor stop                               | `getMinClawY()` computes the minimum safe claw height from the current arm pivot angle, replacing the old static `CLAW_MIN_Y` constant                                                                                                                                            |
| Deep win zone bin                                | Bin shaft extends well below the prize-area floor; prize-area floor has a visual hole at the win zone so prizes visually fall through                                                                                                                                             |
| Score fires on landing                           | Score and message trigger when the prize reaches the bin floor, not when released from the claw                                                                                                                                                                                   |
| Difficulty                                       | Removed prize-slip mechanic                                                                                                                                                                                                                                                       |

### v1.0.0

**Tech:** Three.js r160, Cannon-es 0.20, Node.js (optional server), vanilla HTML/CSS/ES modules, unpkg CDN

| Feature         | Detail                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Initial release | 3D crane game with Three.js rendering and [Cannon-es 0.20](https://github.com/pmndrs/cannon-es) physics |
| Cabinet         | Glass cabinet with neon arcade lighting, crane rail, trolley, and cable visuals                         |
| Prizes          | 3-fingered claw machine with 12 plush toy prizes — bears, bunnies, chicks, and cats                     |
| Difficulty      | Easy / Normal / Hard with prize-slip mechanic                                                           |

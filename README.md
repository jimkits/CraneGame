# 3D Crane Game

> This project was written entirely using [Claude Code](https://claude.ai/claude-code).

A browser-based 3D crane/claw machine game built with Three.js and Cannon-es physics.

![Crane Game](https://img.shields.io/badge/Three.js-r160-black) ![Physics](https://img.shields.io/badge/Cannon--es-0.20-blue) ![Platform](https://img.shields.io/badge/platform-browser-green)

## Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move crane forward |
| `S` / `↓` | Move crane back |
| `A` / `←` | Move crane left |
| `D` / `→` | Move crane right |
| `Space` | Drop the claw |

## How to Play

1. Use WASD or arrow keys to position the crane over a prize
2. Press **Space** to drop the claw
3. If you grab a prize, the crane automatically carries it to the **glowing gold win zone**
4. The claw opens, the prize drops, and your score goes up
5. Repeat!

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

| Library | Purpose |
|---------|---------|
| [Three.js r160](https://threejs.org) | 3D rendering, scene, camera, lighting |
| [Cannon-es 0.20](https://github.com/pmndrs/cannon-es) | Rigid body physics for prizes |

Both libraries are loaded from CDN — no build step or `npm install` required.

## Features

- 4-fingered claw with open/close animation
- 12 physics-simulated plush toy prizes — bears, bunnies, chicks, and cats built from 3D geometry
- Glass case with neon arcade lighting and fog
- Crane rail + trolley + cable visuals
- Glowing win zone indicator
- Score tracker and on-screen messages
- State machine: Idle → Dropping → Grabbing → Rising → Returning → Releasing
- Options menu with Easy / Normal / Hard difficulty — higher difficulty causes the prize to slip from the claw mid-carry

import * as THREE from 'three';
import { CAB_H, CASE_D } from '../../constants.js';

const WALL_Z  = -(CASE_D + 0.3) / 2 - 0.05;
const FLOOR_Y = -CAB_H;
const FPS     = 12;
const DT_FRAME = 1 / FPS;

function drawPerson(ctx, W, H, phase) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0b11';

  const s  = H / 110;
  const cx = W / 2;
  const sw = Math.sin(phase * Math.PI * 2) * 22 * (Math.PI / 180);

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, 8 * s, 6 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.fillRect(cx - 7 * s, 16 * s, 14 * s, 30 * s);

  // Left arm
  ctx.save();
  ctx.translate(cx - 8 * s, 18 * s);
  ctx.rotate(sw);
  ctx.fillRect(-3 * s, 0, 6 * s, 24 * s);
  ctx.restore();

  // Right arm
  ctx.save();
  ctx.translate(cx + 8 * s, 18 * s);
  ctx.rotate(-sw);
  ctx.fillRect(-3 * s, 0, 6 * s, 24 * s);
  ctx.restore();

  // Left leg
  ctx.save();
  ctx.translate(cx - 4 * s, 46 * s);
  ctx.rotate(-sw);
  ctx.fillRect(-4 * s, 0, 8 * s, 32 * s);
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(cx + 4 * s, 46 * s);
  ctx.rotate(sw);
  ctx.fillRect(-4 * s, 0, 8 * s, 32 * s);
  ctx.restore();
}

export function buildSilhouettes(scene) {
  const configs = [
    { x: -14, z: WALL_Z - 0.3, speed:  1.1,  h: 5.5, phase: 0.00 },
    { x:  10, z: WALL_Z - 0.5, speed: -0.85, h: 5.1, phase: 0.35 },
    { x: -20, z: WALL_Z - 0.8, speed:  0.65, h: 4.8, phase: 0.65 },
    { x:  18, z: WALL_Z - 0.4, speed: -1.3,  h: 5.8, phase: 0.15 },
    { x:   4, z: WALL_Z - 0.6, speed:  0.95, h: 5.3, phase: 0.50 },
  ];

  const silhouettes = configs.map(cfg => {
    const W = 64, H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawPerson(ctx, W, H, cfg.phase);

    const tex = new THREE.CanvasTexture(canvas);
    const pw  = cfg.h * (W / H);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, cfg.h),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, alphaTest: 0.05,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    mesh.position.set(cfg.x, FLOOR_Y + cfg.h / 2, cfg.z);
    scene.add(mesh);

    return {
      mesh, canvas, ctx, tex,
      x: cfg.x, speed: cfg.speed, phase: cfg.phase, timer: 0,
    };
  });

  return {
    update(dt) {
      for (const s of silhouettes) {
        s.x += s.speed * dt;
        if (s.speed > 0 && s.x >  22) s.x = -22;
        if (s.speed < 0 && s.x < -22) s.x =  22;

        s.mesh.scale.x    = s.speed < 0 ? -1 : 1;
        s.mesh.position.x = s.x;

        s.timer += dt;
        if (s.timer >= DT_FRAME) {
          s.timer -= DT_FRAME;
          s.phase = (s.phase + Math.abs(s.speed) * 0.9 / FPS) % 1;
          drawPerson(s.ctx, s.canvas.width, s.canvas.height, s.phase);
          s.tex.needsUpdate = true;
        }
      }
    },
  };
}

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { m, emissive } from '../../utils/materials.js';
import { CAB_H, CASE_W, CASE_D } from '../../constants.js';

export function buildEnvironment(scene, world) {
  // Physics ground — large cuboid whose top face sits exactly at y = -CAB_H
  const gnd = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  gnd.setTranslation({ x:0, y:-CAB_H - 0.05, z:0 }, true);
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.05, 100), gnd);


  // Window wall — sits just behind the cabinet back face (z = −cabD/2 = −1.65)
  const WALL_W = 30, WALL_H = 20, WALL_Y = 5;
  const WALL_Z = -(CASE_D + 0.3) / 2 - 0.05;      // just behind cabinet back face
  const PILLAR_W = CASE_W + 5.4;                   // wide wall behind cabinet (~9)
  const WW = (WALL_W - PILLAR_W) / 2;              // each window width (~12.75)
  const WH = WALL_H;
  const WZ = WALL_Z + 0.05;                        // frame Z centre
  const FT = 0.14;   // frame border thickness
  const MW = 0.07;   // muntin width
  const COLS = 3;

  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x1a35b5, roughness: 1.0, metalness: 0 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2dace, roughness: 0.4 });
  // Transparent glass — outdoor scene shows through
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb8d4e0,
    transparent: true,
    opacity: 0.4,
    roughness: 0.04,
    metalness: 0.08,
  });

  // Central column — only solid wall panel; window areas left open
  const column = new THREE.Mesh(new THREE.BoxGeometry(PILLAR_W, WH, 0.2), wallMat);
  column.position.set(0, WALL_Y, WALL_Z);
  scene.add(column);

  const iW = WW - 2 * FT;
  const iH = WH - 2 * FT;
  const pW = (iW - (COLS - 1) * MW) / COLS;

  for (const wx of [-(PILLAR_W / 2 + WW / 2), PILLAR_W / 2 + WW / 2]) {
    // Top and bottom frame bars
    [WALL_Y + WH / 2 - FT / 2, WALL_Y - WH / 2 + FT / 2].forEach(y => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(WW, FT, 0.15), frameMat);
      bar.position.set(wx, y, WZ);
      scene.add(bar);
    });

    // Left and right stiles
    [wx - WW / 2 + FT / 2, wx + WW / 2 - FT / 2].forEach(x => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(FT, iH, 0.15), frameMat);
      stile.position.set(x, WALL_Y, WZ);
      scene.add(stile);
    });

    // Transparent glass panes (inset behind frame face)
    for (let c = 0; c < COLS; c++) {
      const px = wx - iW / 2 + pW / 2 + c * (pW + MW);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(pW, iH), glassMat);
      pane.position.set(px, WALL_Y, WZ - 0.02);
      scene.add(pane);
    }

    // Vertical muntins
    for (let c = 1; c < COLS; c++) {
      const mx = wx - iW / 2 + c * (pW + MW) - MW / 2;
      const muntin = new THREE.Mesh(new THREE.BoxGeometry(MW, iH, 0.07), frameMat);
      muntin.position.set(mx, WALL_Y, WZ + 0.01);
      scene.add(muntin);
    }
  }

  // ── Indoor building space (in front of the glass wall) ───────────────────
  const INDOOR_FRONT = 14;
  const indoorDepth  = INDOOR_FRONT - WALL_Z;

  const indoorFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, indoorDepth),
    wallMat
  );
  indoorFloor.rotation.x = -Math.PI / 2;
  indoorFloor.position.set(0, -CAB_H, WALL_Z + indoorDepth / 2);
  indoorFloor.receiveShadow = true;
  scene.add(indoorFloor);

  [-WALL_W / 2, WALL_W / 2].forEach(x => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, WH, indoorDepth), wallMat);
    wall.position.set(x, WALL_Y, WALL_Z + indoorDepth / 2);
    scene.add(wall);
  });

  // Ceiling
  const CEIL_Y = 8;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, indoorDepth),
    wallMat
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEIL_Y, WALL_Z + indoorDepth / 2);
  scene.add(ceiling);

  // ── Indoor neon border — full rectangle along floor and ceiling edges ─────────
  const roomNeonMat = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 10 });
  const neonZ  = WALL_Z + 0.15;
  const neonY  = -CAB_H + 0.015;   // floor level
  const neonYT = CEIL_Y - 0.015;   // ceiling level
  const sideX  = WALL_W / 2 - 0.12;      // inner face of side walls
  const sideLen = INDOOR_FRONT - neonZ;   // depth strip runs toward camera

  // Back horizontal strips (across window wall width)
  [neonY, neonYT].forEach(y => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.03, 0.03), roomNeonMat);
    s.position.set(0, y, neonZ); scene.add(s);
  });

  // Side strips running forward from window wall to front of room
  [-sideX, sideX].forEach(x => {
    [neonY, neonYT].forEach(y => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, sideLen), roomNeonMat);
      s.position.set(x, y, neonZ + sideLen / 2); scene.add(s);
    });
  });

  // Front horizontal strips — close the rectangle
  [neonY, neonYT].forEach(y => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.03, 0.03), roomNeonMat);
    s.position.set(0, y, INDOOR_FRONT - 0.12); scene.add(s);
  });


  // ── Outdoor courtyard scene (behind the window wall) ──────────────────────

  // Cobblestone path texture
  const pathCanvas = document.createElement('canvas');
  pathCanvas.width = pathCanvas.height = 512;
  const pCtx = pathCanvas.getContext('2d');
  pCtx.fillStyle = '#3e3a36';
  pCtx.fillRect(0, 0, 512, 512);
  const stoneColors = ['#8c8278', '#938a80', '#857d73', '#9a9087', '#807870', '#8e8480'];
  const sCols = 8, sRows = 2;
  const sW = 512 / sCols, sH = 512 / sRows;
  for (let r = 0; r < sRows; r++) {
    for (let c = 0; c < sCols; c++) {
      pCtx.fillStyle = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      pCtx.fillRect(c * sW + 2, r * sH + 2, sW - 4, sH - 4);
    }
  }
  const pathTex = new THREE.CanvasTexture(pathCanvas);
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(3, 4);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 13),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.92 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, -CAB_H - 0.002, WALL_Z - 3.5);
  scene.add(path);

  // Alley walls — tall building facades on three sides
  const alleyH    = 16;                              // tall enough to dominate the view
  const alleyD    = 10;                              // narrow alley depth
  const alleyWallY = -CAB_H + alleyH / 2;
  const alleyMat  = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.95 }); // dark brick/stone

  // Far wall — the main building wall across the alley
  const farWall = new THREE.Mesh(new THREE.BoxGeometry(60, alleyH, 0.35), alleyMat);
  farWall.position.set(0, alleyWallY, WALL_Z - alleyD);
  scene.add(farWall);

  // ── Outdoor street lamps ─────────────────────────────────────────────────────
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc77, emissive: 0xffaa33, emissiveIntensity: 8 });
  const floorY  = -CAB_H;
  const POLE_H  = 13.0;

  function makeStreetLamp(px, pz, armDx, armDz) {
    const topY   = floorY + POLE_H;
    const armLen = 0.8;
    const headX  = px + armDx * armLen;
    const headZ  = pz + armDz * armLen;
    const headY  = topY - 0.15;

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, POLE_H, 8), poleMat);
    pole.position.set(px, floorY + POLE_H / 2, pz);
    scene.add(pole);

    // Arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, armLen, 6), poleMat);
    arm.rotation.z = armDx !== 0 ? Math.PI / 2 : 0;
    arm.rotation.x = armDz !== 0 ? Math.PI / 2 : 0;
    arm.position.set(px + armDx * armLen / 2, topY, pz + armDz * armLen / 2);
    scene.add(arm);

    // Lamp head housing
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), headMat);
    head.position.set(headX, headY, headZ);
    scene.add(head);

    // SpotLight — cone pointing straight down
    const spot = new THREE.SpotLight(0xffaa44, 55, 24, Math.PI / 13, 0.25);
    spot.position.set(headX, headY, headZ);
    spot.target.position.set(headX, floorY, headZ);
    scene.add(spot);
    scene.add(spot.target);

    // Visible light beam cone (additive semi-transparent)
    const beamH = headY - floorY;
    const beamR = Math.tan(Math.PI / 13) * beamH;
    const beamGeo = new THREE.CylinderGeometry(0, beamR, beamH, 20, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33, transparent: true, opacity: 0.07,
      side: THREE.BackSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(headX, headY - beamH / 2, headZ);
    scene.add(beam);
  }

  makeStreetLamp(0,    WALL_Z - 5.5,  1, 0);   // centre — unchanged
  makeStreetLamp(-20,  WALL_Z - 2.5,  1, 0);   // left   — doubled x distance
  makeStreetLamp( 20,  WALL_Z - 2.5, -1, 0);   // right  — doubled x distance

  // ── Wall decorations ──────────────────────────────────────────────────────────
  const DECAL_Z = WALL_Z + 0.12;

  function wallDecal(drawFn, pw, ph, x, y) {
    const cw = 512, ch = Math.max(1, Math.round(512 * ph / pw));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    drawFn(canvas.getContext('2d'), cw, ch);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true,
      emissive: new THREE.Color(1, 1, 1), emissiveMap: tex, emissiveIntensity: 2.2,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    mesh.position.set(x, y, DECAL_Z);
    scene.add(mesh);
  }

  function pxSprite(ctx, rows, color, cs, ox, oy) {
    ctx.fillStyle = color;
    rows.forEach((row, r) => [...row].forEach((cell, c) => {
      if (cell === '1') ctx.fillRect(ox + c * cs, oy + r * cs, cs - 1, cs - 1);
    }));
  }

  // "INSERT COIN" neon sign
  wallDecal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.62)}px monospace`;
    ctx.fillStyle = '#00ffaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('► INSERT COIN ◄', W / 2, H / 2);
  }, 3.2, 0.45, 0, 7.8);

  // "HIGH SCORE" display
  wallDecal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.38)}px monospace`;
    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HIGH SCORE', W / 2, H * 0.32);
    ctx.font = `bold ${Math.floor(H * 0.46)}px monospace`;
    ctx.fillStyle = '#ff6600';
    ctx.fillText('99999', W / 2, H * 0.72);
  }, 2.6, 0.65, 0, 7.15);

  // "BLIP" — original 8-bit blob alien (pink)
  wallDecal((ctx, W, H) => {
    const cs = Math.floor(W / 12);
    const ox = (W - 10 * cs) / 2, oy = (H - 9 * cs) / 2;
    pxSprite(ctx, [
      '0011111100',
      '0111111110',
      '1111111111',
      '1100110011',
      '1111111111',
      '0111111110',
      '1101001011',
      '0110000110',
      '0010000100',
    ], '#ff44cc', cs, ox, oy);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 2 * cs + 2, oy + 3 * cs + 2, cs - 3, cs - 3);
    ctx.fillRect(ox + 6 * cs + 2, oy + 3 * cs + 2, cs - 3, cs - 3);
  }, 1.2, 1.08, -3.2, 3.2);

  // "ZAPPER" — original pixel rocket (cyan)
  wallDecal((ctx, W, H) => {
    const cs = Math.floor(W / 12);
    const ox = (W - 10 * cs) / 2, oy = (H - 9 * cs) / 2;
    pxSprite(ctx, [
      '0000110000',
      '0001111000',
      '0011111100',
      '0111111110',
      '1111111111',
      '1111111111',
      '0110110110',
      '1100000011',
      '1000000001',
    ], '#44ffcc', cs, ox, oy);
    ctx.fillStyle = '#aaffff';
    ctx.fillRect(ox + 4 * cs + 1, oy + cs + 1, 2 * cs - 2, 2 * cs - 2);
  }, 1.2, 1.08, 3.2, 3.2);

  // Pixel plus-stars scattered on wall
  [[-1.5, 9.0], [1.5, 9.0], [-3.6, 7.4], [3.6, 7.4]].forEach(([sx, sy]) => {
    wallDecal((ctx, W, H) => {
      const cs = Math.floor(W / 7);
      const ox = (W - 5 * cs) / 2, oy = (H - 5 * cs) / 2;
      pxSprite(ctx, ['00100','00100','11111','00100','00100'], '#ffff44', cs, ox, oy);
    }, 0.35, 0.35, sx, sy);
  });

  // ── General decal helper (supports arbitrary surface orientation) ─────────────
  function decal(drawFn, pw, ph, x, y, z, ry = 0, rx = 0) {
    const cw = 512, ch = Math.max(1, Math.round(512 * ph / pw));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    drawFn(canvas.getContext('2d'), cw, ch);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true,
      emissive: new THREE.Color(1, 1, 1), emissiveMap: tex, emissiveIntensity: 2.2,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    mesh.rotation.set(rx, ry, 0);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }

  const LWX = -WALL_W / 2 + 0.15;
  const RWX =  WALL_W / 2 - 0.15;

  // ── Left wall ─────────────────────────────────────────────────────────────────
  decal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.7)}px monospace`;
    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PLAYER 1', W / 2, H / 2);
  }, 2.5, 0.4, LWX, 7.0, 5.5, Math.PI / 2);

  // Pixel joystick
  decal((ctx, W, H) => {
    const cs = Math.floor(W / 13);
    const ox = (W - 10 * cs) / 2, oy = (H - 10 * cs) / 2;
    pxSprite(ctx, [
      '0001111000','0001111000','0000110000','0000110000',
      '0000110000','0000110000','1111111111','1111111111',
      '1111111111','1111111111',
    ], '#cc8844', cs, ox, oy);
    ctx.fillStyle = '#ffcc88'; ctx.fillRect(ox + 2*cs, oy, cs, cs);
  }, 1.5, 1.5, LWX, 5.0, 5.5, Math.PI / 2);

  // Pixel trophy
  decal((ctx, W, H) => {
    const cs = Math.floor(W / 11);
    const ox = (W - 9 * cs) / 2, oy = (H - 9 * cs) / 2;
    pxSprite(ctx, [
      '011111110','111111111','111111111','011111110',
      '001111100','000111000','000111000','001111100','011111110',
    ], '#ffdd22', cs, ox, oy);
    ctx.fillStyle = '#ffffaa'; ctx.fillRect(ox + 3*cs, oy, cs, cs);
  }, 1.3, 1.3, LWX, 5.0, 2.0, Math.PI / 2);

  // "CONTINUE? 3 2 1"
  decal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.33)}px monospace`;
    ctx.fillStyle = '#44ffaa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CONTINUE?', W / 2, H * 0.3);
    ctx.font = `bold ${Math.floor(H * 0.5)}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('3  2  1', W / 2, H * 0.72);
  }, 2.2, 0.75, LWX, 2.5, 4.5, Math.PI / 2);

  [[7.5, 2.0],[7.5, 9.0],[1.8, 1.2],[1.8, 8.5]].forEach(([sy, sz]) => {
    decal((ctx, W, H) => {
      const cs = Math.floor(W / 7);
      const ox = (W - 5*cs) / 2, oy = (H - 5*cs) / 2;
      pxSprite(ctx, ['00100','00100','11111','00100','00100'], '#ffff44', cs, ox, oy);
    }, 0.35, 0.35, LWX, sy, sz, Math.PI / 2);
  });

  // ── Right wall ────────────────────────────────────────────────────────────────
  decal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.7)}px monospace`;
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2);
  }, 2.5, 0.4, RWX, 7.0, 5.5, -Math.PI / 2);

  // Pixel heart
  decal((ctx, W, H) => {
    const cs = Math.floor(W / 12);
    const ox = (W - 10 * cs) / 2, oy = (H - 8 * cs) / 2;
    pxSprite(ctx, [
      '0110001100','1111111110','1111111111','0111111110',
      '0011111100','0001111000','0000110000','0000100000',
    ], '#ff4466', cs, ox, oy);
  }, 1.2, 0.96, RWX, 5.0, 5.5, -Math.PI / 2);

  // Pixel coin
  decal((ctx, W, H) => {
    const cs = Math.floor(W / 12);
    const ox = (W - 10 * cs) / 2, oy = (H - 10 * cs) / 2;
    pxSprite(ctx, [
      '0011111100','0111111110','1111111111','1110001111',
      '1100001111','1111100111','1111110011','1111111111',
      '0111111110','0011111100',
    ], '#ffcc00', cs, ox, oy);
    ctx.fillStyle = '#ffffaa'; ctx.fillRect(ox + 2*cs, oy + 2*cs, cs, cs);
  }, 1.2, 1.2, RWX, 5.0, 2.0, -Math.PI / 2);

  // "CLAW MASTER!"
  decal((ctx, W, H) => {
    ctx.font = `bold ${Math.floor(H * 0.33)}px monospace`;
    ctx.fillStyle = '#ff8844'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CLAW MASTER!', W / 2, H * 0.3);
    ctx.font = `bold ${Math.floor(H * 0.45)}px monospace`;
    ctx.fillStyle = '#ffcc44';
    ctx.fillText('★ ★ ★', W / 2, H * 0.72);
  }, 2.2, 0.75, RWX, 2.5, 4.5, -Math.PI / 2);

  [[7.5, 2.0],[7.5, 9.0],[1.8, 1.2],[1.8, 8.5]].forEach(([sy, sz]) => {
    decal((ctx, W, H) => {
      const cs = Math.floor(W / 7);
      const ox = (W - 5*cs) / 2, oy = (H - 5*cs) / 2;
      pxSprite(ctx, ['00100','00100','11111','00100','00100'], '#ffff44', cs, ox, oy);
    }, 0.35, 0.35, RWX, sy, sz, -Math.PI / 2);
  });

}

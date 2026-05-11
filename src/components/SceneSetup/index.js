import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export function setupRenderer(game) {
  game.renderer = new THREE.WebGLRenderer({ antialias: true });
  game.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  game.renderer.setSize(innerWidth, innerHeight);
  game.renderer.shadowMap.enabled = true;
  game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  game.renderer.toneMappingExposure = 1.0;
  document.body.appendChild(game.renderer.domElement);
  Object.assign(game.renderer.domElement.style, { position:'absolute', top:'0', left:'0' });
  addEventListener('resize', () => {
    game.camera.aspect = innerWidth / innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(innerWidth, innerHeight);
  });
}

export function setupScene(game) {
  game.scene = new THREE.Scene();
  game.scene.background = new THREE.Color(0x090914);
  game.scene.fog = new THREE.FogExp2(0x090914, 0.032);

  game.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 80);
  game.camera.position.set(0, 2.5, 9.5);
  game.camera.lookAt(0, 1.5, 0);

  game.scene.add(new THREE.AmbientLight(0x8899cc, 0.18));

  const sun = new THREE.DirectionalLight(0xffffff, 0.15);
  sun.position.set(3, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  Object.assign(sun.shadow.camera, { near:0.5, far:35, left:-8, right:8, top:8, bottom:-8 });
  game.scene.add(sun);

  // Accent lights placed inside the glass cabinet so they illuminate inward
  // and only bleed outward through the glass (acceptable per design intent).
  const pink = new THREE.PointLight(0xff00aa, 3.0, 4.5);
  pink.position.set(-1.0, 3.0, 1.2); game.scene.add(pink);
  const blue = new THREE.PointLight(0x0066ff, 3.0, 4.5);
  blue.position.set(1.0, 3.0, -1.2); game.scene.add(blue);
}

export async function setupPhysics(game) {
  await RAPIER.init();
  game.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
}

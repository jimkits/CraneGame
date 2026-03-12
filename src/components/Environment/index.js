import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { m, emissive } from '../../utils/materials.js';
import { CAB_H } from '../../constants.js';

export function buildEnvironment(scene, world) {
  // Physics ground — large cuboid whose top face sits exactly at y = -CAB_H
  const gnd = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  gnd.setTranslation({ x:0, y:-CAB_H - 0.05, z:0 }, true);
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.05, 100), gnd);

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
  scene.add(floor);

  // Back wall
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e0e22, roughness: 1.0 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), wallMat);
  backWall.position.set(0, 5, -10);
  scene.add(backWall);

  // Neon floor strip lights (decorative)
  const stripMat = emissive(0x6600ff, 3);
  [-4, 4].forEach(x => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 12), stripMat);
    strip.position.set(x, -CAB_H+0.02, 0);
    scene.add(strip);
  });
}

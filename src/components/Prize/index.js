import * as CANNON from 'cannon-es';
import { makeBear }  from '../MakeBear/index.js';
import { makeBunny } from '../MakeBunny/index.js';
import { makeChick } from '../MakeChick/index.js';
import { makeCat }   from '../MakeCat/index.js';

export const PRIZE_DEFS = [
  { fn: () => makeBear(0xff8899, 0xffddee) },   // pink bear
  { fn: () => makeBunny(0xaaccff, 0xddeeff) },  // blue bunny
  { fn: () => makeBear(0xbb88ee, 0xddccff) },   // purple bear
  { fn: () => makeChick() },                    // yellow chick
  { fn: () => makeCat(0xffaa55, 0xffddbb) },    // orange cat
  { fn: () => makeBunny(0x99eedd, 0xccfff5) },  // mint bunny
  { fn: () => makeBear(0x885533, 0xddaa88) },   // brown bear
  { fn: () => makeCat(0x9999aa, 0xddddee) },    // grey cat
  { fn: () => makeBunny(0xffaacc, 0xffddee) },  // pink bunny
  { fn: () => makeBear(0x66aaff, 0xccddff) },   // blue bear
  { fn: () => makeChick() },                    // another chick
  { fn: () => makeCat(0xee7766, 0xffccbb) },    // red-orange cat
];

export class Prize {
  constructor(scene, world, pos, defIndex) {
    this.scene   = scene;
    this.world   = world;
    this.grabbed = false;
    this.won     = false;

    this.mesh = PRIZE_DEFS[defIndex].fn();
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 2.5,
      shape: new CANNON.Sphere(0.27),
      linearDamping: 0.75,
      angularDamping: 0.75,
    });
    this.body.position.set(pos.x, pos.y, pos.z);
    world.addBody(this.body);
  }

  syncMesh() {
    if (this.grabbed) return;
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }

  remove() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
  }
}

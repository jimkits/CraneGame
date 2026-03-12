import RAPIER from '@dimforge/rapier3d-compat';
import { makeBear }  from '../MakeBear/index.js';
import { makeBunny } from '../MakeBunny/index.js';
import { makeChick } from '../MakeChick/index.js';
import { makeCat }   from '../MakeCat/index.js';

// Compound collider shapes per prize type.
// Each sphere: { r, x, y, z, mass }
// Offsets match the visual geometry in each Make*.js file.
const COLLIDER_SHAPES = {
  bear: [
    { r: 0.22,  x:  0,     y:  0.00, z: 0,    mass: 2.0  }, // torso
    { r: 0.175, x:  0,     y:  0.34, z: 0,    mass: 0.4  }, // head
    { r: 0.07,  x: -0.28,  y:  0.04, z: 0.05, mass: 0.05 }, // left arm
    { r: 0.07,  x:  0.28,  y:  0.04, z: 0.05, mass: 0.05 }, // right arm
  ],
  bunny: [
    { r: 0.21,  x:  0,      y:  0.00, z: 0, mass: 2.0  }, // torso
    { r: 0.165, x:  0,      y:  0.32, z: 0, mass: 0.4  }, // head
    { r: 0.06,  x: -0.095,  y:  0.65, z: 0, mass: 0.05 }, // left ear
    { r: 0.06,  x:  0.095,  y:  0.65, z: 0, mass: 0.05 }, // right ear
  ],
  cat: [
    { r: 0.22,  x:  0,     y:  0.00, z: 0,    mass: 2.0  }, // torso
    { r: 0.18,  x:  0,     y:  0.34, z: 0,    mass: 0.4  }, // head
    { r: 0.07,  x: -0.26,  y:  0.00, z: 0.08, mass: 0.05 }, // left arm
    { r: 0.07,  x:  0.26,  y:  0.00, z: 0.08, mass: 0.05 }, // right arm
  ],
  chick: [
    { r: 0.22,  x:  0,     y:  0.00, z: 0, mass: 2.0  }, // body
    { r: 0.16,  x:  0,     y:  0.31, z: 0, mass: 0.4  }, // head
    { r: 0.07,  x: -0.25,  y: -0.02, z: 0, mass: 0.05 }, // left wing
    { r: 0.07,  x:  0.25,  y: -0.02, z: 0, mass: 0.05 }, // right wing
  ],
};

export const PRIZE_DEFS = [
  { fn: () => makeBear(0xff8899, 0xffddee),   type: 'bear'  }, // pink bear
  { fn: () => makeBunny(0xaaccff, 0xddeeff),  type: 'bunny' }, // blue bunny
  { fn: () => makeBear(0xbb88ee, 0xddccff),   type: 'bear'  }, // purple bear
  { fn: () => makeChick(),                     type: 'chick' }, // yellow chick
  { fn: () => makeCat(0xffaa55, 0xffddbb),    type: 'cat'   }, // orange cat
  { fn: () => makeBunny(0x99eedd, 0xccfff5),  type: 'bunny' }, // mint bunny
  { fn: () => makeBear(0x885533, 0xddaa88),   type: 'bear'  }, // brown bear
  { fn: () => makeCat(0x9999aa, 0xddddee),    type: 'cat'   }, // grey cat
  { fn: () => makeBunny(0xffaacc, 0xffddee),  type: 'bunny' }, // pink bunny
  { fn: () => makeBear(0x66aaff, 0xccddff),   type: 'bear'  }, // blue bear
  { fn: () => makeChick(),                     type: 'chick' }, // another chick
  { fn: () => makeCat(0xee7766, 0xffccbb),    type: 'cat'   }, // red-orange cat
];

export class Prize {
  constructor(scene, world, pos, defIndex) {
    this.scene   = scene;
    this.world   = world;
    this.grabbed = false;
    this.won     = false;

    this.mesh = PRIZE_DEFS[defIndex].fn();
    scene.add(this.mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setLinearDamping(0.75)
      .setAngularDamping(0.75)
      .setTranslation(pos.x, pos.y, pos.z);
    this.body = world.createRigidBody(bodyDesc);

    // Prize group 0x0002 filters out arm group 0x0004 so arms pass through prizes.
    const PRIZE_GROUPS = ((0xFFFF & ~0x0004) << 16) | 0x0002; // filter=0xFFFB, member=0x0002

    const shapes = COLLIDER_SHAPES[PRIZE_DEFS[defIndex].type];
    this.colliderShapes = shapes;  // kept for debug visualisation
    this.colliders = shapes.map(s =>
      world.createCollider(
        RAPIER.ColliderDesc.ball(s.r)
          .setTranslation(s.x, s.y, s.z)
          .setMass(s.mass)
          .setFriction(0.7)
          .setRestitution(0.3)
          .setCollisionGroups(PRIZE_GROUPS),
        this.body
      )
    );
  }

  setCollidersEnabled(enabled) {
    this.colliders.forEach(c => c.setEnabled(enabled));
  }

  syncMesh() {
    if (this.grabbed) return;
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.mesh.position.set(pos.x, pos.y, pos.z);
    this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  remove() {
    this.scene.remove(this.mesh);
    this.world.removeRigidBody(this.body);
  }
}

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { m } from '../../utils/materials.js';
import { CASE_W, CASE_D, CASE_H, CLAW_MAX_Y, DROP_X, DROP_Z } from '../../constants.js';

export class Crane {
  constructor(scene, world) {
    this.craneX    = DROP_X;
    this.craneZ    = DROP_Z;
    this.clawY     = CLAW_MAX_Y;
    this.clawOpenT = 1;
    this.clawPivots = [];

    this._build(scene);
    this._buildPhysics(world);
    this.sync();
  }

  // Dynamic sphere: prizes (mass 2.5) are much heavier so they can stop and tilt
  // the claw. A spring force drives it toward the intended position — prizes resist
  // that force, causing the claw to slow, stop, and rotate on contact.
  _buildPhysics(world) {
    this.clawBody = new CANNON.Body({ mass: 0.5 });
    this.clawBody.addShape(new CANNON.Sphere(0.22));
    this.clawBody.linearDamping  = 0.05;
    this.clawBody.angularDamping = 0.95;
    this.clawBody.allowSleep     = false;
    this.clawBody.position.set(DROP_X, CLAW_MAX_Y, DROP_Z);
    world.addBody(this.clawBody);
  }

  // Apply a PD spring force toward the target position before each physics step.
  // The spring is strong enough to follow normal crane movement but prizes (20×
  // heavier) can resist it — the claw body stops and tilts naturally.
  drivePhysics() {
    const K = 500, D = 25;
    this.clawBody.applyForce(new CANNON.Vec3(
      K * (this.craneX - this.clawBody.position.x) - D * this.clawBody.velocity.x,
      K * (this.clawY  - this.clawBody.position.y) - D * this.clawBody.velocity.y,
      K * (this.craneZ - this.clawBody.position.z) - D * this.clawBody.velocity.z
    ));
    // Rotational spring: restore claw to upright (identity quaternion).
    // q.xyz encodes angular displacement from identity; torque drives it back to zero.
    const q  = this.clawBody.quaternion;
    const av = this.clawBody.angularVelocity;
    const Kr = 10, Dr = 0.3;
    this.clawBody.applyTorque(new CANNON.Vec3(
      -Kr * q.x - Dr * av.x,
      -Kr * q.y - Dr * av.y,
      -Kr * q.z - Dr * av.z
    ));
  }

  _build(scene) {
    const metalMat = m(0x999aaa, 0.3, 0.25);
    const darkMat2 = m(0x444455, 0.5, 0.15);

    // X-axis fixed rail
    const railX = new THREE.Mesh(new THREE.BoxGeometry(CASE_W+0.15, 0.1, 0.1), metalMat);
    railX.position.set(0, CASE_H - 0.12, 0); scene.add(railX);

    // Z-axis trolley rail (slides along X)
    this.railZ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, CASE_D), metalMat);
    scene.add(this.railZ);

    // Trolley block
    this.trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), darkMat2);
    scene.add(this.trolley);

    // Cable mesh (scaled each frame)
    this.cableMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1, 7),
      m(0x888899, 0.4, 0.2)
    );
    scene.add(this.cableMesh);

    // Claw group
    this.clawGroup = new THREE.Group();
    scene.add(this.clawGroup);
    this._buildClaw();
  }

  _buildClaw() {
    const clawMat = m(0xccccdd, 0.2, 0.35);

    // Central hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.16, 14), clawMat);
    this.clawGroup.add(hub);

    // Reinforcement ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 20), clawMat);
    ring.position.y = -0.04; this.clawGroup.add(ring);

    // 4 arms (N/E/S/W)
    this.clawPivots = [];
    for (let i=0; i<4; i++) {
      const theta = (i/4) * Math.PI * 2;
      const outer = new THREE.Group();
      outer.rotation.y = theta;
      outer.position.set(Math.sin(theta)*0.1, -0.08, Math.cos(theta)*0.1);
      this.clawGroup.add(outer);

      const inner = new THREE.Group();
      outer.add(inner);
      this.clawPivots.push(inner);

      // Arm shaft
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.065), clawMat);
      shaft.position.y = -0.22; inner.add(shaft);

      // Fingertip hook
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.04, 0.13, 8), clawMat);
      tip.position.y = -0.465; tip.rotation.x = 0.42; inner.add(tip);
    }
    this.applyClawOpen(this.clawOpenT);
  }

  applyClawOpen(t) {
    this.clawOpenT = t;
    const OPEN  = -Math.PI / 3.0;
    const CLOSE =  Math.PI / 12;
    const angle = THREE.MathUtils.lerp(CLOSE, OPEN, t);
    this.clawPivots.forEach(p => { p.rotation.x = angle; });
  }

  sync() {
    // Rail and trolley follow the intended (control) position
    this.trolley.position.set(this.craneX, CASE_H - 0.10, this.craneZ);
    this.railZ.position.set(this.craneX, CASE_H - 0.12, 0);

    // Cable stretches to wherever the physics body actually ended up
    const topY   = CASE_H - 0.10;
    const actualY = this.clawBody.position.y;
    const len     = Math.max(0.01, topY - actualY);
    this.cableMesh.scale.y = len;
    this.cableMesh.position.set(this.craneX, actualY + len / 2, this.craneZ);

    // Claw group: real physics position + rotation (shows tilt on prize contact)
    this.clawGroup.position.copy(this.clawBody.position);
    this.clawGroup.quaternion.set(
      this.clawBody.quaternion.x,
      this.clawBody.quaternion.y,
      this.clawBody.quaternion.z,
      this.clawBody.quaternion.w
    );
  }
}

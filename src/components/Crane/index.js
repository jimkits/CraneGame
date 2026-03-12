import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { m } from '../../utils/materials.js';
import { CASE_W, CASE_D, CASE_H, CLAW_MAX_Y, DROP_X, DROP_Z } from '../../constants.js';

// Arm segments in inner (pivot) local space: lx=0, (ay,az)=start, (by,bz)=end
// Segment 0: straight bracket (y=0 to y=-0.28)
// Segment 1: upper curve  (y=-0.28 to y=-0.70, sweeps out to z=0.29)
// Segment 2: lower curve  (y=-0.70 to y=-0.93, curves back to z=0.03)
export const ARM_SEGS = [
  { ay: 0,     az: 0,    by: -0.28, bz: 0,    r: 0.030 },
  { ay: -0.28, az: 0,    by: -0.70, bz: 0.29, r: 0.028 },
  { ay: -0.70, az: 0.29, by: -0.93, bz: 0.03, r: 0.028 },
];

export class Crane {
  constructor(scene, world) {
    this.craneX    = DROP_X;
    this.craneZ    = DROP_Z;
    this.clawY     = CLAW_MAX_Y;
    this.clawOpenT = 1;
    this.clawPivots = [];
    this.clawTiltQ = new THREE.Quaternion();

    this._build(scene);
    this._buildPhysics(world);
    this.sync();
  }

  // Kinematic body: position is set directly each step, no spring/sleep issues.
  _buildPhysics(world) {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(DROP_X, CLAW_MAX_Y, DROP_Z);
    this.clawBody = world.createRigidBody(bodyDesc);

    // Central housing cylinder — collides with prizes; used for contact/grab detection.
    this.housingCollider = world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.175, 0.13).setFriction(0.4).setRestitution(0.05),
      this.clawBody
    );

    // Collision groups: arms belong to group 0x0004 and filter out prize group 0x0002.
    // Prizes belong to group 0x0002 and filter out arm group 0x0004 (set in Prize).
    // This lets arms pass through prizes while the housing still contacts them.
    const ARM_GROUPS = ((0xFFFF & ~0x0002) << 16) | 0x0004; // filter=0xFFFD, member=0x0004

    // 3 segments × 3 arms = 9 capsule colliders tracing the curved arm shape.
    // Index layout: armColliders[armIdx * ARM_SEGS.length + segIdx]
    this.armColliders = [];
    for (let i = 0; i < 3; i++) {
      for (const seg of ARM_SEGS) {
        const segLen = Math.sqrt((seg.by - seg.ay) ** 2 + (seg.bz - seg.az) ** 2);
        this.armColliders.push(world.createCollider(
          RAPIER.ColliderDesc.capsule(segLen / 2, seg.r)
            .setFriction(0.4).setRestitution(0.05)
            .setCollisionGroups(ARM_GROUPS),
          this.clawBody
        ));
      }
    }
  }

  drivePhysics() {
    this.clawBody.setNextKinematicTranslation({
      x: this.craneX,
      y: this.clawY,
      z: this.craneZ,
    });
    this.syncArmColliders();
  }

  // Recompute each arm capsule's translation/rotation relative to the claw body,
  // matching the current open/close angle of the visual arm pivots.
  // Each arm has ARM_SEGS.length capsule segments tracing the curved shape.
  syncArmColliders() {
    if (!this.armColliders?.length || !this.clawPivots.length) return;
    const angle = this.clawPivots[0].rotation.x;
    const cosA  = Math.cos(angle), sinA = Math.sin(angle);
    const _yAxis = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 3; i++) {
      const theta = (i / 3) * Math.PI * 2;
      const sinT  = Math.sin(theta), cosT = Math.cos(theta);

      for (let s = 0; s < ARM_SEGS.length; s++) {
        const seg = ARM_SEGS[s];

        // Midpoint in inner (pivot) local space (lx always 0)
        const mly = (seg.ay + seg.by) * 0.5;
        const mlz = (seg.az + seg.bz) * 0.5;

        // Apply inner X-rotation → outer Y-rotation + outer group translation.
        // outer position = (sin(theta)*0.13, 0.09, cos(theta)*0.13) in body space.
        const py_rot  = mly * cosA - mlz * sinA;
        const pz_rot  = mly * sinA + mlz * cosA;
        const cx = sinT * (pz_rot + 0.13);
        const cy = py_rot + 0.09;
        const cz = cosT * (pz_rot + 0.13);

        // Segment direction in inner space, normalised
        const dly = seg.by - seg.ay;
        const dlz = seg.bz - seg.az;
        const segLen = Math.sqrt(dly * dly + dlz * dlz);
        const udy = dly / segLen, udz = dlz / segLen;

        // Rotate direction through inner X-rotation then outer Y-rotation
        const bdy = udy * cosA - udz * sinA;
        const bdz = udy * sinA + udz * cosA;
        const armAxis = new THREE.Vector3(sinT * bdz, bdy, cosT * bdz);

        const q = new THREE.Quaternion().setFromUnitVectors(_yAxis, armAxis);
        const collider = this.armColliders[i * ARM_SEGS.length + s];
        collider.setTranslationWrtParent({ x: cx, y: cy, z: cz });
        collider.setRotationWrtParent({ x: q.x, y: q.y, z: q.z, w: q.w });
      }
    }
  }

  _build(scene) {
    const chromeMat  = m(0xccccdd, 0.15, 0.85);
    const steelMat   = m(0x8899aa, 0.35, 0.45);
    const housingMat = m(0x1e2d4a, 0.60, 0.20);
    const drumMat    = m(0x111122, 0.70, 0.10);

    const iY = CASE_H - 0.12;  // rail centerline Y

    // ── Two fixed side rails — run front-to-back (Z) at left/right edges ──
    [-CASE_W / 2, CASE_W / 2].forEach(rx => {
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, CASE_D), steelMat);
      web.position.set(rx, iY, 0); scene.add(web);
      [0.055, -0.055].forEach(dy => {
        const flange = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.022, CASE_D), steelMat);
        flange.position.set(rx, iY + dy, 0); scene.add(flange);
      });
    });

    // ── Bridge — spans full width (X), rides on side rails, moves in Z ──
    // Group origin at (0, iY, craneZ); updated in sync()
    this.bridge = new THREE.Group(); scene.add(this.bridge);
    const bWeb = new THREE.Mesh(new THREE.BoxGeometry(CASE_W + 0.05, 0.09, 0.07), steelMat);
    this.bridge.add(bWeb);
    [0.055, -0.055].forEach(dy => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(CASE_W + 0.05, 0.022, 0.19), steelMat);
      f.position.y = dy; this.bridge.add(f);
    });

    // ── Trolley housing — rides along bridge in X, claw hangs from it ──
    // Group origin at (craneX, iY, craneZ); updated in sync()
    this.trolley = new THREE.Group(); scene.add(this.trolley);

    // Main housing box — hangs below bridge rail
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.44), housingMat);
    housing.position.y = -0.20; this.trolley.add(housing);

    // Chrome top cap that sits flush on the bridge
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.46), chromeMat);
    cap.position.y = -0.03; this.trolley.add(cap);

    // Motor/winch drum (horizontal, axis along Z)
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.40, 14), drumMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.y = -0.15; this.trolley.add(drum);
    // Drum flanges
    [-0.16, 0.16].forEach(dz => {
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.022, 14), chromeMat);
      fl.rotation.x = Math.PI / 2;
      fl.position.set(0, -0.15, dz); this.trolley.add(fl);
    });

    // Cable guide/sheave at bottom center
    const sheave = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.016, 8, 18), chromeMat);
    sheave.rotation.x = Math.PI / 2;
    sheave.position.y = -0.385; this.trolley.add(sheave);

    // Roller wheels — ride on bridge I-beam (axis along Z so they roll in X)
    [-0.20, 0.20].forEach(dz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.055, 12), chromeMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.0, dz); this.trolley.add(wheel);
    });

    // ── Cable (single wire, scaled each frame) ──
    this.cableMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 6),
      m(0x666677, 0.5, 0.15)
    );
    scene.add(this.cableMesh);

    // ── Claw group ──
    this.clawGroup = new THREE.Group();
    scene.add(this.clawGroup);
    this._buildClaw();
  }

  _buildClaw() {
    const grayMat  = m(0x9a9a9a, 0.55, 0.20);
    const lightMat = m(0xbfbfbf, 0.45, 0.30);

    // ── Central motor housing (large cylinder) ──
    const mainCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.35, 16), grayMat);
    this.clawGroup.add(mainCyl);

    // Top mounting stub
    const topStub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), lightMat);
    topStub.position.y = 0.21; this.clawGroup.add(topStub);

    // Lower drive shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), grayMat);
    shaft.position.y = -0.27; this.clawGroup.add(shaft);

    // Triangular arm-mount plates (upper + lower) — CylinderGeometry(r,r,h,3) = triangle
    const triA = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 3), lightMat);
    triA.position.y = 0.09; this.clawGroup.add(triA);
    const triB = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 3), lightMat);
    triB.position.y = -0.07; this.clawGroup.add(triB);

    // Decorative coiled cable/spring on one side of the body
    const helixPts = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const a = t * 5 * Math.PI * 2;
      helixPts.push(new THREE.Vector3(0.13 + 0.05 * Math.cos(a), 0.20 - t * 0.34, 0.05 * Math.sin(a)));
    }
    const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 80, 0.012, 6, false);
    this.clawGroup.add(new THREE.Mesh(coilGeo, m(0x222222, 0.8)));

    // ── 3 curved arms ──
    this.clawPivots = [];
    for (let i = 0; i < 3; i++) {
      const theta = (i / 3) * Math.PI * 2;
      const outer = new THREE.Group();
      outer.rotation.y = theta;
      outer.position.set(Math.sin(theta) * 0.13, 0.09, Math.cos(theta) * 0.13);
      this.clawGroup.add(outer);

      const inner = new THREE.Group();
      outer.add(inner);
      this.clawPivots.push(inner);

      // Pivot axle bolt (horizontal cylinder, tangent to body)
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.078, 10), lightMat);
      bolt.rotation.z = Math.PI / 2; inner.add(bolt);

      // Upper bracket (straight rigid link)
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.28, 0.050), grayMat);
      bracket.position.y = -0.14; inner.add(bracket);

      // Elbow bolt
      const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.068, 10), lightMat);
      elbow.rotation.z = Math.PI / 2;
      elbow.position.y = -0.28; inner.add(elbow);

      // Curved finger — TubeGeometry along a Catmull-Rom curve.
      // Local space: +Z = radially outward, -Y = downward.
      const pts = [
        new THREE.Vector3(0, -0.28, 0.00),
        new THREE.Vector3(0, -0.36, 0.05),
        new THREE.Vector3(0, -0.48, 0.16),
        new THREE.Vector3(0, -0.60, 0.26),
        new THREE.Vector3(0, -0.70, 0.29),  // widest point
        new THREE.Vector3(0, -0.80, 0.24),
        new THREE.Vector3(0, -0.88, 0.13),
        new THREE.Vector3(0, -0.93, 0.03),  // tip
      ];
      const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.026, 8, false);
      inner.add(new THREE.Mesh(tubeGeo, grayMat));

      // Spade tip
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.018, 0.06, 8), lightMat);
      tip.position.set(0, -0.955, 0.03); inner.add(tip);
    }
    this.applyClawOpen(this.clawOpenT);
  }

  // Returns the inner-face radial distance of the arm at the elbow (start of last segment)
  // relative to the claw center XZ. Add a prize's torso radius to get the catch threshold.
  getArmCatchRadius() {
    if (!this.clawPivots.length) return 0.13;
    const angle  = this.clawPivots[0].rotation.x;
    const elbow  = ARM_SEGS[ARM_SEGS.length - 1]; // start point of last segment = the elbow
    // Rotate elbow's (ay, az) by inner X rotation; extract the Z (radial) component.
    const pz = elbow.ay * Math.sin(angle) + elbow.az * Math.cos(angle);
    return pz + 0.13 - elbow.r; // pivot_radius + z_rot - capsule_radius
  }

  // Returns the minimum clawY at which any arm tip would contact the prize-area floor.
  // Computed dynamically from the current arm pivot angle so it's accurate for both
  // open (arms splayed) and closed (arms tucked) positions.
  getMinClawY(floorY = 0.06) {
    if (!this.clawPivots.length) return 0.90;
    const angle   = this.clawPivots[0].rotation.x;
    const lastSeg = ARM_SEGS[ARM_SEGS.length - 1];
    // Tip endpoint rotated through inner X rotation; Y component in body space:
    const py       = lastSeg.by * Math.cos(angle) - lastSeg.bz * Math.sin(angle);
    const tipBodyY = py + 0.09; // 0.09 = outer-group Y offset
    return floorY + lastSeg.r - tipBodyY;
  }

  applyClawOpen(t) {
    this.clawOpenT = t;
    const OPEN  = -0.50;   // arms splayed wide
    const CLOSE = +0.35;   // arms pulled in to grip
    const angle = THREE.MathUtils.lerp(CLOSE, OPEN, t);
    this.clawPivots.forEach(p => { p.rotation.x = angle; });
  }

  sync() {
    const iY = CASE_H - 0.12;

    // Bridge moves front-to-back (Z) along fixed side rails
    this.bridge.position.set(0, iY, this.craneZ);

    // Trolley moves left-right (X) along the bridge
    this.trolley.position.set(this.craneX, iY, this.craneZ);

    // Cable exits from sheave at trolley bottom
    const topY = iY - 0.39;
    const len  = Math.max(0.01, topY - this.clawY);
    this.cableMesh.scale.y = len;
    this.cableMesh.position.set(this.craneX, this.clawY + len / 2, this.craneZ);

    this.clawGroup.position.set(this.craneX, this.clawY, this.craneZ);
    this.clawGroup.quaternion.copy(this.clawTiltQ);
  }
}

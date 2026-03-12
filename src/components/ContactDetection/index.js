import * as THREE from 'three';

// Runs every frame during DROPPING state.
// Sets game.craneInContact and tilts the claw toward the nearest touched prize.
export function updateCraneContact(game) {
  const cx = game.crane.craneX, cz = game.crane.craneZ;
  let inContact = false, bestPrize = null, bestHDx = 0, bestHDz = 0, bestHD2 = Infinity;

  game.prizes.forEach(p => {
    if (p.grabbed || p.won) return;
    let hit = false;
    for (const pc of p.colliders) {
      game.world.contactPair(game.crane.housingCollider, pc, () => { hit = true; });
      if (hit) break;
    }
    if (!hit) return;
    inContact = true;
    const pos = p.body.translation();
    const hdx = pos.x - cx, hdz = pos.z - cz;
    const hd2 = hdx * hdx + hdz * hdz;
    if (hd2 < bestHD2) { bestHD2 = hd2; bestHDx = hdx; bestHDz = hdz; bestPrize = p; }
  });

  game.craneInContact = inContact;

  // Tilt toward the nearest contacted prize
  const targetQ = new THREE.Quaternion();
  const hlen = Math.sqrt(bestHD2 < Infinity ? bestHD2 : 0);
  if (inContact && hlen > 0.03) {
    const axis = new THREE.Vector3(-bestHDz / hlen, 0, bestHDx / hlen);
    targetQ.setFromAxisAngle(axis, Math.PI / 8);
  }
  game.crane.clawTiltQ.slerp(targetQ, 0.3);
}

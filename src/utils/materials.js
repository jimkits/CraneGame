import * as THREE from 'three';

export const m = (color, rough = 0.9, metal = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

export const emissive = (color, intensity = 2) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });

export function castAll(group) {
  group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
}

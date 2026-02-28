'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ShadingMode } from './Scene';

interface DefaultModelProps {
  wireframe: boolean;
  shadingMode: ShadingMode;
}

export default function DefaultModel({ wireframe, shadingMode }: DefaultModelProps) {
  const { scene } = useGLTF('/models/DamagedHelmet.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Apply shading overrides
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (shadingMode === 'pbr') {
      // Restore original if needed — GLTF loader handles this
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        if ('wireframe' in m) (m as any).wireframe = wireframe;
        if ((m as THREE.MeshStandardMaterial).envMapIntensity !== undefined) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 1.5;
        }
        m.needsUpdate = true;
      });
    }
  });

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.1, 0, 0]} scale={1.8} position={[0, 0.1, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/DamagedHelmet.glb');

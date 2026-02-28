'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ShadingMode } from './Scene';

interface DefaultModelProps {
  wireframe: boolean;
  shadingMode: ShadingMode;
  modelPath?: string;
}

export default function DefaultModel({ wireframe, shadingMode, modelPath = '/models/DamagedHelmet.glb' }: DefaultModelProps) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);

  // Auto-center and scale model
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.set(-center.x * scale, -center.y * scale + 0.1, -center.z * scale);
    }
  }, [scene]);

  // Apply shading overrides
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (shadingMode === 'pbr') {
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
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

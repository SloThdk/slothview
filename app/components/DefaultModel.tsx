'use client';

import { useRef, useEffect, useMemo } from 'react';
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
  const { scene: originalScene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Clone scene so we never mutate the GLTF cache
  const scene = useMemo(() => {
    const cloned = originalScene.clone(true);
    // Deep-clone materials so each instance is independent
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
      }
    });
    return cloned;
  }, [originalScene]);

  // Procedural matcap
  const matcapTex = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size * 0.45, size * 0.35, 0, size * 0.5, size * 0.5, size * 0.55);
    g.addColorStop(0, '#e8e8f0'); g.addColorStop(0.3, '#b0b0c0'); g.addColorStop(0.6, '#707088'); g.addColorStop(1, '#282838');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Auto-center/scale + store original materials
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

    // Store originals
    const matMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        matMap.set(mesh, Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone());
      }
    });
    originalMaterials.current = matMap;
  }, [scene]);

  // Apply shading mode
  useEffect(() => {
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const orig = originalMaterials.current.get(mesh);

      if (shadingMode === 'pbr' && orig) {
        mesh.material = Array.isArray(orig) ? orig.map(m => m.clone()) : orig.clone();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
          if ('wireframe' in m) (m as any).wireframe = wireframe;
          if ((m as THREE.MeshStandardMaterial).envMapIntensity !== undefined) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 1.5;
          }
          m.needsUpdate = true;
        });
      } else if (shadingMode === 'normals') {
        mesh.material = new THREE.MeshNormalMaterial({ wireframe, flatShading: false });
      } else if (shadingMode === 'matcap') {
        const mcMat = new THREE.MeshMatcapMaterial({ matcap: matcapTex });
        (mcMat as any).wireframe = wireframe;
        mesh.material = mcMat;
      } else if (shadingMode === 'unlit') {
        const origMat = orig ? (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial : null;
        mesh.material = new THREE.MeshBasicMaterial({ color: origMat?.color || '#888', wireframe, map: origMat?.map || null });
      } else if (shadingMode === 'wireframe') {
        const origMat = orig ? (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial : null;
        mesh.material = new THREE.MeshBasicMaterial({ color: origMat?.color || '#888', wireframe: true });
      }
    });
  }, [scene, shadingMode, wireframe, matcapTex]);

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

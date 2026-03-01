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
  overrideColor: string | null;
  disableFloat?: boolean;
}

export default function DefaultModel({ wireframe, shadingMode, modelPath = '/models/DamagedHelmet.glb', overrideColor, disableFloat }: DefaultModelProps) {
  const { scene: originalScene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);

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

  // 3-step cel-shading gradient ramp: shadow → midtone → highlight
  // NearestFilter = hard step transitions — the signature toon/cel-shaded look
  // This is what separates MeshToonMaterial from MeshBasicMaterial (unlit)
  const toonGradient = useMemo(() => {
    const data = new Uint8Array([
      30,  30,  30,  255,  // shadow  — dark areas (~12% brightness)
      140, 140, 140, 255,  // midtone — mid-lit areas (~55% brightness)
      255, 255, 255, 255,  // highlight — fully lit areas (100% material color)
    ]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; // CRITICAL: NearestFilter = hard step, not smooth gradient
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Clone scene and apply shading mode immediately
  const scene = useMemo(() => {
    const cloned = originalScene.clone(true);

    // Deep-clone materials first
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

    // Apply shading mode
    cloned.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (shadingMode === 'pbr') {
        if (overrideColor) {
          mesh.material = new THREE.MeshStandardMaterial({ color: overrideColor, roughness: 0.4, metalness: 0.1, envMapIntensity: 1.5 });
        } else {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(m => {
            if ((m as THREE.MeshStandardMaterial).envMapIntensity !== undefined) {
              (m as THREE.MeshStandardMaterial).envMapIntensity = 1.5;
            }
            m.needsUpdate = true;
          });
        }
      } else if (shadingMode === 'normals') {
        mesh.material = new THREE.MeshNormalMaterial({ flatShading: false });
      } else if (shadingMode === 'matcap') {
        mesh.material = new THREE.MeshMatcapMaterial({ matcap: matcapTex });
      } else if (shadingMode === 'unlit') {
        const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshBasicMaterial({ color: origMat?.color || '#888', map: origMat?.map || null });
      } else if (shadingMode === 'wireframe') {
        mesh.material = new THREE.MeshBasicMaterial({ color: '#e0e0e0', wireframe: true, opacity: 0.9, transparent: true });
      } else if (shadingMode === 'toon') {
        const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshToonMaterial({
          color: overrideColor ? new THREE.Color(overrideColor) : (origMat?.color ?? new THREE.Color('#cccccc')),
          map: origMat?.map ?? null,
          normalMap: origMat?.normalMap ?? null, // Preserve normal map for surface detail
          gradientMap: toonGradient,             // 3-step ramp — THIS is what makes it cel-shaded
        });
      }
    });

    return cloned;
  }, [originalScene, shadingMode, matcapTex, overrideColor, toonGradient]);

  // Store the centered base Y so floating animation adds ON TOP of centering (not replaces it)
  const baseY = useRef(0);

  // Auto-center/scale
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    if (groupRef.current) {
      const centeredY = -center.y * scale;
      baseY.current = centeredY;
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.set(-center.x * scale, centeredY, -center.z * scale);
    }
  }, [scene]);

  useFrame((state) => {
    if (groupRef.current) {
      // Float animation — disabled in camera view to prevent visual bounce
      groupRef.current.position.y = disableFloat
        ? baseY.current
        : baseY.current + Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { ShadingMode } from './Scene';

interface UserModelProps {
  file: File;
  wireframe: boolean;
  shadingMode: ShadingMode;
  overrideColor: string | null;
  disableFloat?: boolean;
}

export default function UserModel({ file, wireframe, shadingMode, overrideColor, disableFloat }: UserModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);

  // 3-step cel-shading gradient ramp: shadow → midtone → highlight (NearestFilter = hard steps)
  const toonGradient = useMemo(() => {
    const data = new Uint8Array([
      30,  30,  30,  255,
      140, 140, 140, 255,
      255, 255, 255, 255,
    ]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

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

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const processModel = (obj: THREE.Object3D) => {
      const group = obj instanceof THREE.Group ? obj : new THREE.Group().add(obj);
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.5 / maxDim;
      group.scale.setScalar(scale);
      group.position.sub(center.multiplyScalar(scale));

      // Apply shading mode on load
      group.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (shadingMode === 'pbr') {
          if (overrideColor) {
            mesh.material = new THREE.MeshStandardMaterial({ color: overrideColor, roughness: 0.4, metalness: 0.1, envMapIntensity: 1.2 });
          } else {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(mat => {
              if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.2;
                mat.needsUpdate = true;
              }
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
            normalMap: origMat?.normalMap ?? null,
            gradientMap: toonGradient,
          });
        }
      });

      setModel(group);
    };

    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      loader.load(url, (gltf) => processModel(gltf.scene.clone(true)), undefined, console.error);
    } else if (ext === 'fbx') {
      new FBXLoader().load(url, processModel, undefined, console.error);
    } else if (ext === 'obj') {
      new OBJLoader().load(url, processModel, undefined, console.error);
    }

    return () => URL.revokeObjectURL(url);
  }, [file, shadingMode, matcapTex, toonGradient, overrideColor]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = disableFloat ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.02;
    }
  });

  if (!model) return null;
  return <group ref={groupRef}><primitive object={model} /></group>;
}

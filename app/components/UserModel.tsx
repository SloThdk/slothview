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
}

export default function UserModel({ file, wireframe, shadingMode }: UserModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

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

      const matMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          matMap.set(mesh, Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone());
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(mat => {
            if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.2;
              mat.needsUpdate = true;
            }
          });
        }
      });
      originalMaterials.current = matMap;
      setModel(group);
    };

    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      loader.load(url, (gltf) => processModel(gltf.scene), undefined, console.error);
    } else if (ext === 'fbx') {
      new FBXLoader().load(url, processModel, undefined, console.error);
    } else if (ext === 'obj') {
      new OBJLoader().load(url, processModel, undefined, console.error);
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Apply shading mode
  useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const orig = originalMaterials.current.get(mesh);

      if (shadingMode === 'pbr' && orig) {
        mesh.material = Array.isArray(orig) ? orig.map(m => m.clone()) : orig.clone();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => { if ('wireframe' in m) (m as any).wireframe = wireframe; m.needsUpdate = true; });
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
  }, [model, shadingMode, wireframe, matcapTex]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.02;
  });

  if (!model) return null;
  return <group ref={groupRef}><primitive object={model} /></group>;
}

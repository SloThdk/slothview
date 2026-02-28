'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface UserModelProps {
  file: File;
  wireframe: boolean;
}

export default function UserModel({ file, wireframe }: UserModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const processModel = (obj: THREE.Object3D) => {
      const group = obj instanceof THREE.Group ? obj : new THREE.Group().add(obj);
      
      // Center and scale
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.5 / maxDim;
      group.scale.setScalar(scale);
      group.position.sub(center.multiplyScalar(scale));

      // Store original materials and enable shadows
      const matMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          // Store original material reference
          matMap.set(mesh, mesh.material);
          // Enhance material quality
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(mat => {
              if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const stdMat = mat as THREE.MeshStandardMaterial;
                stdMat.envMapIntensity = 1.2;
                stdMat.needsUpdate = true;
              }
            });
          }
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
      loader.load(url, (gltf) => processModel(gltf.scene), undefined, (err) => console.error('GLTF load error:', err));
    } else if (ext === 'fbx') {
      new FBXLoader().load(url, processModel, undefined, (err) => console.error('FBX load error:', err));
    } else if (ext === 'obj') {
      new OBJLoader().load(url, processModel, undefined, (err) => console.error('OBJ load error:', err));
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Toggle wireframe on original materials
  useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
          if (mat && 'wireframe' in mat) {
            (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
            (mat as THREE.MeshStandardMaterial).needsUpdate = true;
          }
        });
      }
    });
  }, [model, wireframe]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.03;
    }
  });

  if (!model) return null;

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

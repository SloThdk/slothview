'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface UserModelProps {
  file: File;
  wireframe: boolean;
}

export default function UserModel({ file, wireframe }: UserModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const onLoad = (obj: THREE.Group | THREE.Object3D) => {
      const group = obj instanceof THREE.Group ? obj : new THREE.Group().add(obj);
      
      // Center and scale to fit
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.5 / maxDim;
      group.scale.setScalar(scale);
      group.position.sub(center.multiplyScalar(scale));

      // Enable shadows
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      setModel(group);

      // Adjust camera
      (camera as THREE.PerspectiveCamera).position.set(3, 2, 5);
      (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
    };

    const onError = (err: unknown) => {
      console.error('Model load error:', err);
    };

    if (ext === 'glb' || ext === 'gltf') {
      new GLTFLoader().load(url, (gltf) => onLoad(gltf.scene), undefined, onError);
    } else if (ext === 'fbx') {
      new FBXLoader().load(url, onLoad, undefined, onError);
    } else if (ext === 'obj') {
      new OBJLoader().load(url, onLoad, undefined, onError);
    }

    return () => URL.revokeObjectURL(url);
  }, [file, camera]);

  useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.wireframe !== undefined) mat.wireframe = wireframe;
        }
      }
    });
  }, [model, wireframe]);

  useFrame((state) => {
    // Gentle float
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  if (!model) return null;

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

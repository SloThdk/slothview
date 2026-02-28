'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ProductProps {
  bodyColor: string;
  accentColor: string;
  baseColor: string;
  material: 'glossy' | 'matte' | 'metallic' | 'glass';
  exploded: boolean;
  wireframe: boolean;
}

export default function Product({ bodyColor, accentColor, baseColor, material, exploded, wireframe }: ProductProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.15;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.25;
      innerRingRef.current.rotation.x = Math.sin(t * 0.15) * 0.05;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.2;
      const scale = 1 + Math.sin(t * 1.5) * 0.015;
      coreRef.current.scale.setScalar(scale);
    }
  });

  const getMaterial = (color: string) => {
    const props: Record<string, unknown> = { color, wireframe };
    switch (material) {
      case 'glossy': return <meshPhysicalMaterial {...props} roughness={0.05} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.5} />;
      case 'matte': return <meshStandardMaterial {...props} roughness={0.85} metalness={0.02} />;
      case 'metallic': return <meshPhysicalMaterial {...props} roughness={0.12} metalness={1} clearcoat={0.3} envMapIntensity={2} />;
      case 'glass': return <meshPhysicalMaterial {...props} roughness={0} metalness={0} transmission={0.65} thickness={1.5} ior={1.5} clearcoat={1} envMapIntensity={1.8} />;
    }
  };

  const exp = exploded ? 1 : 0;

  const baseShape = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 1.2, h = 0.15, r = 0.08;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    return shape;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Base platform */}
      <mesh position={[0, -1.2 - exp * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[baseShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 8 }]} />
        {getMaterial(baseColor)}
      </mesh>

      {/* Main body */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.75, 2, 64, 1, false]} />
        {getMaterial(bodyColor)}
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 1.05 + exp * 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.1, 64]} />
        {getMaterial(bodyColor)}
      </mesh>

      {/* Accent ring - outer */}
      <mesh ref={ringRef} position={[0, 0.3 + exp * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.025, 16, 64]} />
        {getMaterial(accentColor)}
      </mesh>

      {/* Accent ring - inner */}
      <mesh ref={innerRingRef} position={[0, -0.2 - exp * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.015, 16, 64]} />
        {getMaterial(accentColor)}
      </mesh>

      {/* Driver spheres */}
      <mesh position={[0, 0.5 + exp * 0.4, 0.68]} castShadow>
        <sphereGeometry args={[0.18, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[0, 0.5 + exp * 0.4, -0.68]} castShadow>
        <sphereGeometry args={[0.18, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>

      {/* Side nodes */}
      <mesh position={[0.68, 0, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[-0.68, 0, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>

      {/* Core glow */}
      <mesh ref={coreRef} position={[0, 0.7 + exp * 0.8, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} roughness={0} metalness={0} transmission={0.5} wireframe={wireframe} />
      </mesh>

      {/* LED indicators */}
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.55, -0.85, Math.sin(angle) * 0.55]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={2} />
          </mesh>
        );
      })}

      {/* Volume ring */}
      <mesh position={[0, -0.6 - exp * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.04, 8, 64]} />
        {getMaterial(baseColor)}
      </mesh>
    </group>
  );
}

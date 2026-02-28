'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShadingMode } from './Scene';

interface ProductProps {
  bodyColor: string;
  accentColor: string;
  baseColor: string;
  material: 'glossy' | 'matte' | 'metallic' | 'glass';
  exploded: boolean;
  wireframe: boolean;
  shadingMode: ShadingMode;
}

/* ── Matcap texture (generated procedurally) ── */
function useMatcapTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size * 0.45, size * 0.35, 0, size * 0.5, size * 0.5, size * 0.55);
    gradient.addColorStop(0, '#e8e8f0');
    gradient.addColorStop(0.3, '#b0b0c0');
    gradient.addColorStop(0.6, '#707088');
    gradient.addColorStop(1, '#282838');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);
}

export default function Product({ bodyColor, accentColor, baseColor, material, exploded, wireframe, shadingMode }: ProductProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const matcapTex = useMatcapTexture();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.12;
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.2;
      innerRingRef.current.rotation.x = Math.sin(t * 0.12) * 0.04;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.15;
      coreRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.01);
    }
  });

  const getMaterial = (color: string) => {
    if (shadingMode === 'normals') return <meshNormalMaterial wireframe={wireframe} flatShading={false} />;
    if (shadingMode === 'matcap') return <meshMatcapMaterial matcap={matcapTex} {...({ wireframe } as any)} />;
    if (shadingMode === 'unlit') return <meshBasicMaterial color={color} wireframe={wireframe} />;

    const props: Record<string, unknown> = { color, wireframe };
    switch (material) {
      case 'glossy': return <meshPhysicalMaterial {...props} roughness={0.04} metalness={0.08} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.6} />;
      case 'matte': return <meshStandardMaterial {...props} roughness={0.88} metalness={0.02} />;
      case 'metallic': return <meshPhysicalMaterial {...props} roughness={0.1} metalness={1} clearcoat={0.25} envMapIntensity={2.2} />;
      case 'glass': return <meshPhysicalMaterial {...props} roughness={0} metalness={0} transmission={0.7} thickness={1.5} ior={1.5} clearcoat={1} envMapIntensity={1.8} />;
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
    <group>
      <mesh position={[0, -1.2 - exp * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[baseShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 8 }]} />
        {getMaterial(baseColor)}
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.75, 2, 64, 1, false]} />
        {getMaterial(bodyColor)}
      </mesh>
      <mesh position={[0, 1.05 + exp * 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.1, 64]} />
        {getMaterial(bodyColor)}
      </mesh>
      <mesh ref={ringRef} position={[0, 0.3 + exp * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.025, 16, 64]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh ref={innerRingRef} position={[0, -0.2 - exp * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.015, 16, 64]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[0, 0.5 + exp * 0.4, 0.68]} castShadow>
        <sphereGeometry args={[0.18, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[0, 0.5 + exp * 0.4, -0.68]} castShadow>
        <sphereGeometry args={[0.18, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[0.68, 0, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh position={[-0.68, 0, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        {getMaterial(accentColor)}
      </mesh>
      <mesh ref={coreRef} position={[0, 0.7 + exp * 0.8, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        {shadingMode === 'normals' ? <meshNormalMaterial wireframe={wireframe} /> :
         shadingMode === 'matcap' ? <meshMatcapMaterial matcap={matcapTex} {...({ wireframe } as any)} /> :
         <meshPhysicalMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} roughness={0} metalness={0} transmission={0.5} wireframe={wireframe} />}
      </mesh>
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.55, -0.85, Math.sin(angle) * 0.55]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            {shadingMode === 'normals' ? <meshNormalMaterial /> :
             <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} />}
          </mesh>
        );
      })}
      <mesh position={[0, -0.6 - exp * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.04, 8, 64]} />
        {getMaterial(baseColor)}
      </mesh>
    </group>
  );
}

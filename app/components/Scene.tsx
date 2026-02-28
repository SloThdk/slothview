'use client';

import { Suspense, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Grid, Stars } from '@react-three/drei';
import { WebGLRenderer } from 'three';
import Product from './Product';

interface Hotspot {
  position: [number, number, number];
  label: string;
  description: string;
}

const HOTSPOTS: Hotspot[] = [
  { position: [0, 0.75, 0.7], label: 'Hi-Fi Drivers', description: '40mm neodymium drivers with crystal-clear audio reproduction up to 40kHz.' },
  { position: [0.7, 0, 0.2], label: 'Touch Controls', description: 'Capacitive touch surface for volume, track skip, and voice assistant.' },
  { position: [0, -0.85, 0.55], label: 'LED Status', description: 'RGB indicator ring showing connection status, battery, and active mode.' },
  { position: [0, 1.1, 0], label: 'Acoustic Chamber', description: 'Sealed acoustic chamber with passive bass radiator for deep, rich lows.' },
  { position: [0, -1.2, 0], label: 'Weighted Base', description: 'Precision-machined aluminum base with anti-vibration dampening system.' },
];

interface SceneProps {
  bodyColor: string;
  accentColor: string;
  baseColor: string;
  material: 'glossy' | 'matte' | 'metallic' | 'glass';
  environment: string;
  exploded: boolean;
  wireframe: boolean;
  autoRotate: boolean;
  showHotspots: boolean;
  showGrid: boolean;
  activeHotspot: number | null;
  setActiveHotspot: (i: number | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function HotspotMarker({ hotspot, index, active, onClick }: { hotspot: Hotspot; index: number; active: boolean; onClick: () => void }) {
  return (
    <Html position={hotspot.position} center distanceFactor={5}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClick}
          style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: active ? '#6C63FF' : 'rgba(108,99,255,0.4)',
            border: '2px solid rgba(108,99,255,0.8)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: active ? 'none' : 'pulse 2s ease-in-out infinite',
            boxShadow: active ? '0 0 20px rgba(108,99,255,0.6)' : '0 0 10px rgba(108,99,255,0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{index + 1}</span>
        </button>
        {active && (
          <div style={{
            position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '10px', padding: '12px 16px', width: '220px',
            backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6C63FF', marginBottom: '4px' }}>{hotspot.label}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{hotspot.description}</div>
            <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '10px', height: '10px', background: 'rgba(10,10,14,0.95)', borderRight: '1px solid rgba(108,99,255,0.3)', borderBottom: '1px solid rgba(108,99,255,0.3)' }} />
          </div>
        )}
      </div>
    </Html>
  );
}

export default function Scene({ bodyColor, accentColor, baseColor, material, environment, exploded, wireframe, autoRotate, showHotspots, showGrid, activeHotspot, setActiveHotspot, canvasRef }: SceneProps) {
  const controlsRef = useRef(null);

  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    if (canvasRef) {
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement;
    }
  }, [canvasRef]);

  return (
    <Canvas
      shadows
      camera={{ position: [3, 2, 5], fov: 40 }}
      onCreated={handleCanvasCreated as any}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={2048} />
        <directionalLight position={[-3, 4, -5]} intensity={0.4} color="#8888ff" />
        <pointLight position={[0, 3, 0]} intensity={0.5} color={accentColor} />

        {/* Product */}
        <Product
          bodyColor={bodyColor}
          accentColor={accentColor}
          baseColor={baseColor}
          material={material}
          exploded={exploded}
          wireframe={wireframe}
        />

        {/* Hotspots */}
        {showHotspots && !exploded && HOTSPOTS.map((h, i) => (
          <HotspotMarker
            key={i}
            hotspot={h}
            index={i}
            active={activeHotspot === i}
            onClick={() => setActiveHotspot(activeHotspot === i ? null : i)}
          />
        ))}

        {/* Environment */}
        <Environment preset={environment as any} background={false} />

        {/* Floor */}
        <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={10} blur={2} far={4} />
        {showGrid && <Grid position={[0, -1.5, 0]} args={[20, 20]} cellColor="rgba(108,99,255,0.08)" sectionColor="rgba(108,99,255,0.15)" fadeDistance={15} infiniteGrid />}

        {/* Stars for dark env */}
        {environment === 'night' && <Stars radius={50} depth={50} count={1000} factor={3} fade speed={1} />}

        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enablePan={true}
          enableZoom={true}
          minDistance={2}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Suspense>
    </Canvas>
  );
}

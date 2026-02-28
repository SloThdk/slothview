'use client';

import { Suspense, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Grid } from '@react-three/drei';
import { WebGLRenderer } from 'three';
import Product from './Product';
import UserModel from './UserModel';

interface Hotspot {
  position: [number, number, number];
  label: string;
  description: string;
}

const HOTSPOTS: Hotspot[] = [
  { position: [0, 0.75, 0.7], label: 'Hi-Fi Drivers', description: '40mm neodymium drivers with crystal-clear audio reproduction up to 40kHz.' },
  { position: [0.7, 0, 0.2], label: 'Touch Controls', description: 'Capacitive touch surface for volume, track skip, and voice assistant.' },
  { position: [0, -0.85, 0.55], label: 'LED Status Ring', description: 'RGB indicator ring showing connection status, battery level, and active mode.' },
  { position: [0, 1.1, 0], label: 'Acoustic Chamber', description: 'Sealed acoustic chamber with passive bass radiator for deep, rich lows.' },
  { position: [0, -1.2, 0], label: 'Weighted Base', description: 'Precision-machined aluminum base with anti-vibration dampening.' },
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
  autoRotateSpeed: number;
  showHotspots: boolean;
  showGrid: boolean;
  activeHotspot: number | null;
  setActiveHotspot: (i: number | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  glRef: React.RefObject<WebGLRenderer | null>;
  lightIntensity: number;
  lightAngle: number;
  ambientIntensity: number;
  userFile: File | null;
}

function HotspotMarker({ hotspot, index, active, onClick }: { hotspot: Hotspot; index: number; active: boolean; onClick: () => void }) {
  return (
    <Html position={hotspot.position} center distanceFactor={5}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClick}
          style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: active ? '#6C63FF' : 'rgba(108,99,255,0.35)',
            border: '2px solid rgba(108,99,255,0.7)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: active ? 'none' : 'pulse 2.5s ease-in-out infinite',
            boxShadow: active ? '0 0 16px rgba(108,99,255,0.5)' : '0 0 8px rgba(108,99,255,0.2)',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>{index + 1}</span>
        </button>
        {active && (
          <div style={{
            position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(108,99,255,0.25)',
            borderRadius: '10px', padding: '12px 16px', width: '200px',
            backdropFilter: 'blur(16px)', animation: 'fadeIn 0.2s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6C63FF', marginBottom: '4px', letterSpacing: '0.02em' }}>{hotspot.label}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{hotspot.description}</div>
            <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(10,10,14,0.95)', borderRight: '1px solid rgba(108,99,255,0.25)', borderBottom: '1px solid rgba(108,99,255,0.25)' }} />
          </div>
        )}
      </div>
    </Html>
  );
}

export default function Scene(props: SceneProps) {
  const { bodyColor, accentColor, baseColor, material, environment, exploded, wireframe, autoRotate, autoRotateSpeed, showHotspots, showGrid, activeHotspot, setActiveHotspot, canvasRef, glRef, lightIntensity, lightAngle, ambientIntensity, userFile } = props;

  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    if (canvasRef) {
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement;
    }
    if (glRef) {
      (glRef as React.MutableRefObject<WebGLRenderer | null>).current = gl;
    }
    gl.toneMapping = 6; // ACESFilmicToneMapping
    gl.toneMappingExposure = 1.15;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = 2; // PCFSoftShadowMap
  }, [canvasRef, glRef]);

  const lightX = Math.cos(lightAngle * Math.PI / 180) * 6;
  const lightZ = Math.sin(lightAngle * Math.PI / 180) * 6;

  return (
    <Canvas
      shadows
      camera={{ position: [3, 2, 5], fov: 40 }}
      onCreated={handleCanvasCreated as any}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[lightX, 8, lightZ]} intensity={lightIntensity} castShadow shadow-mapSize={2048} shadow-bias={-0.001} />
        <directionalLight position={[-lightX, 4, -lightZ]} intensity={lightIntensity * 0.25} color="#8888ff" />
        <pointLight position={[0, 3, 0]} intensity={0.35} color={accentColor} distance={8} />
        <hemisphereLight args={['#b1e1ff', '#b97a20', 0.2]} />

        {userFile ? (
          <UserModel file={userFile} wireframe={wireframe} />
        ) : (
          <>
            <Product bodyColor={bodyColor} accentColor={accentColor} baseColor={baseColor} material={material} exploded={exploded} wireframe={wireframe} />
            {showHotspots && !exploded && HOTSPOTS.map((h, i) => (
              <HotspotMarker key={i} hotspot={h} index={i} active={activeHotspot === i} onClick={() => setActiveHotspot(activeHotspot === i ? null : i)} />
            ))}
          </>
        )}

        <Environment preset={environment as any} background={false} />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.35} scale={10} blur={2.5} far={4} />
        {showGrid && <Grid position={[0, -1.5, 0]} args={[20, 20]} cellColor="rgba(108,99,255,0.05)" sectionColor="rgba(108,99,255,0.1)" fadeDistance={15} infiniteGrid />}

        {/* Industry-standard orbit: LMB rotate, MMB pan, scroll zoom */}
        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          enablePan={true}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.8}
          panSpeed={0.6}
          zoomSpeed={1.0}
          minDistance={1.5}
          maxDistance={15}
          maxPolarAngle={Math.PI * 0.85}
          mouseButtons={{ LEFT: 0, MIDDLE: 2, RIGHT: 2 }}
        />
      </Suspense>
    </Canvas>
  );
}

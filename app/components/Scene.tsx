'use client';

import { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Grid, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { WebGLRenderer, MathUtils, EquirectangularReflectionMapping } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Product from './Product';
import DefaultModel from './DefaultModel';
import UserModel from './UserModel';

/* Custom HDRI from blob URL */
function CustomHDRI({ url, background }: { url: string; background: boolean }) {
  const { scene, gl } = useThree();
  useEffect(() => {
    const loader = new RGBELoader();
    loader.load(url, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      scene.environment = texture;
      if (background) scene.background = texture;
      else scene.background = null;
    });
    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [url, background, scene, gl]);
  return null;
}

/* Clear scene background/environment when leaving PBR */
function ClearBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
    scene.environment = null;
  }, [scene]);
  return null;
}

/* ── Types ── */
export type ShadingMode = 'pbr' | 'matcap' | 'normals' | 'wireframe' | 'unlit';

interface Hotspot {
  position: [number, number, number];
  label: string;
  description: string;
}

const HOTSPOTS: Hotspot[] = [
  { position: [0.5, 0.8, 0.8], label: 'Visor Assembly', description: 'Impact-resistant polycarbonate visor with anti-scratch and anti-fog coatings. UV400 protection rated.' },
  { position: [-0.6, 0.3, 0.6], label: 'Ventilation System', description: 'Channeled airflow vents for thermal regulation. Adjustable intake and exhaust ports.' },
  { position: [0, -0.3, 1.0], label: 'Chin Guard', description: 'Reinforced composite chin bar with energy-absorbing EPS liner. Meets ECE 22.06 standards.' },
  { position: [0, 0.9, -0.2], label: 'Shell Construction', description: 'Multi-composite fiber shell with variable-density EPS. Optimized impact distribution across zones.' },
  { position: [0.8, -0.1, -0.3], label: 'Retention System', description: 'Double-D ring titanium buckle with emergency quick-release mechanism. Race-grade retention.' },
];

export interface SceneProps {
  bodyColor: string;
  accentColor: string;
  baseColor: string;
  material: 'glossy' | 'matte' | 'metallic' | 'glass';
  environment: string;
  exploded: boolean;
  wireframe: boolean;
  shadingMode: ShadingMode;
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
  lightHeight: number;
  ambientIntensity: number;
  userFile: File | null;
  fov: number;
  bloomIntensity: number;
  bloomThreshold: number;
  vignetteIntensity: number;
  ssaoEnabled: boolean;
  enablePostProcessing: boolean;
  modelPath?: string;
  showEnvBackground: boolean;
  customHdri: string | null;
}

/* ── Hotspot marker ── */
function HotspotMarker({ hotspot, index, active, onClick }: { hotspot: Hotspot; index: number; active: boolean; onClick: () => void }) {
  return (
    <Html position={hotspot.position} center distanceFactor={5}>
      <div style={{ position: 'relative' }}>
        <button onClick={onClick} style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: active ? 'rgba(108,99,255,0.9)' : 'rgba(108,99,255,0.3)',
          border: '1.5px solid rgba(108,99,255,0.6)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: active ? 'none' : 'pulse 2.5s ease-in-out infinite',
          boxShadow: active ? '0 0 12px rgba(108,99,255,0.4)' : 'none',
          transition: 'all 0.2s',
        }}>
          <span style={{ color: '#fff', fontSize: '8px', fontWeight: 700 }}>{index + 1}</span>
        </button>
        {active && (
          <div style={{
            position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,8,12,0.96)', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: '8px', padding: '10px 14px', width: '190px',
            backdropFilter: 'blur(16px)', animation: 'fadeIn 0.15s ease',
            boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6C63FF', marginBottom: '3px' }}>{hotspot.label}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>{hotspot.description}</div>
            <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '7px', height: '7px', background: 'rgba(8,8,12,0.96)', borderRight: '1px solid rgba(108,99,255,0.2)', borderBottom: '1px solid rgba(108,99,255,0.2)' }} />
          </div>
        )}
      </div>
    </Html>
  );
}

/* ── Main Scene ── */
export default function Scene(props: SceneProps) {
  const {
    bodyColor, accentColor, baseColor, material, environment, exploded, wireframe,
    shadingMode, autoRotate, autoRotateSpeed, showHotspots, showGrid,
    activeHotspot, setActiveHotspot, canvasRef, glRef,
    lightIntensity, lightAngle, lightHeight, ambientIntensity, userFile, fov,
    bloomIntensity, bloomThreshold, vignetteIntensity, ssaoEnabled, enablePostProcessing,
    modelPath, showEnvBackground, customHdri,
  } = props;

  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement;
    (glRef as React.MutableRefObject<WebGLRenderer | null>).current = gl;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = 2;
  }, [canvasRef, glRef]);

  const lightX = Math.cos(MathUtils.degToRad(lightAngle)) * 6;
  const lightZ = Math.sin(MathUtils.degToRad(lightAngle)) * 6;
  const showWireframe = false; // Each shading mode handles its own wireframe internally

  return (
    <Canvas
      shadows
      onCreated={handleCanvasCreated as any}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[3, 2, 5]} fov={fov} near={0.1} far={100} />

      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={shadingMode === 'unlit' ? 1.5 : ambientIntensity} />
        {shadingMode !== 'unlit' && shadingMode !== 'normals' && (
          <>
            <directionalLight
              position={[lightX, lightHeight, lightZ]}
              intensity={lightIntensity}
              castShadow
              shadow-mapSize={2048}
              shadow-bias={-0.0005}
              shadow-normalBias={0.02}
            />
            <directionalLight position={[-lightX, lightHeight * 0.5, -lightZ]} intensity={lightIntensity * 0.2} color="#8888ff" />
            <pointLight position={[0, 3, 0]} intensity={0.3} color={accentColor} distance={8} decay={2} />
            <hemisphereLight args={['#b1e1ff', '#b97a20', 0.15]} />
          </>
        )}

        {/* Model */}
        {userFile ? (
          <UserModel file={userFile} wireframe={showWireframe} shadingMode={shadingMode} />
        ) : (
          <>
            <DefaultModel key={modelPath || 'default'} wireframe={showWireframe} shadingMode={shadingMode} modelPath={modelPath} />
            {showHotspots && shadingMode === 'pbr' && (!modelPath || modelPath === '/models/DamagedHelmet.glb') && HOTSPOTS.map((h, i) => (
              <HotspotMarker key={i} hotspot={h} index={i} active={activeHotspot === i} onClick={() => setActiveHotspot(activeHotspot === i ? null : i)} />
            ))}
          </>
        )}

        {/* Environment — only in PBR mode */}
        {shadingMode === 'pbr' ? (
          <>
            {!customHdri && <Environment preset={environment as any} background={showEnvBackground} />}
            {customHdri && <CustomHDRI url={customHdri} background={showEnvBackground} />}
            <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={10} blur={2.5} far={4} />
          </>
        ) : (
          <ClearBackground />
        )}
        {showGrid && shadingMode === 'pbr' && <Grid position={[0, -1.5, 0]} args={[20, 20]} cellColor="rgba(108,99,255,0.04)" sectionColor="rgba(108,99,255,0.08)" fadeDistance={15} infiniteGrid />}

        {/* Post-processing */}
        {enablePostProcessing && shadingMode === 'pbr' && (
          <EffectComposer multisampling={4}>
            <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.4} mipmapBlur />
            {vignetteIntensity > 0 ? <Vignette offset={0.3} darkness={vignetteIntensity} /> : <></>}
            {ssaoEnabled ? <N8AO aoRadius={0.5} intensity={1} distanceFalloff={0.5} /> : <></>}
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        )}

        {/* Controls */}
        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          enablePan={true}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.06}
          rotateSpeed={0.7}
          panSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={1.2}
          maxDistance={20}
          maxPolarAngle={Math.PI * 0.88}
        />
      </Suspense>
    </Canvas>
  );
}

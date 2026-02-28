'use client';

import React, { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Grid, PerspectiveCamera, TransformControls, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO, ToneMapping, ChromaticAberration, BrightnessContrast } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { WebGLRenderer, MathUtils, EquirectangularReflectionMapping, Color, Vector2 } from 'three';
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

/* Set solid background and clear environment when leaving PBR */
function ClearBackground() {
  const { scene, gl } = useThree();
  useEffect(() => {
    scene.background = new Color('#08080C');
    scene.environment = null;
    gl.setClearColor('#08080C', 1);
    gl.autoClear = true;
  }, [scene, gl]);
  return null;
}

/* ── Types ── */
export type ShadingMode = 'pbr' | 'matcap' | 'normals' | 'wireframe' | 'unlit' | 'toon';

export type SceneLight = { id: string; color: string; intensity: number; x: number; y: number; z: number };

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

export interface SceneStats {
  triangles: number;
  vertices: number;
  meshes: number;
  drawCalls: number;
  textures: number;
}

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
  onStats?: (stats: SceneStats) => void;
  onLightDrag?: (deltaX: number, deltaY: number) => void;
  overrideColor: string | null;
  ssaoRadius: number;
  ssaoIntensity: number;
  chromaticAb: number;
  brightness: number;
  contrast: number;
  sceneLights: SceneLight[];
  showSceneCamera: boolean;
  cameraPos: [number, number, number];
  cameraViewMode: boolean;
  onCameraMove: (p: [number, number, number]) => void;
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

/* ── Scene Camera Gizmo ── */
function SceneCameraGizmo({ position, onMove, orbitRef }: {
  position: [number, number, number];
  onMove: (p: [number, number, number]) => void;
  orbitRef: React.RefObject<any>;
}) {
  const groupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const col = '#6C63FF';
  const frustumPts: [number,number,number][] = [
    [0,0,0], [0.2,0.14,-0.35], [0,0,0], [-0.2,0.14,-0.35],
    [0,0,0], [0.2,-0.14,-0.35], [0,0,0], [-0.2,-0.14,-0.35],
    [0.2,0.14,-0.35], [-0.2,0.14,-0.35], [-0.2,0.14,-0.35], [-0.2,-0.14,-0.35],
    [-0.2,-0.14,-0.35], [0.2,-0.14,-0.35], [0.2,-0.14,-0.35], [0.2,0.14,-0.35],
  ];

  return (
    <>
      <group ref={groupRef} position={position}>
        {/* Camera body */}
        <mesh>
          <boxGeometry args={[0.22, 0.16, 0.14]} />
          <meshBasicMaterial color={col} wireframe />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, -0.1]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.04, 0.08, 6]} />
          <meshBasicMaterial color={col} wireframe />
        </mesh>
        {/* Frustum lines */}
        {frustumPts.filter((_,i)=>i%2===0).map((pt,i) => (
          <Line key={i} points={[pt, frustumPts[i*2+1]]} color={col} lineWidth={0.8} transparent opacity={0.5} />
        ))}
      </group>
      {ready && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="translate"
          size={0.7}
          onMouseDown={() => { if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
            if (groupRef.current) {
              const p = groupRef.current.position;
              onMove([Math.round(p.x*10)/10, Math.round(p.y*10)/10, Math.round(p.z*10)/10]);
            }
          }}
          onChange={() => {
            if (groupRef.current) {
              const p = groupRef.current.position;
              onMove([Math.round(p.x*10)/10, Math.round(p.y*10)/10, Math.round(p.z*10)/10]);
            }
          }}
        />
      )}
    </>
  );
}

/* ── Stats collector (runs inside Canvas) ── */
function StatsCollector({ onStats }: { onStats: (s: SceneStats) => void }) {
  const { scene, gl } = useThree();
  const lastRef = useRef('');
  useFrame(() => {
    let triangles = 0, vertices = 0, meshes = 0, textures = 0;
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        meshes++;
        const geo = (child as any).geometry;
        if (geo) {
          const idx = geo.index;
          if (idx) triangles += idx.count / 3;
          else if (geo.attributes.position) triangles += geo.attributes.position.count / 3;
          if (geo.attributes.position) vertices += geo.attributes.position.count;
        }
      }
    });
    const info = gl.info;
    const drawCalls = info.render?.calls || 0;
    textures = info.memory?.textures || 0;
    const key = `${triangles}-${vertices}-${meshes}`;
    if (key !== lastRef.current) {
      lastRef.current = key;
      onStats({ triangles: Math.round(triangles), vertices, meshes, drawCalls, textures });
    }
  });
  return null;
}

/* Ensure autoClear=true whenever PP is off or changes */
function AutoClearFix({ enablePP }: { enablePP: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    if (!enablePP) {
      gl.autoClear = true;
      gl.autoClearColor = true;
      gl.autoClearDepth = true;
    }
  });
  return null;
}

/* ── Main Scene ── */
export default function Scene(props: SceneProps) {
  const {
    bodyColor, accentColor, baseColor, material, environment, exploded, wireframe,
    shadingMode, autoRotate, autoRotateSpeed, showHotspots, showGrid,
    activeHotspot, setActiveHotspot, canvasRef, glRef,
    lightIntensity, lightAngle, lightHeight, ambientIntensity, userFile, fov,
    bloomIntensity, bloomThreshold, vignetteIntensity, ssaoEnabled, enablePostProcessing,
    modelPath, showEnvBackground, customHdri, onStats, onLightDrag, overrideColor,
    ssaoRadius, ssaoIntensity, chromaticAb, brightness, contrast, sceneLights,
    showSceneCamera, cameraPos, cameraViewMode, onCameraMove,
  } = props;

  const orbitRef = useRef<any>(null);

  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement;
    (glRef as React.MutableRefObject<WebGLRenderer | null>).current = gl;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = 2;
  }, [canvasRef, glRef]);

  const lightX = Math.cos(MathUtils.degToRad(lightAngle)) * 6;
  const lightZ = Math.sin(MathUtils.degToRad(lightAngle)) * 6;
  const showWireframe = false; // Each shading mode handles its own wireframe internally

  // Alt+RMB light control
  const altDrag = useRef(false);
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.altKey && e.button === 2) { altDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); }
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (altDrag.current && onLightDrag) { onLightDrag(e.movementX, e.movementY); e.preventDefault(); e.stopPropagation(); }
  }, [onLightDrag]);
  const handlePointerUp = useCallback(() => { altDrag.current = false; }, []);

  return (
    <Canvas
      shadows
      onCreated={handleCanvasCreated as any}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => { if (e.altKey) e.preventDefault(); }}
    >
      {cameraViewMode
        ? <PerspectiveCamera makeDefault position={cameraPos} fov={fov} near={0.1} far={100} />
        : <PerspectiveCamera makeDefault position={[3, 2, 5]} fov={fov} near={0.1} far={100} />
      }

      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={shadingMode === 'unlit' ? 1.5 : shadingMode === 'toon' ? ambientIntensity * 0.4 : ambientIntensity} />
        {shadingMode !== 'unlit' && shadingMode !== 'normals' && (
          <>
            <directionalLight
              position={[lightX, lightHeight, lightZ]}
              intensity={shadingMode === 'toon' ? lightIntensity * 1.4 : lightIntensity}
              castShadow
              shadow-mapSize={2048}
              shadow-bias={-0.0005}
              shadow-normalBias={0.02}
            />
            {shadingMode !== 'toon' && <>
              <directionalLight position={[-lightX, lightHeight * 0.5, -lightZ]} intensity={lightIntensity * 0.2} color="#8888ff" />
              <pointLight position={[0, 3, 0]} intensity={0.3} color={accentColor} distance={8} decay={2} />
              <hemisphereLight args={['#b1e1ff', '#b97a20', 0.15]} />
            </>}
          </>
        )}
        {/* User-added scene lights */}
        {sceneLights.map(l => (
          <pointLight key={l.id} position={[l.x, l.y, l.z]} color={l.color} intensity={l.intensity} distance={12} decay={2} />
        ))}

        {/* Model */}
        {userFile ? (
          <UserModel key={`user-${shadingMode}-${overrideColor}`} file={userFile} wireframe={showWireframe} shadingMode={shadingMode} overrideColor={overrideColor} />
        ) : (
          <>
            <DefaultModel key={`${modelPath || 'default'}-${shadingMode}-${overrideColor}`} wireframe={showWireframe} shadingMode={shadingMode} modelPath={modelPath} overrideColor={overrideColor} />
            {showHotspots && shadingMode === 'pbr' && (!modelPath || modelPath === '/models/DamagedHelmet.glb') && HOTSPOTS.map((h, i) => (
              <HotspotMarker key={i} hotspot={h} index={i} active={activeHotspot === i} onClick={() => setActiveHotspot(activeHotspot === i ? null : i)} />
            ))}
          </>
        )}

        {/* Environment — only in PBR mode */}
        {(shadingMode === 'pbr') ? (
          <>
            {!customHdri && <Environment preset={environment as any} background={showEnvBackground} />}
            {customHdri && <CustomHDRI url={customHdri} background={showEnvBackground} />}
            <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={10} blur={2.5} far={4} />
          </>
        ) : (
          <ClearBackground />
        )}
        {showGrid && shadingMode === 'pbr' && <Grid position={[0, -1.5, 0]} args={[20, 20]} cellColor="#1a1833" sectionColor="#2a2555" fadeDistance={15} infiniteGrid />}

        {/* Post-processing */}
        {enablePostProcessing && shadingMode === 'pbr' && (
          <EffectComposer multisampling={4}>
            <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.4} mipmapBlur />
            {vignetteIntensity > 0 ? <Vignette offset={0.3} darkness={vignetteIntensity} /> : <></>}
            {ssaoEnabled ? <N8AO aoRadius={ssaoRadius} intensity={ssaoIntensity} distanceFalloff={0.5} /> : <></>}
            {chromaticAb > 0 ? <ChromaticAberration offset={new Vector2(chromaticAb, chromaticAb)} /> : <></>}
            {(brightness !== 0 || contrast !== 0) ? <BrightnessContrast brightness={brightness} contrast={contrast} /> : <></>}
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        )}

        {/* Scene Camera Gizmo — only visible when not in camera view */}
        {showSceneCamera && !cameraViewMode && (
          <SceneCameraGizmo position={cameraPos} onMove={onCameraMove} orbitRef={orbitRef} />
        )}

        {/* Controls */}
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enabled={!cameraViewMode}
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
        {onStats && <StatsCollector onStats={onStats} />}
        <AutoClearFix enablePP={enablePostProcessing} />
      </Suspense>
    </Canvas>
  );
}

'use client';

import React, { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Grid, PerspectiveCamera, TransformControls, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO, ToneMapping, ChromaticAberration, BrightnessContrast, Outline, Select } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { WebGLRenderer, MathUtils, EquirectangularReflectionMapping, Color, Vector2, Vector3 } from 'three';
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

/* Strip environment from scene.environment every frame — keeps bg but kills IBL */
function EnvLightingOverride({ enable }: { enable: boolean }) {
  const { scene } = useThree();
  useFrame(() => {
    if (!enable && scene.environment !== null) {
      scene.environment = null;
    }
  });
  return null;
}

/* Set solid background, clear environment lighting (no PBR env effects) */
function ClearBackground({ keepBg }: { keepBg?: boolean }) {
  const { scene, gl } = useThree();
  useEffect(() => {
    if (!keepBg) {
      scene.background = new Color('#08080C');
    }
    scene.environment = null;
    gl.setClearColor('#08080C', 1);
    gl.autoClear = true;
  }, [scene, gl, keepBg]);
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
  selectedLightId: string | null;
  onSelectLight: (id: string | null) => void;
  onMoveLight: (id: string, pos: [number, number, number]) => void;
  showSceneCamera: boolean;
  cameraPos: [number, number, number];
  cameraViewMode: boolean;
  lockCameraToView: boolean;
  onCameraMove: (p: [number, number, number]) => void;
  rotationMode?: boolean;
  rotationStepRef?: React.RefObject<((deg: number) => void) | null>;
  hdriLighting: boolean;
  cameraGizmoMode: 'translate' | 'rotate';
  modelUniformScale: number;
  selectedObjectIds: string[];
  modelTransformMode: 'translate' | 'rotate' | 'scale';
  onModelClick: (shiftKey: boolean, ctrlKey: boolean) => void;
  onModelDeselect: () => void;
  onCameraSelect?: (shift: boolean) => void;
  onModelUniformScaleChange?: (s: number) => void;
  onTransformActioned?: () => void;
  onGroupMount?: (ref: React.RefObject<any>) => void;
  rendering?: boolean;
  onLMBDownNoAlt?: (screenX: number, screenY: number, shiftKey: boolean) => void;
  projectorRef?: React.MutableRefObject<((worldPos: [number, number, number]) => { x: number; y: number } | null) | null>;
  onTransformChange?: (t: TransformSnapshot) => void;
  applyTransformRef?: React.MutableRefObject<ApplyTransformFn | null>;
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
function SceneCameraGizmo({ position, onMove, orbitRef, mode, selected, onSelect, dragRef }: {
  position: [number, number, number];
  onMove: (p: [number, number, number]) => void;
  orbitRef: React.RefObject<any>;
  mode: 'translate' | 'rotate';
  selected: boolean;
  onSelect: (shift: boolean) => void;
  dragRef?: React.RefObject<boolean>;
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

  const selCol = selected ? '#00D4A8' : col;
  return (
    <>
      <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey); }}>
        {/* Camera body */}
        <mesh>
          <boxGeometry args={[0.22, 0.16, 0.14]} />
          <meshBasicMaterial color={selCol} wireframe />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, -0.1]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.04, 0.08, 6]} />
          <meshBasicMaterial color={selCol} wireframe />
        </mesh>
        {/* Frustum lines */}
        {frustumPts.filter((_,i)=>i%2===0).map((pt,i) => (
          <Line key={i} points={[pt, frustumPts[i*2+1]]} color={selCol} lineWidth={selected ? 1.2 : 0.8} transparent opacity={selected ? 0.8 : 0.5} />
        ))}
      </group>
      {selected && ready && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={mode}
          size={0.7}
          onMouseDown={() => { if (dragRef) dragRef.current = true; if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => {
            if (dragRef) setTimeout(() => { dragRef.current = false; }, 50);
            if (orbitRef.current) orbitRef.current.enabled = true;
            if (mode === 'translate' && groupRef.current) {
              const p = groupRef.current.position;
              onMove([Math.round(p.x*10)/10, Math.round(p.y*10)/10, Math.round(p.z*10)/10]);
            }
          }}
          onChange={() => {
            if (mode === 'translate' && groupRef.current) {
              const p = groupRef.current.position;
              onMove([Math.round(p.x*10)/10, Math.round(p.y*10)/10, Math.round(p.z*10)/10]);
            }
          }}
        />
      )}
    </>
  );
}

/* ── Scene Light Object ── */
function SceneLightObject({ light, selected, onSelect, onMove, orbitRef, dragRef }: {
  light: SceneLight;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: [number, number, number]) => void;
  orbitRef: React.RefObject<any>;
  dragRef?: React.RefObject<boolean>;
}) {
  const groupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <>
      <group
        ref={groupRef}
        position={[light.x, light.y, light.z]}
        onClick={(e) => { e.stopPropagation(); onSelect(light.id); }}
      >
        {/* Core emissive sphere */}
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color={light.color} />
        </mesh>
        {/* Inner glow */}
        <mesh>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color={light.color} transparent opacity={0.18} />
        </mesh>
        {/* Outer wireframe radius indicator */}
        <mesh>
          <sphereGeometry args={selected ? [0.28, 8, 8] : [0.22, 8, 8]} />
          <meshBasicMaterial color={selected ? '#6C63FF' : light.color} wireframe transparent opacity={selected ? 0.8 : 0.35} />
        </mesh>
        {/* Cross-hair lines through center */}
        {selected && <>
          <Line points={[[-0.28,0,0],[0.28,0,0]]} color="#6C63FF" lineWidth={0.6} />
          <Line points={[[0,-0.28,0],[0,0.28,0]]} color="#6C63FF" lineWidth={0.6} />
          <Line points={[[0,0,-0.28],[0,0,0.28]]} color="#6C63FF" lineWidth={0.6} />
        </>}
      </group>
      {selected && ready && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="translate"
          size={0.65}
          onMouseDown={() => { if (dragRef) dragRef.current = true; if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => {
            if (dragRef) setTimeout(() => { dragRef.current = false; }, 50);
            if (orbitRef.current) orbitRef.current.enabled = true;
            if (groupRef.current) {
              const p = groupRef.current.position;
              onMove(light.id, [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]);
            }
          }}
          onChange={() => {
            if (groupRef.current) {
              const p = groupRef.current.position;
              onMove(light.id, [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]);
            }
          }}
        />
      )}
    </>
  );
}

/* ── Camera-to-viewport syncer: when in camera view, sync orbit changes back to cameraPos ── */
function CameraViewSyncer({ onCameraMove }: { onCameraMove: (p: [number, number, number]) => void }) {
  const { camera } = useThree();
  const lastSync = useRef(0);
  useFrame(() => {
    const now = Date.now();
    if (now - lastSync.current < 80) return; // throttle to ~12 fps for state updates
    lastSync.current = now;
    const p = camera.position;
    onCameraMove([
      Math.round(p.x * 10) / 10,
      Math.round(p.y * 10) / 10,
      Math.round(p.z * 10) / 10,
    ]);
  });
  return null;
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

/* ── Types ── */
export interface TransformSnapshot {
  px: number; py: number; pz: number;
  rx: number; ry: number; rz: number; // degrees
  s: number; // uniform scale (from modelUniformScale prop)
}
export type ApplyTransformFn = (pos?: [number, number, number], rot?: [number, number, number]) => void;

/* ── Live transform reporter — throttled to actual changes ── */
function TransformReporter({ modelGroupRef, modelUniformScale, onTransformChange }: {
  modelGroupRef: React.RefObject<any>;
  modelUniformScale: number;
  onTransformChange: (t: TransformSnapshot) => void;
}) {
  const lastKey = useRef('');
  const lastUpdate = useRef(0);
  const RAD2DEG = 180 / Math.PI;
  // Throttle to ~12fps max — prevents React re-renders from blocking 3D canvas at 60fps
  useFrame((state) => {
    const obj = modelGroupRef.current;
    if (!obj) return;
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < 0.083) return; // ~12fps cap
    const k = `${obj.position.x.toFixed(2)},${obj.position.y.toFixed(2)},${obj.position.z.toFixed(2)},${obj.rotation.x.toFixed(2)},${obj.rotation.y.toFixed(2)},${obj.rotation.z.toFixed(2)},${modelUniformScale.toFixed(2)}`;
    if (k !== lastKey.current) {
      lastKey.current = k;
      lastUpdate.current = now;
      onTransformChange({
        px: obj.position.x, py: obj.position.y, pz: obj.position.z,
        rx: obj.rotation.x * RAD2DEG, ry: obj.rotation.y * RAD2DEG, rz: obj.rotation.z * RAD2DEG,
        s: modelUniformScale,
      });
    }
  });
  return null;
}

/* ── Apply transform imperatively from outside Canvas ── */
function ApplyTransformSetup({ modelGroupRef, applyTransformRef }: {
  modelGroupRef: React.RefObject<any>;
  applyTransformRef: React.MutableRefObject<ApplyTransformFn | null>;
}) {
  const DEG2RAD = Math.PI / 180;
  useEffect(() => {
    applyTransformRef.current = (pos, rot) => {
      const obj = modelGroupRef.current;
      if (!obj) return;
      if (pos) obj.position.set(pos[0], pos[1], pos[2]);
      if (rot) obj.rotation.set(rot[0] * DEG2RAD, rot[1] * DEG2RAD, rot[2] * DEG2RAD);
    };
  }, []);
  return null;
}

/* ── Alt+LMB orbit interceptor — LMB alone = marquee, Alt+LMB = orbit ── */
function AltOrbitController({ orbitRef, onLMBDownNoAlt, isModelSelectedRef }: {
  orbitRef: React.RefObject<any>;
  onLMBDownNoAlt: (screenX: number, screenY: number, shiftKey: boolean) => void;
  isModelSelectedRef: React.RefObject<boolean>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let capturedNoAlt = false;
    const onDown = (e: PointerEvent) => {
      if (e.button === 0 && !e.altKey) {
        // If model is selected, DON'T intercept — let TC and R3F handle the interaction
        if (isModelSelectedRef.current) return;
        if (orbitRef.current) orbitRef.current.enabled = false;
        capturedNoAlt = true;
        onLMBDownNoAlt(e.clientX, e.clientY, e.shiftKey);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 0 && capturedNoAlt) {
        capturedNoAlt = false;
        if (orbitRef.current) orbitRef.current.enabled = true;
      }
    };
    // Capture phase — fires BEFORE OrbitControls' own listener
    canvas.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl]);
  return null;
}

/* ── World → screen projector exposed via ref for marquee selection ── */
function ProjectorSetup({ projectorRef }: {
  projectorRef: React.MutableRefObject<((worldPos: [number, number, number]) => { x: number; y: number } | null) | null>;
}) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const v = new Vector3();
    projectorRef.current = ([wx, wy, wz]) => {
      v.set(wx, wy, wz).project(camera);
      if (v.z > 1) return null; // behind camera
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
      };
    };
  }, [camera, gl]);
  return null;
}

/* OutlineSync removed — using Select component instead */

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
    selectedLightId, onSelectLight, onMoveLight,
    showSceneCamera, cameraPos, cameraViewMode, lockCameraToView, onCameraMove,
    rotationMode, rotationStepRef,
    hdriLighting, cameraGizmoMode, modelUniformScale,
    selectedObjectIds, modelTransformMode, onModelClick, onModelDeselect,
  } = props;
  const rendering = props.rendering ?? false;

  const modelSelected = selectedObjectIds.includes('model');

  const orbitRef = useRef<any>(null);
  const modelGroupRef = useRef<any>(null);
  const isModelSelectedRef = useRef<boolean>(false);
  const isDraggingTransformRef = useRef<boolean>(false);
  // Apply scale imperatively so TC can modify it freely during drag without React fighting back
  useEffect(() => {
    if (modelGroupRef.current) modelGroupRef.current.scale.setScalar(props.modelUniformScale);
  }, [props.modelUniformScale]);
  // Expose modelGroupRef to parent for direct Three.js scale updates (no React round-trip)
  useEffect(() => {
    if (props.onGroupMount) props.onGroupMount(modelGroupRef);
  }, []);
  // Saved orbit position for restoring after exiting camera view
  const savedOrbitState = useRef<{ camPos: [number,number,number]; target: [number,number,number] } | null>(null);
  // Pointer drag detection — prevent onPointerMissed deselecting during pan/orbit
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const pointerDidDrag = useRef(false);
  useEffect(() => { isModelSelectedRef.current = modelSelected; }, [modelSelected]);

  // Save orbit camera state when entering camera view; restore on exit
  useEffect(() => {
    if (cameraViewMode) {
      const orbit = orbitRef.current;
      if (orbit) {
        savedOrbitState.current = {
          camPos: [orbit.object.position.x, orbit.object.position.y, orbit.object.position.z],
          target: [orbit.target.x, orbit.target.y, orbit.target.z],
        };
      }
    } else {
      // Give R3F 2 frames to mount the non-camera PerspectiveCamera before overriding
      setTimeout(() => {
        const orbit = orbitRef.current;
        const saved = savedOrbitState.current;
        if (orbit && saved) {
          orbit.object.position.set(...saved.camPos);
          orbit.target.set(...saved.target);
          orbit.update();
        }
      }, 32);
    }
  }, [cameraViewMode]);

  // Populate rotationStepRef so page.tsx can step-rotate orbit camera from outside Canvas
  useEffect(() => {
    if (!rotationStepRef) return;
    rotationStepRef.current = (deg: number) => {
      const orbit = orbitRef.current;
      if (!orbit) return;
      const cam = orbit.object;
      const target = orbit.target;
      // Compute spherical coords
      const offset = cam.position.clone().sub(target);
      const radius = offset.length();
      const currentAzimuth = Math.atan2(offset.x, offset.z);
      const newAzimuth = currentAzimuth + (deg * Math.PI / 180);
      const currentPolar = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
      cam.position.set(
        target.x + radius * Math.sin(currentPolar) * Math.sin(newAzimuth),
        target.y + radius * Math.cos(currentPolar),
        target.z + radius * Math.sin(currentPolar) * Math.cos(newAzimuth),
      );
      cam.lookAt(target);
      orbit.update();
    };
  }, [rotationStepRef]);

  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement;
    (glRef as React.MutableRefObject<WebGLRenderer | null>).current = gl;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = 2;
  }, [canvasRef, glRef]);

  const lightX = Math.cos(MathUtils.degToRad(lightAngle)) * 6;
  const lightZ = Math.sin(MathUtils.degToRad(lightAngle)) * 6;
  const showWireframe = false; // Each shading mode handles its own wireframe internally

  // Alt+RMB light control + drag detection for pointer-missed guard
  const altDrag = useRef(false);
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDidDrag.current = false;
    if (e.altKey && e.button === 2) { altDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); }
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) pointerDidDrag.current = true;
    }
    if (altDrag.current && onLightDrag) { onLightDrag(e.movementX, e.movementY); e.preventDefault(); e.stopPropagation(); }
  }, [onLightDrag]);
  const handlePointerUp = useCallback(() => {
    altDrag.current = false;
    pointerDownPos.current = null;
  }, []);

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
      onPointerMissed={() => {
        if (!isDraggingTransformRef.current && !pointerDidDrag.current) onModelDeselect();
        pointerDidDrag.current = false;
        pointerDownPos.current = null;
      }}
    >
      {cameraViewMode
        ? <PerspectiveCamera makeDefault position={cameraPos} fov={fov} near={0.1} far={100} />
        : <PerspectiveCamera makeDefault position={[3, 2, 5]} fov={fov} near={0.1} far={100} />
      }

      {/* Model group is OUTSIDE Suspense so ref is immediately available for HierarchyReporter */}
      <Select enabled={modelSelected}>
        <group
          ref={modelGroupRef}
          onClick={(e) => { e.stopPropagation(); onModelClick(e.shiftKey, e.ctrlKey || e.metaKey); }}
        >
          <Suspense fallback={null}>
            {userFile ? (
              <UserModel key={`user-${shadingMode}-${overrideColor}`} file={userFile} wireframe={showWireframe} shadingMode={shadingMode} overrideColor={overrideColor} disableFloat={cameraViewMode} />
            ) : (
              <>
                <DefaultModel key={`${modelPath || 'default'}-${shadingMode}-${overrideColor}`} wireframe={showWireframe} shadingMode={shadingMode} modelPath={modelPath} overrideColor={overrideColor} disableFloat={cameraViewMode} />
                {showHotspots && shadingMode === 'pbr' && !modelPath && HOTSPOTS.map((h, i) => (
                  <HotspotMarker key={i} hotspot={h} index={i} active={activeHotspot === i} onClick={() => setActiveHotspot(activeHotspot === i ? null : i)} />
                ))}
              </>
            )}
          </Suspense>
        </group>
      </Select>

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
        {/* User-added scene lights — actual point light + visible 3D object */}
        {sceneLights.map(l => (
          <React.Fragment key={l.id}>
            <pointLight position={[l.x, l.y, l.z]} color={l.color} intensity={l.intensity} distance={12} decay={2} />
            <SceneLightObject
              light={l}
              selected={selectedLightId === l.id}
              onSelect={onSelectLight}
              onMove={onMoveLight}
              orbitRef={orbitRef}
              dragRef={isDraggingTransformRef}
            />
          </React.Fragment>
        ))}

        {/* Model group hoisted above Suspense — see group at top of Canvas */}

        {/* Model TransformControls — G=translate, E=rotate, R=scale; hidden during render */}
        {modelSelected && modelGroupRef.current && !rendering && (
          <TransformControls
            object={modelGroupRef.current}
            mode={modelTransformMode}
            size={1.2}
            translationSnap={null}
            rotationSnap={null}
            onMouseDown={() => { isDraggingTransformRef.current = true; props.onTransformActioned?.(); if (orbitRef.current) { orbitRef.current.enabled = false; orbitRef.current.saveState?.(); } }}
            onMouseUp={() => {
              setTimeout(() => { isDraggingTransformRef.current = false; }, 50);
              if (orbitRef.current) orbitRef.current.enabled = true;
              // When scale mode: sync TC-applied scale back to React state (average of all 3 axes)
              if (modelTransformMode === 'scale' && modelGroupRef.current && props.onModelUniformScaleChange) {
                const s = modelGroupRef.current.scale;
                const avg = Math.max(0.01, (s.x + s.y + s.z) / 3);
                props.onModelUniformScaleChange(Math.round(avg * 1000) / 1000);
              }
            }}
          />
        )}

        {/* Environment — PBR gets full lighting + optional bg; other modes get bg only if enabled */}
        {shadingMode === 'pbr' ? (
          <>
            {!customHdri && <Environment preset={environment as any} background={showEnvBackground} />}
            {customHdri && <CustomHDRI url={customHdri} background={showEnvBackground} />}
            {/* Kill IBL when hdriLighting is off — keeps background, strips env lighting contribution */}
            <EnvLightingOverride enable={hdriLighting} />
            <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={10} blur={2.5} far={4} />
          </>
        ) : showEnvBackground ? (
          <>
            {!customHdri && <Environment preset={environment as any} background={true} />}
            {customHdri && <CustomHDRI url={customHdri} background={true} />}
            <ClearBackground keepBg />
          </>
        ) : (
          <ClearBackground />
        )}
        {showGrid && shadingMode === 'pbr' && <Grid position={[0, -1.5, 0]} args={[20, 20]} cellColor="#1a1833" sectionColor="#2a2555" fadeDistance={15} infiniteGrid />}

        {/* Post-processing — PBR mode with outline */}
        {enablePostProcessing && shadingMode === 'pbr' ? (
          <EffectComposer multisampling={4}>
            <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.4} mipmapBlur />
            {vignetteIntensity > 0 ? <Vignette offset={0.3} darkness={vignetteIntensity} /> : <></>}
            {ssaoEnabled ? <N8AO aoRadius={ssaoRadius} intensity={ssaoIntensity} distanceFalloff={0.5} /> : <></>}
            {chromaticAb > 0 ? <ChromaticAberration offset={new Vector2(chromaticAb, chromaticAb)} /> : <></>}
            {(brightness !== 0 || contrast !== 0) ? <BrightnessContrast brightness={brightness} contrast={contrast} /> : <></>}
            <ToneMapping mode={ToneMappingMode.AGX} />
            <Outline edgeStrength={3} visibleEdgeColor={0xFFAA00 as any} hiddenEdgeColor={0x000000 as any} blur={false as any} xRay={false} />
          </EffectComposer>
        ) : (
          /* Outline-only composer for non-PBR modes */
          <EffectComposer multisampling={0}>
            <Outline edgeStrength={3} visibleEdgeColor={0xFFAA00 as any} hiddenEdgeColor={0x000000 as any} blur={false as any} xRay={false} />
          </EffectComposer>
        )}

        {/* Scene Camera Gizmo — only visible when not in camera view */}
        {showSceneCamera && !cameraViewMode && (
          <SceneCameraGizmo
            position={cameraPos}
            onMove={onCameraMove}
            orbitRef={orbitRef}
            mode={cameraGizmoMode}
            selected={selectedObjectIds.includes('camera')}
            onSelect={(shift: boolean) => props.onCameraSelect?.(shift)}
            dragRef={isDraggingTransformRef}
          />
        )}

        {/* Controls */}
        {/* Camera-to-view syncer: orbit movement always updates cameraPos state in camera view */}
        {cameraViewMode && <CameraViewSyncer onCameraMove={onCameraMove} />}

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enabled={!rendering}
          autoRotate={autoRotate && !cameraViewMode}
          autoRotateSpeed={autoRotateSpeed}
          enablePan={true}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.12}
          rotateSpeed={0.7}
          panSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={1.2}
          maxDistance={20}
          maxPolarAngle={Math.PI * 0.88}
        />
        {props.onLMBDownNoAlt && <AltOrbitController orbitRef={orbitRef} onLMBDownNoAlt={props.onLMBDownNoAlt} isModelSelectedRef={isModelSelectedRef} />}
        {props.projectorRef && <ProjectorSetup projectorRef={props.projectorRef} />}
        {props.onTransformChange && modelSelected && (
          <TransformReporter modelGroupRef={modelGroupRef} modelUniformScale={modelUniformScale} onTransformChange={props.onTransformChange} />
        )}
        {props.applyTransformRef && (
          <ApplyTransformSetup modelGroupRef={modelGroupRef} applyTransformRef={props.applyTransformRef} />
        )}
        {onStats && <StatsCollector onStats={onStats} />}
        <AutoClearFix enablePP={enablePostProcessing} />
      </Suspense>
    </Canvas>
  );
}

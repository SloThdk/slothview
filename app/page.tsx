'use client';

import { useState, useRef, useCallback, useEffect, startTransition } from 'react';
import dynamic from 'next/dynamic';
import type { ShadingMode, SceneStats, SceneLight, TransformSnapshot, ApplyTransformFn } from './components/Scene';
import {
  IconCamera, IconMaximize, IconShare, IconGrid, IconExplode, IconRotate,
  IconWireframe, IconHotspot, IconUpload, IconSun, IconPalette, IconLayers,
  IconBox, IconSliders, IconEye, IconX, IconMenu, IconCheck, IconFile, IconTrash, IconZap,
} from './components/Icons';
import type { WebGLRenderer } from 'three';

const Scene = dynamic(() => import('./components/Scene'), { ssr: false });

/* ── Data ── */
const COLORS = [
  { n: 'Obsidian', v: '#1a1a2e' }, { n: 'Arctic', v: '#e8e8ec' }, { n: 'Navy', v: '#0f1b3d' },
  { n: 'Crimson', v: '#8b1a1a' }, { n: 'Forest', v: '#1a3a2a' }, { n: 'Charcoal', v: '#2d2d3a' },
  { n: 'Slate', v: '#3d4f5f' }, { n: 'Copper', v: '#5a3825' },
];
const ACCENTS = [
  { n: 'Violet', v: '#6C63FF' }, { n: 'Emerald', v: '#00D4A8' }, { n: 'Amber', v: '#FFB020' },
  { n: 'Rose', v: '#FF4F81' }, { n: 'Ice', v: '#4FC3F7' }, { n: 'Pure', v: '#ffffff' },
  { n: 'Coral', v: '#FF6B6B' }, { n: 'Lime', v: '#A3E635' },
];
const BASES = [
  { n: 'Gunmetal', v: '#2a2a35' }, { n: 'Silver', v: '#b8b8c0' },
  { n: 'Gold', v: '#c4a35a' }, { n: 'Black', v: '#0a0a0e' }, { n: 'Brushed', v: '#6b7280' },
];

type MatType = 'glossy' | 'matte' | 'metallic' | 'glass';
const MATERIALS: { n: string; v: MatType; d: string; p: number }[] = [
  { n: 'Glossy', v: 'glossy', d: 'High-shine reflective', p: 0 },
  { n: 'Matte', v: 'matte', d: 'Soft diffused surface', p: 0 },
  { n: 'Metallic', v: 'metallic', d: 'Brushed metal', p: 299 },
  { n: 'Glass', v: 'glass', d: 'Translucent frosted', p: 499 },
];

const ENVS = ['studio', 'sunset', 'city', 'forest', 'night', 'warehouse', 'dawn', 'apartment', 'lobby', 'park'];

const LIGHT_PRESETS = [
  { n: 'Studio', i: 1.2, a: 0.3, ang: 45, h: 8 },
  { n: 'Dramatic', i: 2.2, a: 0.08, ang: 80, h: 10 },
  { n: 'Soft', i: 0.6, a: 0.55, ang: 30, h: 6 },
  { n: 'Backlit', i: 1.6, a: 0.15, ang: 180, h: 7 },
  { n: 'Rim', i: 1.8, a: 0.1, ang: 120, h: 5 },
  { n: 'Golden', i: 1.0, a: 0.35, ang: 60, h: 4 },
];

const SHADING_MODES: { id: ShadingMode; label: string; bg: string }[] = [
  { id: 'pbr', label: 'PBR', bg: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4a 40%, #3a3a5a 70%, #1a1a2e 100%)' },
  { id: 'matcap', label: 'Matcap', bg: 'radial-gradient(ellipse at 40% 35%, #d0d0e0 0%, #8888a0 35%, #404058 65%, #1a1a28 100%)' },
  { id: 'normals', label: 'Normals', bg: 'linear-gradient(135deg, #4040ff 0%, #40ff40 25%, #ffff40 50%, #ff4040 75%, #8040ff 100%)' },
  { id: 'wireframe', label: 'Wire', bg: 'repeating-linear-gradient(45deg, #0a0a10 0px, #0a0a10 3px, #1a1a28 3px, #1a1a28 4px)' },
  { id: 'unlit', label: 'Unlit', bg: 'linear-gradient(135deg, #555 0%, #777 50%, #555 100%)' },
  { id: 'toon', label: 'Toon', bg: 'linear-gradient(135deg, #ff6b9d 0%, #c84b77 30%, #9b5de5 70%, #f15bb5 100%)' },
];

const PRESET_MODELS = [
  { id: 'chair', name: 'Designer Chair', path: '/models/SheenChair.glb', cat: 'Furniture', desc: 'Modern fabric chair with sheen' },
  { id: 'helmet', name: 'Damaged Helmet', path: '/models/DamagedHelmet.glb', cat: 'Sci-Fi', desc: 'Battle-worn helmet with PBR materials' },
  { id: 'shoe', name: 'Sneaker', path: '/models/MaterialsVariantsShoe.glb', cat: 'Fashion', desc: 'Athletic shoe with material variants' },
  { id: 'car', name: 'Toy Car', path: '/models/ToyCar.glb', cat: 'Automotive', desc: 'Detailed miniature car model' },
  { id: 'dragon', name: 'Crystal Dragon', path: '/models/DragonAttenuation.glb', cat: 'Art', desc: 'Translucent dragon sculpture' },
  { id: 'antique-camera', name: 'Antique Camera', path: '/models/AntiqueCamera.glb', cat: 'Vintage', desc: 'Classic folding camera with brass details' },
  { id: 'lantern', name: 'Lantern', path: '/models/Lantern.glb', cat: 'Props', desc: 'Oil lantern with glass and metal' },
  // — New models —
  { id: 'avocado', name: 'Avocado', path: '/models/Avocado.glb', cat: 'Food', desc: 'Hyper-real avocado with PBR skin' },
  { id: 'boombox', name: 'Boom Box', path: '/models/BoomBox.glb', cat: 'Electronics', desc: 'Retro 80s boombox with scratches and decals' },
  { id: 'corset', name: 'Victorian Corset', path: '/models/Corset.glb', cat: 'Fashion', desc: 'Ornate corset with intricate fabric detail' },
  { id: 'duck', name: 'Rubber Duck', path: '/models/Duck.glb', cat: 'Classic', desc: 'The original glTF rubber duck' },
  { id: 'waterbottle', name: 'Water Bottle', path: '/models/WaterBottle.glb', cat: 'Product', desc: 'Insulated steel bottle, product-viz ready' },
  { id: 'milktruck', name: 'Milk Truck', path: '/models/CesiumMilkTruck.glb', cat: 'Vehicle', desc: 'Cute vintage milk delivery truck' },
  { id: 'iridescent-dish', name: 'Iridescent Dish', path: '/models/IridescentDishWithOlives.glb', cat: 'Materials', desc: 'Shows iridescence and thin-film interference' },
  { id: 'velvet-sofa', name: 'Velvet Sofa', path: '/models/GlamVelvetSofa.glb', cat: 'Furniture', desc: 'Glam sofa with velvet sheen material' },
  { id: 'cesium-man', name: 'Cesium Man', path: '/models/CesiumMan.glb', cat: 'Character', desc: 'Humanoid character for animation tests' },
  // — Game-ready characters & environments —
  { id: 'soldier', name: 'Soldier', path: '/models/Soldier.glb', cat: 'Game', desc: 'Rigged military game character — test with your game lighting' },
  { id: 'xbot', name: 'Game Character', path: '/models/Xbot.glb', cat: 'Game', desc: 'Prototype game character rig — classic industry test asset' },
  { id: 'michelle', name: 'Michelle', path: '/models/Michelle.glb', cat: 'Game', desc: 'Realistic rigged female character — AAA game production quality' },
  { id: 'littlest-tokyo', name: 'Tokyo Scene', path: '/models/LittlestTokyo.glb', cat: 'Game', desc: 'Stylized Japanese city environment — test scene lighting at scale' },
  { id: 'buggy', name: 'Buggy', path: '/models/Buggy.glb', cat: 'Game', desc: 'Open-world off-road vehicle — game-ready with full PBR materials' },
];

const BASE_PRICE = 2499;

/* ── Helpers ── */
function Tip({ text, children, pos = 'bottom', fullWidth = false }: { text: string; children: React.ReactNode; pos?: 'bottom' | 'top' | 'left' | 'right'; fullWidth?: boolean }) {
  const [s, setS] = useState(false);
  const p: React.CSSProperties = pos === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '5px' }
    : pos === 'left' ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '5px' }
    : pos === 'right' ? { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '5px' }
    : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '5px' };
  return (
    <div style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-flex', width: fullWidth ? '100%' : undefined }} onMouseEnter={() => setS(true)} onMouseLeave={() => setS(false)}>
      {children}
      {s && <div style={{ position: 'absolute', ...p, zIndex: 200, background: 'rgba(8,8,12,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', padding: '4px 8px', fontSize: '9px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'normal', maxWidth: '180px', textAlign: 'center', pointerEvents: 'none', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.1s ease', letterSpacing: '0.01em', lineHeight: 1.5 }}>{text}</div>}
    </div>
  );
}

function NumericInput({
  value,
  min,
  max,
  step,
  onChange,
  style,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  style?: React.CSSProperties;
}) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(String(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(local);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setLocal(String(clamped));
    } else {
      setLocal(String(value));
    }
    setFocused(false);
  };

  return (
    <input
      type="number"
      value={local}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
      style={style}
    />
  );
}

function Slider({ label, value, min, max, step, onChange, unit = '', defaultValue, tooltip }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string; defaultValue?: number; tooltip?: string }) {
  const isDefault = defaultValue !== undefined && Math.abs(value - defaultValue) < step * 0.5;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
          {tooltip && <span title={tooltip} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)', cursor: 'help', lineHeight: 1 }}>?</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{value.toFixed(step < 1 ? step < 0.1 ? 2 : 1 : 0)}{unit}</span>
          {defaultValue !== undefined && !isDefault && (
            <button onClick={() => onChange(defaultValue)} title="Reset to default" style={{ fontSize: '8px', color: 'rgba(108,99,255,0.6)', padding: '0 2px', lineHeight: 1, cursor: 'pointer', border: 'none', background: 'none' }}>↺</button>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#6C63FF', height: '2px', opacity: 0.8 }} />
    </div>
  );
}

/* ── Page ── */
export default function Page() {
  // Product config
  const [bodyColor, setBodyColor] = useState('#1a1a2e');
  const [accentColor, setAccentColor] = useState('#6C63FF');
  const [baseColor, setBaseColor] = useState('#2a2a35');
  const [mat, setMat] = useState<MatType>('glossy');
  const [env, setEnv] = useState('studio');
  const [exploded, setExploded] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [shadingMode, setShadingMode] = useState<ShadingMode>('pbr');

  // Viewport
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.8);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  // SSR-safe: always start open (matches server), correct after hydration
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Viewport dimensions — needed for JS-computed camera boundary box (CSS aspect-ratio breaks for portrait/square)
  const [vpW, setVpW] = useState(1920);
  const [vpH, setVpH] = useState(1080);
  useEffect(() => {
    // Set correct initial value post-hydration + auto-restore on responsive exit
    setSidebarOpen(window.innerWidth > 768);
    setVpW(window.innerWidth);
    setVpH(window.innerHeight);
    const onResize = () => {
      setSidebarOpen(window.innerWidth > 768);
      setVpW(window.innerWidth);
      setVpH(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Camera
  const [fov, setFov] = useState(40);

  // Lighting
  const [lightI, setLightI] = useState(1.2);
  const [lightAng, setLightAng] = useState(45);
  const [lightH, setLightH] = useState(8);
  const [ambI, setAmbI] = useState(0.3);

  // Post-processing (disable on mobile for performance)
  // SSR-safe: default true server-side, disable on mobile post-hydration
  const [enablePP, setEnablePP] = useState(true);
  useEffect(() => { setEnablePP(window.innerWidth > 768); }, []);
  const [bloomI, setBloomI] = useState(0.15);
  const [bloomT, setBloomT] = useState(0.9);
  const [vigI, setVigI] = useState(0.3);
  const [ssao, setSsao] = useState(true);
  const [ssaoRadius, setSsaoRadius] = useState(0.5);
  const [ssaoIntensity, setSsaoIntensity] = useState(1.0);
  const [chromaticAb, setChromaticAb] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // Render
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  // Custom render dimensions (directly set, not a multiplier)
  const [renderWidth, setRenderWidth] = useState(1920);
  const [renderHeight, setRenderHeight] = useState(1080);
  const [renderSamples, setRenderSamples] = useState(4);
  const [renderFormat, setRenderFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [renderQuality, setRenderQuality] = useState(0.92);
  const [renderFilename, setRenderFilename] = useState('');

  // Turntable render
  const [ttFrames, setTtFrames] = useState(120);
  const [ttFps, setTtFps] = useState(24);
  const [ttFormat, setTtFormat] = useState<'webm' | 'png-zip' | 'jpg-zip' | 'webp-zip'>('webm');
  const [ttActive, setTtActive] = useState(false);
  const ttActiveRef = useRef(false);
  const [ttPreviewActive, setTtPreviewActive] = useState(false);
  const [ttProgress, setTtProgress] = useState(0);
  const [ttCurrentFrame, setTtCurrentFrame] = useState(0);
  const cancelTtRef = useRef(false);
  const [ttDirection, setTtDirection] = useState<'cw' | 'ccw'>('cw');
  const [ttEasing, setTtEasing] = useState<'linear' | 'smooth'>('linear');
  const setAzimuthRef = useRef<((angle: number) => void) | null>(null);
  const getAzimuthRef = useRef<(() => number) | null>(null);

  // F key focus-on-selection — ref set by FocusController inside Canvas
  const focusOnModelRef = useRef<(() => void) | null>(null);

  // Transform properties panel (Blender-style)
  const [displayTransform, setDisplayTransform] = useState<TransformSnapshot | null>(null);
  const [transformPanelOpen, setTransformPanelOpen] = useState(true);
  const [transformActioned, setTransformActioned] = useState(false);
  const applyTransformRef = useRef<ApplyTransformFn | null>(null);
  // Direct ref to the Scene model group for immediate Three.js scale updates (zero React latency)
  const externalGroupRef = useRef<any>(null);

  // Marquee select
  const marqueeStartRef = useRef<{ x: number; y: number; shift: boolean } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const sceneProjectorRef = useRef<((worldPos: [number, number, number]) => { x: number; y: number } | null) | null>(null);

  // Camera boundary drag handles
  const boundaryRef = useRef<HTMLDivElement>(null);
  const boundaryDragRef = useRef<{ handle: string; startX: number; startY: number; startW: number; startH: number; screenW: number; screenH: number } | null>(null);
  const [showCameraBoundary, setShowCameraBoundary] = useState(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState('chair');

  // Environment
  const [showEnvBg, setShowEnvBg] = useState(true);
  const [customHdri, setCustomHdri] = useState<string | null>(null);
  const [hdriLighting, setHdriLighting] = useState(true); // HDRI contributes IBL lighting

  // Camera gizmo mode (G=translate, E=rotate — only when camera is in scene)
  const [cameraGizmoMode, setCameraGizmoMode] = useState<'translate' | 'rotate'>('translate');

  // Multi-select model system (Blender-style Shift+click add, Ctrl+click remove)
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const modelSelected = selectedObjectIds.includes('model');
  const [modelTransformMode, setModelTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [modelUniformScale, setModelUniformScale] = useState(1.0);
  const modelScaleActive = modelSelected && modelTransformMode === 'scale';

  // Viewport ref + scale mode refs (non-passive wheel + MMB drag) — must be after modelScaleActive
  const viewportRef = useRef<HTMLDivElement>(null);
  const modelScaleActiveRef = useRef(false);
  const modelUniformScaleRef = useRef(1.0);
  const mmbScaleRef = useRef<{ y: number; startScale: number } | null>(null);
  useEffect(() => { modelScaleActiveRef.current = modelScaleActive; }, [modelScaleActive]);
  useEffect(() => { modelUniformScaleRef.current = modelUniformScale; }, [modelUniformScale]);

  // Non-passive scroll scale + MMB drag scale on the viewport element
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    // Non-passive wheel — prevents OrbitControls from zooming when in scale mode
    const onWheel = (e: WheelEvent) => {
      if (!modelScaleActiveRef.current) return;
      e.preventDefault(); e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const next = Math.max(0.05, Math.min(10, parseFloat((modelUniformScaleRef.current + delta).toFixed(2))));
      // Direct Three.js update first (immediate, no React latency)
      externalGroupRef.current?.scale.setScalar(next);
      modelUniformScaleRef.current = next;
      setModelUniformScale(next);
      setTransformActioned(true);
      // Update transform panel IMMEDIATELY — bypass TransformReporter's 83ms poll for live feel
      setDisplayTransform(prev => prev
        ? { ...prev, s: next }
        : { px: externalGroupRef.current?.position.x ?? 0, py: externalGroupRef.current?.position.y ?? 0, pz: externalGroupRef.current?.position.z ?? 0, rx: 0, ry: 0, rz: 0, s: next }
      );
    };
    // MMB hold + drag up/down to scale (industry standard scroll-wheel button drag)
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 1 || !modelScaleActiveRef.current) return;
      e.preventDefault(); e.stopPropagation();
      mmbScaleRef.current = { y: e.clientY, startScale: modelUniformScaleRef.current };
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!mmbScaleRef.current) return;
      const dy = e.clientY - mmbScaleRef.current.y; // down = positive = bigger (Blender standard)
      const newScale = Math.max(0.05, Math.min(10, parseFloat((mmbScaleRef.current.startScale + dy * 0.008).toFixed(3))));
      // Direct Three.js update first (zero-latency visual feedback)
      externalGroupRef.current?.scale.setScalar(newScale);
      modelUniformScaleRef.current = newScale;
      setModelUniformScale(newScale);
      // Live transform panel update during MMB drag (bypasses TransformReporter polling)
      setDisplayTransform(prev => prev
        ? { ...prev, s: newScale }
        : { px: externalGroupRef.current?.position.x ?? 0, py: externalGroupRef.current?.position.y ?? 0, pz: externalGroupRef.current?.position.z ?? 0, rx: 0, ry: 0, rz: 0, s: newScale }
      );
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1) {
        if (mmbScaleRef.current) setTransformActioned(true);
        mmbScaleRef.current = null;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('pointerdown', onPointerDown, { capture: true });
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('wheel', onWheel, { capture: true } as any);
      el.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Marquee select + boundary drag — window-level pointer tracking
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ms = marqueeStartRef.current;
      if (ms) {
        setMarqueeRect({ x: Math.min(e.clientX, ms.x), y: Math.min(e.clientY, ms.y), w: Math.abs(e.clientX - ms.x), h: Math.abs(e.clientY - ms.y) });
      }
      const bd = boundaryDragRef.current;
      if (bd) {
        const dx = e.clientX - bd.startX, dy = e.clientY - bd.startY;
        const sx = bd.startW / (bd.screenW || 1), sy = bd.startH / (bd.screenH || 1);
        let nW = bd.startW, nH = bd.startH;
        if (bd.handle.includes('e')) nW = Math.max(100, Math.round(bd.startW + dx * sx));
        if (bd.handle.includes('w')) nW = Math.max(100, Math.round(bd.startW - dx * sx));
        if (bd.handle.includes('s')) nH = Math.max(100, Math.round(bd.startH + dy * sy));
        if (bd.handle.includes('n')) nH = Math.max(100, Math.round(bd.startH - dy * sy));
        setRenderWidth(nW); setRenderHeight(nH);
      }
    };
    const onUp = (e: PointerEvent) => {
      const ms = marqueeStartRef.current;
      if (ms) {
        const dx = Math.abs(e.clientX - ms.x), dy = Math.abs(e.clientY - ms.y);
        if (dx > 8 || dy > 8) {
          const rect = { x: Math.min(e.clientX, ms.x), y: Math.min(e.clientY, ms.y), w: Math.abs(e.clientX - ms.x), h: Math.abs(e.clientY - ms.y) };
          const proj = sceneProjectorRef.current;
          const inside = (pos: { x: number; y: number } | null) => pos && pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;
          const hits: string[] = [];
          if (proj && inside(proj([0, 0, 0]))) hits.push('model');
          if (hits.length > 0) setSelectedObjectIds(prev => ms.shift ? [...new Set([...prev, ...hits])] : hits);
          else if (!ms.shift) setSelectedObjectIds([]);
        }
        marqueeStartRef.current = null; setMarqueeRect(null);
      }
      if (boundaryDragRef.current) boundaryDragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);

  // Stale-closure refs for keyboard handler
  const modelSelectedRef = useRef(false);
  const modelTransformModeRef = useRef<'translate' | 'rotate' | 'scale'>('translate');
  const renderingRef = useRef(false);
  useEffect(() => { modelSelectedRef.current = modelSelected; }, [modelSelected]);
  useEffect(() => { modelTransformModeRef.current = modelTransformMode; }, [modelTransformMode]);
  useEffect(() => { renderingRef.current = rendering; }, [rendering]);
  useEffect(() => { ttActiveRef.current = ttActive; }, [ttActive]);

  // File
  const [userFile, setUserFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Scene stats
  const [sceneStats, setSceneStats] = useState<SceneStats | null>(null);

  // User scene lights
  const [sceneLights, setSceneLights] = useState<SceneLight[]>([]);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const handleMoveLight = useCallback((id: string, pos: [number,number,number]) => {
    setSceneLights(ls => ls.map(l => l.id === id ? {...l, x: pos[0], y: pos[1], z: pos[2]} : l));
  }, []);

  // Scene Camera
  const [showSceneCamera, setShowSceneCamera] = useState(false);
  // Scene camera position — intentionally DIFFERENT from orbit camera default [3,2,5]
  // If they matched, the camera gizmo would render from inside the orbit camera → frustum lines fill the viewport
  const [cameraPos, setCameraPos] = useState<[number,number,number]>([0, 1.5, 4]);
  const [cameraViewMode, setCameraViewMode] = useState(false);
  const cameraViewModeRef = useRef(false);
  useEffect(() => { cameraViewModeRef.current = cameraViewMode; }, [cameraViewMode]);
  const [lockCameraToView, setLockCameraToView] = useState(true);

  // (rotationMode removed — E now controls camera gizmo rotate in scene)
  const rotationMode = false;
  const rotationStepRef = useRef<((deg: number) => void) | null>(null);

  // Override color (null = original materials)
  const [overrideColor, setOverrideColor] = useState<string | null>(null);

  // UI
  const [shadingOverlay, setShadingOverlay] = useState(false);
  const [shadingPreviews, setShadingPreviews] = useState<Record<string, string>>({});
  const [hoveredShading, setHoveredShading] = useState<ShadingMode | null>(null);
  const [tab, setTab] = useState<'model' | 'scene' | 'camera' | 'light' | 'render' | 'display'>('model');
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderer | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hdriRef = useRef<HTMLInputElement | null>(null);
  const cancelRenderRef = useRef(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const previewsReady = useRef(false);
  const capturingRef = useRef(false);
  const captureGenRef = useRef(0);
  const shadingModeRef = useRef<ShadingMode>('pbr');

  // Keep shadingModeRef in sync so refreshPreviews can read current mode without stale closure
  useEffect(() => { shadingModeRef.current = shadingMode; }, [shadingMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (window.innerWidth > 768) setSidebarOpen(prev => !prev);
      }
      // G = Move (translate gizmo)
      if (e.key === 'g' || e.key === 'G') {
        setCameraGizmoMode('translate');
        if (modelSelectedRef.current) setModelTransformMode('translate');
      }
      // E = Rotate gizmo
      if (e.key === 'e' || e.key === 'E') {
        setCameraGizmoMode('rotate');
        if (modelSelectedRef.current) setModelTransformMode('rotate');
      }
      // R = Scale mode (scroll to scale)
      if (e.key === 'r' || e.key === 'R') {
        if (modelSelectedRef.current) setModelTransformMode('scale');
      }
      // F4 = enter / exit camera view
      if (e.key === 'F4') {
        e.preventDefault();
        const entering = !cameraViewModeRef.current;
        if (entering) {
          setShowSceneCamera(true);
          setCameraViewMode(true);
        } else {
          setLockCameraToView(false);
          setCameraViewMode(false);
        }
      }
      // F = Focus on selected object (Blender-style: frame/zoom camera to fit selection)
      if (e.key === 'f' || e.key === 'F') {
        if (modelSelectedRef.current) {
          focusOnModelRef.current?.();
        }
      }
      // Escape = cancel turntable OR cancel render OR deselect all
      if (e.key === 'Escape') {
        if (ttActiveRef.current) { cancelTtRef.current = true; return; }
        if (renderingRef.current) { cancelRenderRef.current = true; return; }
        setSelectedObjectIds([]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refreshPreviews = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Abort any existing capture
    capturingRef.current = false;
    const gen = ++captureGenRef.current;
    await new Promise<void>(r => setTimeout(r, 20)); // let abort take effect
    capturingRef.current = true;

    const originalMode = shadingModeRef.current;
    const modes: ShadingMode[] = ['pbr', 'matcap', 'normals', 'wireframe', 'unlit', 'toon'];

    // Dark mask
    const container = canvas.parentElement;
    const mask = document.createElement('div');
    mask.style.cssText = 'position:absolute;inset:0;background:#08080C;z-index:29;pointer-events:none;opacity:1;transition:opacity 0.2s;';
    container?.appendChild(mask);

    for (const mode of modes) {
      if (gen !== captureGenRef.current) break; // aborted by newer call or user click
      setShadingMode(mode);
      await new Promise<void>(r => setTimeout(r, 360));
      if (gen !== captureGenRef.current) break;
      await new Promise<void>(r => { let c = 0; const t = () => { if (++c >= 6) r(); else requestAnimationFrame(t); }; requestAnimationFrame(t); });
      if (gen !== captureGenRef.current) break;
      const img = canvas.toDataURL('image/jpeg', 0.82);
      setShadingPreviews(prev => ({ ...prev, [mode]: img }));
    }

    // Only restore original mode if not aborted (user hasn't clicked a mode)
    if (gen === captureGenRef.current) {
      setShadingMode(originalMode);
      await new Promise<void>(r => setTimeout(r, 200));
    }

    mask.style.opacity = '0';
    setTimeout(() => mask.remove(), 220);

    if (gen === captureGenRef.current) {
      previewsReady.current = true;
      capturingRef.current = false;
    }
  }, []);

  const openShadingOverlay = useCallback(async () => {
    if (shadingOverlay) { setShadingOverlay(false); return; }
    // Clear stale previews so no wrong images flash
    setShadingPreviews({});
    previewsReady.current = false;
    setShadingOverlay(true);
    refreshPreviews();
  }, [shadingOverlay, refreshPreviews]);

  const screenshot = useCallback(async () => {
    if (!canvasRef.current) return;
    const hadGrid = showGrid;
    if (hadGrid) setShowGrid(false);
    await new Promise<void>(r => { let c = 0; const t = () => { if (++c >= 3) r(); else requestAnimationFrame(t); }; requestAnimationFrame(t); });
    const a = document.createElement('a');
    a.download = `slothstudio-3d-viewer-${Date.now()}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
    if (hadGrid) setShowGrid(true);
    showToast('Screenshot saved');
  }, [showGrid]);

  const cancelRender = useCallback(() => {
    cancelRenderRef.current = true;
  }, []);

  const cancelTurntable = useCallback(() => {
    cancelTtRef.current = true;
  }, []);

  const renderTurntable = useCallback(async () => {
    const gl = glRef.current;
    if (!gl || !setAzimuthRef.current) return;

    cancelTtRef.current = false;
    setTtPreviewActive(false);
    // Exit camera view mode if active — CameraViewSyncer fights the azimuth setter and causes flickering
    setCameraViewMode(false);
    setTtActive(true);
    setRendering(true);
    setTtProgress(0);

    const oW = (gl.domElement as HTMLCanvasElement).width;
    const oH = (gl.domElement as HTMLCanvasElement).height;
    const rW = renderWidth;
    const rH = renderHeight;

    gl.setSize(rW, rH, false);
    gl.setPixelRatio(1);

    const totalFrames = ttFrames;
    const startAngle = getAzimuthRef.current ? getAzimuthRef.current() : 0;
    const dirSign = ttDirection === 'cw' ? 1 : -1;

    const frameAngle = (i: number) => {
      const t = i / totalFrames;
      const eased = ttEasing === 'smooth' ? (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t) : t;
      return startAngle + eased * Math.PI * 2 * dirSign;
    };

    try {
      if (ttFormat === 'webm') {
        // captureStream(0) = no automatic capture; we push each frame manually via requestFrame()
        // This avoids the sync mismatch where the stream timer and gl.render() run independently
        const stream = (gl.domElement as HTMLCanvasElement).captureStream(0);
        const track = stream.getVideoTracks()[0] as any; // CanvasCaptureMediaStreamTrack
        const chunks: BlobPart[] = [];
        // VP8 has the broadest platform support (incl. Windows without extensions)
        // VP9 is higher quality but requires codec packs on Windows
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        // Create stopPromise BEFORE starting recorder so resolve is captured
        const stopPromise = new Promise<void>((resolve, reject) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = renderFilename.trim() ? `${renderFilename.trim()}.webm` : `slothview-turntable-${rW}x${rH}-${totalFrames}f.webm`;
            a.click();
            resolve();
          };
          recorder.onerror = () => reject(new Error('MediaRecorder error'));
        });
        recorder.start();

        // Brief init pause so recorder is ready before first frame
        await new Promise(r => setTimeout(r, 80));

        const frameMs = 1000 / ttFps;
        for (let i = 0; i < totalFrames; i++) {
          if (cancelTtRef.current) { recorder.stop(); break; }
          // Render the rotated frame
          setAzimuthRef.current!(frameAngle(i));
          // Wait one animation frame so the browser fully composites the WebGL output before capture
          await new Promise(r => requestAnimationFrame(r));
          track.requestFrame(); // push exactly this rendered canvas frame
          setTtProgress(Math.round(((i + 1) / totalFrames) * 100));
          setTtCurrentFrame(i + 1);
          // Pace remaining time at target FPS (subtract ~16ms already spent in rAF)
          await new Promise(r => setTimeout(r, Math.max(0, frameMs - 16)));
        }
        if (!cancelTtRef.current) recorder.stop();

        // Wait for blob to be created and download triggered
        await stopPromise;

      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const folder = zip.folder('frames')!;

        const ext = ttFormat === 'jpg-zip' ? 'jpg' : ttFormat === 'webp-zip' ? 'webp' : 'png';
        const mime = ttFormat === 'jpg-zip' ? 'image/jpeg' : ttFormat === 'webp-zip' ? 'image/webp' : 'image/png';

        let captured = 0;
        for (let i = 0; i < totalFrames; i++) {
          if (cancelTtRef.current) break;
          setAzimuthRef.current!(frameAngle(i));
          setTtProgress(Math.round(((i + 1) / totalFrames) * 100));
          setTtCurrentFrame(i + 1);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const blob = await new Promise<Blob>((res) =>
            (gl.domElement as HTMLCanvasElement).toBlob((b) => res(b!), mime, 0.92)
          );
          folder.file(`frame_${String(i + 1).padStart(4, '0')}.${ext}`, blob);
          captured++;
        }

        if (captured > 0) {
          const partial = cancelTtRef.current;
          showToast(partial ? `Packing partial ZIP (${captured}/${totalFrames})...` : 'Packing ZIP...');
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(zipBlob);
          const baseName = renderFilename.trim() || `slothview-turntable-${rW}x${rH}-${totalFrames}f`;
          a.download = partial ? `${baseName}-partial-${captured}of${totalFrames}.zip` : `${baseName}.zip`;
          a.click();
        }
      }
    } finally {
      gl.setSize(oW, oH, false);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // Return to start angle, not 0
      if (setAzimuthRef.current) setAzimuthRef.current(startAngle);
      setTtActive(false);
      setRendering(false);
      setTtProgress(0);
      setTtCurrentFrame(0);
      if (cancelTtRef.current) {
        // Toast already shown for partial zip; video partial downloads via recorder.onstop
      } else {
        showToast('Turntable export complete');
      }
      cancelTtRef.current = false;
    }
  }, [renderWidth, renderHeight, ttFrames, ttFps, ttFormat, ttDirection, ttEasing, renderFilename]);

  const render = useCallback(() => {
    const gl = glRef.current, c = canvasRef.current;
    if (!gl || !c) return;
    cancelRenderRef.current = false;
    const hadGrid = showGrid;
    if (hadGrid) setShowGrid(false);
    setRendering(true);
    const oW = c.width, oH = c.height;
    const rW = renderWidth, rH = renderHeight;
    gl.setSize(rW, rH, false);
    gl.setPixelRatio(1);
    setRenderProgress(0);
    let frame = 0;
    const abort = () => {
      gl.setSize(oW, oH, false);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (hadGrid) setShowGrid(true);
      setRendering(false);
      setRenderProgress(0);
      showToast('Render cancelled');
    };
    const doFrame = () => {
      if (cancelRenderRef.current) { abort(); return; }
      if (frame < renderSamples) {
        frame++;
        setRenderProgress(Math.round((frame / renderSamples) * 100));
        requestAnimationFrame(doFrame);
      } else {
        const mimeType = renderFormat === 'jpeg' ? 'image/jpeg' : renderFormat === 'webp' ? 'image/webp' : 'image/png';
        const url = gl.domElement.toDataURL(mimeType, renderFormat !== 'png' ? renderQuality : undefined);
        gl.setSize(oW, oH, false);
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const a = document.createElement('a');
        a.download = renderFilename.trim() ? `${renderFilename.trim()}.${renderFormat}` : `slothview-render-${rW}x${rH}-${renderSamples}spp.${renderFormat}`;
        a.href = url;
        a.click();
        setRendering(false);
        if (hadGrid) setShowGrid(true);
        showToast(`Rendered ${rW}x${rH} @ ${renderSamples} samples`);
      }
    };
    setTimeout(() => requestAnimationFrame(doFrame), 100);
  }, [renderWidth, renderHeight, renderSamples, renderFormat, renderQuality, showGrid, renderFilename]);

  const fullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const share = useCallback(() => {
    const url = `${window.location.origin}?b=${bodyColor.slice(1)}&a=${accentColor.slice(1)}&m=${mat}&e=${env}`;
    navigator.clipboard.writeText(url).then(() => showToast('Config URL copied'));
  }, [bodyColor, accentColor, mat, env]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && ['glb', 'gltf', 'fbx', 'obj'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setUserFile(f); showToast(`Loaded: ${f.name}`);
    } else showToast('Formats: GLB, GLTF, FBX, OBJ');
  }, []);

  const price = BASE_PRICE + (MATERIALS.find(m => m.v === mat)?.p || 0);
  const focalLength = Math.round(36 / (2 * Math.tan((fov * Math.PI / 180) / 2)));

  /* ── Shared UI ── */
  const ibtn = (icon: React.ReactNode, tip: string, active: boolean, fn: () => void, pos: 'top' | 'bottom' = 'bottom') => (
    <Tip text={tip} pos={pos} key={tip}>
      <button onClick={fn} style={{
        width: '30px', height: '30px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(108,99,255,0.12)' : 'transparent',
        border: active ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
        color: active ? '#6C63FF' : 'rgba(255,255,255,0.3)', transition: 'all 0.15s',
      }}>{icon}</button>
    </Tip>
  );

  const cswatch = (c: { n: string; v: string }, sel: boolean, fn: () => void) => (
    <Tip text={c.n} pos="top" key={c.v}>
      <button onClick={fn} style={{
        width: '24px', height: '24px', borderRadius: '5px', background: c.v,
        border: sel ? '1.5px solid #6C63FF' : '1.5px solid transparent',
        boxShadow: sel ? '0 0 6px rgba(108,99,255,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        transition: 'all 0.15s', flexShrink: 0, position: 'relative',
      }}>
        {sel && <div style={{ position: 'absolute', inset: 0, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c.v === '#e8e8ec' || c.v === '#b8b8c0' || c.v === '#ffffff' ? '#000' : '#fff'} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        </div>}
      </button>
    </Tip>
  );

  const stl = { label: { fontSize: '9px' as const, color: 'rgba(255,255,255,0.25)' as const, fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.1em' as const, marginBottom: '5px' as const, display: 'block' as const } };

  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', overflow: 'hidden', background: '#08080C', position: 'fixed', inset: 0 }}>

      <input ref={fileRef} type="file" accept=".glb,.gltf,.fbx,.obj" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setUserFile(f); showToast(`Loaded: ${f.name}`); } }} />
      <input ref={hdriRef} type="file" accept=".hdr,.exr" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setCustomHdri(url); setShowEnvBg(true); showToast(`HDRI: ${f.name}`); } }} />

      {/* transform is intentionally NOT in inline style — CSS handles translateX(-50%) + slide-up via toastPop animation */}
      {toast && <div className="toast-msg" style={{ position: 'fixed', bottom: '80px', left: '50%', zIndex: 100, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', padding: '6px 14px', color: '#9590ff', fontSize: '10px', fontWeight: 600, maxWidth: 'calc(100vw - 32px)', textAlign: 'center', whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* drag-to-load removed */}

      {/* ── Top bar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: '32px', background: 'rgba(8,8,12,0.98)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '12px' }}><span style={{ color: '#fff' }}>Sloth</span><span style={{ color: '#4F8EF7' }}>Studio</span> 3D Viewer</span>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
          <span style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', fontSize: '7px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.1em' }}>DEMO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a href="https://slothstudioco.com" target="_blank" rel="noopener" style={{ color: '#00D4A8', fontWeight: 600, textDecoration: 'none', fontSize: '9px' }}>Get a quote &rarr;</a>
        </div>
      </div>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && <div className="sidebar-backdrop" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 35, top: '32px' }} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <div className="sidebar-panel" data-closed={!sidebarOpen} style={{
        width: sidebarOpen ? '250px' : '0px', flexShrink: 0, maxWidth: '85vw',
        background: 'rgba(10,10,14,0.98)', borderRight: '1px solid rgba(255,255,255,0.03)',
        transition: 'width 0.25s ease', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', paddingTop: '32px', zIndex: 10,
      }}>
        <div className="sidebar-inner" style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
        >
          {/* Render-in-progress overlay — grays out all sidebar controls, no cancel button here */}
          {rendering && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(8,8,12,0.8)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', pointerEvents: 'none' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#6C63FF' }}>RENDERING</div>
              <div style={{ width: '130px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${renderProgress}%`, background: 'linear-gradient(90deg,#6C63FF,#9590ff)', borderRadius: '2px', transition: 'width 0.1s' }} />
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{renderProgress}% · {renderWidth}×{renderHeight}</div>
            </div>
          )}
          {/* Panel tabs + close */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {([
              ['model', 'Model', <svg key="mdl" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.2"/></svg>],
              ['scene', 'Environment', <svg key="env" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.5 2.5l.7.7M10.8 10.8l.7.7M10.8 2.5l-.7.7M2.5 10.8l.7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>],
              ['camera', 'Camera', <svg key="cam" width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 4L5.5 2h3l1 2" stroke="currentColor" strokeWidth="1.2"/></svg>],
              ['light', 'Lighting', <svg key="lit" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 9v3M5 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M7 1v1M2.5 2.5l.7.7M1 5.5h1M12 5.5h1M10.8 2.5l-.7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>],
              ['render', 'Render', <svg key="ren" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h3M2 7h6M2 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="8" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>],
              ['display', 'Display', <svg key="dsp" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2.5C2 2.5 4 5 7 5C10 5 12 2.5 12 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 8.5C2 8.5 4 6 7 6C10 6 12 8.5 12 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="3.5" r="1" fill="currentColor"/><circle cx="7" cy="7.5" r="1" fill="currentColor"/></svg>],
            ] as [string, string, React.ReactNode][]).map(([id, label, icon]) => (
              <Tip text={label} pos="bottom" key={id}>
                <button onClick={() => setTab(id as any)} style={{
                  flex: 1, padding: '9px 4px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tab === id ? '#6C63FF' : 'rgba(255,255,255,0.2)',
                  borderBottom: tab === id ? '2px solid #6C63FF' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>{icon}</button>
              </Tip>
            ))}
            {/* Close sidebar button */}
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)} style={{
              padding: '9px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', borderBottom: '2px solid transparent',
              transition: 'all 0.15s', flexShrink: 0,
            }}><IconX /></button>
          </div>

          {/* Panel content */}
          <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

            {/* ── Model tab ── */}
            {tab === 'model' && (
              <div>
                <span style={stl.label}>Preset Models</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '10px' }}>
                  {PRESET_MODELS.map(m => (
                    <Tip key={m.id} text={m.desc} pos="right" fullWidth>
                      <button onClick={() => { setSelectedModel(m.id); setUserFile(null); previewsReady.current = false; showToast(m.name); if (window.innerWidth <= 768) setSidebarOpen(false); }} style={{
                        width: '100%', padding: '6px 8px', borderRadius: '5px', textAlign: 'left',
                        background: !userFile && selectedModel === m.id ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.01)',
                        border: !userFile && selectedModel === m.id ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
                      }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: !userFile && selectedModel === m.id ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconBox /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: !userFile && selectedModel === m.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{m.cat}</div>
                        </div>
                        {!userFile && selectedModel === m.id && <div style={{ marginLeft: 'auto', color: '#6C63FF', flexShrink: 0 }}><IconCheck /></div>}
                      </button>
                    </Tip>
                  ))}
                </div>

                <button onClick={() => fileRef.current?.click()} style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', marginBottom: '12px',
                  background: userFile ? 'rgba(108,99,255,0.06)' : 'rgba(255,255,255,0.015)',
                  border: userFile ? '1px solid rgba(108,99,255,0.15)' : '1px dashed rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <span style={{ color: userFile ? '#6C63FF' : 'rgba(255,255,255,0.2)' }}>{userFile ? <IconFile /> : <IconUpload />}</span>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: userFile ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{userFile ? userFile.name : 'Upload your own'}</div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{userFile ? `${(userFile.size / 1024 / 1024).toFixed(1)} MB` : 'GLB / GLTF / FBX / OBJ'}</div>
                  </div>
                  {userFile && <button onClick={e => { e.stopPropagation(); setUserFile(null); showToast('Removed'); }} style={{ marginLeft: 'auto', color: '#f87171', opacity: 0.6 }}><IconTrash /></button>}
                </button>

                <span style={stl.label}>Style Preset</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px', marginBottom: '4px' }}>
                  {[
                    { id: 'toon', label: 'Toon', desc: 'Cel-shaded', apply: () => { setShadingMode('toon'); setLightI(2.8); setAmbI(0.08); setLightAng(35); setLightH(10); setEnablePP(false); } },
                    { id: 'games', label: 'Games', desc: 'Balanced PBR', apply: () => { setShadingMode('pbr'); setLightI(1.5); setAmbI(0.25); setBloomI(0.12); setBloomT(0.85); setSsao(true); setSsaoRadius(0.3); setSsaoIntensity(1.2); setChromaticAb(0); setEnablePP(true); setEnv('city'); setShowEnvBg(true); } },
                    { id: 'cinematic', label: 'Cinematic', desc: 'Film look', apply: () => { setShadingMode('pbr'); setLightI(1.8); setAmbI(0.06); setBloomI(0.45); setBloomT(0.65); setVigI(0.55); setSsao(true); setSsaoRadius(0.6); setSsaoIntensity(1.8); setChromaticAb(0.0005); setBrightness(0.05); setContrast(0.12); setEnablePP(true); setEnv('sunset'); setShowEnvBg(true); } },
                  ].map(p => (
                    <button key={p.id} onClick={() => { p.apply(); previewsReady.current = false; showToast(p.label); }} title={p.desc} style={{
                      padding: '8px 4px', borderRadius: '6px', textAlign: 'center',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{p.label}</div>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Environment tab (reusing 'scene' id) ── */}
            {tab === 'scene' && (
              <div>
                <span style={stl.label}>HDRI Environment</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', marginBottom: '12px' }}>
                  {ENVS.map(e => (
                    <button key={e} onClick={() => setEnv(e)} title={`Set environment to ${e}`} style={{
                      padding: '6px 2px', borderRadius: '4px', textAlign: 'center', fontSize: '8px', fontWeight: 600,
                      background: env === e ? 'rgba(108,99,255,0.1)' : 'transparent',
                      color: env === e ? '#6C63FF' : 'rgba(255,255,255,0.25)',
                      border: env === e ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.02)',
                      textTransform: 'capitalize', transition: 'all 0.15s',
                    }}>{e}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  <button onClick={() => setShowEnvBg(!showEnvBg)} title="Show or hide the HDRI environment as the background" style={{
                    flex: 1, padding: '6px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600,
                    background: showEnvBg ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.015)',
                    color: showEnvBg ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                    border: showEnvBg ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
                  }}><IconEye /> Background</button>
                  <button onClick={() => hdriRef.current?.click()} title="Upload a custom HDR or EXR environment map" style={{
                    flex: 1, padding: '6px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600,
                    background: customHdri ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.015)',
                    color: customHdri ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                    border: customHdri ? '1px solid rgba(108,99,255,0.2)' : '1px dashed rgba(255,255,255,0.06)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
                  }}><IconUpload /> {customHdri ? 'Custom' : 'Load HDR'}</button>
                </div>
                {/* HDRI Lighting toggle */}
                <button onClick={() => setHdriLighting(!hdriLighting)} title="ON: HDRI acts as both background AND image-based lighting (reflections, ambient GI). Manual lights stack on top — you can use both together. OFF: HDRI background still shows but contributes NO lighting. Only your manual key/fill lights are used." style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: '5px', marginBottom: '12px',
                  background: hdriLighting ? 'rgba(108,99,255,0.06)' : 'rgba(255,255,255,0.015)',
                  border: hdriLighting ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M8.8 2.5l-.7.7M2.5 8.8l.7.7" stroke={hdriLighting ? '#6C63FF' : 'rgba(255,255,255,0.2)'} strokeWidth="1" strokeLinecap="round"/><circle cx="6" cy="6" r="2" stroke={hdriLighting ? '#6C63FF' : 'rgba(255,255,255,0.2)'} strokeWidth="1"/></svg>
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: hdriLighting ? '#fff' : 'rgba(255,255,255,0.4)' }}>HDRI Lighting</div>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{hdriLighting ? 'HDRI bg + IBL + manual lights combined' : 'HDRI bg only — manual lights control all'}</div>
                    </div>
                  </div>
                  <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: hdriLighting ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: hdriLighting ? '16px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </button>
                {customHdri && (
                  <button onClick={() => { setCustomHdri(null); showToast('HDRI removed'); }} style={{
                    width: '100%', padding: '4px 8px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, marginBottom: '10px',
                    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
                    color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}><IconTrash /> Remove custom HDRI</button>
                )}
              </div>
            )}

            {/* ── Lighting tab ── */}
            {tab === 'light' && (
              <div>
                <span style={stl.label}>Presets</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '10px' }}>
                  {LIGHT_PRESETS.map(p => (
                    <button key={p.n} onClick={() => { setLightI(p.i); setAmbI(p.a); setLightAng(p.ang); setLightH(p.h); showToast(p.n); }} title={`Apply ${p.n} lighting`} style={{
                      padding: '5px 2px', borderRadius: '4px', fontSize: '8px', fontWeight: 600,
                      background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s',
                    }}>{p.n}</button>
                  ))}
                </div>
                <Slider label="Key Light" value={lightI} min={0} max={3} step={0.05} onChange={setLightI} defaultValue={1.2} tooltip="Strength of the main directional light hitting the model" />
                <Slider label="Fill / Ambient" value={ambI} min={0} max={1} step={0.02} onChange={setAmbI} defaultValue={0.3} tooltip="Soft fill light — raises the minimum brightness across the whole scene" />
                <Slider label="Light Angle" value={lightAng} min={0} max={360} step={1} onChange={setLightAng} unit="deg" defaultValue={45} tooltip="Horizontal rotation of the key light around the model" />
                <Slider label="Light Height" value={lightH} min={1} max={15} step={0.5} onChange={setLightH} defaultValue={8} tooltip="Vertical elevation of the key light above the model" />

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={stl.label}>Scene Lights</span>
                  <button onClick={() => {
                    const id = `light-${Date.now()}`;
                    // Randomize spawn position so multiple lights don't stack at the same spot
                    const rx = parseFloat(((Math.random() - 0.5) * 6).toFixed(1));
                    const ry = parseFloat((1.5 + Math.random() * 3).toFixed(1));
                    const rz = parseFloat(((Math.random() - 0.5) * 6).toFixed(1));
                    setSceneLights(l => [...l, { id, color: '#ffffff', intensity: 1.5, x: rx, y: ry, z: rz }]);
                  }} title="Add a new point light to the scene" style={{ fontSize: '9px', fontWeight: 700, color: '#6C63FF', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>+ Add</button>
                </div>
                {sceneLights.length === 0 && (
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '8px 0 4px' }}>No scene lights — click Add to place one</div>
                )}
                {sceneLights.map((light, idx) => {
                  const isSel = selectedLightId === light.id;
                  return (
                    <div key={light.id} onClick={() => setSelectedLightId(isSel ? null : light.id)} style={{
                      background: isSel ? 'rgba(108,99,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: isSel ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '6px', padding: '8px', marginBottom: '6px', cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSel ? '8px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: light.color, boxShadow: `0 0 6px ${light.color}` }} />
                          <span style={{ fontSize: '10px', fontWeight: 600, color: isSel ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)' }}>Point Light {idx + 1}</span>
                          {isSel && <span style={{ fontSize: '8px', color: '#6C63FF', fontWeight: 700 }}>SELECTED</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <label onClick={e => e.stopPropagation()} title="Change light color" style={{ width: '18px', height: '18px', borderRadius: '50%', background: light.color, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                            <input type="color" value={light.color} onChange={e => setSceneLights(ls => ls.map(l => l.id === light.id ? {...l, color: e.target.value} : l))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </label>
                          <button onClick={e => { e.stopPropagation(); setSceneLights(ls => ls.filter(l => l.id !== light.id)); if (isSel) setSelectedLightId(null); }} title="Remove this light" style={{ fontSize: '10px', color: '#f87171', opacity: 0.6, padding: '0 2px' }}>✕</button>
                        </div>
                      </div>
                      {isSel && <>
                        <div style={{ fontSize: '8px', color: 'rgba(108,99,255,0.7)', marginBottom: '6px' }}>Drag the gizmo in viewport · or use sliders</div>
                        <Slider label="Intensity" value={light.intensity} min={0} max={5} step={0.1} onChange={v => setSceneLights(ls => ls.map(l => l.id === light.id ? {...l, intensity: v} : l))} defaultValue={1.5} tooltip="Brightness of this point light" />
                        <Slider label="X" value={light.x} min={-10} max={10} step={0.1} onChange={v => setSceneLights(ls => ls.map(l => l.id === light.id ? {...l, x: v} : l))} tooltip="Light X position in world space" />
                        <Slider label="Y" value={light.y} min={0} max={12} step={0.1} onChange={v => setSceneLights(ls => ls.map(l => l.id === light.id ? {...l, y: v} : l))} tooltip="Light height (Y axis)" />
                        <Slider label="Z" value={light.z} min={-10} max={10} step={0.1} onChange={v => setSceneLights(ls => ls.map(l => l.id === light.id ? {...l, z: v} : l))} tooltip="Light Z position in world space" />
                      </>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Camera tab ── */}
            {tab === 'camera' && (
              <div>
                <span style={stl.label}>Lens</span>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Focal Length</span>
                    <span style={{ fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#fff' }}>{focalLength}<span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>mm</span></span>
                  </div>
                  <Slider label="Field of View" value={fov} min={15} max={120} step={1} onChange={setFov} unit="deg" defaultValue={40} tooltip="Camera lens angle — lower = telephoto/compressed, higher = wide angle" />
                  <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                    {[{l:'24mm',v:73},{l:'35mm',v:54},{l:'50mm',v:39},{l:'85mm',v:24},{l:'135mm',v:15}].map(p => (
                      <button key={p.l} onClick={() => setFov(p.v)} style={{
                        flex: 1, padding: '4px 2px', borderRadius: '3px', fontSize: '8px', fontWeight: 600,
                        background: Math.abs(fov - p.v) < 2 ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.015)',
                        color: Math.abs(fov - p.v) < 2 ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                        border: Math.abs(fov - p.v) < 2 ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                        transition: 'all 0.15s',
                      }}>{p.l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '4px 0 12px 0' }} />
                <span style={stl.label}>Scene Camera</span>

                {/* Toggle camera visibility */}
                <button onClick={() => { setShowSceneCamera(!showSceneCamera); if (cameraViewMode) setCameraViewMode(false); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '5px', marginBottom: '8px',
                  background: showSceneCamera ? 'rgba(108,99,255,0.06)' : 'transparent',
                  border: showSceneCamera ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: showSceneCamera ? '#6C63FF' : 'rgba(255,255,255,0.2)' }}><IconCamera /></span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: showSceneCamera ? '#fff' : 'rgba(255,255,255,0.4)' }}>Show Camera</span>
                  </div>
                  <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: showSceneCamera ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: showSceneCamera ? '16px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </button>

                {showSceneCamera && (
                  <>
                    {/* Camera view toggle */}
                    <button onClick={() => { if (cameraViewMode) setLockCameraToView(false); setCameraViewMode(!cameraViewMode); }} style={{
                      width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '10px',
                      background: cameraViewMode ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${cameraViewMode ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.35)'}`,
                      color: cameraViewMode ? '#fff' : '#22c55e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                    }}>
                      {cameraViewMode ? '● Exit Camera View' : 'Enter Camera View'}
                    </button>

                    {/* Camera position */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', fontWeight: 600 }}>Position</div>
                      <Slider label="X" value={cameraPos[0]} min={-15} max={15} step={0.1} onChange={v => setCameraPos([v, cameraPos[1], cameraPos[2]])} defaultValue={3} />
                      <Slider label="Y" value={cameraPos[1]} min={0} max={15} step={0.1} onChange={v => setCameraPos([cameraPos[0], v, cameraPos[2]])} defaultValue={2} />
                      <Slider label="Z" value={cameraPos[2]} min={-15} max={15} step={0.1} onChange={v => setCameraPos([cameraPos[0], cameraPos[1], v])} defaultValue={5} />
                    </div>

                    {!cameraViewMode && (
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', lineHeight: 1.5 }}>
                        Drag gizmo to move &nbsp;·&nbsp; <span style={{ color: 'rgba(108,99,255,0.7)' }}>G</span> = Move &nbsp;·&nbsp; <span style={{ color: 'rgba(108,99,255,0.7)' }}>E</span> = Rotate
                      </div>
                    )}
                    {cameraViewMode && (
                      <div style={{ fontSize: '9px', color: '#ef4444', textAlign: 'center', padding: '5px 8px', background: 'rgba(239,68,68,0.06)', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.15)' }}>
                        Orbit/pan/scroll moves the camera
                      </div>
                    )}

                    {/* ── Render Region ── */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '10px 0' }} />
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Render Region</span>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)', marginTop: '3px', lineHeight: 1.5 }}>Output resolution in pixels. The box in the viewport shows your exact crop area.</div>
                    </div>
                    {/* Resolution presets */}
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {[{ label: '1080p', w: 1920, h: 1080 }, { label: '4K', w: 3840, h: 2160 }, { label: '1:1', w: 2048, h: 2048 }, { label: 'Portrait', w: 1080, h: 1350 }].map(p => {
                        const active = renderWidth === p.w && renderHeight === p.h;
                        return (
                          <button key={p.label} onClick={() => { setRenderWidth(p.w); setRenderHeight(p.h); }} style={{
                            flex: 1, minWidth: '40px', padding: '4px 3px', borderRadius: '3px', fontSize: '8px', fontWeight: 700,
                            background: active ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.015)',
                            color: active ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                            border: active ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                          }}>{p.label}</button>
                        );
                      })}
                    </div>
                    {/* Sliders for visual drag control */}
                    <Slider label="Width" value={Math.min(renderWidth, 4096)} min={480} max={4096} step={8}
                      onChange={v => setRenderWidth(Math.round(v))} unit=" px"
                      tooltip="Controls how many horizontal pixels your render has. More pixels = sharper output, larger file size, longer render. 1920px covers most screens and social media. 3840px is for print or large display work. Go higher only when you specifically need it." />
                    <Slider label="Height" value={Math.min(renderHeight, 4096)} min={270} max={4096} step={8}
                      onChange={v => setRenderHeight(Math.round(v))} unit=" px"
                      tooltip="Controls how many vertical pixels your render has. 1080px pairs with 1920px for the standard 16:9 widescreen ratio used everywhere — screens, presentations, video. 2160px is 4K. For square or portrait formats, match width and height or use a preset above." />
                    {/* Exact px inputs for users who need specific values above slider range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', marginBottom: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.18)', marginBottom: '2px', textAlign: 'center' }}>Exact Width (px)</div>
                        <NumericInput value={renderWidth} min={100} max={16384} step={1}
                          onChange={v => setRenderWidth(v)}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '5px 4px', color: '#fff', fontSize: '11px', fontWeight: 700, textAlign: 'center' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, marginTop: '14px' }}>x</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.18)', marginBottom: '2px', textAlign: 'center' }}>Exact Height (px)</div>
                        <NumericInput value={renderHeight} min={100} max={16384} step={1}
                          onChange={v => setRenderHeight(v)}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '5px 4px', color: '#fff', fontSize: '11px', fontWeight: 700, textAlign: 'center' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.12)', textAlign: 'center', marginBottom: '2px' }}>Current: {renderWidth} x {renderHeight} px</div>
                  </>
                )}
              </div>
            )}

            {/* ── Render tab ── */}
            {tab === 'render' && (
              <div>
                <span style={stl.label}>Post-Processing</span>
                <Tip text="Toggles all post-processing effects on or off. Disable for a clean flat look or to improve performance." pos="top">
                <button onClick={() => setEnablePP(!enablePP)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '5px', width: '100%', marginBottom: '8px',
                  background: enablePP ? 'rgba(108,99,255,0.06)' : 'transparent', border: enablePP ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: enablePP ? '#fff' : 'rgba(255,255,255,0.4)' }}>Enable Effects</span>
                  <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: enablePP ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: enablePP ? '16px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </button>
                </Tip>
                {enablePP && (
                  <>
                    <Slider label="Bloom Intensity" value={bloomI} min={0} max={1} step={0.01} onChange={setBloomI} defaultValue={0.15} tooltip="Adds a soft glow around bright surfaces — raise for neon/cinematic looks" />
                    <Slider label="Bloom Threshold" value={bloomT} min={0} max={1.5} step={0.05} onChange={setBloomT} defaultValue={0.9} tooltip="Brightness cutoff before glow kicks in — lower = more glow everywhere" />
                    <Slider label="Vignette" value={vigI} min={0} max={1} step={0.05} onChange={setVigI} defaultValue={0.3} tooltip="Darkens the viewport edges for a cinematic / lens falloff look" />
                    <Tip text="Screen Space Ambient Occlusion -- adds soft shadows in crevices and contact points for depth and realism." pos="top">
                    <button onClick={() => setSsao(!ssao)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '5px', width: '100%', marginBottom: '4px',
                      background: ssao ? 'rgba(108,99,255,0.06)' : 'transparent', border: ssao ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: ssao ? '#fff' : 'rgba(255,255,255,0.4)' }}>SSAO (Ambient Occlusion)</span>
                      <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: ssao ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: ssao ? '16px' : '2px', transition: 'left 0.2s' }} />
                      </div>
                    </button>
                    </Tip>
                    {ssao && <>
                      <Slider label="AO Radius" value={ssaoRadius} min={0.1} max={2} step={0.05} onChange={setSsaoRadius} defaultValue={0.5} tooltip="How far ambient occlusion shadows spread from contact points" />
                      <Slider label="AO Intensity" value={ssaoIntensity} min={0} max={4} step={0.1} onChange={setSsaoIntensity} defaultValue={1.0} tooltip="Strength of the ambient occlusion darkening effect" />
                    </>}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '8px 0' }} />
                    <span style={stl.label}>Color Grading</span>
                    <Slider label="Brightness" value={brightness} min={-0.4} max={0.4} step={0.01} onChange={setBrightness} defaultValue={0} tooltip="Post-process overall brightness adjustment" />
                    <Slider label="Contrast" value={contrast} min={-0.4} max={0.4} step={0.01} onChange={setContrast} defaultValue={0} tooltip="Post-process contrast — raises darks and lowers highlights when negative" />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '8px 0' }} />
                    <span style={stl.label}>Lens Effects</span>
                    <Slider label="Chromatic Aberration" value={chromaticAb} min={0} max={0.01} step={0.0005} onChange={setChromaticAb} defaultValue={0} tooltip="Simulates lens color fringing at the edges — subtle realism effect" />
                  </>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '10px 0' }} />

                <span style={stl.label}>Format</span>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', marginBottom: '8px' }}>
                  {([
                    { id: 'png', label: 'PNG', desc: 'Lossless · transparent', tip: 'Lossless quality, supports transparency. Largest file size.' },
                    { id: 'jpeg', label: 'JPEG', desc: 'Lossy · smaller file', tip: 'Compressed format. Smaller file, slight quality loss. Best for sharing.' },
                    { id: 'webp', label: 'WebP', desc: 'Modern · best ratio', tip: 'Modern format. Small file with near-lossless quality. Best overall.' },
                  ] as const).map(f => (
                    <Tip key={f.id} text={f.tip} pos="top">
                    <button onClick={() => setRenderFormat(f.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px',
                      marginBottom: '2px', borderRadius: '4px', textAlign: 'left',
                      background: renderFormat === f.id ? 'rgba(108,99,255,0.14)' : 'transparent',
                      border: renderFormat === f.id ? '1px solid rgba(108,99,255,0.25)' : '1px solid transparent',
                    }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid ${renderFormat === f.id ? '#6C63FF' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {renderFormat === f.id && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6C63FF' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: renderFormat === f.id ? '#fff' : 'rgba(255,255,255,0.4)' }}>{f.label}</div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{f.desc}</div>
                      </div>
                    </button>
                    </Tip>
                  ))}
                  {renderFormat !== 'png' && (
                    <div style={{ marginTop: '6px' }}>
                      <Slider label="Quality" value={renderQuality * 100} min={10} max={100} step={1} onChange={v => setRenderQuality(v / 100)} unit="%" tooltip="Compression quality. 92% is near-lossless for most uses." />
                    </div>
                  )}
                </div>

                <span style={stl.label}>Export</span>
                {/* Output filename */}
                <Tip text="Custom filename for the downloaded file. Applies to both Render Image and Turntable exports. Leave blank to use the auto-generated name." pos="top" fullWidth>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Output Filename (optional)</div>
                    <input
                      type="text"
                      value={renderFilename}
                      onChange={e => setRenderFilename(e.target.value)}
                      placeholder="e.g. my-render"
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '4px', padding: '5px 8px', color: '#fff', fontSize: '10px',
                        outline: 'none', boxSizing: 'border-box' as const,
                      }}
                    />
                    <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.15)', marginTop: '3px', lineHeight: 1.4 }}>
                      If blank, you will be prompted to save the file after render completes. The file goes to your browser downloads folder.
                    </div>
                  </div>
                </Tip>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                  {/* Resolution presets */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '1080p', w: 1920, h: 1080, tip: '1920x1080 -- standard HD, ideal for web and most screens' },
                      { label: '4K', w: 3840, h: 2160, tip: '3840x2160 -- ultra HD, great for print and large displays. 4x more pixels than 1080p.' },
                      { label: '1:1', w: 2048, h: 2048, tip: '2048x2048 -- perfect square format for product photos, social posts, and thumbnails' },
                      { label: 'Portrait', w: 1080, h: 1350, tip: '1080x1350 -- portrait ratio, ideal for Instagram and vertical content' },
                      { label: '8K', w: 7680, h: 4320, tip: '7680x4320 -- extreme resolution. Slow to render, only use for print or professional exports.' },
                    ].map(p => {
                      const active = renderWidth === p.w && renderHeight === p.h;
                      return (
                        <Tip key={p.label} text={p.tip} pos="top">
                        <button onClick={() => { setRenderWidth(p.w); setRenderHeight(p.h); }} style={{
                          flex: 1, minWidth: '40px', padding: '4px 3px', borderRadius: '3px', fontSize: '8px', fontWeight: 700,
                          background: active ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.015)',
                          color: active ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                          border: active ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                        }}>{p.label}</button>
                        </Tip>
                      );
                    })}
                  </div>
                  {/* Custom W × H inputs */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <NumericInput value={renderWidth} min={100} max={8192} step={1}
                        onChange={v => setRenderWidth(v)}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 6px', color: '#fff', fontSize: '10px', fontWeight: 600, textAlign: 'center' }} />
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>×</span>
                      <NumericInput value={renderHeight} min={100} max={8192} step={1}
                        onChange={v => setRenderHeight(v)}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 6px', color: '#fff', fontSize: '10px', fontWeight: 600, textAlign: 'center' }} />
                      <Tip text="Custom width and height in pixels. Max 8192px per side." pos="top"><span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>px</span></Tip>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Tip text="Reset resolution to 1920x1080 (standard 1080p)" pos="top">
                      <button
                        onClick={() => { setRenderWidth(1920); setRenderHeight(1080); }}
                        style={{ fontSize: '8px', color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.1)', letterSpacing: '0.02em' }}
                      >Reset to default (1920x1080)</button>
                      </Tip>
                    </div>
                  </div>
                  {(renderWidth > 3840 || renderHeight > 2160) && ttFormat !== 'webm' && <div style={{ fontSize: '8px', color: '#f87171', marginBottom: '6px', padding: '4px 8px', background: 'rgba(248,113,113,0.06)', borderRadius: '4px', border: '1px solid rgba(248,113,113,0.15)' }}>8K+ image sequences are memory-intensive. Use WebM for large turntables.</div>}
                  <Slider label="Samples" value={renderSamples} min={1} max={16384} step={1} onChange={v => setRenderSamples(Math.round(v))} unit=" spp" tooltip={renderSamples > 512 ? 'WARNING: Very high sample count — this may slow or freeze your machine. Use 4–64 for previews, 128–512 for finals.' : 'Higher = smoother render. 4 = preview, 64 = good quality, 512+ = production. Very high counts will lag your machine.'} />
                  {renderSamples > 512 && <div style={{ fontSize: '8px', color: '#f87171', marginBottom: '6px', padding: '4px 8px', background: 'rgba(248,113,113,0.06)', borderRadius: '4px', border: '1px solid rgba(248,113,113,0.15)' }}>High SPP can slow or freeze your browser</div>}
                  <Tip text="Samples per pixel -- higher values reduce noise but take longer. 4=preview, 64=quality, 256+=production." pos="top">
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                    {[4, 16, 64, 256, 1024].map(s => (
                      <button key={s} onClick={() => setRenderSamples(s)} style={{ flex: 1, padding: '3px 2px', borderRadius: '3px', fontSize: '8px', fontWeight: 600, background: renderSamples === s ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)', color: renderSamples === s ? '#6C63FF' : 'rgba(255,255,255,0.3)', border: renderSamples === s ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)' }}>{s}</button>
                    ))}
                  </div>
                  </Tip>
                  <Tip text="Renders the current scene to a high-quality image. You will be prompted to download when done. Press Esc to cancel." pos="top">
                  <button onClick={render} disabled={rendering} style={{
                    width: '100%', padding: '10px', borderRadius: '6px', marginTop: '4px',
                    background: rendering ? 'rgba(108,99,255,0.08)' : 'linear-gradient(135deg, #6C63FF, #5046e5)',
                    color: '#fff', fontSize: '11px', fontWeight: 700, opacity: rendering ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                    <IconZap />
                    {rendering ? 'Rendering...' : 'Render Image'}
                  </button>
                  </Tip>
                  {!rendering && <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: '5px' }}>You will be prompted to download the image when done</div>}
                </div>
                <Tip text="Captures the viewport as-is at screen resolution. Instant -- no rendering." pos="top">
                <button onClick={screenshot} style={{
                  width: '100%', padding: '8px', borderRadius: '5px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}><IconCamera /> Quick Screenshot</button>
                </Tip>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '10px 0' }} />

                <span style={stl.label}>Turntable Render</span>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>

                  {/* Video formats */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '2px' }}>Video</div>
                    {([
                      { id: 'webm', label: 'WebM', desc: 'VP8/VP9 video \u00b7 single file' },
                    ] as const).map(f => (
                      <Tip key={f.id} text="Single WebM video file -- best for presentations and social media" pos="top">
                        <button onClick={() => setTtFormat(f.id)} style={{
                          width: '100%', padding: '5px 8px', borderRadius: '4px', textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: '1px', marginBottom: '2px',
                          background: ttFormat === f.id ? 'rgba(108,99,255,0.14)' : 'transparent',
                          border: ttFormat === f.id ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: ttFormat === f.id ? '#fff' : 'rgba(255,255,255,0.4)' }}>{f.label}</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{f.desc}</span>
                        </button>
                      </Tip>
                    ))}
                  </div>

                  {/* Image sequence formats */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '2px' }}>Image Sequence</div>
                    {([
                      { id: 'png-zip', label: 'PNG', desc: 'Lossless \u00b7 ZIP archive', tip: 'Lossless PNG sequence as ZIP -- best for compositing and post-production' },
                      { id: 'jpg-zip', label: 'JPEG', desc: 'Compressed \u00b7 ZIP archive', tip: 'Compressed JPEG sequence as ZIP -- smaller files, slight quality loss' },
                      { id: 'webp-zip', label: 'WebP', desc: 'Modern \u00b7 ZIP archive', tip: 'Modern WebP sequence as ZIP -- small files, near-lossless quality' },
                    ] as const).map(f => (
                      <Tip key={f.id} text={f.tip} pos="top">
                        <button onClick={() => setTtFormat(f.id)} style={{
                          width: '100%', padding: '5px 8px', borderRadius: '4px', textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: '1px', marginBottom: '2px',
                          background: ttFormat === f.id ? 'rgba(108,99,255,0.14)' : 'transparent',
                          border: ttFormat === f.id ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: ttFormat === f.id ? '#fff' : 'rgba(255,255,255,0.4)' }}>{f.label}</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{f.desc}</span>
                        </button>
                      </Tip>
                    ))}
                  </div>

                  {/* Turntable presets */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '4px', paddingLeft: '2px' }}>Preset</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                      {([
                        { label: 'Quick', frames: 60, fps: 30, desc: '2s · preview', tip: '60 steps at 30fps -- 2-second spin. Good for quick direction and lighting checks.' },
                        { label: 'Showcase', frames: 120, fps: 24, desc: '5s · standard', tip: '120 steps at 24fps -- 5-second cinematic spin. Standard for product showcases and social media.' },
                        { label: 'Cinematic', frames: 240, fps: 24, desc: '10s · smooth', tip: '240 steps at 24fps -- 10-second ultra-smooth rotation. For high-end presentations and reels.' },
                        { label: 'Master', frames: 360, fps: 30, desc: '12s · full detail', tip: '360 steps at 30fps -- 12-second one-degree-per-step rotation. Maximum detail for editing and compositing.' },
                      ] as const).map(p => {
                        const active = ttFrames === p.frames && ttFps === p.fps;
                        return (
                          <Tip key={p.label} text={p.tip} pos="top">
                          <button onClick={() => { setTtFrames(p.frames); setTtFps(p.fps); }} style={{
                            padding: '5px 6px', borderRadius: '4px', textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, gap: '1px',
                            background: active ? 'rgba(108,99,255,0.14)' : 'rgba(255,255,255,0.02)',
                            border: active ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{p.label}</span>
                            <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)' }}>{p.desc}</span>
                          </button>
                          </Tip>
                        );
                      })}
                    </div>
                  </div>

                  {/* Frames + FPS row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <div>
                      <Tip text="Total number of shots captured during one full 360 degree rotation. More steps = smoother rotation but longer render time. 60 = choppy preview, 120 = smooth, 360 = 1 shot per degree." pos="top">
                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, cursor: 'default' }}>
                          Steps
                          <div style={{ fontSize: '7px', fontWeight: 400, color: 'rgba(255,255,255,0.15)', textTransform: 'none', letterSpacing: 0, marginTop: '1px' }}>shots per 360°</div>
                        </div>
                      </Tip>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
                        {[60, 120, 240, 360].map(v => (
                          <button key={v} onClick={() => setTtFrames(v)} style={{
                            flex: 1, padding: '3px 1px', borderRadius: '3px', fontSize: '8px', fontWeight: 600,
                            background: ttFrames === v ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                            color: ttFrames === v ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                            border: ttFrames === v ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                          }}>{v}</button>
                        ))}
                      </div>
                      <NumericInput value={ttFrames} min={12} max={720} step={1}
                        onChange={v => setTtFrames(v)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 6px', color: '#fff', fontSize: '10px', fontWeight: 600, textAlign: 'center' as const, boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <Tip text={ttFormat === 'webm' ? 'How fast the video plays back. 24fps = cinematic, 30fps = standard, 60fps = super smooth. Only affects WebM video output — image sequences ignore this.' : 'Playback speed for WebM video. Has no effect on image sequence (ZIP) exports.'} pos="top">
                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, cursor: 'default' }}>
                          FPS
                          <div style={{ fontSize: '7px', fontWeight: 400, color: 'rgba(255,255,255,0.15)', textTransform: 'none', letterSpacing: 0, marginTop: '1px' }}>{ttFormat === 'webm' ? 'video playback speed' : 'WebM only'}</div>
                        </div>
                      </Tip>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
                        {[24, 30, 60].map(v => (
                          <button key={v} onClick={() => setTtFps(v)} style={{
                            flex: 1, padding: '3px 1px', borderRadius: '3px', fontSize: '8px', fontWeight: 600,
                            background: ttFps === v ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                            color: ttFps === v ? ttFormat === 'webm' ? '#6C63FF' : 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.3)',
                            border: ttFps === v ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                            opacity: ttFormat !== 'webm' ? 0.5 : 1,
                          }}>{v}</button>
                        ))}
                      </div>
                      <NumericInput value={ttFps} min={1} max={60} step={1}
                        onChange={v => setTtFps(v)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 6px', color: ttFormat !== 'webm' ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '10px', fontWeight: 600, textAlign: 'center' as const, boxSizing: 'border-box' as const, opacity: ttFormat !== 'webm' ? 0.5 : 1 }} />
                    </div>
                  </div>

                  {/* Duration info */}
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: '8px', textAlign: 'center' as const }}>
                    {ttFormat === 'webm'
                      ? `${ttFrames} steps at ${ttFps}fps = ${(ttFrames / ttFps).toFixed(1)}s video`
                      : `${ttFrames} individual frames as ${ttFormat === 'png-zip' ? 'PNG' : ttFormat === 'jpg-zip' ? 'JPG' : 'WebP'} ZIP`
                    }
                  </div>

                  {/* Progress bar (shown during render) */}
                  {ttActive && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                          Frame {ttCurrentFrame} / {ttFrames}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#6C63FF' }}>{ttProgress}%</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #6C63FF, #8B7FFF)', borderRadius: '2px', width: `${ttProgress}%`, transition: 'width 0.15s' }} />
                      </div>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'center' as const }}>
                        {ttFormat === 'webm' ? 'Recording video...' : 'Capturing frames...'}
                      </div>
                    </div>
                  )}

                  {/* Direction + Easing */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Direction</div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {([['cw', 'CW', 'Clockwise rotation \u2014 model appears to rotate right to left'], ['ccw', 'CCW', 'Counter-clockwise rotation \u2014 model appears to rotate left to right']] as const).map(([v, label, tip]) => (
                          <Tip key={v} text={tip} pos="top"><button onClick={() => setTtDirection(v)} style={{
                            flex: 1, padding: '4px 2px', borderRadius: '3px', fontSize: '9px', fontWeight: 600,
                            background: ttDirection === v ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                            color: ttDirection === v ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                            border: ttDirection === v ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                          }}>{label}</button></Tip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Easing</div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {([['linear', 'Linear', 'Constant rotation speed throughout'], ['smooth', 'Smooth', 'Ease-in and ease-out \u2014 slower at start and end, faster in the middle']] as const).map(([v, label, tip]) => (
                          <Tip key={v} text={tip} pos="top"><button onClick={() => setTtEasing(v)} style={{
                            flex: 1, padding: '4px 2px', borderRadius: '3px', fontSize: '9px', fontWeight: 600,
                            background: ttEasing === v ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                            color: ttEasing === v ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                            border: ttEasing === v ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                          }}>{label}</button></Tip>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview spin toggle */}
                  <Tip text="Spins the model live in the viewport at the exact speed and direction of your current turntable settings. Use this to preview before rendering." pos="top">
                  <button
                    onClick={() => setTtPreviewActive(p => !p)}
                    disabled={ttActive}
                    style={{
                      width: '100%', padding: '7px', borderRadius: '5px', marginBottom: '4px',
                      background: ttPreviewActive ? 'rgba(0,212,168,0.1)' : 'rgba(255,255,255,0.02)',
                      border: ttPreviewActive ? '1px solid rgba(0,212,168,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      color: ttPreviewActive ? '#00D4A8' : 'rgba(255,255,255,0.4)',
                      fontSize: '10px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      opacity: ttActive ? 0.35 : 1,
                    }}
                  >
                    <IconRotate />
                    {ttPreviewActive ? 'Stop Preview' : 'Preview Spin'}
                  </button>
                  </Tip>

                  {/* Action buttons */}
                  <Tip text="Captures a full 360 degree rotation as a WebM video or image sequence ZIP. Uses your current resolution and lighting settings." pos="top">
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={ttActive ? cancelTurntable : renderTurntable} disabled={rendering && !ttActive} style={{
                      flex: 1, padding: '9px', borderRadius: '6px',
                      background: ttActive ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg, #6C63FF, #5046e5)',
                      color: ttActive ? '#f87171' : '#fff', fontSize: '11px', fontWeight: 700,
                      border: ttActive ? '1px solid rgba(239,68,68,0.2)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      opacity: (rendering && !ttActive) ? 0.4 : 1,
                    }}>
                      <IconRotate />
                      {ttActive ? `Cancel (${ttProgress}%)` : 'Render Turntable'}
                    </button>
                  </div>
                  </Tip>
                  {ttFormat === 'webm' && !ttActive && (
                    <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginTop: '5px', lineHeight: 1.4 }}>
                      WebM plays in Chrome, Firefox, and VLC. Windows Media Player may not support it.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Display tab ── */}
            {tab === 'display' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {/* Model Color Override */}
                <div style={{ marginBottom: '10px' }}>
                  <span style={stl.label}>Model Color</span>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => setOverrideColor(null)} title="Original materials" style={{
                      padding: '4px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600,
                      background: !overrideColor ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.03)',
                      color: !overrideColor ? '#6C63FF' : 'rgba(255,255,255,0.35)',
                      border: !overrideColor ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.04)',
                    }}>Original</button>
                    {['#ffffff','#333333','#cc3333','#3366cc','#33aa55','#ffaa00','#cc66ff','#ff6699'].map(c => (
                      <button key={c} onClick={() => setOverrideColor(c)} title={c} style={{
                        width: '22px', height: '22px', borderRadius: '5px', background: c,
                        border: overrideColor === c ? '2px solid #6C63FF' : '1.5px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.15s',
                      }} />
                    ))}
                    <label title="Custom color" style={{ position: 'relative', width: '22px', height: '22px', borderRadius: '5px', border: '1.5px dashed rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>+</span>
                      <input type="color" value={overrideColor || '#6C63FF'} onChange={(e) => setOverrideColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </label>
                  </div>
                </div>

                {/* Toggles */}
                {[
                  { l: 'Grid', d: 'Reference plane', a: showGrid, fn: () => setShowGrid(!showGrid), i: <IconGrid /> },
                  ...(!userFile ? [
                    { l: 'Annotations', d: 'Feature hotspots', a: showHotspots, fn: () => setShowHotspots(!showHotspots), i: <IconHotspot /> },
                  ] : []),
                ].map(f => (
                  <button key={f.l} onClick={f.fn} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '5px',
                    background: f.a ? 'rgba(108,99,255,0.06)' : 'transparent', border: f.a ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)', transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: f.a ? '#6C63FF' : 'rgba(255,255,255,0.2)' }}>{f.i}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: f.a ? '#fff' : 'rgba(255,255,255,0.45)' }}>{f.l}</div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{f.d}</div>
                      </div>
                    </div>
                    <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: f.a ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'all 0.2s' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: f.a ? '16px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset + Footer */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(108,99,255,0.02)' }}>
            <Tip text="Resets all lights, camera, effects, shading, environment, and transforms to defaults" pos="top" fullWidth>
              <button onClick={() => {
                if (!window.confirm('Reset all settings and transforms to defaults?')) return;
                // Direct Three.js reset first (immediate, no React round-trip lag)
                if (externalGroupRef.current) {
                  externalGroupRef.current.position.set(0, 0, 0);
                  externalGroupRef.current.rotation.set(0, 0, 0);
                  externalGroupRef.current.scale.setScalar(1.0);
                  externalGroupRef.current.updateMatrix?.();
                }
                applyTransformRef.current?.([0, 0, 0], [0, 0, 0]);
                setLightI(1.2); setLightAng(45); setLightH(8); setAmbI(0.3);
                setFov(40); setBloomI(0.15); setBloomT(0.9); setVigI(0.3);
                setSsao(true); setSsaoRadius(0.5); setSsaoIntensity(1.0);
                setChromaticAb(0); setBrightness(0); setContrast(0);
                setEnablePP(true); setAutoRotate(false); setShowGrid(true);
                setShowHotspots(true); setOverrideColor(null); setEnv('studio');
                setShowEnvBg(true); setShadingMode('pbr'); setSceneLights([]);
                setShowSceneCamera(false); setCameraViewMode(false); setCameraPos([0,1.5,4]); setLockCameraToView(true);
                setCameraGizmoMode('translate'); setSelectedObjectIds([]); setModelTransformMode('translate'); setModelUniformScale(1.0); setHdriLighting(true);
                setRenderWidth(1920); setRenderHeight(1080); setRenderSamples(4); setRenderFormat('png'); setRenderQuality(0.92);
                setShowCameraBoundary(false); setExploded(false); setWireframe(false); setCustomHdri(null);
                setTransformActioned(false); setDisplayTransform(null);
                showToast('Reset to defaults');
              }} style={{
                width: '100%', padding: '6px', borderRadius: '5px', marginBottom: '6px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>Reset All to Defaults</button>
            </Tip>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.12)', textAlign: 'center' }}>SlothStudio 3D Viewer - Demo</div>
          </div>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div ref={viewportRef} style={{ flex: 1, position: 'relative', paddingTop: '32px' }}>
        {/* Mobile burger — mobile only */}
        {!shadingOverlay && !sidebarOpen && (
          <button className="burger-btn" onClick={() => setSidebarOpen(true)} style={{
            position: 'absolute', top: '40px', left: '8px', zIndex: 50,
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#6C63FF', border: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
          }}><IconMenu /></button>
        )}
        {/* Desktop sidebar pull-tab — shows when sidebar is closed */}
        {!shadingOverlay && !sidebarOpen && (
          <button className="desktop-edge-tab" onClick={() => setSidebarOpen(true)} title="Open panel" style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 50,
            width: '16px', height: '60px', borderRadius: '0 6px 6px 0',
            background: 'rgba(108,99,255,0.18)', border: '1px solid rgba(108,99,255,0.25)', borderLeft: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M2 2l4 4-4 4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

        {/* Share button top-right */}
        <div style={{
          position: 'absolute', top: '40px', right: '8px', zIndex: 20,
        }}>
          {ibtn(<IconShare />, 'Share config', false, share)}
        </div>

        {/* Blender-style mode indicator — only visible when in a non-default transform mode */}
        {modelSelected && modelTransformMode !== 'translate' && (
          <div className="model-badge" style={{
            position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 25,
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(8,8,12,0.82)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', padding: '5px 14px', backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: modelTransformMode === 'rotate' ? '#9590ff' : '#00D4A8', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
              {modelTransformMode === 'rotate' ? 'Rotate' : 'Scale'}
            </span>
            {modelTransformMode === 'scale' && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {modelUniformScale.toFixed(3)}
              </span>
            )}
          </div>
        )}

        <Scene
          bodyColor={bodyColor} accentColor={accentColor} baseColor={baseColor}
          material={mat} environment={env} exploded={exploded} wireframe={wireframe}
          shadingMode={shadingMode}
          autoRotate={((autoRotate && !cameraViewMode) || ttPreviewActive) && !ttActive}
          autoRotateSpeed={ttPreviewActive ? Math.max(0.5, 30 / (ttFrames / ttFps)) * (ttDirection === 'ccw' ? -1 : 1) : autoRotateSpeed}
          showHotspots={showHotspots} showGrid={showGrid} activeHotspot={activeHotspot}
          setActiveHotspot={setActiveHotspot} canvasRef={canvasRef} glRef={glRef}
          lightIntensity={lightI} lightAngle={lightAng} lightHeight={lightH}
          ambientIntensity={ambI} userFile={userFile} fov={fov}
          bloomIntensity={bloomI} bloomThreshold={bloomT} vignetteIntensity={vigI}
          ssaoEnabled={ssao} enablePostProcessing={enablePP}
          modelPath={PRESET_MODELS.find(m => m.id === selectedModel)?.path}
          showEnvBackground={showEnvBg} customHdri={customHdri}
          onStats={setSceneStats}
          onLightDrag={(dx, dy) => { setLightAng(a => a + dx * 0.5); setLightH(h => Math.max(1, Math.min(15, h - dy * 0.05))); }}
          overrideColor={overrideColor}
          ssaoRadius={ssaoRadius} ssaoIntensity={ssaoIntensity}
          chromaticAb={chromaticAb} brightness={brightness} contrast={contrast}
          sceneLights={sceneLights}
          selectedLightId={selectedLightId}
          onSelectLight={setSelectedLightId}
          onMoveLight={handleMoveLight}
          showSceneCamera={showSceneCamera}
          cameraPos={cameraPos}
          cameraViewMode={cameraViewMode}
          lockCameraToView={lockCameraToView}
          onCameraMove={setCameraPos}
          rotationMode={rotationMode}
          rotationStepRef={rotationStepRef}
          hdriLighting={hdriLighting}
          cameraGizmoMode={cameraGizmoMode}
          modelUniformScale={modelUniformScale}
          selectedObjectIds={selectedObjectIds}
          modelTransformMode={modelTransformMode}
          onModelClick={(shiftKey, ctrlKey) => {
            if (ctrlKey) {
              // Ctrl/Meta+click = remove from selection
              setSelectedObjectIds(prev => prev.filter(id => id !== 'model'));
            } else if (shiftKey) {
              // Shift+click = add to selection
              setSelectedObjectIds(prev => prev.includes('model') ? prev : [...prev, 'model']);
            } else {
              // Regular click: toggle if already the sole selection, else select only this
              setSelectedObjectIds(prev =>
                prev.length === 1 && prev[0] === 'model' ? [] : ['model']
              );
              setModelTransformMode('translate');
            }
          }}
          onModelDeselect={() => { setSelectedObjectIds([]); setSelectedLightId(null); }}
          rendering={rendering}
          shadingOverlay={shadingOverlay}
          onModelUniformScaleChange={(s) => { externalGroupRef.current?.scale.setScalar(s); setModelUniformScale(s); setTransformActioned(true); }}
          onTransformActioned={() => setTransformActioned(true)}
          onGroupMount={(ref) => { externalGroupRef.current = ref.current; }}
          onCameraSelect={(shift: boolean) => {
            if (shift) {
              setSelectedObjectIds(prev => prev.includes('camera') ? prev : [...prev, 'camera']);
            } else {
              setSelectedObjectIds(['camera']);
            }
          }}
          onLMBDownNoAlt={(sx, sy, shift) => { marqueeStartRef.current = { x: sx, y: sy, shift }; }}
          projectorRef={sceneProjectorRef}
          onTransformChange={(t) => startTransition(() => setDisplayTransform(t))}
          applyTransformRef={applyTransformRef}
          focusOnModelRef={focusOnModelRef}
          setAzimuthRef={setAzimuthRef}
          getAzimuthRef={getAzimuthRef}
        />

        {/* ── Marmoset-style vertical split panes ── */}
        {shadingOverlay && (
          <div style={{ position: 'absolute', inset: 0, top: '32px', zIndex: 30, display: 'flex', overflow: 'hidden', cursor: 'pointer', animation: 'fadeInOverlay 0.25s ease' }}
            onClick={() => { setShadingOverlay(false); setHoveredShading(null); }}>
            {SHADING_MODES.map((m, i) => {
              const isActive = shadingMode === m.id;
              const isHovered = hoveredShading === m.id;
              const anyHovered = hoveredShading !== null;
              const imgSrc = shadingPreviews[m.id];
              // Expand hovered strip, shrink others when something is hovered
              const flexVal = isHovered ? 1.6 : (anyHovered && !isActive) ? 0.82 : 1;
              // Brightness: active = full, hovered = full, others = 0.6 (slightly darker when something else is hovered)
              const brightness = isActive || isHovered ? 1 : anyHovered ? 0.55 : 0.7;
              return (
                <div key={m.id} style={{
                  flex: flexVal, position: 'relative',
                  borderRight: i < SHADING_MODES.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  transition: 'flex 0.18s cubic-bezier(0.4,0,0.2,1)',
                  animation: `fadeInStrip 0.3s ease ${i * 0.04}s both`,
                  transformOrigin: 'top',
                  cursor: 'pointer',
                }}
                  onMouseEnter={() => setHoveredShading(m.id)}
                  onMouseLeave={() => setHoveredShading(null)}
                  onClick={(e) => { e.stopPropagation(); captureGenRef.current++; capturingRef.current = false; setShadingMode(m.id); previewsReady.current = false; setShadingOverlay(false); setHoveredShading(null); }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={m.label} draggable={false} style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                      filter: `brightness(${brightness})`,
                      transition: 'filter 0.15s ease',
                    }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(108,99,255,0.3)', borderTopColor: '#6C63FF', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}
                  {/* Active border — blue */}
                  {isActive && <div style={{ position: 'absolute', inset: 0, border: '2px solid #6C63FF', zIndex: 2, pointerEvents: 'none' }} />}
                  {/* Hover border — white glow, only when not already active */}
                  {isHovered && !isActive && (
                    <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.6)', zIndex: 2, pointerEvents: 'none', boxShadow: 'inset 0 0 24px rgba(255,255,255,0.06)' }} />
                  )}
                  {/* Bottom "you are here" arrow indicator on hover */}
                  {isHovered && !isActive && (
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 4, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
                  )}
                  {/* Label badge */}
                  <div style={{
                    position: 'absolute', top: '10px', left: '50%', transform: `translateX(-50%) scale(${isHovered ? 1.1 : 1})`, zIndex: 3,
                    background: isActive ? 'rgba(108,99,255,0.92)' : isHovered ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.65)',
                    padding: '4px 10px', borderRadius: '4px', pointerEvents: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    boxShadow: isHovered && !isActive ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                  }}>
                    <span className="shading-overlay-label" style={{
                      fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: isHovered && !isActive ? '#08080C' : '#fff',
                    }}>{m.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Navigation hints — bottom-left, only when no overlay AND transform panel not active ── */}
        {!shadingOverlay && !(modelSelected && displayTransform && transformActioned) && (
          <div className="nav-hint" style={{
            position: 'absolute', bottom: '58px', left: '12px',
            zIndex: 18, display: 'flex', flexDirection: 'column', gap: '3px',
            pointerEvents: 'none',
          }}>
            {[
              ['LMB', 'Orbit'], ['RMB', 'Pan'], ['Scroll', 'Zoom'],
              ['Click', 'Select obj'], ['F', 'Focus obj'], ['E', 'Rotate obj'], ['R', 'Scale obj'],
              ['F4', 'Camera view'], ['Tab', 'Open settings'],
            ].map(([key, action]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 700, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '3px', padding: '1px 5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{key}</span>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>{action}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Mobile nav hint — touch controls only, hidden when transform panel active ── */}
        {!(modelSelected && displayTransform && transformActioned) && (
        <div className="mobile-nav-hint" style={{
          display: 'none', position: 'absolute', top: '46px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 18, flexDirection: 'row', gap: '4px', alignItems: 'center', pointerEvents: 'none',
          flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90vw',
        }}>
          {[
            { label: 'Tap · Select' },
            { label: '1 finger · Orbit' },
            { label: 'Pinch · Zoom' },
          ].map(h => (
            <span key={h.label} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.32)', background: 'rgba(8,8,12,0.8)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h.label}</span>
          ))}
        </div>
        )}

        {/* ── Bottom viewport toolbar ── */}
        <div className="viewport-toolbar" style={{
          position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(8,8,12,0.92)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px', padding: '4px', backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {/* Shading button — opens stripe overlay */}
          <Tip text="Shading modes" pos="top">
            <button onClick={openShadingOverlay} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px',
              background: shadingOverlay ? 'rgba(108,99,255,0.18)' : 'transparent',
              color: shadingOverlay ? '#6C63FF' : 'rgba(255,255,255,0.4)',
              border: shadingOverlay ? '1px solid rgba(108,99,255,0.3)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              <IconLayers />
              <span>{SHADING_MODES.find(m => m.id === shadingMode)?.label || 'PBR'}</span>
            </button>
          </Tip>

          {/* Separator */}
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {ibtn(<IconGrid />, 'Toggle grid', showGrid, () => setShowGrid(!showGrid), 'top')}
            {ibtn(<IconMaximize />, 'Fullscreen', false, fullscreen, 'top')}
          </div>

          {/* Separator */}
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Render button — always in toolbar so it's reachable on mobile without opening sidebar */}
          <Tip text="Render scene to image" pos="top">
            <button onClick={render} disabled={rendering} style={{
              padding: '7px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '5px',
              background: rendering ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.06)',
              color: rendering ? '#6C63FF' : 'rgba(108,99,255,0.75)',
              border: `1px solid ${rendering ? 'rgba(108,99,255,0.4)' : 'rgba(108,99,255,0.2)'}`,
              transition: 'all 0.15s', opacity: rendering ? 0.7 : 1,
              cursor: rendering ? 'not-allowed' : 'pointer',
            }}>
              <IconCamera />
              <span className="badge-hint">{rendering ? '...' : 'Render'}</span>
            </button>
          </Tip>
        </div>

        {/* Mobile model picker strip */}
        <div className="mobile-model-bar" style={{
          display: 'none', position: 'absolute', bottom: '50px', left: '0', right: '0',
          zIndex: 19, padding: '0 6px', maxWidth: '100%', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', overflowY: 'hidden', padding: '6px 4px', WebkitOverflowScrolling: 'touch' as any,
            background: 'rgba(8,8,12,0.9)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)',
            maxWidth: '100%',
          }}>
            {PRESET_MODELS.map(m => (
              <button key={m.id} onClick={() => { setSelectedModel(m.id); setUserFile(null); showToast(m.name); }} style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                background: !userFile && selectedModel === m.id ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.03)',
                color: !userFile && selectedModel === m.id ? '#6C63FF' : 'rgba(255,255,255,0.35)',
                border: !userFile && selectedModel === m.id ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>{m.name}</button>
            ))}
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
              background: userFile ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: userFile ? '#6C63FF' : 'rgba(255,255,255,0.35)',
              border: userFile ? '1px solid rgba(108,99,255,0.25)' : '1px dashed rgba(255,255,255,0.08)',
              whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
            }}><IconUpload /> {userFile ? userFile.name.slice(0, 12) : 'Upload'}</button>
          </div>
        </div>

        {/* Mobile FAB - settings */}
        <button className="mobile-fab" onClick={() => setSidebarOpen(true)} style={{
          display: 'none', position: 'absolute', bottom: '130px', right: '12px', zIndex: 25,
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)',
          color: '#6C63FF', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}><IconSliders /></button>

        {/* Scene stats overlay — inside viewport so it positions from viewport right edge */}
        {sceneStats && (
          <div className="scene-stats" style={{
            position: 'absolute', top: '40px', right: '12px', zIndex: 15,
            background: 'rgba(8,8,12,0.75)', border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '8px', padding: '8px 14px',
            fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.7, pointerEvents: 'none', letterSpacing: '0.03em',
          }}>
            <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>TRI</span> {sceneStats.triangles.toLocaleString()}</div>
            <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>VTX</span> {sceneStats.vertices.toLocaleString()}</div>
            <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>OBJ</span> {sceneStats.meshes}</div>
            <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>TEX</span> {sceneStats.textures}</div>
            <div style={{ marginTop: '2px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(108,99,255,0.6)' }}>SPP</span> {renderSamples}
            </div>
          </div>
        )}

        {/* Camera boundary overlay — visible ONLY in camera view mode or during rendering.
            showSceneCamera alone (camera in scene but not in view mode) does NOT show the boundary. */}
        {(cameraViewMode || rendering) && (
        <div style={{ position: 'absolute', inset: 0, top: 40, zIndex: 12, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Camera view label badge */}
          {cameraViewMode && !rendering && (
            <>
              <div style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', zIndex: 15, background: 'rgba(239,68,68,0.9)', border: '1px solid rgba(239,68,68,0.6)', borderRadius: '4px', padding: '3px 10px', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#fff' }}>CAMERA VIEW</span>
              </div>
              {/* F4 exit hint only */}
              <div style={{ position: 'absolute', bottom: 'calc(8% + 60px)', left: '50%', transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(8,8,12,0.7)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '4px', padding: '3px 10px', backdropFilter: 'blur(8px)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '8px', fontWeight: 700, color: '#ef4444' }}>F4</span>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>Exit Camera View</span>
                </div>
              </div>
            </>
          )}
          {/* Camera aperture — CSS aspect-ratio, centered, correct render dimensions */}
          {(() => {
            const bColor = rendering ? '#6C63FF' : cameraViewMode ? '#ef4444' : 'rgba(255,255,255,0.5)';
            // JS-computed boundary dimensions — CSS aspect-ratio + max constraints breaks for portrait/square presets
            const sideW = sidebarOpen ? 250 : 0;
            const avW = (vpW - sideW) * 0.92;
            const avH = (vpH - 40) * 0.84; // 40px = top bar
            const bScale = Math.min(avW / renderWidth, avH / renderHeight);
            const bW = Math.round(renderWidth * bScale);
            const bH = Math.round(renderHeight * bScale);
            return (
              <div
                ref={boundaryRef}
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  // Explicit pixel dimensions — always correct for any aspect ratio (portrait, square, ultra-wide)
                  width: bW + 'px',
                  height: bH + 'px',
                  border: `1.5px ${rendering || cameraViewMode ? 'solid' : 'dashed'} ${bColor}`,
                  // box-shadow dims everything outside the aperture
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.35)`,
                  pointerEvents: 'none',
                  zIndex: 13,
                }}
              >
                {/* Corner L-marks */}
                {[[0,0],[0,1],[1,0],[1,1]].map(([x,y],i) => (
                  <div key={i} style={{
                    position: 'absolute', width: '14px', height: '14px',
                    top: y ? 'auto' : '-1px', bottom: y ? '-1px' : 'auto',
                    left: x ? 'auto' : '-1px', right: x ? '-1px' : 'auto',
                    borderTop: y ? 'none' : `2px solid ${bColor}`,
                    borderBottom: y ? `2px solid ${bColor}` : 'none',
                    borderLeft: x ? 'none' : `2px solid ${bColor}`,
                    borderRight: x ? `2px solid ${bColor}` : 'none',
                  }} />
                ))}
                {/* Rule of thirds */}
                {cameraViewMode && !rendering && (
                  <>
                    <div style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  </>
                )}
                {/* Dimension badge */}
                {cameraViewMode && !rendering && (
                  <div style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '8px', fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,0.35)', background: 'rgba(8,8,12,0.7)', padding: '2px 7px', borderRadius: '3px' }}>
                    {renderWidth} x {renderHeight}
                  </div>
                )}
                {/* resize handles removed — sliders in sidebar control dimensions */}
                {/* Render scanline + badge */}
                {rendering && (
                  <>
                    <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,#6C63FF,transparent)', top: `${renderProgress}%`, transition: 'top 0.1s linear', boxShadow: '0 0 8px rgba(108,99,255,0.8)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 80, pointerEvents: 'auto', background: 'rgba(8,8,12,0.9)', border: '1px solid rgba(108,99,255,0.4)', borderRadius: '8px', padding: '12px 24px', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#6C63FF', marginBottom: '6px' }}>RENDERING</div>
                      <div style={{ width: '140px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${renderProgress}%`, background: 'linear-gradient(90deg,#6C63FF,#9590ff)', borderRadius: '2px', transition: 'width 0.1s' }} />
                      </div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '5px', marginBottom: '8px' }}>{renderProgress}% · {renderWidth}×{renderHeight} · {renderSamples} SPP</div>
                      <button onClick={cancelRender} style={{ padding: '6px 20px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: 'pointer', letterSpacing: '0.02em' }}>
                        Cancel Render
                      </button>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>or press Esc</div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Transform Properties Panel — only shows after an actual transform was applied ── */}
      {modelSelected && displayTransform && transformActioned && (
        <div className="transform-panel" style={{
          position: 'absolute', bottom: '54px', left: '10px', zIndex: 28,
          background: 'rgba(30,28,40,0.97)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px', minWidth: '200px', pointerEvents: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
          userSelect: 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: transformPanelOpen ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <button onClick={() => setTransformPanelOpen(!transformPanelOpen)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px' }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transform: transformPanelOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                <path d="M2 1l4 3-4 3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {modelTransformMode === 'scale' ? 'Resize' : modelTransformMode === 'rotate' ? 'Rotate' : 'Move'}
              </span>
            </button>
            {/* Reset all transforms to zero */}
            <Tip text="Reset position, rotation & scale to default" pos="top">
              <button
                onClick={() => {
                  applyTransformRef.current?.([0, 0, 0], [0, 0, 0]);
                  setModelUniformScale(1.0);
                }}
                style={{ padding: '4px 8px', fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 6px 0 0', letterSpacing: '0.04em' }}
              >
                RESET
              </button>
            </Tip>
          </div>
          {/* Fields */}
          {transformPanelOpen && (() => {
            const axisColor = (a: string) => a === 'X' ? '#ef4444' : a === 'Y' ? '#22c55e' : '#3b82f6';
            const fieldStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '3px 6px', color: '#fff', fontSize: '10px', fontWeight: 600, width: '85px', textAlign: 'right' as const, MozAppearance: 'textfield' as any, WebkitAppearance: 'none' as any, appearance: 'textfield' as any };
            const labelStyle = { fontSize: '9px', color: 'rgba(255,255,255,0.4)', width: '28px', textAlign: 'right' as const };
            const row = (axis: string, val: number, onChange: (v: number) => void) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', padding: '3px 10px', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: axisColor(axis), width: '10px', textAlign: 'center' }}>{axis}</span>
                <span style={labelStyle}>{modelTransformMode === 'scale' ? 'Scale' : modelTransformMode === 'rotate' ? 'Angle' : 'Pos'}</span>
                <input
                  type="number"
                  value={parseFloat(val.toFixed(4))}
                  step={modelTransformMode === 'rotate' ? 0.1 : 0.001}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={fieldStyle}
                />
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', width: '18px' }}>
                  {modelTransformMode === 'rotate' ? '°' : modelTransformMode === 'scale' ? 'x' : 'm'}
                </span>
              </div>
            );
            if (modelTransformMode === 'scale') return (
              <div style={{ padding: '4px 0 6px' }}>
                {['X', 'Y', 'Z'].map(a => row(a, displayTransform.s, v => setModelUniformScale(v)))}
                <div style={{ padding: '3px 10px 0', fontSize: '8px', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' }}>Uniform scale — all axes equal</div>
              </div>
            );
            if (modelTransformMode === 'rotate') return (
              <div style={{ padding: '4px 0 6px' }}>
                {[
                  ['X', displayTransform.rx, (v: number) => applyTransformRef.current?.(undefined, [v, displayTransform.ry, displayTransform.rz])],
                  ['Y', displayTransform.ry, (v: number) => applyTransformRef.current?.(undefined, [displayTransform.rx, v, displayTransform.rz])],
                  ['Z', displayTransform.rz, (v: number) => applyTransformRef.current?.(undefined, [displayTransform.rx, displayTransform.ry, v])],
                ].map(([a, val, fn]) => row(a as string, val as number, fn as (v: number) => void))}
                <div style={{ padding: '4px 10px 0', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)' }}>Orientation</span>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Global</span>
                </div>
              </div>
            );
            return (
              <div style={{ padding: '4px 0 6px' }}>
                {[
                  ['X', displayTransform.px, (v: number) => applyTransformRef.current?.([v, displayTransform.py, displayTransform.pz])],
                  ['Y', displayTransform.py, (v: number) => applyTransformRef.current?.([displayTransform.px, v, displayTransform.pz])],
                  ['Z', displayTransform.pz, (v: number) => applyTransformRef.current?.([displayTransform.px, displayTransform.py, v])],
                ].map(([a, val, fn]) => row(a as string, val as number, fn as (v: number) => void))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Marquee selection rectangle */}
      {marqueeRect && marqueeRect.w > 4 && marqueeRect.h > 4 && (
        <div style={{
          position: 'fixed', zIndex: 999,
          left: marqueeRect.x, top: marqueeRect.y,
          width: marqueeRect.w, height: marqueeRect.h,
          border: '1px dashed rgba(108,99,255,0.9)',
          background: 'rgba(108,99,255,0.06)',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(108,99,255,0.2)',
        }}>
          {/* Corner dots */}
          {['tl','tr','bl','br'].map(c => (
            <div key={c} style={{ position: 'absolute', width: '4px', height: '4px', background: '#6C63FF', borderRadius: '50%', top: c.startsWith('t') ? '-2px' : 'auto', bottom: c.startsWith('b') ? '-2px' : 'auto', left: c.endsWith('l') ? '-2px' : 'auto', right: c.endsWith('r') ? '-2px' : 'auto' }} />
          ))}
        </div>
      )}
      </div>{/* end viewport div */}

      {/* Built by link removed — demo info kept in top bar only */}
    </div>
  );
}

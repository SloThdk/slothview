'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ShadingMode, SceneStats } from './components/Scene';
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
];

const PRESET_MODELS = [
  { id: 'chair', name: 'Designer Chair', path: '/models/SheenChair.glb', cat: 'Furniture', desc: 'Modern fabric chair with sheen' },
  { id: 'helmet', name: 'Damaged Helmet', path: '/models/DamagedHelmet.glb', cat: 'Sci-Fi', desc: 'Battle-worn helmet with PBR materials' },
  { id: 'shoe', name: 'Sneaker', path: '/models/MaterialsVariantsShoe.glb', cat: 'Fashion', desc: 'Athletic shoe with material variants' },
  { id: 'car', name: 'Toy Car', path: '/models/ToyCar.glb', cat: 'Automotive', desc: 'Detailed miniature car model' },
  { id: 'dragon', name: 'Crystal Dragon', path: '/models/DragonAttenuation.glb', cat: 'Art', desc: 'Translucent dragon sculpture' },
  { id: 'camera', name: 'Antique Camera', path: '/models/AntiqueCamera.glb', cat: 'Vintage', desc: 'Classic folding camera with brass details' },
  { id: 'lantern', name: 'Lantern', path: '/models/Lantern.glb', cat: 'Props', desc: 'Oil lantern with glass and metal' },
];

const BASE_PRICE = 2499;

/* ── Helpers ── */
function Tip({ text, children, pos = 'bottom' }: { text: string; children: React.ReactNode; pos?: 'bottom' | 'top' | 'left' | 'right' }) {
  const [s, setS] = useState(false);
  const p: React.CSSProperties = pos === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '5px' }
    : pos === 'left' ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '5px' }
    : pos === 'right' ? { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '5px' }
    : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '5px' };
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setS(true)} onMouseLeave={() => setS(false)}>
      {children}
      {s && <div style={{ position: 'absolute', ...p, zIndex: 200, background: 'rgba(8,8,12,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', padding: '4px 8px', fontSize: '9px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.1s ease', letterSpacing: '0.01em' }}>{text}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{value.toFixed(step < 1 ? step < 0.1 ? 2 : 1 : 0)}{unit}</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  // Camera
  const [fov, setFov] = useState(40);

  // Lighting
  const [lightI, setLightI] = useState(1.2);
  const [lightAng, setLightAng] = useState(45);
  const [lightH, setLightH] = useState(8);
  const [ambI, setAmbI] = useState(0.3);

  // Post-processing (disable on mobile for performance)
  const [enablePP, setEnablePP] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [bloomI, setBloomI] = useState(0.15);
  const [bloomT, setBloomT] = useState(0.9);
  const [vigI, setVigI] = useState(0.3);
  const [ssao, setSsao] = useState(true);

  // Render
  const [rendering, setRendering] = useState(false);
  const [renderRes, setRenderRes] = useState<'2x' | '4x'>('2x');
  const [renderSamples, setRenderSamples] = useState(4);

  // Model selection
  const [selectedModel, setSelectedModel] = useState('chair');

  // Environment
  const [showEnvBg, setShowEnvBg] = useState(false);
  const [customHdri, setCustomHdri] = useState<string | null>(null);

  // File
  const [userFile, setUserFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Scene stats
  const [sceneStats, setSceneStats] = useState<SceneStats | null>(null);

  // UI
  const [shadingOverlay, setShadingOverlay] = useState(false);
  // shadingPreviews removed — using button-based picker now
  const [tab, setTab] = useState<'scene' | 'camera' | 'render' | 'display'>('scene');
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderer | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hdriRef = useRef<HTMLInputElement | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  // Preview capture removed — using instant button picker

  const openShadingOverlay = useCallback(() => {
    setShadingOverlay(!shadingOverlay);
  }, [shadingOverlay]);

  const screenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `slothview-${Date.now()}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
    showToast('Screenshot saved');
  }, []);

  const render = useCallback(() => {
    const gl = glRef.current, c = canvasRef.current;
    if (!gl || !c) return;
    setRendering(true);
    const mul = renderRes === '4x' ? 4 : 2;
    const oW = c.width, oH = c.height;
    const rW = oW * mul, rH = oH * mul;
    gl.setSize(rW, rH, false);
    gl.setPixelRatio(1);
    // Multi-sample by rendering multiple frames
    let frame = 0;
    const doFrame = () => {
      if (frame < renderSamples) {
        frame++;
        requestAnimationFrame(doFrame);
      } else {
        const url = gl.domElement.toDataURL('image/png');
        gl.setSize(oW, oH, false);
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const a = document.createElement('a');
        a.download = `slothview-render-${rW}x${rH}-${renderSamples}spp-${Date.now()}.png`;
        a.href = url;
        a.click();
        setRendering(false);
        showToast(`Rendered ${rW}x${rH} @ ${renderSamples} samples`);
      }
    };
    requestAnimationFrame(doFrame);
  }, [renderRes, renderSamples]);

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
  const ibtn = (icon: React.ReactNode, tip: string, active: boolean, fn: () => void) => (
    <Tip text={tip} pos="bottom" key={tip}>
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
    <div style={{ width: '100%', height: '100dvh', display: 'flex', overflow: 'hidden', background: '#08080C', position: 'fixed', inset: 0 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>

      <input ref={fileRef} type="file" accept=".glb,.gltf,.fbx,.obj" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setUserFile(f); showToast(`Loaded: ${f.name}`); } }} />
      <input ref={hdriRef} type="file" accept=".hdr,.exr" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setCustomHdri(url); setShowEnvBg(true); showToast(`HDRI: ${f.name}`); } }} />

      {toast && <div className="toast-msg" style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', padding: '6px 14px', color: '#9590ff', fontSize: '10px', fontWeight: 600, animation: 'fadeIn 0.1s', maxWidth: 'calc(100vw - 32px)', textAlign: 'center' }}>{toast}</div>}

      {dragOver && <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(108,99,255,0.06)', border: '2px dashed rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}><div style={{ color: '#6C63FF', marginBottom: '6px' }}><IconUpload /></div><div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Drop 3D model</div><div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>GLB, GLTF, FBX, OBJ</div></div>
      </div>}

      {/* ── Top bar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: '32px', background: 'rgba(8,8,12,0.98)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '12px' }}><span style={{ color: '#6C63FF' }}>Sloth</span>View</span>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
          <span style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', color: '#6C63FF', fontSize: '7px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.1em' }}>DEMO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a href="https://sloth-studio.pages.dev" target="_blank" rel="noopener" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none', fontSize: '9px' }}>Get a quote &rarr;</a>
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
        <div className="sidebar-inner" style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Panel tabs + close */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            {([
              ['scene', 'Scene', <IconPalette key="s" />],
              ['camera', 'Camera', <IconEye key="c" />],
              ['render', 'Render', <IconZap key="r" />],
              ['display', 'Display', <IconSliders key="d" />],
            ] as [string, string, React.ReactNode][]).map(([id, label, icon]) => (
              <Tip text={label} pos="bottom" key={id}>
                <button onClick={() => setTab(id as any)} style={{
                  flex: 1, padding: '10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tab === id ? '#6C63FF' : 'rgba(255,255,255,0.2)',
                  borderBottom: tab === id ? '2px solid #6C63FF' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>{icon}</button>
              </Tip>
            ))}
            {/* Close sidebar button */}
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)} style={{
              padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', borderBottom: '2px solid transparent',
              transition: 'all 0.15s', flexShrink: 0,
            }}><IconX /></button>
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

            {/* ── Scene tab ── */}
            {tab === 'scene' && (
              <div>
                {/* Model Gallery */}
                <span style={stl.label}>Model</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '10px' }}>
                  {PRESET_MODELS.map(m => (
                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setUserFile(null); showToast(m.name); if (window.innerWidth <= 768) setSidebarOpen(false); }} style={{
                      width: '100%', padding: '6px 8px', borderRadius: '5px', textAlign: 'left',
                      background: !userFile && selectedModel === m.id ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.01)',
                      border: !userFile && selectedModel === m.id ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
                    }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: !userFile && selectedModel === m.id ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconBox />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: !userFile && selectedModel === m.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{m.cat}</div>
                      </div>
                      {!userFile && selectedModel === m.id && <div style={{ marginLeft: 'auto', color: '#6C63FF', flexShrink: 0 }}><IconCheck /></div>}
                    </button>
                  ))}
                </div>

                {/* Upload own model */}
                <button onClick={() => fileRef.current?.click()} style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px',
                  background: userFile ? 'rgba(108,99,255,0.06)' : 'rgba(255,255,255,0.015)',
                  border: userFile ? '1px solid rgba(108,99,255,0.15)' : '1px dashed rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <span style={{ color: userFile ? '#6C63FF' : 'rgba(255,255,255,0.2)' }}>{userFile ? <IconFile /> : <IconUpload />}</span>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: userFile ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>
                      {userFile ? userFile.name : 'Upload your own'}
                    </div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>
                      {userFile ? `${(userFile.size / 1024 / 1024).toFixed(1)} MB` : 'GLB / GLTF / FBX / OBJ'}
                    </div>
                  </div>
                  {userFile && <button onClick={e => { e.stopPropagation(); setUserFile(null); showToast('Removed'); }} style={{ marginLeft: 'auto', color: '#f87171', opacity: 0.6 }}><IconTrash /></button>}
                </button>

                <span style={stl.label}>Environment</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', marginBottom: '12px' }}>
                  {ENVS.map(e => (
                    <button key={e} onClick={() => setEnv(e)} style={{
                      padding: '6px 2px', borderRadius: '4px', textAlign: 'center', fontSize: '8px', fontWeight: 600,
                      background: env === e ? 'rgba(108,99,255,0.1)' : 'transparent',
                      color: env === e ? '#6C63FF' : 'rgba(255,255,255,0.25)',
                      border: env === e ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.02)',
                      textTransform: 'capitalize', transition: 'all 0.15s',
                    }}>{e}</button>
                  ))}
                </div>

                {/* HDRI background toggle + custom upload */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  <button onClick={() => setShowEnvBg(!showEnvBg)} style={{
                    flex: 1, padding: '6px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600,
                    background: showEnvBg ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.015)',
                    color: showEnvBg ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                    border: showEnvBg ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <IconEye /> Background
                  </button>
                  <button onClick={() => hdriRef.current?.click()} style={{
                    flex: 1, padding: '6px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600,
                    background: customHdri ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.015)',
                    color: customHdri ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                    border: customHdri ? '1px solid rgba(108,99,255,0.2)' : '1px dashed rgba(255,255,255,0.06)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <IconUpload /> {customHdri ? 'Custom' : 'Load HDR'}
                  </button>
                </div>
                {customHdri && (
                  <button onClick={() => { setCustomHdri(null); showToast('HDRI removed'); }} style={{
                    width: '100%', padding: '4px 8px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, marginBottom: '10px',
                    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
                    color: '#f87171', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}><IconTrash /> Remove custom HDRI</button>
                )}

                <span style={stl.label}>Lighting Presets</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '10px' }}>
                  {LIGHT_PRESETS.map(p => (
                    <button key={p.n} onClick={() => { setLightI(p.i); setAmbI(p.a); setLightAng(p.ang); setLightH(p.h); showToast(p.n); }} style={{
                      padding: '5px 2px', borderRadius: '4px', fontSize: '8px', fontWeight: 600,
                      background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s',
                    }}>{p.n}</button>
                  ))}
                </div>
                <Slider label="Key Light" value={lightI} min={0} max={3} step={0.05} onChange={setLightI} />
                <Slider label="Fill / Ambient" value={ambI} min={0} max={1} step={0.02} onChange={setAmbI} />
                <Slider label="Light Angle" value={lightAng} min={0} max={360} step={1} onChange={setLightAng} unit="deg" />
                <Slider label="Light Height" value={lightH} min={1} max={15} step={0.5} onChange={setLightH} />
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
                  <Slider label="Field of View" value={fov} min={15} max={120} step={1} onChange={setFov} unit="deg" />
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

                <span style={stl.label}>Orbit</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <button onClick={() => setAutoRotate(!autoRotate)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '5px',
                    background: autoRotate ? 'rgba(108,99,255,0.06)' : 'transparent',
                    border: autoRotate ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: autoRotate ? '#6C63FF' : 'rgba(255,255,255,0.2)' }}><IconRotate /></span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: autoRotate ? '#fff' : 'rgba(255,255,255,0.45)' }}>Auto Rotate</span>
                    </div>
                    <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: autoRotate ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'all 0.2s' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: autoRotate ? '16px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                  </button>
                  {autoRotate && <div style={{ padding: '0 4px' }}><Slider label="Speed" value={autoRotateSpeed} min={0.1} max={5} step={0.1} onChange={setAutoRotateSpeed} /></div>}
                </div>
              </div>
            )}

            {/* ── Render tab ── */}
            {tab === 'render' && (
              <div>
                <span style={stl.label}>Post-Processing</span>
                <button onClick={() => setEnablePP(!enablePP)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '5px', width: '100%', marginBottom: '8px',
                  background: enablePP ? 'rgba(108,99,255,0.06)' : 'transparent', border: enablePP ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: enablePP ? '#fff' : 'rgba(255,255,255,0.4)' }}>Enable Effects</span>
                  <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: enablePP ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: enablePP ? '16px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </button>
                {enablePP && (
                  <>
                    <Slider label="Bloom Intensity" value={bloomI} min={0} max={1} step={0.01} onChange={setBloomI} />
                    <Slider label="Bloom Threshold" value={bloomT} min={0} max={1.5} step={0.05} onChange={setBloomT} />
                    <Slider label="Vignette" value={vigI} min={0} max={1} step={0.05} onChange={setVigI} />
                    <button onClick={() => setSsao(!ssao)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '5px', width: '100%', marginBottom: '8px',
                      background: ssao ? 'rgba(108,99,255,0.06)' : 'transparent', border: ssao ? '1px solid rgba(108,99,255,0.15)' : '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: ssao ? '#fff' : 'rgba(255,255,255,0.4)' }}>SSAO</span>
                      <div style={{ width: '28px', height: '14px', borderRadius: '7px', background: ssao ? '#6C63FF' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: ssao ? '16px' : '2px', transition: 'left 0.2s' }} />
                      </div>
                    </button>
                  </>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '10px 0' }} />

                <span style={stl.label}>Export</span>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                    {(['2x', '4x'] as const).map(r => (
                      <button key={r} onClick={() => setRenderRes(r)} style={{
                        flex: 1, padding: '5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                        background: renderRes === r ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.015)',
                        color: renderRes === r ? '#6C63FF' : 'rgba(255,255,255,0.3)',
                        border: renderRes === r ? '1px solid rgba(108,99,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
                      }}>{r} Resolution</button>
                    ))}
                  </div>
                  <Slider label="Samples" value={renderSamples} min={1} max={16} step={1} onChange={v => setRenderSamples(Math.round(v))} unit=" spp" />
                  <button onClick={render} disabled={rendering} style={{
                    width: '100%', padding: '10px', borderRadius: '6px', marginTop: '4px',
                    background: rendering ? 'rgba(108,99,255,0.08)' : 'linear-gradient(135deg, #6C63FF, #5046e5)',
                    color: '#fff', fontSize: '11px', fontWeight: 700, opacity: rendering ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                    <IconZap />
                    {rendering ? 'Rendering...' : 'Render Image'}
                  </button>
                </div>
                <button onClick={screenshot} style={{
                  width: '100%', padding: '8px', borderRadius: '5px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}><IconCamera /> Quick Screenshot</button>
              </div>
            )}

            {/* ── Display tab ── */}
            {tab === 'display' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {/* Background color */}
                <div style={{ marginBottom: '10px' }}>
                  <span style={stl.label}>Background</span>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {[
                      { n: 'Dark', v: '#08080C' }, { n: 'Midnight', v: '#0a0a1a' },
                      { n: 'Charcoal', v: '#1a1a1e' }, { n: 'Slate', v: '#2a2a32' },
                      { n: 'Light', v: '#e0e0e4' }, { n: 'White', v: '#ffffff' },
                    ].map(c => (
                      <button key={c.v} onClick={() => { document.body.style.background = c.v; showToast(`BG: ${c.n}`); }} title={c.n} style={{
                        width: '24px', height: '24px', borderRadius: '5px', background: c.v,
                        border: '1.5px solid rgba(255,255,255,0.06)', transition: 'all 0.15s',
                      }} />
                    ))}
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

          {/* Footer info */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(108,99,255,0.02)' }}>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>SlothView 3D Viewer - Demo</div>
          </div>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div style={{ flex: 1, position: 'relative', paddingTop: '32px' }}>
        {!shadingOverlay && !sidebarOpen && (
          <button className="burger-btn" onClick={() => setSidebarOpen(true)} style={{
            position: 'absolute', top: '40px', left: '8px', zIndex: 50,
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#6C63FF', border: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
          }}><IconMenu /></button>
        )}

        {/* Share button top-right */}
        <div style={{
          position: 'absolute', top: '40px', right: '8px', zIndex: 20,
        }}>
          {ibtn(<IconShare />, 'Share config', false, share)}
        </div>

        <Scene
          bodyColor={bodyColor} accentColor={accentColor} baseColor={baseColor}
          material={mat} environment={env} exploded={exploded} wireframe={wireframe}
          shadingMode={shadingMode} autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed}
          showHotspots={showHotspots} showGrid={showGrid} activeHotspot={activeHotspot}
          setActiveHotspot={setActiveHotspot} canvasRef={canvasRef} glRef={glRef}
          lightIntensity={lightI} lightAngle={lightAng} lightHeight={lightH}
          ambientIntensity={ambI} userFile={userFile} fov={fov}
          bloomIntensity={bloomI} bloomThreshold={bloomT} vignetteIntensity={vigI}
          ssaoEnabled={ssao} enablePostProcessing={enablePP}
          modelPath={PRESET_MODELS.find(m => m.id === selectedModel)?.path}
          showEnvBackground={showEnvBg} customHdri={customHdri}
          onStats={setSceneStats}
        />

        {/* ── Shading mode picker overlay ── */}
        {shadingOverlay && (
          <div style={{ position: 'absolute', inset: 0, top: '32px', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,8,12,0.85)' }}
            onClick={() => setShadingOverlay(false)}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '16px' }}
              onClick={(e) => e.stopPropagation()}>
              {SHADING_MODES.map((m) => {
                const isActive = shadingMode === m.id;
                return (
                  <button key={m.id} onClick={() => { setShadingMode(m.id); setShadingOverlay(false); }} style={{
                    padding: '12px 20px', borderRadius: '8px', cursor: 'pointer',
                    background: isActive ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(108,99,255,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? '#6C63FF' : 'rgba(255,255,255,0.5)',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'all 0.15s',
                    minWidth: '80px',
                  }}>{m.label}</button>
                );
              })}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>Click to select shading mode</div>
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
            {ibtn(<IconGrid />, 'Grid', showGrid, () => setShowGrid(!showGrid))}
            {ibtn(<IconRotate />, 'Auto-rotate', autoRotate, () => setAutoRotate(!autoRotate))}
            {ibtn(<IconMaximize />, 'Fullscreen', false, fullscreen)}
          </div>
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
      </div>

      {/* Scene stats overlay */}
      {sceneStats && (
        <div className="scene-stats" style={{
          position: 'absolute', bottom: '56px', right: '12px', zIndex: 15,
          background: 'rgba(8,8,12,0.75)', border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '6px', padding: '6px 10px',
          fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.6, pointerEvents: 'none', letterSpacing: '0.02em',
        }}>
          <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>TRI</span> {sceneStats.triangles.toLocaleString()}</div>
          <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>VTX</span> {sceneStats.vertices.toLocaleString()}</div>
          <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>OBJ</span> {sceneStats.meshes}</div>
          <div><span style={{ color: 'rgba(108,99,255,0.6)' }}>TEX</span> {sceneStats.textures}</div>
        </div>
      )}

      {/* Built by link removed — demo info kept in top bar only */}
    </div>
  );
}

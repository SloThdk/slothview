'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  IconCamera, IconMaximize, IconShare, IconGrid, IconExplode, IconRotate,
  IconWireframe, IconHotspot, IconUpload, IconSun, IconPalette, IconLayers,
  IconBox, IconSliders, IconEye, IconX, IconMenu, IconCheck, IconFile, IconTrash, IconZap,
} from './components/Icons';

const Scene = dynamic(() => import('./components/Scene'), { ssr: false });

/* ── Data ── */
const COLORS = [
  { name: 'Obsidian', value: '#1a1a2e' },
  { name: 'Arctic', value: '#e8e8ec' },
  { name: 'Navy', value: '#0f1b3d' },
  { name: 'Crimson', value: '#8b1a1a' },
  { name: 'Forest', value: '#1a3a2a' },
  { name: 'Charcoal', value: '#2d2d3a' },
  { name: 'Slate', value: '#3d4f5f' },
  { name: 'Copper', value: '#5a3825' },
];

const ACCENTS = [
  { name: 'Violet', value: '#6C63FF' },
  { name: 'Emerald', value: '#00D4A8' },
  { name: 'Amber', value: '#FFB020' },
  { name: 'Rose', value: '#FF4F81' },
  { name: 'Ice', value: '#4FC3F7' },
  { name: 'Pure', value: '#ffffff' },
  { name: 'Coral', value: '#FF6B6B' },
  { name: 'Lime', value: '#A3E635' },
];

const BASES = [
  { name: 'Gunmetal', value: '#2a2a35' },
  { name: 'Silver', value: '#b8b8c0' },
  { name: 'Gold', value: '#c4a35a' },
  { name: 'Black', value: '#0a0a0e' },
  { name: 'Brushed', value: '#6b7280' },
];

type MaterialType = 'glossy' | 'matte' | 'metallic' | 'glass';
const MATERIALS: { name: string; value: MaterialType; desc: string; price: number }[] = [
  { name: 'Glossy', value: 'glossy', desc: 'High-shine reflective finish', price: 0 },
  { name: 'Matte', value: 'matte', desc: 'Soft, diffused surface', price: 0 },
  { name: 'Metallic', value: 'metallic', desc: 'Brushed metal appearance', price: 299 },
  { name: 'Glass', value: 'glass', desc: 'Translucent frosted glass', price: 499 },
];

const ENVIRONMENTS = [
  { name: 'Studio', value: 'studio' },
  { name: 'Sunset', value: 'sunset' },
  { name: 'City', value: 'city' },
  { name: 'Forest', value: 'forest' },
  { name: 'Night', value: 'night' },
  { name: 'Warehouse', value: 'warehouse' },
  { name: 'Dawn', value: 'dawn' },
  { name: 'Apartment', value: 'apartment' },
  { name: 'Lobby', value: 'lobby' },
  { name: 'Park', value: 'park' },
];

const LIGHTING_PRESETS = [
  { name: 'Default', intensity: 1.2, ambient: 0.3, angle: 45 },
  { name: 'Dramatic', intensity: 2.0, ambient: 0.1, angle: 80 },
  { name: 'Soft', intensity: 0.7, ambient: 0.5, angle: 30 },
  { name: 'Backlit', intensity: 1.5, ambient: 0.2, angle: 180 },
  { name: 'Top-Down', intensity: 1.8, ambient: 0.15, angle: 0 },
  { name: 'Warm', intensity: 1.0, ambient: 0.4, angle: 60 },
];

const BASE_PRICE = 2499;

/* ── Tooltip ── */
function Tooltip({ text, children, position = 'bottom' }: { text: string; children: React.ReactNode; position?: 'bottom' | 'top' | 'left' }) {
  const [show, setShow] = useState(false);
  const posStyle: React.CSSProperties = position === 'top'
    ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' }
    : position === 'left'
    ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' }
    : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', ...posStyle, zIndex: 200,
          background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: '6px', padding: '5px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.7)',
          whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.15s ease',
        }}>{text}</div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function HomePage() {
  const [bodyColor, setBodyColor] = useState('#1a1a2e');
  const [accentColor, setAccentColor] = useState('#6C63FF');
  const [baseColor, setBaseColor] = useState('#2a2a35');
  const [material, setMaterial] = useState<MaterialType>('glossy');
  const [environment, setEnvironment] = useState('studio');
  const [exploded, setExploded] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1.0);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState('');
  const [activePanel, setActivePanel] = useState<'colors' | 'material' | 'environment' | 'lighting' | 'features'>('colors');
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [lightAngle, setLightAngle] = useState(45);
  const [ambientIntensity, setAmbientIntensity] = useState(0.3);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `slothview-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('Screenshot exported');
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const handleShare = useCallback(() => {
    const config = `body=${bodyColor.slice(1)}&accent=${accentColor.slice(1)}&base=${baseColor.slice(1)}&mat=${material}&env=${environment}`;
    const url = `${window.location.origin}?${config}`;
    navigator.clipboard.writeText(url).then(() => showToast('Config URL copied to clipboard'));
  }, [bodyColor, accentColor, baseColor, material, environment]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['glb', 'gltf', 'fbx', 'obj'].includes(ext || '')) {
        setUserFile(file);
        showToast(`Loaded: ${file.name}`);
      } else {
        showToast('Supported formats: GLB, GLTF, FBX, OBJ');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserFile(file);
      showToast(`Loaded: ${file.name}`);
    }
  }, []);

  const totalPrice = BASE_PRICE + (MATERIALS.find(m => m.value === material)?.price || 0);
  const bodyName = COLORS.find(c => c.value === bodyColor)?.name || 'Custom';
  const accentName = ACCENTS.find(c => c.value === accentColor)?.name || 'Custom';

  const applyLightingPreset = (preset: typeof LIGHTING_PRESETS[0]) => {
    setLightIntensity(preset.intensity);
    setAmbientIntensity(preset.ambient);
    setLightAngle(preset.angle);
    showToast(`Lighting: ${preset.name}`);
  };

  /* ── Shared styles ── */
  const panelTab = (id: string, label: string, icon: React.ReactNode) => (
    <Tooltip text={label} position="bottom" key={id}>
      <button onClick={() => setActivePanel(id as any)} style={{
        flex: 1, padding: '8px 4px', borderRadius: '6px', fontSize: '0px',
        background: activePanel === id ? 'var(--accent-glow)' : 'transparent',
        color: activePanel === id ? '#6C63FF' : 'var(--text-dim)',
        border: activePanel === id ? '1px solid rgba(108,99,255,0.25)' : '1px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>{icon}</button>
    </Tooltip>
  );

  const toolBtn = (icon: React.ReactNode, label: string, active: boolean, onClick: () => void) => (
    <Tooltip text={label} position="bottom" key={label}>
      <button onClick={onClick} style={{
        width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.03)',
        border: active ? '1px solid rgba(108,99,255,0.35)' : '1px solid var(--border)',
        color: active ? '#6C63FF' : 'var(--text-dim)',
        transition: 'all 0.2s',
      }}>{icon}</button>
    </Tooltip>
  );

  const swatch = (c: { name: string; value: string }, selected: boolean, onClick: () => void) => (
    <Tooltip text={c.name} position="top" key={c.value}>
      <button onClick={onClick} style={{
        width: '32px', height: '32px', borderRadius: '8px', background: c.value,
        border: selected ? '2px solid #6C63FF' : '2px solid transparent',
        boxShadow: selected ? '0 0 10px rgba(108,99,255,0.35)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        transition: 'all 0.2s', position: 'relative', flexShrink: 0,
      }}>
        {selected && <div style={{ position: 'absolute', inset: 0, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: c.value === '#e8e8ec' || c.value === '#b8b8c0' || c.value === '#ffffff' ? '#000' : '#fff' }}><IconCheck /></div>
        </div>}
      </button>
    </Tooltip>
  );

  const sliderRow = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#6C63FF', height: '3px' }} />
    </div>
  );

  const toggleRow = (label: string, desc: string, active: boolean, toggle: () => void, icon: React.ReactNode) => (
    <button key={label} onClick={toggle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: '8px', width: '100%',
      background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.015)',
      border: active ? '1px solid rgba(108,99,255,0.25)' : '1px solid var(--border)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: active ? '#6C63FF' : 'var(--text-dim)' }}>{icon}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{label}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{desc}</div>
        </div>
      </div>
      <div style={{
        width: '32px', height: '18px', borderRadius: '9px',
        background: active ? '#6C63FF' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: active ? '16px' : '2px', transition: 'left 0.2s' }} />
      </div>
    </button>
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
    >
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".glb,.gltf,.fbx,.obj" style={{ display: 'none' }} onChange={handleFileSelect} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)',
          borderRadius: '8px', padding: '8px 18px', color: '#a5a0ff', fontSize: '12px', fontWeight: 600,
          backdropFilter: 'blur(12px)', animation: 'fadeIn 0.15s ease',
        }}>{toast}</div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(108,99,255,0.08)',
          border: '2px dashed rgba(108,99,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#6C63FF', marginBottom: '8px' }}><IconUpload /></div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Drop your 3D model here</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>GLB, GLTF, FBX, or OBJ</div>
          </div>
        </div>
      )}

      {/* Demo Banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        background: '#0D0D0D', borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        fontSize: '11px',
      }}>
        <span style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', color: '#6C63FF', fontSize: '8px', fontWeight: 800, padding: '2px 7px', borderRadius: '100px', letterSpacing: '0.1em' }}>DEMO</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Interactive 3D product viewer</span>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        <a href="https://sloth-studio.pages.dev" target="_blank" rel="noopener" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none', fontSize: '11px' }}>Get a quote &rarr;</a>
      </div>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '300px' : '0px', flexShrink: 0,
        background: 'rgba(10,10,14,0.97)', borderRight: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', transition: 'width 0.3s ease', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', paddingTop: '34px', zIndex: 10,
      }}>
        <div style={{ padding: '16px 16px 8px', minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                <span style={{ color: '#6C63FF' }}>Sloth</span>View <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '12px' }}>3D</span>
              </div>
            </div>
            {userFile && (
              <Tooltip text="Remove model" position="left">
                <button onClick={() => { setUserFile(null); showToast('Model removed'); }} style={{
                  width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171',
                }}><IconTrash /></button>
              </Tooltip>
            )}
          </div>

          {/* File upload area */}
          <button onClick={() => fileInputRef.current?.click()} style={{
            width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '12px',
            background: userFile ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.02)',
            border: userFile ? '1px solid rgba(108,99,255,0.25)' : '1px dashed rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
          }}>
            <span style={{ color: userFile ? '#6C63FF' : 'var(--text-dim)' }}>{userFile ? <IconFile /> : <IconUpload />}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: userFile ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {userFile ? userFile.name : 'Load your own model'}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                {userFile ? `${(userFile.size / 1024 / 1024).toFixed(1)} MB` : 'GLB, GLTF, FBX, OBJ - drag & drop supported'}
              </div>
            </div>
          </button>

          {/* Panel tabs */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', padding: '3px', marginBottom: '12px' }}>
            {panelTab('colors', 'Colors', <IconPalette />)}
            {panelTab('material', 'Material', <IconLayers />)}
            {panelTab('environment', 'Environment', <IconBox />)}
            {panelTab('lighting', 'Lighting', <IconSun />)}
            {panelTab('features', 'Features', <IconSliders />)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', minWidth: '300px' }}>
          {activePanel === 'colors' && !userFile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Body</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{COLORS.map(c => swatch(c, bodyColor === c.value, () => setBodyColor(c.value)))}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Accent</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{ACCENTS.map(c => swatch(c, accentColor === c.value, () => setAccentColor(c.value)))}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Base</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{BASES.map(c => swatch(c, baseColor === c.value, () => setBaseColor(c.value)))}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Custom</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={bodyColor} onChange={e => setBodyColor(e.target.value)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{bodyColor.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'colors' && userFile && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
              Color controls are for the built-in demo product. Load materials with your model file.
            </div>
          )}

          {activePanel === 'material' && !userFile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {MATERIALS.map(m => (
                <button key={m.value} onClick={() => setMaterial(m.value)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', borderRadius: '8px',
                  background: material === m.value ? 'var(--accent-glow)' : 'rgba(255,255,255,0.015)',
                  border: material === m.value ? '1px solid rgba(108,99,255,0.35)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: material === m.value ? '#fff' : 'rgba(255,255,255,0.65)' }}>{m.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{m.desc}</div>
                  </div>
                  {m.price > 0 && <span style={{ fontSize: '10px', color: '#FFB020', fontWeight: 600 }}>+{m.price} DKK</span>}
                </button>
              ))}
            </div>
          )}

          {activePanel === 'material' && userFile && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
              Material controls are for the built-in demo product. Your model uses its own materials.
            </div>
          )}

          {activePanel === 'environment' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              {ENVIRONMENTS.map(e => (
                <button key={e.value} onClick={() => setEnvironment(e.value)} style={{
                  padding: '14px 10px', borderRadius: '8px', textAlign: 'center',
                  background: environment === e.value ? 'var(--accent-glow)' : 'rgba(255,255,255,0.015)',
                  border: environment === e.value ? '1px solid rgba(108,99,255,0.35)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: environment === e.value ? '#fff' : 'rgba(255,255,255,0.55)' }}>{e.name}</div>
                </button>
              ))}
            </div>
          )}

          {activePanel === 'lighting' && (
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Presets</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '16px' }}>
                {LIGHTING_PRESETS.map(p => (
                  <button key={p.name} onClick={() => applyLightingPreset(p)} style={{
                    padding: '8px 4px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    color: 'rgba(255,255,255,0.55)', transition: 'all 0.2s',
                  }}>{p.name}</button>
                ))}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Manual</div>
              {sliderRow('Key Light Intensity', lightIntensity, 0, 3, 0.1, setLightIntensity)}
              {sliderRow('Ambient Fill', ambientIntensity, 0, 1, 0.05, setAmbientIntensity)}
              {sliderRow('Light Rotation', lightAngle, 0, 360, 1, setLightAngle)}
            </div>
          )}

          {activePanel === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {toggleRow('Auto Rotate', 'Slowly spin the model', autoRotate, () => setAutoRotate(!autoRotate), <IconRotate />)}
              {autoRotate && (
                <div style={{ padding: '4px 12px 8px' }}>
                  {sliderRow('Rotation Speed', autoRotateSpeed, 0.2, 5, 0.1, setAutoRotateSpeed)}
                </div>
              )}
              {!userFile && toggleRow('Exploded View', 'Separate components', exploded, () => setExploded(!exploded), <IconExplode />)}
              {toggleRow('Wireframe', 'Show mesh topology', wireframe, () => setWireframe(!wireframe), <IconWireframe />)}
              {!userFile && toggleRow('Annotations', 'Feature hotspots on model', showHotspots, () => setShowHotspots(!showHotspots), <IconHotspot />)}
              {toggleRow('Floor Grid', 'Reference grid plane', showGrid, () => setShowGrid(!showGrid), <IconGrid />)}
            </div>
          )}
        </div>

        {/* Price footer */}
        {!userFile && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            background: 'rgba(108,99,255,0.02)', minWidth: '300px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Config</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>{bodyName} / {accentName} / {material}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800 }}>{totalPrice.toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 400 }}>DKK</span></div>
              </div>
            </div>
            <button style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6C63FF, #5046e5)',
              color: '#fff', fontSize: '12px', fontWeight: 700,
            }}>Add to Cart</button>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>Demo only</div>
          </div>
        )}
      </div>

      {/* Main viewport */}
      <div style={{ flex: 1, position: 'relative', paddingTop: '32px' }}>
        {/* Sidebar toggle */}
        <Tooltip text={sidebarOpen ? 'Close panel' : 'Open panel'} position="bottom">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            position: 'absolute', top: '42px', left: '10px', zIndex: 20,
            width: '34px', height: '34px', borderRadius: '7px',
            background: 'rgba(10,10,14,0.85)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
          }}>
            {sidebarOpen ? <IconX /> : <IconMenu />}
          </button>
        </Tooltip>

        {/* Toolbar */}
        <div style={{
          position: 'absolute', top: '42px', right: '10px', zIndex: 20,
          display: 'flex', gap: '3px', background: 'rgba(10,10,14,0.85)',
          border: '1px solid var(--border)', borderRadius: '8px', padding: '3px',
          backdropFilter: 'blur(12px)',
        }}>
          {toolBtn(<IconCamera />, 'Screenshot (PNG)', false, handleScreenshot)}
          {toolBtn(<IconMaximize />, 'Fullscreen', false, handleFullscreen)}
          {toolBtn(<IconShare />, 'Share Configuration', false, handleShare)}
        </div>

        {/* Canvas */}
        <Scene
          bodyColor={bodyColor} accentColor={accentColor} baseColor={baseColor}
          material={material} environment={environment} exploded={exploded}
          wireframe={wireframe} autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed}
          showHotspots={showHotspots} showGrid={showGrid} activeHotspot={activeHotspot}
          setActiveHotspot={setActiveHotspot} canvasRef={canvasRef}
          lightIntensity={lightIntensity} lightAngle={lightAngle}
          ambientIntensity={ambientIntensity} userFile={userFile}
        />

        {/* Controls hint */}
        <div style={{
          position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '12px', alignItems: 'center',
          background: 'rgba(10,10,14,0.85)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '6px 14px', backdropFilter: 'blur(12px)',
          fontSize: '10px', color: 'var(--text-dim)',
        }}>
          <span>Scroll to zoom</span>
          <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
          <span>Drag to rotate</span>
          <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
          <span>Right-click to pan</span>
        </div>
      </div>

      {/* Built by */}
      <a href="https://sloth-studio.pages.dev" target="_blank" rel="noopener" style={{
        position: 'fixed', bottom: '14px', right: '14px', zIndex: 50,
        background: 'rgba(10,10,14,0.9)', border: '1px solid var(--border)',
        borderRadius: '7px', padding: '6px 12px', fontSize: '10px',
        color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
        backdropFilter: 'blur(12px)',
      }}>
        Built by <span style={{ color: '#6C63FF', fontWeight: 600 }}>Sloth Studio</span> &rarr;
      </a>
    </div>
  );
}

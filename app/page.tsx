'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./components/Scene'), { ssr: false });

const COLORS = [
  { name: 'Obsidian', value: '#1a1a2e' },
  { name: 'Arctic White', value: '#e8e8ec' },
  { name: 'Navy', value: '#0f1b3d' },
  { name: 'Crimson', value: '#8b1a1a' },
  { name: 'Forest', value: '#1a3a2a' },
  { name: 'Charcoal', value: '#2d2d3a' },
];

const ACCENTS = [
  { name: 'Violet', value: '#6C63FF' },
  { name: 'Emerald', value: '#00D4A8' },
  { name: 'Amber', value: '#FFB020' },
  { name: 'Rose', value: '#FF4F81' },
  { name: 'Ice', value: '#4FC3F7' },
  { name: 'Pure', value: '#ffffff' },
];

const BASES = [
  { name: 'Gunmetal', value: '#2a2a35' },
  { name: 'Silver', value: '#b8b8c0' },
  { name: 'Gold', value: '#c4a35a' },
  { name: 'Black', value: '#0a0a0e' },
];

const MATERIALS: { name: string; value: 'glossy' | 'matte' | 'metallic' | 'glass' }[] = [
  { name: 'Glossy', value: 'glossy' },
  { name: 'Matte', value: 'matte' },
  { name: 'Metallic', value: 'metallic' },
  { name: 'Glass', value: 'glass' },
];

const ENVIRONMENTS = [
  { name: 'Studio', value: 'studio' },
  { name: 'Sunset', value: 'sunset' },
  { name: 'City', value: 'city' },
  { name: 'Forest', value: 'forest' },
  { name: 'Night', value: 'night' },
  { name: 'Warehouse', value: 'warehouse' },
];

const MATERIAL_PRICES = { glossy: 0, matte: 0, metallic: 299, glass: 499 };
const BASE_PRICE = 2499;

const SVG_ICONS = {
  camera: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  maximize: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  explode: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  ),
  rotate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  wireframe: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  tag: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  share: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
};

export default function HomePage() {
  const [bodyColor, setBodyColor] = useState('#1a1a2e');
  const [accentColor, setAccentColor] = useState('#6C63FF');
  const [baseColor, setBaseColor] = useState('#2a2a35');
  const [material, setMaterial] = useState<'glossy' | 'matte' | 'metallic' | 'glass'>('glossy');
  const [environment, setEnvironment] = useState('studio');
  const [exploded, setExploded] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState('');
  const [activePanel, setActivePanel] = useState<'colors' | 'material' | 'environment' | 'features'>('colors');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `slothview-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('Screenshot saved!');
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleShare = useCallback(() => {
    const config = `body=${bodyColor.slice(1)}&accent=${accentColor.slice(1)}&base=${baseColor.slice(1)}&mat=${material}&env=${environment}`;
    const url = `${window.location.origin}?${config}`;
    navigator.clipboard.writeText(url).then(() => showToast('Configuration link copied!'));
  }, [bodyColor, accentColor, baseColor, material, environment]);

  const totalPrice = BASE_PRICE + MATERIAL_PRICES[material];
  const bodyName = COLORS.find(c => c.value === bodyColor)?.name || 'Custom';
  const accentName = ACCENTS.find(c => c.value === accentColor)?.name || 'Custom';

  const toolbarBtn = (icon: React.ReactNode, label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      title={label}
      style={{
        width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(108,99,255,0.4)' : '1px solid var(--border)',
        color: active ? '#6C63FF' : 'var(--text-dim)',
        transition: 'all 0.2s ease',
      }}
    >
      {icon}
    </button>
  );

  const colorSwatch = (c: { name: string; value: string }, selected: boolean, onClick: () => void) => (
    <button
      key={c.value}
      onClick={onClick}
      title={c.name}
      style={{
        width: '36px', height: '36px', borderRadius: '10px', background: c.value,
        border: selected ? '2px solid #6C63FF' : '2px solid transparent',
        boxShadow: selected ? '0 0 12px rgba(108,99,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.15)' : 'inset 0 0 0 1px rgba(255,255,255,0.1)',
        transition: 'all 0.2s ease', position: 'relative',
      }}
    >
      {selected && <div style={{ position: 'absolute', inset: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.value === '#e8e8ec' || c.value === '#b8b8c0' || c.value === '#ffffff' ? '#000' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>}
    </button>
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: '10px', padding: '10px 20px', color: '#a5a0ff', fontSize: '13px', fontWeight: 600,
          backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease',
        }}>{toast}</div>
      )}

      {/* Demo Banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        background: '#0D0D0D', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        fontSize: '12px',
      }}>
        <span style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', color: '#6C63FF', fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '100px', letterSpacing: '0.08em' }}>DEMO</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Interactive 3D product viewer by Sloth Studio</span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <a href="https://sloth-studio.pages.dev" target="_blank" rel="noopener" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>Get a quote &rarr;</a>
      </div>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '320px' : '0px', flexShrink: 0,
        background: 'rgba(10,10,14,0.95)', borderRight: '1px solid var(--border)',
        backdropFilter: 'blur(16px)', transition: 'width 0.3s ease', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', paddingTop: '40px', zIndex: 10,
      }}>
        <div style={{ padding: '20px 20px 10px', minWidth: '320px' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>
            <span style={{ color: '#6C63FF' }}>Sloth</span>View 3D
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>Product Configurator</div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px', marginBottom: '16px' }}>
            {(['colors', 'material', 'environment', 'features'] as const).map(p => (
              <button key={p} onClick={() => setActivePanel(p)} style={{
                flex: 1, padding: '7px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                background: activePanel === p ? 'var(--accent-glow)' : 'transparent',
                color: activePanel === p ? '#6C63FF' : 'var(--text-dim)',
                border: activePanel === p ? '1px solid rgba(108,99,255,0.25)' : '1px solid transparent',
                textTransform: 'capitalize', transition: 'all 0.2s',
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', minWidth: '320px' }}>
          {activePanel === 'colors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Body Color</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => colorSwatch(c, bodyColor === c.value, () => setBodyColor(c.value)))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Accent Color</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ACCENTS.map(c => colorSwatch(c, accentColor === c.value, () => setAccentColor(c.value)))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Base</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {BASES.map(c => colorSwatch(c, baseColor === c.value, () => setBaseColor(c.value)))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Custom Color</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={bodyColor} onChange={e => setBodyColor(e.target.value)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{bodyColor.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'material' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {MATERIALS.map(m => (
                <button key={m.value} onClick={() => setMaterial(m.value)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '10px',
                  background: material === m.value ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                  border: material === m.value ? '1px solid rgba(108,99,255,0.4)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: m.value === 'glossy' ? 'linear-gradient(135deg, #333, #555, #333)' :
                        m.value === 'matte' ? '#3a3a3a' :
                        m.value === 'metallic' ? 'linear-gradient(135deg, #666, #aaa, #666)' :
                        'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(108,99,255,0.05))',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: material === m.value ? '#fff' : 'rgba(255,255,255,0.7)' }}>{m.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                        {m.value === 'glossy' ? 'High-shine reflective finish' :
                         m.value === 'matte' ? 'Soft, diffused surface' :
                         m.value === 'metallic' ? 'Brushed metal appearance' :
                         'Translucent frosted glass'}
                      </div>
                    </div>
                  </div>
                  {MATERIAL_PRICES[m.value] > 0 && (
                    <span style={{ fontSize: '11px', color: '#FFB020', fontWeight: 600 }}>+{MATERIAL_PRICES[m.value]} DKK</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {activePanel === 'environment' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {ENVIRONMENTS.map(e => (
                <button key={e.value} onClick={() => setEnvironment(e.value)} style={{
                  padding: '16px 12px', borderRadius: '10px', textAlign: 'center',
                  background: environment === e.value ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                  border: environment === e.value ? '1px solid rgba(108,99,255,0.4)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                    {e.value === 'studio' ? '\u2728' : e.value === 'sunset' ? '\u{1F305}' : e.value === 'city' ? '\u{1F307}' : e.value === 'forest' ? '\u{1F332}' : e.value === 'night' ? '\u{1F30C}' : '\u{1F3ED}'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: environment === e.value ? '#fff' : 'rgba(255,255,255,0.6)' }}>{e.name}</div>
                </button>
              ))}
            </div>
          )}

          {activePanel === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Auto Rotate', active: autoRotate, toggle: () => setAutoRotate(!autoRotate), icon: SVG_ICONS.rotate },
                { label: 'Exploded View', active: exploded, toggle: () => setExploded(!exploded), icon: SVG_ICONS.explode },
                { label: 'Wireframe', active: wireframe, toggle: () => setWireframe(!wireframe), icon: SVG_ICONS.wireframe },
                { label: 'Hotspots', active: showHotspots, toggle: () => setShowHotspots(!showHotspots), icon: SVG_ICONS.tag },
                { label: 'Floor Grid', active: showGrid, toggle: () => setShowGrid(!showGrid), icon: SVG_ICONS.grid },
              ].map(f => (
                <button key={f.label} onClick={f.toggle} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '10px',
                  background: f.active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                  border: f.active ? '1px solid rgba(108,99,255,0.3)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: f.active ? '#6C63FF' : 'var(--text-dim)' }}>{f.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: f.active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{f.label}</span>
                  </div>
                  <div style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: f.active ? '#6C63FF' : 'rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: f.active ? '18px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price card at bottom of sidebar */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border)',
          background: 'rgba(108,99,255,0.03)', minWidth: '320px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Configuration</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{bodyName} / {accentName} / {material}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 800, color: '#fff' }}>{totalPrice.toLocaleString()} <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 400 }}>DKK</span></div>
            </div>
          </div>
          <button style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6C63FF, #5046e5)',
            color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em',
            transition: 'all 0.2s',
          }}>Add to Cart</button>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '6px' }}>Demo only - no real transaction</div>
        </div>
      </div>

      {/* Main viewport */}
      <div style={{ flex: 1, position: 'relative', paddingTop: '36px' }}>
        {/* Toggle sidebar button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          position: 'absolute', top: '48px', left: '12px', zIndex: 20,
          width: '36px', height: '36px', borderRadius: '8px',
          background: 'rgba(10,10,14,0.8)', border: '1px solid var(--border)',
          color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>

        {/* Toolbar */}
        <div style={{
          position: 'absolute', top: '48px', right: '12px', zIndex: 20,
          display: 'flex', gap: '4px', background: 'rgba(10,10,14,0.8)',
          border: '1px solid var(--border)', borderRadius: '10px', padding: '4px',
          backdropFilter: 'blur(8px)',
        }}>
          {toolbarBtn(SVG_ICONS.camera, 'Screenshot', false, handleScreenshot)}
          {toolbarBtn(SVG_ICONS.maximize, 'Fullscreen', false, handleFullscreen)}
          {toolbarBtn(SVG_ICONS.share, 'Share Config', false, handleShare)}
        </div>

        {/* 3D Canvas */}
        <Scene
          bodyColor={bodyColor}
          accentColor={accentColor}
          baseColor={baseColor}
          material={material}
          environment={environment}
          exploded={exploded}
          wireframe={wireframe}
          autoRotate={autoRotate}
          showHotspots={showHotspots}
          showGrid={showGrid}
          activeHotspot={activeHotspot}
          setActiveHotspot={setActiveHotspot}
          canvasRef={canvasRef}
        />

        {/* Bottom info */}
        <div style={{
          position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '16px', alignItems: 'center',
          background: 'rgba(10,10,14,0.8)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '8px 16px', backdropFilter: 'blur(8px)',
          fontSize: '11px', color: 'var(--text-dim)',
        }}>
          <span>Scroll to zoom</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>Drag to rotate</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>Right-click to pan</span>
        </div>
      </div>

      {/* Built by floating button */}
      <a
        href="https://sloth-studio.pages.dev"
        target="_blank"
        rel="noopener"
        style={{
          position: 'fixed', bottom: '16px', right: '16px', zIndex: 50,
          background: 'rgba(10,10,14,0.9)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '8px 14px', fontSize: '11px',
          color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
          backdropFilter: 'blur(8px)', transition: 'all 0.2s',
        }}
      >
        Built by <span style={{ color: '#6C63FF', fontWeight: 600 }}>Sloth Studio</span> &rarr;
      </a>
    </div>
  );
}

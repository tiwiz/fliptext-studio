import { useState, useCallback, useEffect, useRef } from 'react';
import Viewport from './components/Viewport';
import InputPanel from './components/InputPanel';
import { generateScadWithFont } from './utils/scadGenerator';
import type { FlipTextInputs } from './utils/scadTemplate';
import type { Font } from 'opentype.js';

type TabId = 'configure' | 'preview';

export default function App() {
  const [stlData, setStlData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('configure');
  const compileRef = useRef<((code: string) => Promise<string | null>) | null>(null);
  const fontRef = useRef<Font | null>(null);

  // Load OpenSCAD engine + font
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [openscadModule, opentypeModule] = await Promise.all([
          import('openscad-wasm-prebuilt'),
          import('opentype.js'),
        ]);

        if (cancelled) return;

        const instance = await openscadModule.createOpenSCAD({
          print: () => { },
          printErr: () => { },
        });
        if (cancelled) return;
        compileRef.current = instance.renderToStl.bind(instance);

        try {
          const resp = await fetch('/fonts/NotoSans-Bold.ttf');
          if (resp.ok) {
            const fontData = await resp.arrayBuffer();
            const font = opentypeModule.default.parse(fontData);
            fontRef.current = font;
          }
        } catch {
          // Font loading failure handled at generation time
        }

        setEngineReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(`Loading failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const handleGenerate = useCallback(async (inputs: FlipTextInputs) => {
    if (!compileRef.current) {
      setError('OpenSCAD engine not loaded yet. Please wait.');
      return;
    }

    const font = fontRef.current;
    if (!font) {
      setError('Font not loaded. Please wait or refresh the page.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStlData(null);

    await new Promise(r => setTimeout(r, 50));

    try {
      const code = generateScadWithFont(
        inputs.name1,
        inputs.name2,
        inputs.filler,
        font,
      );

      const stl = await compileRef.current(code);

      if (stl && stl.trim().startsWith('solid') && stl.length > 100) {
        setStlData(stl);
        setActiveTab('preview');
      } else {
        setError('OpenSCAD returned invalid STL. Check your inputs.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!stlData) return;
    const blob = new Blob([stlData], { type: 'application/sla' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flip-text.stl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stlData]);

  const isReady = engineReady && fontRef.current !== null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background font-body-base">
      {/* === DESKTOP TOP NAV BAR === */}
      <header className="hidden md:flex docked full-width top-0 z-50 bg-surface border-b border-outline-variant items-center w-full h-16">
        <div className="flex items-center pl-[48px]"> {/* px-8 (32px) + 16px = 48px */}
          <span className="font-headline-md text-[24px] font-bold text-primary tracking-tight [font-variant:small-caps]">FlipText</span>
        </div>
      </header>

      {/* === MOBILE TOP APP BAR === */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-md border-b border-outline-variant/10 flex items-center px-0 h-16">
        <div className="flex items-center pl-[40px]"> {/* Original px-6 (24px) + 16px = 40px */}
          <span className="font-headline-md font-bold text-on-surface [font-variant:small-caps]">FlipText</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row md:h-[calc(100vh-64px)] pt-16 md:pt-0 pb-20 md:pb-0">


        {/* === INPUT PANEL === */}
        <aside
          className={`w-full py-[80px] md:w-[360px] md:flex-shrink-0 ${activeTab === 'configure' ? 'flex' : 'hidden'} md:flex flex-col h-full bg-surface-container border-r border-outline-variant`}
        >
          <InputPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            hasModel={!!stlData}
            onDownload={handleDownload}
            error={error}
            disabled={!isReady}
            onSwitchToPreview={() => setActiveTab('preview')}
          />
        </aside>

        {/* === 3D VIEWPORT === */}
        <main
          className={`flex-1 relative ${activeTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-col h-full bg-surface-dim overflow-hidden items-center justify-center`}
        >
          {/* Immersion Canvas Background */}
          <div className="hidden md:block absolute inset-0 viewport-grid opacity-20 pointer-events-none"></div>
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          <div className="md:hidden absolute inset-0 viewport-gradient border-b border-outline-variant/10">
            <div className="perspective-grid"></div>
          </div>
          <Viewport stlData={stlData} />

          {/* Floating Viewport Controls */}
          <div className="hidden md:flex absolute bottom-10 right-10 gap-2 studio-glass p-2 rounded-xl border border-white/10">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-secondary hover:text-on-secondary transition-all">
              <span className="material-symbols-outlined">orbit</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-secondary hover:text-on-secondary transition-all">
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-secondary hover:text-on-secondary transition-all">
              <span className="material-symbols-outlined">pan_tool</span>
            </button>
            <div className="w-px h-8 bg-outline-variant/30 self-center mx-1"></div>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-secondary hover:text-on-secondary transition-all">
              <span className="material-symbols-outlined">videocam</span>
            </button>
          </div>
          <div className="md:hidden absolute bottom-4 right-4 flex flex-col gap-2">
            <button className="glass-panel w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/20 text-primary active:scale-90 transition-transform">
              <span className="material-symbols-outlined">orbit</span>
            </button>
            <button className="glass-panel w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/20 text-primary active:scale-90 transition-transform">
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
          </div>

          {/* Loading overlay */}
          {!engineReady && !error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-container/80 backdrop-blur-sm rounded-lg px-5 py-3 border border-[#849495]/20 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <p className="text-sm text-on-surface font-medium">Loading FlipText Studio</p>
                  <p className="font-label text-outline">
                    Loading OpenSCAD engine (11MB WASM)... {!fontRef.current ? 'Loading font...' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Font loading overlay */}
          {engineReady && !fontRef.current && !error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-container/80 backdrop-blur-sm rounded-lg px-5 py-3 border border-[#849495]/20 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-on-surface font-medium">Loading Noto Sans Bold font...</p>
              </div>
            </div>
          )}
        </main>

      </div>

      {/* === MOBILE BOTTOM TAB BAR === */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container border-t border-outline-variant/10 flex justify-around items-center h-20 px-4 pb-safe">
        <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('configure'); }} className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 duration-200 ${activeTab === 'configure' ? 'text-secondary bg-secondary-container/20' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
          <span className="material-symbols-outlined">construction</span>
          <span className="font-body-sm text-[12px]">Tools</span>
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('preview'); }} className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 duration-200 ${activeTab === 'preview' ? 'text-secondary bg-secondary-container/20' : 'text-on-surface-variant hover:bg-surface-variant'}`}>
          <span className="material-symbols-outlined">view_in_ar</span>
          <span className="font-body-sm text-[12px]">Workspace</span>
        </a>
      </nav>
    </div>
  );
}
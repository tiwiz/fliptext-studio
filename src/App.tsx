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
          print: () => {},
          printErr: () => {},
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
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* === MOBILE TAB BAR === */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 bg-surface-container border-b border-[#849495]/20 z-20">
        <h1 className="font-headline text-base text-white tracking-tight">
          FlipText <span className="text-on-surface-variant font-normal">Studio</span>
        </h1>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('configure')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'configure'
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            ⚙️ Configure
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all relative ${
              activeTab === 'preview'
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            👁 Preview
            {stlData && activeTab !== 'preview' && (
              <span className="ml-1 w-1.5 h-1.5 bg-secondary rounded-full inline-block" />
            )}
          </button>
        </div>
      </header>

      {/* === INPUT PANEL === */}
      <aside
        className={`w-full md:w-[280px] md:flex-shrink-0 ${activeTab === 'configure' ? 'flex' : 'hidden'} md:flex flex-col h-full`}
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
        className={`flex-1 relative ${activeTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-col h-full`}
      >
        {/* Desktop header */}
        <div className="hidden md:block absolute top-4 left-4 z-10">
          <h1 className="font-headline text-lg text-white drop-shadow-lg">
            Flip Text<span className="text-on-surface-variant font-normal"> Studio</span>
          </h1>
        </div>

        <Viewport stlData={stlData} />

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

      {/* === MOBILE BOTTOM TAB BAR === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-[#849495]/20 z-20 safe-area-bottom">
        <div className="flex">
          <button
            onClick={() => setActiveTab('configure')}
            className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-all ${
              activeTab === 'configure'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">⚙️</span>
            Configure
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-all relative ${
              activeTab === 'preview'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">👁</span>
            Preview
            {stlData && (
              <span className="absolute top-1 right-1/4 w-1.5 h-1.5 bg-secondary rounded-full" />
            )}
          </button>
        </div>
      </nav>

      <div className="md:hidden h-14" />
    </div>
  );
}
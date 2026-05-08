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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('configure');
  const fontRef = useRef<Font | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const resolveInitRef = useRef<(() => void) | null>(null);
  const rejectInitRef = useRef<((err: any) => void) | null>(null);
  const resolveGenRef = useRef<((stl: string) => void) | null>(null);
  const rejectGenRef = useRef<((err: any) => void) | null>(null);

  // Load OpenSCAD Worker + font
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const opentypeModule = await import('opentype.js');

        if (cancelled) return;

        const worker = new Worker(new URL('./utils/openscadWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const { type, payload } = e.data;
          if (type === 'INIT_DONE') {
            resolveInitRef.current?.();
          } else if (type === 'GENERATE_DONE') {
            resolveGenRef.current?.(payload);
          } else if (type === 'ERROR') {
            if (resolveInitRef.current) {
              rejectInitRef.current?.(payload);
            } else if (resolveGenRef.current) {
              rejectGenRef.current?.(payload);
            }
          }
        };

        worker.onerror = (e) => {
          if (resolveInitRef.current) {
            rejectInitRef.current?.(e.message || "Worker initialization failed");
          }
        };

        await new Promise<void>((resolve, reject) => {
          resolveInitRef.current = resolve;
          rejectInitRef.current = reject;
          worker.postMessage({ type: 'INIT' });
        });
        
        resolveInitRef.current = null;
        rejectInitRef.current = null;

        if (cancelled) return;

        try {
          const resp = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-Bold.ttf`);
          if (resp.ok) {
            const fontData = await resp.arrayBuffer();
            const font = opentypeModule.default.parse(fontData);
            fontRef.current = font;
          }
        } catch {
          // Font error
        }

        setEngineReady(true);
        setLoadingProgress(100);
      } catch (err) {
        if (!cancelled) {
          setError(`Loading failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    init();
    
    // Simulated progress bar
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    return () => { 
      cancelled = true; 
      clearInterval(progressInterval);
      workerRef.current?.terminate();
    };
  }, []);

  const handleGenerate = useCallback(async (inputs: FlipTextInputs) => {
    if (!workerRef.current) {
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

    try {
      const code = generateScadWithFont(
        inputs.name1,
        inputs.name2,
        inputs.filler,
        font,
      );

      const stl = await new Promise<string>((resolve, reject) => {
        resolveGenRef.current = resolve;
        rejectGenRef.current = reject;
        workerRef.current?.postMessage({ type: 'GENERATE', payload: { scadCode: code } });
      });

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

  if (!isReady && !error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background font-body-base">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 p-8 bg-surface-container rounded-2xl border border-outline-variant shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="font-headline-md text-3xl font-bold text-primary tracking-tight [font-variant:small-caps]">FlipText</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary uppercase tracking-wider">Studio</span>
          </div>
          
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-on-surface-variant">
                {!engineReady ? "Loading OpenSCAD Engine (11MB)" : "Initializing Fonts"}
              </span>
              <span className="text-sm font-mono text-primary">{Math.min(100, Math.round(loadingProgress))}%</span>
            </div>
            
            <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.round(loadingProgress))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Removed old loading overlays since we now have a full screen one */}
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
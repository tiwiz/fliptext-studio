import { useState } from 'react';
import type { FillerType, FlipTextInputs } from '../utils/scadTemplate';

interface InputPanelProps {
  onGenerate: (inputs: FlipTextInputs) => void;
  isGenerating: boolean;
  hasModel: boolean;
  onDownload: () => void;
  error: string | null;
  disabled?: boolean;
  onSwitchToPreview?: () => void;
}

const FILLER_OPTIONS: { value: FillerType; label: string; icon: string }[] = [
  { value: 'heart', label: 'Heart', icon: '❤️' },
  { value: 'heart1', label: 'Heart 1', icon: '💖' },
  { value: 'heart2', label: 'Heart 2', icon: '💟' },
  { value: 'diamond', label: 'Diamond', icon: '💠' },
  { value: 'frame', label: 'Frame', icon: '🔲' },
];

export default function InputPanel({
  onGenerate,
  isGenerating,
  hasModel,
  onDownload,
  error,
  disabled = false,
  onSwitchToPreview,
}: InputPanelProps) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [filler, setFiller] = useState<FillerType>('heart');

  const handleGenerate = () => {
    if (!name1.trim() || !name2.trim()) return;
    onGenerate({ name1: name1.trim(), name2: name2.trim(), filler });
  };

  return (
    <div className="flex flex-col h-full border-r border-[#849495]/20">
/* Desktop-only header */
      <div className="hidden md:block px-6 py-6 border-b border-[#849495]/20">
        <h1 className="font-headline text-white text-xl">
          FlipText Studio
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Generate 3D printable flip-text STLs
        </p>
      </div>

      {/* Inputs — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* Name 1 */}
        <div>
          <label className="block font-label text-on-surface-variant uppercase tracking-wider mb-2">
            Name 1
          </label>
          <input
            type="text"
            value={name1}
            onChange={(e) => setName1(e.target.value.slice(0, 12))}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. Alice"
            maxLength={12}
            className="w-full bg-surface-container-low border-b-2 border-[#849495]/40 rounded px-4 py-3.5 text-base text-white placeholder-text-outline focus:outline-none focus:border-primary transition-colors uppercase"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="font-label text-outline mt-1.5 text-xs">{name1.length}/12 chars · auto-uppercased</p>
        </div>

        {/* Name 2 */}
        <div>
          <label className="block font-label text-on-surface-variant uppercase tracking-wider mb-2">
            Name 2
          </label>
          <input
            type="text"
            value={name2}
            onChange={(e) => setName2(e.target.value.slice(0, 12))}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. Bob"
            maxLength={12}
            className="w-full bg-surface-container-low border-b-2 border-[#849495]/40 rounded px-4 py-3.5 text-base text-white placeholder-text-outline focus:outline-none focus:border-primary transition-colors uppercase"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="font-label text-outline mt-1.5 text-xs">{name2.length}/12 chars · auto-uppercased</p>
        </div>

        {/* Filler Selector */}
        <div>
          <label className="block font-label text-on-surface-variant uppercase tracking-wider mb-3">
            Filler Character
          </label>
          <div className="grid grid-cols-5 gap-2.5">
            {FILLER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiller(opt.value)}
                className={`flex flex-col items-center gap-1 py-3.5 px-2 rounded-lg text-xs transition-all ${
                  filler === opt.value
                    ? 'bg-primary/15 text-primary border border-primary/40'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:border border-[#849495]/30'
                }`}
                title={opt.label}
              >
                <span className="text-xl leading-none">{opt.icon}</span>
                <span className="font-label mt-0.5">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button - Primary CTA */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || disabled || !name1.trim() || !name2.trim()}
          className="w-full py-4 rounded-lg font-medium text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-on-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Compiling...
            </span>
          ) : (
            'Generate STL'
          )}
        </button>

        {/* Download + View 3D action row */}
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            disabled={!hasModel}
            className="flex-1 py-3.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-surface-container hover:bg-surface-container-high text-on-surface border border-[#849495]/30"
          >
            ⬇ Download STL
          </button>

          {onSwitchToPreview && hasModel && (
            <button
              onClick={onSwitchToPreview}
              className="flex-1 py-3.5 rounded-lg font-medium text-sm transition-all bg-surface-container hover:bg-surface-container-high text-on-surface border border-[#849495]/30 md:hidden"
            >
              👁 View 3D
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3">
            <p className="text-sm text-error leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="hidden md:block px-6 py-5 border-t border-[#849495]/20">
        <p className="font-label text-outline text-center">
          100% client-side · Powered by OpenSCAD WASM
        </p>
      </div>
    </div>
  );
}
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
  { value: 'heart', label: 'HEART', icon: 'favorite' },
  { value: 'heart1', label: 'HEART1', icon: 'favorite_border' },
  { value: 'heart2', label: 'HEART2', icon: 'heart_plus' },
  { value: 'diamond', label: 'DIAMOND', icon: 'diamond' },
  { value: 'frame', label: 'FRAME', icon: 'crop_square' },
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
    <div className="flex flex-col h-full overflow-y-auto">


      {/* Inputs — scrollable */}
      <div className="flex-1 px-6 pb-6 md:pt-0 pt-6 space-y-6">


        {/* Spacer */}
        <div className="h-[50px] w-full" />

        {/* Text Inputs */}
        <div className="space-y-4">
          {/* Name 1 */}
          <div className="relative group">
            <label className="block font-label-mono text-secondary mb-2 uppercase tracking-widest">
              Name 1
            </label>
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value.slice(0, 12))}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="ENTER TEXT..."
              maxLength={12}
              className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant focus:border-secondary focus:ring-0 text-primary font-headline-md text-[24px] py-2 px-0 transition-all placeholder-surface-variant uppercase"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="font-label-mono text-outline mt-1.5 text-[10px]">{name1.length}/12 chars</p>
          </div>

          {/* Spacer */}
          <div className="h-[50px] w-full" />

          {/* Name 2 */}
          <div className="relative group">
            <label className="block font-label-mono text-secondary mb-2 uppercase tracking-widest">
              Name 2
            </label>
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value.slice(0, 12))}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="ENTER TEXT..."
              maxLength={12}
              className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant focus:border-secondary focus:ring-0 text-primary font-headline-md text-[24px] py-2 px-0 transition-all placeholder-surface-variant uppercase"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="font-label-mono text-outline mt-1.5 text-[10px]">{name2.length}/12 chars</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-[50px] w-full" />

        {/* Filler Selector */}
        <div>
          <label className="block font-label-mono text-on-surface-variant mb-4 uppercase tracking-widest">
            Filler Type
          </label>
          <div className="grid grid-cols-5 gap-3">
            {FILLER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiller(opt.value)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-all active:scale-90 ${filler === opt.value
                  ? 'bg-secondary-container text-on-secondary-container active-glow border border-secondary/30'
                  : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-bright'
                  }`}
                title={opt.label}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: filler === opt.value ? "'FILL' 1" : "'FILL' 0" }}>{opt.icon}</span>
                <span className="text-[8px] mt-1 font-label-mono md:hidden block">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-[80px] w-full" />

        {/* Generate Button - Primary CTA */}
        <div className="pt-8 md:border-t md:border-outline-variant/30 mt-auto">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || disabled || !name1.trim() || !name2.trim()}
            className="w-full bg-secondary text-on-secondary font-bold py-4 rounded-lg flex items-center justify-center gap-3 active-glow hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(70,234,237,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>COMPILING...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">precision_manufacturing</span>
                <span>GENERATE 3D PREVIEW</span>
              </>
            )}
          </button>

          {/* Spacer */}
          <div className="h-[20px] w-full" />
          <div className="flex justify-between mt-6">
            <button className="flex items-center gap-2 text-on-surface-variant font-label-mono hover:text-primary transition-colors" onClick={onDownload} disabled={!hasModel}>
              <span className="material-symbols-outlined text-[18px]">download</span> DOWNLOAD STL
            </button>

            {onSwitchToPreview && hasModel && (
              <button className="flex items-center gap-2 text-on-surface-variant font-label-mono hover:text-primary transition-colors md:hidden" onClick={onSwitchToPreview}>
                <span className="material-symbols-outlined text-[18px]">visibility</span> VIEW 3D
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3">
            <p className="text-sm text-error leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
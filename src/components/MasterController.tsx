"use client";

import type { PlayState } from "@/hooks/useAutoProgress";

interface MasterControllerProps {
  playState: PlayState;
  speedFactor: number;
  onTogglePlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  currentIndex: number;
  totalLines: number;
  isUsingRecordedData?: boolean;
}

export default function MasterController({
  playState,
  speedFactor,
  onTogglePlayPause,
  onReset,
  onSpeedChange,
  currentIndex,
  totalLines,
  isUsingRecordedData,
}: MasterControllerProps) {
  const progress =
    totalLines > 0 ? Math.max(0, ((currentIndex + 1) / totalLines) * 100) : 0;

  return (
    <div className="flex-shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-sm px-4 py-3">
      {isUsingRecordedData && (
        <div className="text-xs text-[#D4AF37]/40 text-center mb-2">
          録音データ使用中
        </div>
      )}
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Play/Pause + Reset buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlayPause}
            className="w-12 h-12 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors"
          >
            {playState === "playing" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button
            onClick={onReset}
            className="w-10 h-10 rounded-full bg-white/10 text-[#D4AF37] flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="text-[#D4AF37]/70 text-sm whitespace-nowrap">
          {currentIndex + 1} / {totalLines}
        </div>

        {/* Speed slider */}
        <div className="flex items-center gap-2">
          <span className="text-[#D4AF37]/50 text-xs">速度</span>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.05"
            value={speedFactor}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-20 accent-[#D4AF37]"
          />
          <span className="text-[#D4AF37]/70 text-xs w-8">
            {speedFactor.toFixed(1)}x
          </span>
        </div>
      </div>
    </div>
  );
}

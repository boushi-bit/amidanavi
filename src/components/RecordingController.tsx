"use client";

import type { RecordingState } from "@/hooks/useRecordingProgress";

interface RecordingControllerProps {
  recordingState: RecordingState;
  currentIndex: number;
  totalLines: number;
  elapsedTime: number;
  onStart: () => void;
  onAdvance: () => void;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function RecordingController({
  recordingState,
  currentIndex,
  totalLines,
  elapsedTime,
  onStart,
  onAdvance,
  onBack,
  onReset,
  onSave,
  onCancel,
}: RecordingControllerProps) {
  const progress =
    totalLines > 0 ? Math.max(0, ((currentIndex + 1) / totalLines) * 100) : 0;

  return (
    <div className="flex-shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-sm px-4 py-3">
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${recordingState === "idle" ? 0 : progress}%`,
            background: "linear-gradient(to right, #D4AF37, #c0392b)",
          }}
        />
      </div>

      {/* Idle: Start button */}
      {recordingState === "idle" && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white/10 text-[#D4AF37]/70 text-sm hover:bg-white/20 transition-colors"
          >
            戻る
          </button>
          <button
            onClick={onStart}
            className="flex-1 py-3 rounded-lg bg-[#D4AF37] text-black font-bold text-base hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors"
          >
            録音開始
          </button>
        </div>
      )}

      {/* Recording: Back / Status / Advance */}
      {recordingState === "recording" && (
        <div className="flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            onClick={onBack}
            disabled={currentIndex <= 0}
            className="w-12 h-12 rounded-full bg-white/10 text-[#D4AF37] flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19,3 5,12 19,21" />
            </svg>
          </button>

          {/* Status: recording indicator + timer + progress */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs">録音中</span>
            </span>
            <span className="text-[#D4AF37] font-mono text-base tabular-nums">
              {elapsedTime.toFixed(1)}秒
            </span>
            <span className="text-[#D4AF37]/50 text-xs">
              {currentIndex + 1}/{totalLines}
            </span>
          </div>

          {/* Advance button (large tap target) */}
          <button
            onClick={onAdvance}
            className="w-16 h-16 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>
        </div>
      )}

      {/* Finished: Save / Redo */}
      {recordingState === "finished" && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-white/10 text-[#D4AF37]/70 text-sm hover:bg-white/20 transition-colors"
          >
            やり直す
          </button>
          <div className="text-[#D4AF37]/50 text-xs">
            全{totalLines}行を録音完了
          </div>
          <button
            onClick={onSave}
            className="px-6 py-3 rounded-lg bg-[#D4AF37] text-black font-bold text-base hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors"
          >
            保存
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import KyoView from "@/components/KyoView";

interface KyoLine {
  id: number;
  text: string;
  ruby: string;
  duration: number;
  type: "solo" | "all" | "slow";
}

interface FollowerViewProps {
  lines: KyoLine[];
  currentIndex: number;
  charProgress: number;
  playState: string;
  speedFactor: number;
  totalLines: number;
  connected: boolean;
}

export default function FollowerView({
  lines,
  currentIndex,
  charProgress,
  playState,
  speedFactor,
  totalLines,
  connected,
}: FollowerViewProps) {
  const progress =
    totalLines > 0 ? Math.max(0, ((currentIndex + 1) / totalLines) * 100) : 0;

  return (
    <>
      {/* Reconnecting overlay */}
      {!connected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-[#D4AF37] text-lg animate-pulse">
            再接続中...
          </div>
        </div>
      )}

      <KyoView
        lines={lines}
        currentIndex={currentIndex}
        charProgress={charProgress}
      />

      {/* Read-only status footer */}
      <div className="flex-shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-sm px-4 py-3">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Play state indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                playState === "playing"
                  ? "bg-green-400 animate-pulse"
                  : "bg-[#D4AF37]/30"
              }`}
            />
            <span className="text-[#D4AF37]/50 text-sm">
              {playState === "idle"
                ? "待機中"
                : playState === "playing"
                  ? "再生中"
                  : playState === "paused"
                    ? "一時停止"
                    : "完了"}
            </span>
          </div>

          {/* Line counter */}
          <div className="text-[#D4AF37]/70 text-sm">
            {currentIndex + 1} / {totalLines}
          </div>

          {/* Speed display */}
          <div className="text-[#D4AF37]/50 text-xs">
            速度 {speedFactor.toFixed(1)}x
          </div>
        </div>
      </div>
    </>
  );
}

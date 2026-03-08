"use client";

import { useState, useCallback, useMemo } from "react";
import KyoView from "@/components/KyoView";
import MasterController from "@/components/MasterController";
import RecordingController from "@/components/RecordingController";
import { useAutoProgress } from "@/hooks/useAutoProgress";
import { useRecordingProgress } from "@/hooks/useRecordingProgress";
import { useRecordedDurations } from "@/hooks/useRecordedDurations";
import { useWakeLock } from "@/hooks/useWakeLock";
import kyoData from "../../data/amidakyo.json";

type AppMode = "playback" | "recording";

const lines = kyoData as {
  id: number;
  text: string;
  ruby: string;
  duration: number;
  type: "solo" | "all" | "slow";
}[];

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("playback");
  const [showMenu, setShowMenu] = useState(false);
  const [speedFactor, setSpeedFactor] = useState(1.15);
  const [durationVersion, setDurationVersion] = useState(0);

  // localStorage persistence
  const { load, save, clear, hasRecordedData } = useRecordedDurations(kyoData.length);

  // Merge durations: recorded data takes priority over JSON defaults
  const jsonDurations = useMemo(() => kyoData.map((line) => line.duration), []);
  const pauseAfterFlags = useMemo(
    () => kyoData.map((line) => "pauseAfter" in line && (line as { pauseAfter?: boolean }).pauseAfter === true),
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveDurations = useMemo(() => {
    const recorded = load();
    return recorded ? recorded.durations : jsonDurations;
  }, [jsonDurations, load, durationVersion]);

  const isUsingRecordedData = useMemo(() => hasRecordedData(), [durationVersion, hasRecordedData]);

  // Playback hook
  const {
    currentIndex,
    charProgress,
    playState,
    togglePlayPause,
    reset: resetPlayback,
  } = useAutoProgress({ durations: effectiveDurations, pauseAfterFlags, speedFactor });

  // Recording hook
  const {
    currentIndex: recIndex,
    recordingState,
    recordedDurations,
    elapsedTime,
    start: recStart,
    advance: recAdvance,
    back: recBack,
    reset: recReset,
  } = useRecordingProgress({ totalLines: kyoData.length });

  // Keep screen awake during playback or recording
  useWakeLock(playState === "playing" || recordingState === "recording");

  // Mode switching
  const switchToRecording = useCallback(() => {
    if (playState === "playing") {
      togglePlayPause();
    }
    resetPlayback();
    setAppMode("recording");
    setShowMenu(false);
  }, [playState, togglePlayPause, resetPlayback]);

  const switchToPlayback = useCallback(() => {
    recReset();
    setAppMode("playback");
    setShowMenu(false);
  }, [recReset]);

  const handleSave = useCallback(() => {
    save(recordedDurations);
    recReset();
    setDurationVersion((v) => v + 1);
    setAppMode("playback");
  }, [save, recordedDurations, recReset]);

  const handleClearRecording = useCallback(() => {
    clear();
    setDurationVersion((v) => v + 1);
    setShowMenu(false);
  }, [clear]);

  const handleCancel = useCallback(() => {
    recReset();
    setAppMode("playback");
  }, [recReset]);

  // Format recorded date for display
  const recordedDateStr = useMemo(() => {
    const data = load();
    if (!data) return null;
    const d = new Date(data.recordedAt);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [load, durationVersion]);

  return (
    <div className="flex flex-col h-dvh bg-black relative">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between py-3 border-b border-white/10 px-4">
        <div className="w-8" />
        <h1
          className="text-lg tracking-[0.5em] font-light flex items-center gap-2"
          style={{ color: "#D4AF37" }}
        >
          {appMode === "recording" && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          阿弥陀経ナビ
        </h1>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 flex items-center justify-center text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </header>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-14 right-4 z-50 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden min-w-48">
            <button
              onClick={switchToPlayback}
              className="w-full px-4 py-3 text-left text-sm text-[#D4AF37] hover:bg-white/10 transition-colors flex items-center justify-between"
            >
              再生モード
              {appMode === "playback" && <span className="text-[#D4AF37]">✓</span>}
            </button>
            <button
              onClick={switchToRecording}
              className="w-full px-4 py-3 text-left text-sm text-[#D4AF37] hover:bg-white/10 transition-colors flex items-center justify-between border-t border-white/10"
            >
              タイミング録音
              {appMode === "recording" && <span className="text-[#D4AF37]">✓</span>}
            </button>
            {isUsingRecordedData && (
              <>
                <div className="px-4 py-2 text-xs text-[#D4AF37]/40 border-t border-white/10">
                  録音日時: {recordedDateStr}
                </div>
                <button
                  onClick={handleClearRecording}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10 transition-colors border-t border-white/10"
                >
                  録音データ削除
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Content area */}
      {appMode === "playback" ? (
        <>
          <KyoView
            lines={lines}
            currentIndex={currentIndex}
            charProgress={charProgress}
          />
          <MasterController
            playState={playState}
            speedFactor={speedFactor}
            onTogglePlayPause={togglePlayPause}
            onReset={resetPlayback}
            onSpeedChange={setSpeedFactor}
            currentIndex={currentIndex}
            totalLines={kyoData.length}
            isUsingRecordedData={isUsingRecordedData}
          />
        </>
      ) : (
        <>
          <div
            onClick={recordingState === "recording" ? recAdvance : undefined}
            className={recordingState === "recording" ? "flex-1 min-h-0 flex flex-col cursor-pointer active:bg-white/5 transition-colors" : "flex-1 min-h-0 flex flex-col"}
          >
            <KyoView
              lines={lines}
              currentIndex={recIndex}
              charProgress={1}
            />
          </div>
          <RecordingController
            recordingState={recordingState}
            currentIndex={recIndex}
            totalLines={kyoData.length}
            elapsedTime={elapsedTime}
            onStart={recStart}
            onAdvance={recAdvance}
            onBack={recBack}
            onReset={recReset}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </>
      )}
    </div>
  );
}

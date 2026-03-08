"use client";

import { useState, useCallback, useMemo } from "react";
import KyoView from "@/components/KyoView";
import MasterController from "@/components/MasterController";
import RecordingController from "@/components/RecordingController";
import RoomLobby from "@/components/RoomLobby";
import RoomHeader from "@/components/RoomHeader";
import FollowerView from "@/components/FollowerView";
import { useAutoProgress } from "@/hooks/useAutoProgress";
import { useRecordingProgress } from "@/hooks/useRecordingProgress";
import { useRecordedDurations } from "@/hooks/useRecordedDurations";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRoom } from "@/hooks/useRoom";
import { useMasterSync } from "@/hooks/useMasterSync";
import { useFollowerSync } from "@/hooks/useFollowerSync";
import { saveRoomDurations } from "@/lib/roomService";
import kyoData from "../../data/amidakyo.json";

type AppMode = "playback" | "recording";
type ConnectivityMode = "solo" | "room";

const lines = kyoData as {
  id: number;
  text: string;
  ruby: string;
  duration: number;
  type: "solo" | "all" | "slow";
}[];

export default function Home() {
  const [connectivityMode, setConnectivityMode] = useState<ConnectivityMode>("solo");
  const [appMode, setAppMode] = useState<AppMode>("playback");
  const [showMenu, setShowMenu] = useState(false);
  const [speedFactor, setSpeedFactor] = useState(1.15);
  const [durationVersion, setDurationVersion] = useState(0);

  // Firebase auth (lazy — only activated when entering room mode)
  const { uid, loading: authLoading, activate: activateAuth } = useFirebaseAuth();

  // Room management
  const {
    roomState,
    role,
    roomCode,
    participantCount,
    error: roomError,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useRoom({ uid });

  // Derived states
  const isMaster =
    connectivityMode === "room" &&
    roomState === "connected" &&
    role === "master";
  const isFollower =
    connectivityMode === "room" &&
    roomState === "connected" &&
    role === "follower";
  const isRoomLobby =
    connectivityMode === "room" && roomState !== "connected";

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Master sync — broadcasts playback state to Firebase
  useMasterSync({
    roomCode,
    isActive: isMaster,
    currentIndex,
    playState,
    speedFactor,
    durations: effectiveDurations,
  });

  // Follower sync — receives playback state from Firebase
  const follower = useFollowerSync({
    roomCode,
    isActive: isFollower,
  });

  // ───── Mode switching callbacks ─────

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

  const switchToRoom = useCallback(() => {
    if (playState === "playing") togglePlayPause();
    resetPlayback();
    recReset();
    setAppMode("playback");
    activateAuth();
    setConnectivityMode("room");
    setShowMenu(false);
  }, [playState, togglePlayPause, resetPlayback, recReset, activateAuth]);

  const switchToSolo = useCallback(async () => {
    if (playState === "playing") togglePlayPause();
    resetPlayback();
    await leaveRoom();
    setConnectivityMode("solo");
    setShowMenu(false);
  }, [playState, togglePlayPause, resetPlayback, leaveRoom]);

  // ───── Save / Clear recording ─────

  const handleSave = useCallback(() => {
    save(recordedDurations);
    // Also save to Firebase if in room mode
    if (connectivityMode === "room" && roomCode) {
      saveRoomDurations(roomCode, recordedDurations).catch(() => {});
    }
    recReset();
    setDurationVersion((v) => v + 1);
    setAppMode("playback");
  }, [save, recordedDurations, recReset, connectivityMode, roomCode]);

  const handleClearRecording = useCallback(() => {
    clear();
    setDurationVersion((v) => v + 1);
    setShowMenu(false);
  }, [clear]);

  const handleCancel = useCallback(() => {
    recReset();
    setAppMode("playback");
  }, [recReset]);

  // ───── Room callbacks ─────

  const handleCreateRoom = useCallback(async () => {
    await createRoom();
  }, [createRoom]);

  const handleJoinRoom = useCallback(async (code: string) => {
    await joinRoom(code);
  }, [joinRoom]);

  const handleLeaveRoom = useCallback(async () => {
    if (playState === "playing") togglePlayPause();
    resetPlayback();
    recReset();
    setAppMode("playback");
    await leaveRoom();
    // Stay in room mode (show lobby)
  }, [playState, togglePlayPause, resetPlayback, recReset, leaveRoom]);

  // ───── Display helpers ─────

  // Format recorded date for display
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {appMode === "recording" && !isFollower && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          阿弥陀経ナビ
        </h1>
        {!isFollower ? (
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
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Room header bar (shown when connected to a room) */}
      {(isMaster || isFollower) && roomCode && role && (
        <RoomHeader
          roomCode={roomCode}
          role={role}
          participantCount={participantCount}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* ───── Dropdown menu ───── */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-14 right-4 z-50 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden min-w-48">
            {connectivityMode === "solo" ? (
              <>
                {/* Solo mode menu */}
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
                <button
                  onClick={switchToRoom}
                  className="w-full px-4 py-3 text-left text-sm text-[#D4AF37] hover:bg-white/10 transition-colors border-t border-white/10"
                >
                  ルームモード
                </button>
              </>
            ) : (
              <>
                {/* Room mode menu */}
                {isMaster && (
                  <>
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
                  </>
                )}
                <button
                  onClick={switchToSolo}
                  className="w-full px-4 py-3 text-left text-sm text-[#D4AF37] hover:bg-white/10 transition-colors border-t border-white/10"
                >
                  ソロモードに戻る
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ───── Content area ───── */}
      {isFollower ? (
        /* Follower view — read-only, synced from Firebase */
        <FollowerView
          lines={lines}
          currentIndex={follower.currentIndex}
          charProgress={follower.charProgress}
          playState={follower.playState}
          speedFactor={follower.speedFactor}
          totalLines={kyoData.length}
          connected={follower.connected}
        />
      ) : isRoomLobby ? (
        /* Room lobby — create or join */
        <RoomLobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={() => {
            setConnectivityMode("solo");
            setShowMenu(false);
          }}
          loading={
            roomState === "creating" ||
            roomState === "joining" ||
            authLoading
          }
          error={
            roomError ||
            (!authLoading && connectivityMode === "room" && uid === null && !roomError
              ? "認証に失敗しました。ページを再読み込みしてください。"
              : null)
          }
        />
      ) : appMode === "playback" ? (
        /* Playback view — solo mode or room master */
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
        /* Recording view — solo mode or room master */
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

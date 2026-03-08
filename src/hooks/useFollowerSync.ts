"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import type { PlayState } from "@/hooks/useAutoProgress";

interface UseFollowerSyncOptions {
  roomCode: string | null;
  isActive: boolean;
}

interface FollowerState {
  currentIndex: number;
  charProgress: number;
  playState: PlayState;
  speedFactor: number;
  connected: boolean;
}

export function useFollowerSync({
  roomCode,
  isActive,
}: UseFollowerSyncOptions): FollowerState {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [charProgress, setCharProgress] = useState(0);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [speedFactor, setSpeedFactor] = useState(1.15);
  const [connected, setConnected] = useState(false);

  const serverOffsetRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const playbackDataRef = useRef<{
    startedAt: number;
    duration: number;
    playState: PlayState;
  }>({ startedAt: 0, duration: 0, playState: "idle" });

  // Get server time offset
  useEffect(() => {
    if (!isActive) return;
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => {
      serverOffsetRef.current = snap.val() || 0;
    });
    return () => unsub();
  }, [isActive]);

  // Monitor connection state
  useEffect(() => {
    if (!isActive) return;
    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });
    return () => unsub();
  }, [isActive]);

  // Animate charProgress locally using rAF
  const animate = useCallback(() => {
    const { startedAt, duration, playState: ps } = playbackDataRef.current;
    if (ps !== "playing" || duration <= 0) {
      return;
    }
    const serverNow = Date.now() + serverOffsetRef.current;
    const elapsed = (serverNow - startedAt) / 1000;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    setCharProgress(progress);
    if (progress < 1) {
      animRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Subscribe to playback state from Firebase
  useEffect(() => {
    if (!isActive || !roomCode) return;

    const playbackRef = ref(db, `rooms/${roomCode}/playback`);
    const unsub = onValue(playbackRef, (snap) => {
      if (!snap.exists()) {
        // Room was deleted
        setPlayState("idle");
        setCurrentIndex(-1);
        setCharProgress(0);
        return;
      }

      const val = snap.val();
      setCurrentIndex(val.currentIndex ?? -1);
      setPlayState(val.playState ?? "idle");
      setSpeedFactor(val.speedFactor ?? 1.15);

      playbackDataRef.current = {
        startedAt: val.startedAt ?? 0,
        duration: val.duration ?? 0,
        playState: val.playState ?? "idle",
      };

      // Cancel previous animation
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }

      if (val.playState === "playing" && val.duration > 0) {
        // Start local charProgress animation
        animRef.current = requestAnimationFrame(animate);
      } else if (val.playState === "paused" || val.playState === "finished") {
        setCharProgress(1);
      } else {
        setCharProgress(0);
      }
    });

    return () => {
      unsub();
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [isActive, roomCode, animate]);

  return { currentIndex, charProgress, playState, speedFactor, connected };
}

"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, update, serverTimestamp, onValue } from "firebase/database";
import type { PlayState } from "@/hooks/useAutoProgress";

interface UseMasterSyncOptions {
  roomCode: string | null;
  isActive: boolean;
  currentIndex: number;
  playState: PlayState;
  speedFactor: number;
  durations: number[];
}

export function useMasterSync({
  roomCode,
  isActive,
  currentIndex,
  playState,
  speedFactor,
  durations,
}: UseMasterSyncOptions) {
  const prevRef = useRef({
    currentIndex: -2,
    playState: "idle" as PlayState,
    speedFactor: 0,
  });
  const serverOffsetRef = useRef(0);

  // Get server time offset
  useEffect(() => {
    if (!isActive) return;
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => {
      serverOffsetRef.current = snap.val() || 0;
    });
    return () => unsub();
  }, [isActive]);

  // Sync playback state to Firebase
  useEffect(() => {
    if (!isActive || !roomCode) return;

    const prev = prevRef.current;
    if (
      prev.currentIndex === currentIndex &&
      prev.playState === playState &&
      prev.speedFactor === speedFactor
    ) {
      return;
    }

    prevRef.current = { currentIndex, playState, speedFactor };

    const duration =
      currentIndex >= 0 && currentIndex < durations.length
        ? durations[currentIndex] / speedFactor
        : 0;

    const serverNow = Date.now() + serverOffsetRef.current;

    const playbackRef = ref(db, `rooms/${roomCode}/playback`);
    update(playbackRef, {
      currentIndex,
      playState,
      speedFactor,
      duration,
      startedAt: serverNow,
    });
  }, [isActive, roomCode, currentIndex, playState, speedFactor, durations]);

  // Update lastActiveAt every 30 seconds
  useEffect(() => {
    if (!isActive || !roomCode) return;
    const interval = setInterval(() => {
      const metaRef = ref(db, `rooms/${roomCode}/meta`);
      update(metaRef, { lastActiveAt: serverTimestamp() });
    }, 30000);
    return () => clearInterval(interval);
  }, [isActive, roomCode]);
}

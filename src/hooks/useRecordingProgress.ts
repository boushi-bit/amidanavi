"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "finished";

interface UseRecordingProgressOptions {
  totalLines: number;
}

const MIN_DURATION_MS = 200;

export function useRecordingProgress({ totalLines }: UseRecordingProgressOptions) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedDurations, setRecordedDurations] = useState<number[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const lineStartRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    lineStartRef.current = performance.now();
    setElapsedTime(0);

    const tick = () => {
      const elapsed = (performance.now() - lineStartRef.current) / 1000;
      setElapsedTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    setCurrentIndex(0);
    setRecordedDurations([]);
    setRecordingState("recording");
    startTimer();
  }, [startTimer]);

  const advance = useCallback(() => {
    if (recordingState !== "recording") return;

    const elapsed = performance.now() - lineStartRef.current;
    if (elapsed < MIN_DURATION_MS) return;

    const duration = elapsed / 1000;

    setRecordedDurations((prev) => {
      const next = [...prev];
      next[currentIndex] = duration;
      return next;
    });

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalLines) {
      stopTimer();
      setCurrentIndex(nextIndex - 1);
      setRecordingState("finished");
    } else {
      setCurrentIndex(nextIndex);
      lineStartRef.current = performance.now();
      setElapsedTime(0);
    }
  }, [recordingState, currentIndex, totalLines, stopTimer]);

  const back = useCallback(() => {
    if (recordingState !== "recording" || currentIndex <= 0) return;

    setRecordedDurations((prev) => {
      const next = [...prev];
      next.length = currentIndex - 1;
      return next;
    });

    setCurrentIndex(currentIndex - 1);
    lineStartRef.current = performance.now();
    setElapsedTime(0);
  }, [recordingState, currentIndex]);

  const reset = useCallback(() => {
    stopTimer();
    setCurrentIndex(-1);
    setRecordedDurations([]);
    setElapsedTime(0);
    setRecordingState("idle");
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    currentIndex,
    recordingState,
    recordedDurations,
    elapsedTime,
    start,
    advance,
    back,
    reset,
  };
}

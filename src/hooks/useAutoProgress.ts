"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type PlayState = "idle" | "playing" | "paused" | "finished";

interface UseAutoProgressOptions {
  durations: number[];
  pauseAfterFlags: boolean[];
  speedFactor: number;
}

export function useAutoProgress({ durations, pauseAfterFlags, speedFactor }: UseAutoProgressOptions) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [charProgress, setCharProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentDurationRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const animateCharProgress = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const duration = currentDurationRef.current;
    const progress = Math.min(elapsed / duration, 1);
    setCharProgress(progress);
    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(animateCharProgress);
    }
  }, []);

  const scheduleNext = useCallback(
    (index: number) => {
      if (index >= durations.length) {
        setPlayState("finished");
        return;
      }

      setCurrentIndex(index);
      setCharProgress(0);

      const duration = durations[index] / speedFactor;
      currentDurationRef.current = duration;
      startTimeRef.current = performance.now();

      animFrameRef.current = requestAnimationFrame(animateCharProgress);

      timerRef.current = setTimeout(() => {
        if (pauseAfterFlags[index]) {
          clearTimers();
          setCurrentIndex(index + 1);
          setCharProgress(0);
          setPlayState("paused");
        } else {
          scheduleNext(index + 1);
        }
      }, duration * 1000);
    },
    [durations, pauseAfterFlags, speedFactor, animateCharProgress]
  );

  const play = useCallback(() => {
    clearTimers();
    if (playState === "idle" || playState === "finished") {
      setPlayState("playing");
      scheduleNext(0);
    } else if (playState === "paused") {
      setPlayState("playing");
      scheduleNext(currentIndex);
    }
  }, [playState, currentIndex, scheduleNext, clearTimers]);

  const pause = useCallback(() => {
    clearTimers();
    setPlayState("paused");
  }, [clearTimers]);

  const togglePlayPause = useCallback(() => {
    if (playState === "playing") {
      pause();
    } else {
      play();
    }
  }, [playState, play, pause]);

  const reset = useCallback(() => {
    clearTimers();
    setCurrentIndex(-1);
    setCharProgress(0);
    setPlayState("idle");
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // When speedFactor changes during play, reschedule from current index
  useEffect(() => {
    if (playState === "playing") {
      clearTimers();
      scheduleNext(currentIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedFactor]);

  return {
    currentIndex,
    charProgress,
    playState,
    play,
    pause,
    togglePlayPause,
    reset,
  };
}

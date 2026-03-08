"use client";

const STORAGE_KEY = "amidanavi-recorded-durations";

interface RecordedData {
  durations: number[];
  recordedAt: string;
}

export function useRecordedDurations(expectedLength: number) {
  const load = (): RecordedData | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data: RecordedData = JSON.parse(raw);
      if (
        !Array.isArray(data.durations) ||
        data.durations.length !== expectedLength ||
        !data.durations.every((d) => typeof d === "number" && d > 0)
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const save = (durations: number[]): void => {
    const data: RecordedData = {
      durations,
      recordedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clear = (): void => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasRecordedData = (): boolean => {
    return load() !== null;
  };

  return { load, save, clear, hasRecordedData };
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import * as roomService from "@/lib/roomService";

export type RoomState = "none" | "creating" | "joining" | "connected" | "error";
export type RoomRole = "master" | "follower" | null;

interface UseRoomOptions {
  uid: string | null;
}

export function useRoom({ uid }: UseRoomOptions) {
  const [roomState, setRoomState] = useState<RoomState>("none");
  const [role, setRole] = useState<RoomRole>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup (avoid stale closures)
  const unsubParticipantsRef = useRef<(() => void) | null>(null);
  const unsubConnectionRef = useRef<(() => void) | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const roleRef = useRef<RoomRole>(null);

  // Keep refs in sync
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { uidRef.current = uid; }, [uid]);
  useEffect(() => { roleRef.current = role; }, [role]);

  const subscribeParticipants = useCallback((code: string) => {
    if (unsubParticipantsRef.current) {
      unsubParticipantsRef.current();
    }
    const pRef = ref(db, `rooms/${code}/participants`);
    const unsub = onValue(pRef, (snap) => {
      const val = snap.val();
      setParticipantCount(val ? Object.keys(val).length : 0);
    });
    unsubParticipantsRef.current = unsub;
  }, []);

  // Re-add participant on reconnection
  useEffect(() => {
    if (!roomCode || !uid || roomState !== "connected") {
      if (unsubConnectionRef.current) {
        unsubConnectionRef.current();
        unsubConnectionRef.current = null;
      }
      return;
    }

    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, async (snap) => {
      if (snap.val() === true) {
        try {
          await roomService.addParticipant(roomCode, uid);
        } catch {
          // Ignore reconnection errors
        }
      }
    });
    unsubConnectionRef.current = unsub;

    return () => {
      unsub();
      unsubConnectionRef.current = null;
    };
  }, [roomCode, uid, roomState]);

  const createRoom = useCallback(async () => {
    if (!uid) return;
    setRoomState("creating");
    setError(null);
    try {
      const code = await roomService.createRoom(uid);
      await roomService.addParticipant(code, uid);
      setRoomCode(code);
      setRole("master");
      setRoomState("connected");
      subscribeParticipants(code);
    } catch (e) {
      setError((e as Error).message);
      setRoomState("error");
    }
  }, [uid, subscribeParticipants]);

  const joinRoom = useCallback(async (code: string) => {
    if (!uid) return;
    setRoomState("joining");
    setError(null);
    try {
      const exists = await roomService.joinRoom(code);
      if (!exists) {
        setError("ルームが見つかりません");
        setRoomState("error");
        return;
      }
      await roomService.addParticipant(code, uid);
      setRoomCode(code);
      setRole("follower");
      setRoomState("connected");
      subscribeParticipants(code);
    } catch (e) {
      setError((e as Error).message);
      setRoomState("error");
    }
  }, [uid, subscribeParticipants]);

  const leaveRoom = useCallback(async () => {
    const currentCode = roomCodeRef.current;
    const currentUid = uidRef.current;
    const currentRole = roleRef.current;

    // Unsubscribe from listeners
    if (unsubParticipantsRef.current) {
      unsubParticipantsRef.current();
      unsubParticipantsRef.current = null;
    }
    if (unsubConnectionRef.current) {
      unsubConnectionRef.current();
      unsubConnectionRef.current = null;
    }

    if (currentUid && currentCode) {
      try {
        await roomService.removeParticipant(currentCode, currentUid);
        if (currentRole === "master") {
          await roomService.deleteRoom(currentCode, currentUid);
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    setRoomCode(null);
    setRole(null);
    setRoomState("none");
    setParticipantCount(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubParticipantsRef.current) {
        unsubParticipantsRef.current();
      }
      if (unsubConnectionRef.current) {
        unsubConnectionRef.current();
      }
      const code = roomCodeRef.current;
      const currentUid = uidRef.current;
      if (code && currentUid) {
        roomService.removeParticipant(code, currentUid).catch(() => {});
      }
    };
  }, []);

  return {
    roomState,
    role,
    roomCode,
    participantCount,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}

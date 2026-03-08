import { db } from "@/lib/firebase";
import {
  ref,
  get,
  set,
  update,
  remove,
  serverTimestamp,
  onDisconnect,
} from "firebase/database";

export function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createRoom(masterUid: string): Promise<string> {
  let code = generateRoomCode();
  let attempts = 0;

  while (attempts < 10) {
    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      await set(roomRef, {
        meta: {
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          masterUid: masterUid,
        },
        playback: {
          currentIndex: -1,
          playState: "idle",
          speedFactor: 1.15,
          duration: 0,
          startedAt: 0,
        },
      });
      return code;
    }

    code = generateRoomCode();
    attempts++;
  }

  throw new Error("ルームコードの生成に失敗しました");
}

export async function joinRoom(code: string): Promise<boolean> {
  const roomRef = ref(db, `rooms/${code}/meta`);
  const snapshot = await get(roomRef);
  return snapshot.exists();
}

export async function saveRoomDurations(
  code: string,
  durations: number[]
): Promise<void> {
  const durRef = ref(db, `rooms/${code}/durations`);
  await set(durRef, {
    data: durations,
    recordedAt: new Date().toISOString(),
  });
}

export async function loadRoomDurations(
  code: string
): Promise<{ data: number[]; recordedAt: string } | null> {
  const durRef = ref(db, `rooms/${code}/durations`);
  const snapshot = await get(durRef);
  if (!snapshot.exists()) return null;
  return snapshot.val();
}

export async function updatePlayback(
  code: string,
  data: {
    currentIndex: number;
    playState: string;
    speedFactor: number;
    duration: number;
    startedAt: number;
  }
): Promise<void> {
  const playbackRef = ref(db, `rooms/${code}/playback`);
  await update(playbackRef, data);
}

export async function updateLastActive(code: string): Promise<void> {
  const metaRef = ref(db, `rooms/${code}/meta`);
  await update(metaRef, { lastActiveAt: serverTimestamp() });
}

export async function addParticipant(
  code: string,
  uid: string
): Promise<void> {
  const participantRef = ref(db, `rooms/${code}/participants/${uid}`);
  await set(participantRef, true);
  onDisconnect(participantRef).remove();
}

export async function removeParticipant(
  code: string,
  uid: string
): Promise<void> {
  const participantRef = ref(db, `rooms/${code}/participants/${uid}`);
  await remove(participantRef);
}

export async function deleteRoom(
  code: string,
  uid: string
): Promise<void> {
  const metaRef = ref(db, `rooms/${code}/meta`);
  const snapshot = await get(metaRef);
  if (!snapshot.exists()) return;

  const meta = snapshot.val();
  if (meta.masterUid !== uid) {
    throw new Error("ルームの削除権限がありません");
  }

  const roomRef = ref(db, `rooms/${code}`);
  await remove(roomRef);
}

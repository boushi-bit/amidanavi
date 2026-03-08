"use client";

import { useState } from "react";

interface RoomLobbyProps {
  onCreateRoom: () => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export default function RoomLobby({
  onCreateRoom,
  onJoinRoom,
  onBack,
  loading,
  error,
}: RoomLobbyProps) {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"select" | "join">("select");

  const handleJoin = () => {
    if (code.length === 4) {
      onJoinRoom(code);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {mode === "select" ? (
        <>
          <h2
            className="text-xl tracking-widest mb-4"
            style={{ color: "#D4AF37" }}
          >
            ルームモード
          </h2>

          <button
            onClick={onCreateRoom}
            disabled={loading}
            className="w-64 py-4 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors disabled:opacity-50"
          >
            {loading ? "作成中..." : "ルームを作成"}
          </button>

          <button
            onClick={() => setMode("join")}
            disabled={loading}
            className="w-64 py-4 bg-white/10 text-[#D4AF37] font-bold rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            ルームに参加
          </button>

          <button
            onClick={onBack}
            className="mt-4 text-[#D4AF37]/50 text-sm hover:text-[#D4AF37] transition-colors"
          >
            ← ソロモードに戻る
          </button>
        </>
      ) : (
        <>
          <h2
            className="text-xl tracking-widest mb-4"
            style={{ color: "#D4AF37" }}
          >
            ルームに参加
          </h2>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="4桁のコード"
            className="w-48 text-center text-3xl tracking-[0.5em] py-3 bg-white/5 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] placeholder:text-[#D4AF37]/20 focus:outline-none focus:border-[#D4AF37]"
          />

          <button
            onClick={handleJoin}
            disabled={code.length !== 4 || loading}
            className="w-48 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#E5C04B] active:bg-[#C49F2F] transition-colors disabled:opacity-50"
          >
            {loading ? "参加中..." : "参加"}
          </button>

          <button
            onClick={() => {
              setMode("select");
              setCode("");
            }}
            className="text-[#D4AF37]/50 text-sm hover:text-[#D4AF37] transition-colors"
          >
            ← 戻る
          </button>
        </>
      )}
    </div>
  );
}

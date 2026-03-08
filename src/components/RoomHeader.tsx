"use client";

interface RoomHeaderProps {
  roomCode: string;
  role: "master" | "follower";
  participantCount: number;
  onLeave: () => void;
}

export default function RoomHeader({
  roomCode,
  role,
  participantCount,
  onLeave,
}: RoomHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[#D4AF37] font-mono tracking-widest">
          {roomCode}
        </span>
        <span className="text-[#D4AF37]/60">
          {role === "master" ? "親機" : "子機"}
        </span>
        <span className="text-[#D4AF37]/40">{participantCount}人</span>
      </div>
      <button
        onClick={onLeave}
        className="text-xs text-[#D4AF37]/50 hover:text-red-400 transition-colors px-2 py-1"
      >
        退出
      </button>
    </div>
  );
}

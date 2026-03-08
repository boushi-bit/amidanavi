"use client";

import { useEffect, useRef } from "react";

interface KyoLine {
  id: number;
  text: string;
  ruby: string;
  duration: number;
  type: "solo" | "all" | "slow";
}

interface KyoViewProps {
  lines: KyoLine[];
  currentIndex: number;
  charProgress: number;
}

function SlowText({
  text,
  progress,
  isActive,
  isPast,
}: {
  text: string;
  progress: number;
  isActive: boolean;
  isPast: boolean;
}) {
  const chars = [...text];
  const litCount = isActive ? Math.floor(progress * (chars.length + 1)) : 0;

  return (
    <>
      {chars.map((char, i) => (
        <span
          key={i}
          className="transition-colors duration-300"
          style={{
            color:
              isActive && i < litCount
                ? "#D4AF37"
                : isPast
                  ? "#6b5f2e"
                  : "#3a3a2a",
          }}
        >
          {char}
        </span>
      ))}
    </>
  );
}

export default function KyoView({ lines, currentIndex, charProgress }: KyoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < lines.length) {
      const el = lineRefs.current[currentIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentIndex, lines.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 relative"
      style={{ paddingTop: "45vh", paddingBottom: "45vh" }}
    >
      {lines.map((line, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const isSlow = line.type === "slow";
        const isSolo = line.type === "solo";

        return (
          <div
            key={line.id}
            ref={(el) => {
              lineRefs.current[idx] = el;
            }}
            className="transition-all duration-500 rounded-md mx-auto max-w-2xl"
            style={{
              padding: isSlow ? "0.6rem 1rem" : "0.35rem 1rem",
              background: isCurrent
                ? "linear-gradient(to right, rgba(212,175,55,0.12), rgba(212,175,55,0.04))"
                : "transparent",
              boxShadow: isCurrent ? "0 0 24px rgba(212,175,55,0.08)" : "none",
            }}
          >
            <ruby
              className={`
                leading-loose
                font-bold
              `}
              style={{
                fontSize: isSlow ? "2rem" : isSolo ? "1.6rem" : "1.7rem",
                color: isCurrent
                  ? "#D4AF37"
                  : isPast
                    ? "#6b5f2e"
                    : "#3a3a2a",
                transition: "color 0.5s ease",
                letterSpacing: isSlow ? "0.4em" : "0.15em",
              }}
            >
              {isSlow ? (
                <SlowText
                  text={line.text}
                  progress={charProgress}
                  isActive={isCurrent}
                  isPast={isPast}
                />
              ) : (
                line.text
              )}
              <rp>(</rp>
              <rt
                style={{
                  fontSize: "0.55em",
                  letterSpacing: "0.05em",
                  color: isCurrent ? "#D4AF37" : isPast ? "#5a5028" : "#2a2a1e",
                }}
              >
                {line.ruby}
              </rt>
              <rp>)</rp>
            </ruby>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// File: src/components/AssistantTalking.tsx
// WITH INCREASED SIZE
// ============================================================

const avatarBoy = "/assets/avatar-boy.png";

const ASSISTANT_CSS = `
  @keyframes ring-pulse {
    0%   { opacity: 0.55; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.65); }
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-8px) scale(1.03); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0.15; transform: scale(0.75); }
    50%      { opacity: 1; transform: scale(1.2); }
  }
  @keyframes wave {
    0%, 100% { transform: scaleY(0.35); }
    50%      { transform: scaleY(1); }
  }
  
  .assistant-ring {
    position: absolute;
    width: 118%;
    height: 118%;
    border-radius: 9999px;
    border: 3px solid oklch(0.68 0.19 75 / 0.65);
    animation: ring-pulse 1.8s ease-out infinite;
  }
  .assistant-ring-2 { animation-delay: 0.6s; }
  .assistant-bob { animation: bob 2.4s ease-in-out infinite; }
  .assistant-sparkle { animation: sparkle 2.2s ease-in-out infinite; }
  .assistant-wave { height: 34px; display: flex; align-items: flex-end; gap: 6px; }
  .assistant-bar {
    display: inline-block;
    width: 6px;
    height: 100%;
    border-radius: 9999px;
    background: oklch(0.55 0.2 40);
    transform-origin: bottom;
    animation: wave 0.9s ease-in-out infinite;
  }
`;

export function AssistantTalking() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 sm:gap-7">
      <style>{ASSISTANT_CSS}</style>
      
      <div className="relative flex items-center justify-center">
        <span className="assistant-ring assistant-ring-1" />
        <span className="assistant-ring assistant-ring-2" />

        {/* 🔥 SIZE INCREASED: h-40 w-40 to h-48 w-48 (sm: h-56 w-56) */}
        <div
          className="assistant-bob relative h-48 w-48 overflow-hidden rounded-full border-[6px] border-white bg-yellow-kid sm:h-56 sm:w-56"
          style={{
            boxShadow:
              "0 10px 0 0 oklch(0.55 0.19 75 / 0.85), 0 16px 28px -10px rgb(0 0 0 / 0.28)",
          }}
        >
          <img src={avatarBoy} alt="" className="h-full w-full object-cover" />
        </div>

        {/* 🔥 SPARKLES SIZE INCREASED: h-6 w-6 to h-7 w-7 */}
        <Sparkle style={{ top: "-8%", left: "80%" }} delay={0} />
        <Sparkle style={{ top: "72%", left: "-10%" }} delay={0.7} />
        <Sparkle style={{ top: "-12%", left: "8%" }} delay={1.3} />
      </div>

      {/* 🔥 WAVE BARS SIZE INCREASED: width 6px to 8px, gap 1.5 to 2 */}
      <div className="assistant-wave" aria-hidden="true">
        <span className="assistant-bar" style={{ animationDelay: "0s", width: "8px" }} />
        <span className="assistant-bar" style={{ animationDelay: "0.12s", width: "8px" }} />
        <span className="assistant-bar" style={{ animationDelay: "0.24s", width: "8px" }} />
        <span className="assistant-bar" style={{ animationDelay: "0.36s", width: "8px" }} />
        <span className="assistant-bar" style={{ animationDelay: "0.48s", width: "8px" }} />
      </div>
    </div>
  );
}

function Sparkle({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#facc15"
      className="assistant-sparkle absolute h-7 w-7 sm:h-8 sm:w-8"
      style={{ ...style, animationDelay: `${delay}s` }}
    >
      <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
    </svg>
  );
}
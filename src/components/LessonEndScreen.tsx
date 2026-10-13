// src/components/LessonEndScreen.tsx
//
// Shared End Screen component for all games.
// Use this instead of duplicating code in every game.
// 
// Usage:
//   import { LessonEndScreen } from "@/components/LessonEndScreen";
//   
//   {showEndScreen && (
//     <LessonEndScreen
//       phase={endScreenPhase}
//       onRestart={resetLevel}
//       onNext={goToNextLesson}
//     />
//   )}

import { RotateCcw, ArrowRight } from "lucide-react";
const SuccessAnimationSVG = "/assets/SuccessAnimation.svg";

export type EndScreenPhase = "idle" | "svg" | "buttons";

interface LessonEndScreenProps {
  /** Current phase: "idle" | "svg" | "buttons" */
  phase: EndScreenPhase;
  /** Callback when Restart button is clicked */
  onRestart: () => void;
  /** Callback when Next button is clicked */
  onNext: () => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional: Override success animation SVG URL */
  successAnimationSvg?: string;
  /** Optional: Override restart button text */
  restartText?: string;
  /** Optional: Override next button text */
  nextText?: string;
}

const END_SCREEN_CSS = `
  @keyframes les-success-svg-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-10deg); }
    60%  { opacity: 1; transform: scale(1.15) rotate(3deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes les-success-svg-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.8); }
  }
  @keyframes les-buttons-pop {
    0%   { opacity: 0; transform: scale(0.5) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.05) translateY(-3px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes les-icon-hover {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-6px) scale(1.05); }
  }
  @keyframes les-end-screen-pop {
    0%   { opacity: 0; transform: scale(0.5) translateY(30px); }
    60%  { opacity: 1; transform: scale(1.05) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  .les-success-svg-pop {
    animation: les-success-svg-pop 0.8s cubic-bezier(.34,1.56,.64,1) both;
  }
  .les-success-svg-fade-out {
    animation: les-success-svg-fade-out 0.5s ease-in forwards;
  }
  .les-buttons-pop {
    animation: les-buttons-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
  }
  .les-icon-hover {
    animation: les-icon-hover 2s ease-in-out infinite;
  }
  .les-end-screen-pop {
    animation: les-end-screen-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
  }
`;

export function LessonEndScreen({
  phase,
  onRestart,
  onNext,
  className = "",
  successAnimationSvg = SuccessAnimationSVG,
  restartText = "Restart",
  nextText = "Next",
}: LessonEndScreenProps) {
  // Don't render if phase is idle
  if (phase === "idle") return null;

  return (
    <>
      <style>{END_SCREEN_CSS}</style>
      <div
        className={`absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-green-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm ${className}`}
      >
        {phase === "svg" && (
          <div className="les-success-svg-pop flex h-[45vh] max-h-[350px] w-[45vh] max-w-[350px] items-center justify-center sm:h-[50vh] sm:max-h-[400px] sm:w-[50vh] sm:max-w-[400px]">
            <img
              src={successAnimationSvg}
              alt="Success"
              className="h-full w-full object-contain"
              style={{ pointerEvents: "none" }}
            />
          </div>
        )}

        {phase === "buttons" && (
          <>
            <div className="les-success-svg-fade-out absolute flex h-[45vh] max-h-[350px] w-[45vh] max-w-[350px] items-center justify-center sm:h-[50vh] sm:max-h-[400px] sm:w-[50vh] sm:max-w-[400px]">
              <img
                src={successAnimationSvg}
                alt="Success"
                className="h-full w-full object-contain"
                style={{ pointerEvents: "none" }}
              />
            </div>
            <div className="les-buttons-pop flex items-center gap-10 sm:gap-14">
              <button
                onClick={onRestart}
                className="les-icon-hover clay-sm flex flex-col items-center gap-2 rounded-2xl border-4 border-white bg-orange-kid px-6 py-4 transition-transform hover:scale-105 active:scale-95 sm:px-8 sm:py-5"
                style={{ ["--clay-shadow" as string]: "oklch(0.55 0.2 40 / 0.85)" }}
              >
                <RotateCcw className="h-10 w-10 text-white sm:h-12 sm:w-12" strokeWidth={2.5} />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white sm:text-sm">
                  {restartText}
                </span>
              </button>
              <button
                onClick={onNext}
                className="les-icon-hover clay-sm flex flex-col items-center gap-2 rounded-2xl border-4 border-white bg-blue-kid px-6 py-4 transition-transform hover:scale-105 active:scale-95 sm:px-8 sm:py-5"
                style={{ ["--clay-shadow" as string]: "oklch(0.35 0.18 260 / 0.85)" }}
              >
                <ArrowRight className="h-10 w-10 text-white sm:h-12 sm:w-12" strokeWidth={2.5} />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white sm:text-sm">
                  {nextText}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default LessonEndScreen;
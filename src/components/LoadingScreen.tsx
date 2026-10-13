// src/components/LoadingScreen.tsx (Complete)

import { useEffect, useState, useRef } from "react";
const taqseemLogo = "/assets/taqseem-logo.png";

interface LoadingScreenProps {
  message?: string;
  onComplete: () => void;
  duration?: number;
}

const LOADING_CSS = `
  @keyframes loading-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.04); }
  }

  @keyframes loading-logo-float {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-8px) scale(1.02); }
  }

  @keyframes loading-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes loading-bg-pulse {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  .loading-logo-float {
    animation: loading-logo-float 2.4s ease-in-out infinite;
  }

  .loading-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.4) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: loading-shimmer 1.2s ease-in-out infinite;
  }

  .loading-pulse-text {
    animation: loading-pulse 1.6s ease-in-out infinite;
  }

  .loading-bg-animated {
    background: linear-gradient(
      135deg,
      #EAF4FF 0%,
      #DCE8FF 25%,
      #EAF4FF 50%,
      #DCE8FF 75%,
      #EAF4FF 100%
    );
    background-size: 400% 400%;
    animation: loading-bg-pulse 6s ease-in-out infinite;
  }
`;

export function LoadingScreen({
  message = "Loading lesson...",
  onComplete,
  duration = 2000,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isCompleteRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = performance.now();
    isCompleteRef.current = false;

    const animate = () => {
      if (isCompleteRef.current) return;

      const now = performance.now();
      const elapsed = now - (startTimeRef.current || now);
      
      const raw = Math.min(elapsed / duration, 1);
      setProgress(raw);

      if (raw < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        isCompleteRef.current = true;
        setTimeout(onComplete, 250);
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [duration, onComplete]);

  const percent = Math.round(progress * 100);

  return (
    // 🔥 FIX: Full screen overlay with solid background
    <div 
      className="loading-bg-animated fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#EAF4FF',
        zIndex: 9999,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <style>{LOADING_CSS}</style>

      {/* 🔥 FIX: Extra overlay to ensure nothing shows through */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: '#EAF4FF',
          zIndex: 1,
        }}
      />

      <div 
        className="relative z-10 flex flex-col items-center gap-6 sm:gap-8"
        style={{
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo with floating animation */}
        <div className="loading-logo-float">
          <div 
            className="rounded-full border-4 border-white shadow-[0_10px_0_0_oklch(0.55_0.19_75_/_0.3),0_20px_40px_-12px_rgba(0,0,0,0.15)]"
            style={{ 
              backgroundColor: "white",
              boxShadow: '0 10px 0 0 rgba(100, 150, 200, 0.3), 0 20px 40px -12px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={taqseemLogo}
              alt="Taqseem Foundation"
              className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full object-cover bg-white"
              width={512}
              height={512}
            />
          </div>
        </div>

        {/* Loading message */}
        <p 
          className="text-sm sm:text-base font-extrabold text-blue-kid-deep uppercase tracking-widest loading-pulse-text"
          style={{
            color: '#1a3a6a',
            textShadow: '0 2px 4px rgba(255,255,255,0.5)',
          }}
        >
          {message}
        </p>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 md:w-96 flex flex-col items-center gap-2">
          <div 
            className="relative w-full h-3.5 sm:h-4 rounded-full border-2 border-white/90 shadow-inner overflow-hidden"
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="h-full rounded-full will-change-transform"
              style={{
                width: `${percent}%`,
                background: `linear-gradient(90deg, #4D82F6, #6B9FFF, #4D82F6)`,
                transition: 'width 16ms linear',
                boxShadow: '0 0 12px rgba(77, 130, 246, 0.3)',
              }}
            >
              <div className="loading-shimmer absolute inset-0 rounded-full pointer-events-none" />
            </div>
          </div>

          <span 
            className="text-xs font-bold tabular-nums"
            style={{
              color: '#4a6a8a',
              fontWeight: 700,
            }}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}
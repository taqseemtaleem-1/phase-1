// src/components/games/Math/Numbers-Items Drag Basket/JarSVG.tsx
// 🫙 Glass jar — STRONG blue outline

import React from "react";

interface BasketSVGProps {
  size?: number | string;
  className?: string;
  isHovered?: boolean;
}

export function BasketBackSVG({ size = "100%", className = "", isHovered = false }: BasketSVGProps) {
  return (
    <svg
      viewBox="0 0 400 320"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Jar Back"
    >
      <defs>
        <linearGradient id="jar-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(186, 230, 253, 0.25)" />
          <stop offset="100%" stopColor="rgba(125, 211, 252, 0.12)" />
        </linearGradient>
        <linearGradient id="jar-lid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(147, 197, 253, 0.75)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.55)" />
        </linearGradient>
      </defs>

      <ellipse
        cx="200"
        cy="42"
        rx="82"
        ry="12"
        fill="url(#jar-lid)"
        stroke={isHovered ? "#1D4ED8" : "#2563EB"}
        strokeWidth="3"
      />

      <path
        d="M 118 42 
           L 118 72 
           Q 118 86 134 92 
           L 100 114 
           Q 70 134 70 162 
           L 70 288 
           Q 70 308 96 308 
           L 304 308 
           Q 330 308 330 288 
           L 330 162 
           Q 330 134 300 114 
           L 266 92 
           Q 282 86 282 72 
           L 282 42 Z"
        fill="url(#jar-inner)"
        stroke={isHovered ? "#1D4ED8" : "#2563EB"}
        strokeWidth="3"
      />
    </svg>
  );
}

export function BasketFrontSVG({ size = "100%", className = "", isHovered = false }: BasketSVGProps) {
  return (
    <svg
      viewBox="0 0 400 320"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Jar Front"
    >
      <defs>
        <linearGradient id="jar-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(191, 219, 254, 0.85)" />
          <stop offset="100%" stopColor="rgba(96, 165, 250, 0.6)" />
        </linearGradient>
        <linearGradient id="jar-shine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <ellipse cx="200" cy="312" rx="125" ry="8" fill="rgba(0,0,0,0.15)" />

      <path
        d="M 118 42 
           L 118 72 
           Q 118 86 134 92 
           L 100 114 
           Q 70 134 70 162 
           L 70 288 
           Q 70 308 96 308 
           L 304 308 
           Q 330 308 330 288 
           L 330 162 
           Q 330 134 300 114 
           L 266 92 
           Q 282 86 282 72 
           L 282 42 Z"
        fill="none"
        stroke={isHovered ? "#1D4ED8" : "#2563EB"}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      <path
        d="M 86 175 Q 82 240 96 292"
        fill="none"
        stroke="url(#jar-shine)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.65"
      />

      <path
        d="M 314 175 Q 318 240 304 292"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <ellipse
        cx="200"
        cy="42"
        rx="82"
        ry="12"
        fill="url(#jar-rim)"
        stroke={isHovered ? "#1D4ED8" : "#2563EB"}
        strokeWidth="4"
      />

      <ellipse
        cx="200"
        cy="40"
        rx="72"
        ry="8"
        fill="none"
        stroke="rgba(255, 255, 255, 0.8)"
        strokeWidth="2"
      />

      <line x1="128" y1="46" x2="128" y2="74" stroke="#2563EB" strokeWidth="2" />
      <line x1="272" y1="46" x2="272" y2="74" stroke="#2563EB" strokeWidth="2" />

      <path
        d="M 90 128 Q 200 152 310 128"
        fill="none"
        stroke="rgba(255, 255, 255, 0.7)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <path
        d="M 82 302 Q 200 316 318 302"
        fill="none"
        stroke="#2563EB"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M 105 297 Q 200 307 295 297"
        fill="none"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <g opacity="0.85">
        <path
          d="M 300 165 L 302 173 L 310 175 L 302 177 L 300 185 L 298 177 L 290 175 L 298 173 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function BasketSVG({ size = "100%", className = "", isHovered = false }: BasketSVGProps) {
  return <BasketBackSVG size={size} className={className} isHovered={isHovered} />;
}

export default BasketSVG;
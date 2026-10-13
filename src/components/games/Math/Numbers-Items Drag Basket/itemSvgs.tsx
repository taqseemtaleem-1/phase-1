// src/components/games/Math/Numbers-Items Drag Basket/itemSvgs.tsx
// 🎨 Custom SVG items — Pencil, School Bag, Car
// 🔥 Tight viewBox — SVG content fills the entire cell

import React from "react";

interface SvgProps {
  size?: number | string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
//  ✏️ PENCIL SVG
// ═══════════════════════════════════════════════════════════════
export function PencilSVG({ size = "100%", className = "" }: SvgProps) {
  return (
    <svg
      viewBox="65 0 70 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Pencil"
    >
      <defs>
        <linearGradient id="db-pencil-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="18%" stopColor="#FCD34D" />
          <stop offset="45%" stopColor="#FEF08A" />
          <stop offset="75%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="db-pencil-wood-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C9A87C" />
          <stop offset="30%" stopColor="#E8CDA8" />
          <stop offset="60%" stopColor="#F5DEB3" />
          <stop offset="100%" stopColor="#B8935F" />
        </linearGradient>
        <radialGradient id="db-pencil-graphite-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4B5563" />
          <stop offset="55%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id="db-pencil-ferrule-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B7280" />
          <stop offset="20%" stopColor="#D1D5DB" />
          <stop offset="50%" stopColor="#F3F4F6" />
          <stop offset="80%" stopColor="#D1D5DB" />
          <stop offset="100%" stopColor="#6B7280" />
        </linearGradient>
        <linearGradient id="db-pencil-eraser-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B91C1C" />
          <stop offset="25%" stopColor="#F87171" />
          <stop offset="55%" stopColor="#FCA5A5" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>

      <path
        d="M 72 2 Q 72 0 76 0 L 124 0 Q 128 0 128 2 L 128 22 L 72 22 Z"
        fill="url(#db-pencil-eraser-grad)"
        stroke="#7F1D1D"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M 78 4 Q 78 3 82 3 L 118 3 Q 122 3 122 4"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <rect x="70" y="22" width="60" height="12" fill="url(#db-pencil-ferrule-grad)" stroke="#4B5563" strokeWidth="1.5" />
      <line x1="70" y1="26" x2="130" y2="26" stroke="#9CA3AF" strokeWidth="1" />
      <line x1="70" y1="30" x2="130" y2="30" stroke="#9CA3AF" strokeWidth="1" />

      <rect x="70" y="34" width="60" height="112" fill="url(#db-pencil-body-grad)" stroke="#A16207" strokeWidth="1.8" />
      <line x1="84" y1="36" x2="84" y2="144" stroke="rgba(161,98,7,0.4)" strokeWidth="1" />
      <line x1="116" y1="36" x2="116" y2="144" stroke="rgba(161,98,7,0.4)" strokeWidth="1" />
      <line x1="94" y1="38" x2="94" y2="142" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" />

      <polygon points="70,146 100,185 130,146" fill="url(#db-pencil-wood-grad)" stroke="#8B6914" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="82" y1="146" x2="94" y2="176" stroke="rgba(139,105,20,0.5)" strokeWidth="0.8" />
      <line x1="118" y1="146" x2="106" y2="176" stroke="rgba(139,105,20,0.5)" strokeWidth="0.8" />

      <polygon points="93,178 100,196 107,178" fill="url(#db-pencil-graphite-grad)" stroke="#0F172A" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="97" cy="184" r="0.8" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  🎒 SCHOOL BAG SVG
// ═══════════════════════════════════════════════════════════════
export function SchoolBagSVG({ size = "100%", className = "" }: SvgProps) {
  return (
    <svg
      viewBox="30 8 140 188"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="School Bag"
    >
      <defs>
        <linearGradient id="db-bag-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="db-bag-lid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="db-bag-pocket-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="194" rx="60" ry="6" fill="rgba(0,0,0,0.15)" />

      <path d="M 72 42 Q 100 12 128 42" fill="none" stroke="#1E3A8A" strokeWidth="9" strokeLinecap="round" />
      <path d="M 76 40 Q 100 18 124 40" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

      <rect x="38" y="44" width="124" height="148" rx="20" fill="url(#db-bag-body-grad)" stroke="#1E3A8A" strokeWidth="2.5" />

      <path
        d="M 38 64 Q 38 44 58 44 L 142 44 Q 162 44 162 64 L 162 98 Q 100 118 38 98 Z"
        fill="url(#db-bag-lid-grad)"
        stroke="#1E3A8A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      <path d="M 48 54 Q 48 50 58 50 L 90 50" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 42 92 Q 100 110 158 92" fill="none" stroke="rgba(30,58,138,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />

      <rect x="90" y="94" width="20" height="30" rx="4" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="2" />
      <rect x="86" y="120" width="28" height="22" rx="6" fill="#FBBF24" stroke="#92400E" strokeWidth="2.5" />
      <rect x="92" y="126" width="16" height="10" rx="3" fill="#B45309" />
      <path d="M 90 124 L 110 124" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />

      <rect x="55" y="146" width="90" height="42" rx="10" fill="url(#db-bag-pocket-grad)" stroke="#1E3A8A" strokeWidth="2.5" />
      <line x1="62" y1="153" x2="138" y2="153" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeDasharray="3 3" />
      <line x1="62" y1="170" x2="138" y2="170" stroke="rgba(30,58,138,0.35)" strokeWidth="1.5" strokeDasharray="2 2" />
      <rect x="96" y="166" width="9" height="7" rx="2" fill="#FBBF24" stroke="#92400E" strokeWidth="1.2" />

      <path d="M 38 90 Q 34 90 34 98 L 34 175 Q 34 185 42 186" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M 162 90 Q 166 90 166 98 L 166 175 Q 166 185 158 186" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

      <path d="M 48 60 Q 48 52 56 52" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  🚗 CAR SVG
// ═══════════════════════════════════════════════════════════════
export function CarSVG({ size = "100%", className = "" }: SvgProps) {
  return (
    <svg
      viewBox="15 65 170 115"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Car"
    >
      <defs>
        <linearGradient id="db-car-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="db-car-glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="170" rx="78" ry="8" fill="rgba(0,0,0,0.15)" />

      <path
        d="M 25 140 Q 25 120 45 118 L 60 118 L 75 85 Q 80 78 90 78 L 125 78 Q 138 78 145 88 L 158 118 L 170 120 Q 180 122 180 135 L 180 145 Q 180 152 172 152 L 28 152 Q 20 152 20 145 Z"
        fill="url(#db-car-body-grad)"
        stroke="#7F1D1D"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 80 118 L 88 88 Q 90 84 95 84 L 118 84 Q 124 84 128 90 L 140 118 Z"
        fill="url(#db-car-glass-grad)"
        stroke="#1E3A8A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line x1="113" y1="84" x2="113" y2="118" stroke="#1E3A8A" strokeWidth="2.5" />
      <line x1="110" y1="120" x2="110" y2="148" stroke="#7F1D1D" strokeWidth="2" />
      <rect x="118" y="128" width="10" height="4" rx="1.5" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="172" cy="132" r="6" fill="#FEF3C7" stroke="#B45309" strokeWidth="2" />
      <rect x="23" y="128" width="6" height="10" rx="2" fill="#FCA5A5" stroke="#7F1D1D" strokeWidth="1.5" />
      <rect x="174" y="142" width="8" height="8" rx="2" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1.5" />

      <g>
        <circle cx="55" cy="152" r="18" fill="#1F2937" stroke="#111827" strokeWidth="3" />
        <circle cx="55" cy="152" r="9" fill="#9CA3AF" stroke="#4B5563" strokeWidth="2" />
        <circle cx="55" cy="152" r="4" fill="#4B5563" />
        <circle cx="145" cy="152" r="18" fill="#1F2937" stroke="#111827" strokeWidth="3" />
        <circle cx="145" cy="152" r="9" fill="#9CA3AF" stroke="#4B5563" strokeWidth="2" />
        <circle cx="145" cy="152" r="4" fill="#4B5563" />
      </g>

      <path d="M 35 132 Q 35 124 48 124 L 70 124" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  🎯 ITEM REGISTRY
// ═══════════════════════════════════════════════════════════════
export type ItemType = "pencil" | "bag" | "car";

export const ITEM_COMPONENTS: Record<ItemType, React.FC<SvgProps>> = {
  pencil: PencilSVG,
  bag: SchoolBagSVG,
  car: CarSVG,
};

export const ITEM_LABELS: Record<ItemType, string> = {
  pencil: "Pencil",
  bag: "School Bag",
  car: "Car",
};

export const ITEM_PLURALS: Record<ItemType, string> = {
  pencil: "Pencils",
  bag: "School Bags",
  car: "Cars",
};
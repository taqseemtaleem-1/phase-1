// src/routes/levels.tsx
// Levels page — Parrot Green Theme
// Lesson cards match subject color (same as level cards)

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { getSubject, getLevel, getTotalLevelCount } from "../data/lessonsData";
import taqseemLogo from "../assets/taqseem-logo.png";
import { getCurrentStudent } from "../lib/auth";
import {
  getCompletedMap,
  getResumePoint,
  getNextLessonInLevel,
  isLevelComplete,
  type CompletedMap,
} from "../lib/studentProgress";

export const Route = createFileRoute("/levels")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { subject: string; level?: number; openPopup?: string } => {
    return {
      subject: (search.subject as string) ?? "english",
      level: search.level !== undefined ? Number(search.level) : undefined,
      openPopup: (search.openPopup as string) ?? undefined,
    };
  },
  head: () => ({
    meta: [{ title: "Choose Level — Taqseem Foundation" }],
  }),
  component: LevelsPage,
});

// ─── Subject Metadata ──────────────────────────────────────────
const SUBJECT_META: Record<
  string,
  { label: string; from: string; to: string; shadow: string; emoji: string }
> = {
  english: {
    label: "English",
    from: "oklch(0.72 0.16 250)",
    to: "oklch(0.55 0.2 260)",
    shadow: "oklch(0.35 0.18 260 / 0.85)",
    emoji: "📚",
  },
  math: {
    label: "Math",
    from: "oklch(0.78 0.18 148)",
    to: "oklch(0.55 0.2 148)",
    shadow: "oklch(0.32 0.18 148 / 0.85)",
    emoji: "🔢",
  },
  urdu: {
    label: "Urdu",
    from: "oklch(0.78 0.18 55)",
    to: "oklch(0.6 0.21 40)",
    shadow: "oklch(0.4 0.18 40 / 0.85)",
    emoji: "📖",
  },
};

// ─── POPUP CSS ──────────────────────────────────────────────────
const POPUP_CSS = `
  @keyframes level-popup-in {
    from { opacity: 0; transform: scale(0.9) translateY(30px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes level-popup-out {
    from { opacity: 1; transform: scale(1) translateY(0); }
    to { opacity: 0; transform: scale(0.9) translateY(30px); }
  }
  @keyframes level-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes level-lesson-pop {
    0%   { opacity: 0; transform: scale(0.85); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  .popup-enter {
    animation: level-popup-in 0.3s ease-out both;
  }
  .popup-exit {
    animation: level-popup-out 0.2s ease-in both;
  }
  .overlay-enter {
    animation: level-overlay-in 0.25s ease-out both;
  }
  .lesson-card-pop {
    animation: level-lesson-pop 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
`;

// ─── Types ──────────────────────────────────────────────────────
interface LevelCardProps {
  level: number;
  isActive: boolean;
  completed?: boolean;
  isResume?: boolean;
  onClick: () => void;
  meta: { from: string; to: string; shadow: string };
}

interface LessonPopupProps {
  level: number;
  lessons: number[];
  completedLessons?: number[];
  nextLessonId?: number | null;
  onSelectLesson: (lessonId: number) => void;
  onClose: () => void;
  meta: { from: string; to: string; shadow: string };
}

// ─── Level Card ──────────────────────────────────────────────────
function LevelCard({ level, isActive, completed, isResume, onClick, meta }: LevelCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        clay-sm group relative flex h-16 w-16 shrink-0 flex-col items-center justify-center
        rounded-lg border-[3px] font-extrabold text-white transition-all duration-200
        hover:-translate-y-0.5 hover:z-10 active:translate-y-0.5
        sm:h-20 sm:w-20 sm:border-[4px] md:h-24 md:w-24 lg:h-28 lg:w-28
        ${isActive ? "border-white scale-105 shadow" : "border-white hover:border-white"}
        ${isResume && !completed ? "ring-4 ring-yellow-300 ring-offset-1" : ""}
      `}
      style={{
        background: `linear-gradient(145deg, ${meta.from}, ${meta.to})`,
        ["--clay-shadow" as string]: meta.shadow,
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider leading-none text-white/85 sm:text-[11px] md:text-xs">
        Level
      </span>
      <span className="mt-0.5 text-2xl font-black leading-none sm:text-3xl md:text-4xl lg:text-5xl">
        {level}
      </span>
      {completed && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white shadow sm:h-6 sm:w-6">
          <Check className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={4} />
        </span>
      )}
      {isResume && !completed && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black uppercase text-yellow-900 shadow sm:text-[10px]">
          Continue
        </span>
      )}
    </button>
  );
}

// ─── Lesson Popup Component ────────────────────────────────────
function LessonPopup({ level, lessons, completedLessons = [], nextLessonId = null, onSelectLesson, onClose, meta }: LessonPopupProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 overlay-enter p-4">
      <div className="popup-enter relative w-full max-w-lg overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-b from-white to-green-50 p-5 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Top accent — GREEN */}
        <div
          className="absolute left-0 right-0 top-0 h-2"
          style={{
            background: "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform hover:scale-105 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header — GREEN */}
        <div className="mb-4 mt-2 text-center">
          <div className="inline-block rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-green-700 ring-1 ring-green-200 sm:text-sm">
            Level {level}
          </div>
          <h2 className="mt-2 text-xl font-extrabold text-slate-800 sm:text-2xl">
            Choose Lesson
          </h2>
        </div>

        {/* 🔥 Lesson cards grid — SUBJECT COLOR (same as level cards) */}
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {lessons.map((lessonId, index) => (
            <button
              key={lessonId}
              onClick={() => onSelectLesson(lessonId)}
              className={`lesson-card-pop group relative flex aspect-square flex-col items-center justify-center rounded-lg border-[3px] border-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 ${lessonId === nextLessonId ? "ring-4 ring-yellow-300 ring-offset-1" : ""}`}
              style={{
                background: `linear-gradient(145deg, ${meta.from}, ${meta.to})`,
                ["--clay-shadow" as string]: meta.shadow,
                animationDelay: `${index * 50}ms`,
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-white/85 sm:text-xs">
                Lesson
              </span>
              <span className="mt-1 text-2xl font-black leading-none text-white sm:text-3xl">
                {lessonId}
              </span>
              {completedLessons.includes(lessonId) && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white shadow sm:h-6 sm:w-6">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={4} />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 text-center text-xs font-medium text-slate-400 sm:text-sm">
          Tap a lesson to start
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────
function LevelsPage() {
  const { subject, level: levelParam, openPopup } = Route.useSearch();
  const navigate = useNavigate();
  const subjectData = getSubject(subject);
  const totalLevels = getTotalLevelCount(subject);
  const meta = SUBJECT_META[subject] ?? SUBJECT_META.english;

  // Pagination state
  const LEVELS_PER_PAGE = 20;
  const totalPages = Math.ceil(totalLevels / LEVELS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(0);

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // 🔥 Progress (IndexedDB — reinstall ke baad server se restore hua data bhi yahin hai)
  const studentId = getCurrentStudent()?.studentId ?? "";
  const [completedMap, setCompletedMap] = useState<CompletedMap>({});
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCompletedMap(studentId).then((m) => {
      if (cancelled) return;
      setCompletedMap(m);
      setProgressLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const resumePoint = progressLoaded ? getResumePoint(completedMap, subject) : null;

  // Level param na ho to us page par jao jahan bacha ruka tha
  useEffect(() => {
    if (!progressLoaded) return;
    if (levelParam !== undefined && levelParam !== null) return;
    if (!resumePoint) return;
    setCurrentPage(Math.floor((resumePoint.level - 1) / LEVELS_PER_PAGE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded, subject]);

  // Auto-open popup
  useEffect(() => {
    if (levelParam === undefined || levelParam === null) return;
    if (!Number.isFinite(levelParam) || levelParam < 1 || levelParam > totalLevels) return;

    const targetPage = Math.floor((levelParam - 1) / LEVELS_PER_PAGE);
    setCurrentPage(targetPage);
    setSelectedLevel(levelParam);
    setShowPopup(true);
  }, [levelParam, totalLevels, openPopup]);

  // Get levels for current page
  const startIndex = currentPage * LEVELS_PER_PAGE;
  const endIndex = Math.min(startIndex + LEVELS_PER_PAGE, totalLevels);
  const pageLevels = Array.from(
    { length: endIndex - startIndex },
    (_, i) => startIndex + i + 1,
  );

  const goBack = () => navigate({ to: "/dashboard" });

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level);
    setShowPopup(true);
  };

  const handleSelectLesson = (lessonId: number) => {
    if (selectedLevel === null) return;
    setShowPopup(false);
    navigate({
      to: "/lesson",
      search: {
        subject,
        level: selectedLevel,
        lessonId: lessonId,
      },
    });
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLevel(null);
    navigate({
      to: "/levels",
      search: { subject },
      replace: true,
    });
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  if (!subjectData || totalLevels === 0) {
    return (
      <main className="levels-screen flex h-[100dvh] w-screen items-center justify-center overflow-hidden">
        <style>{LEVELS_CSS}</style>
        <div className="clay bg-white p-8 text-center">
          <p className="text-2xl font-extrabold">Subject not found!</p>
          <button
            onClick={goBack}
            className="clay-sm mt-4 rounded-full bg-green-500 px-6 py-3 font-bold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const pageStart = startIndex + 1;
  const pageEnd = endIndex;

  // Lesson IDs for selected level
  const selectedLevelData = selectedLevel !== null ? getLevel(subject, selectedLevel) : null;
  const selectedLessonIds = selectedLevelData?.lessons.map((l) => l.id) ?? [];

  return (
    <main className="levels-screen relative h-[100dvh] w-screen overflow-hidden p-2 sm:p-3">
      <style>{POPUP_CSS}</style>
      <style>{LEVELS_CSS}</style>

      {/* Decorative background — GREEN */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-40 blur-3xl float-slow"
          style={{ background: "radial-gradient(circle, #4ade80, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-30 blur-3xl float-slow-reverse"
          style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)" }}
        />

        <svg className="sparkle absolute left-[10%] top-[20%] h-4 w-4" viewBox="0 0 24 24" fill="#4ade80" style={{ animationDelay: "0s" }}>
          <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
        </svg>
        <svg className="sparkle absolute right-[15%] top-[25%] h-5 w-5" viewBox="0 0 24 24" fill="#22c55e" style={{ animationDelay: "1s" }}>
          <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col gap-1">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2 sm:gap-3">
          <img
            src={taqseemLogo}
            alt="Taqseem Foundation"
            className="h-10 w-10 shrink-0 rounded-full object-contain drop-shadow-[0_2px_8px_rgba(34,197,94,0.3)] sm:h-12 sm:w-12 md:h-14 md:w-14"
          />

          <button
            onClick={goBack}
            className="clay-sm flex shrink-0 items-center gap-1 rounded-full border-[2px] border-white px-2.5 py-1 text-[9px] font-extrabold uppercase text-white transition-transform hover:-translate-y-0.5 active:translate-y-0.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
            style={{
              ["--clay-shadow" as string]: "oklch(0.45 0.19 148 / 0.6)",
              background: "linear-gradient(135deg, #4ade80, #16a34a)",
            }}
          >
            <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{" "}
            <span className="hidden sm:inline">Back</span>
          </button>
        </header>

        {/* Level Grid */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              className={`
                clay-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full 
                border-[2px] border-white transition-all hover:scale-105 active:scale-95
                sm:h-10 sm:w-10 md:h-11 md:w-11
                ${currentPage === 0 ? "bg-white/50 text-gray-300 cursor-not-allowed" : "bg-white/90 text-green-600 hover:bg-white"}
              `}
              style={{ ["--clay-shadow" as string]: "oklch(0.5 0.15 148 / 0.15)" }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <div className="grid grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {pageLevels.map((level) => (
                  <LevelCard
                    key={level}
                    level={level}
                    isActive={level === levelParam}
                    completed={isLevelComplete(completedMap, subject, level)}
                    isResume={resumePoint?.level === level}
                    onClick={() => handleLevelClick(level)}
                    meta={meta}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`
                        h-1 rounded-full transition-all
                        ${i === currentPage ? "w-3 bg-green-500" : "w-1 bg-green-200 hover:bg-green-300"}
                      `}
                      aria-label={`Go to page ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className={`
                clay-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full 
                border-[2px] border-white transition-all hover:scale-105 active:scale-95
                sm:h-10 sm:w-10 md:h-11 md:w-11
                ${currentPage >= totalPages - 1 ? "bg-white/50 text-gray-300 cursor-not-allowed" : "bg-white/90 text-green-600 hover:bg-white"}
              `}
              style={{ ["--clay-shadow" as string]: "oklch(0.5 0.15 148 / 0.15)" }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="shrink-0 text-center text-[4px] font-bold text-green-700/60 sm:text-[5px]">
          {pageStart}–{pageEnd} of {totalLevels}
          {totalPages > 1 && ` · Pg ${currentPage + 1}`}
        </div>
      </div>

      {showPopup && selectedLevel !== null && (
        <LessonPopup
          level={selectedLevel}
          lessons={selectedLessonIds}
          completedLessons={completedMap[subject]?.[selectedLevel] ?? []}
          nextLessonId={getNextLessonInLevel(completedMap, subject, selectedLevel)}
          onSelectLesson={handleSelectLesson}
          onClose={handleClosePopup}
          meta={meta}
        />
      )}
    </main>
  );
}

// ─── LEVELS CSS ─────────────────────────────────────────────────
const LEVELS_CSS = `
  .levels-screen {
    background:
      radial-gradient(ellipse at 20% 0%, #dcfce7 0%, transparent 55%),
      radial-gradient(ellipse at 80% 100%, #bbf7d0 0%, transparent 55%),
      radial-gradient(ellipse at 50% 50%, #f0fdf4 0%, transparent 65%),
      linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  }

  @keyframes float-slow {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(20px, -30px) scale(1.1); }
  }

  @keyframes float-slow-reverse {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-20px, 30px) scale(1.1); }
  }

  @keyframes sparkle-float {
    0%, 100% { opacity: 0.2; transform: translateY(0) scale(0.8) rotate(0deg); }
    50%      { opacity: 1; transform: translateY(-15px) scale(1.2) rotate(180deg); }
  }

  .float-slow {
    animation: float-slow 12s ease-in-out infinite;
  }

  .float-slow-reverse {
    animation: float-slow-reverse 14s ease-in-out infinite;
  }

  .sparkle {
    animation: sparkle-float 4s ease-in-out infinite;
  }
`;
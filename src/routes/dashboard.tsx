// src/routes/dashboard.tsx
// Dashboard with student profile popup — Parrot Green Theme
// ✅ FIXED: Profile pics now cache-first (offline-safe)
//    - Header avatar uses getCachedImage
//    - ProfilePopup avatar uses getCachedImage

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { User, LogOut, RefreshCw, X, Check, AlertCircle } from "lucide-react";
import englishImg from "../assets/images/subject cards images dashboard/english.png";
import mathImg from "../assets/images/subject cards images dashboard/math.png";
import urduImg from "../assets/images/subject cards images dashboard/urdu.png";
import taqseemLogo from "../assets/taqseem-logo.png";

import { getCompletedMap, getSubjectStats } from "../lib/studentProgress";
import { getCurrentStudent, clearSession } from "../lib/auth";

// 🔥 Progress sync imports
import {
  syncToSupabase,
  getPendingCount,
} from "../lib/progressSync";

// 🔥 FIXED: Import cache helpers
import { getCachedImage, cacheImage } from "../lib/image-cache";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Taqseem Foundation" },
      {
        name: "description",
        content: "Choose English, Math or Urdu and start your learning adventure!",
      },
    ],
  }),
  component: Dashboard,
});

// ─── Clock ──────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Tagline Cycler ────────────────────────────────────────────
const TAGLINE_STEPS = [
  { text: "EDUCATION", small: false },
  { text: "EMPOWER", small: false },
  { text: "TRANSFORM", small: false },
  { text: "EDUCATION  ·  EMPOWER  ·  TRANSFORM", small: true },
];

function TaglineCycler() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fade: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;

    const SHOW = 1500;
    const FADE = 380;

    const cycle = () => {
      setVisible(true);
      fade = setTimeout(() => setVisible(false), SHOW);
      next = setTimeout(() => {
        setIdx((i) => (i + 1) % TAGLINE_STEPS.length);
        cycle();
      }, SHOW + FADE);
    };

    cycle();
    return () => {
      clearTimeout(fade);
      clearTimeout(next);
    };
  }, []);

  const step = TAGLINE_STEPS[idx];
  return (
    <span
      style={{
        display: "block",
        opacity: visible ? 1 : 0,
        transition: `opacity 380ms ease-in-out`,
        fontSize: step.small ? "0.72em" : "1em",
        letterSpacing: step.small ? "0.12em" : "0.18em",
        whiteSpace: "nowrap",
        color: "#16a34a",
        fontWeight: 800,
        textShadow: "0 2px 4px rgba(22, 163, 74, 0.15)",
      }}
    >
      {step.text}
    </span>
  );
}

// ─── Sky Decor ─────────────────────────────────────────────────
function SkyDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden
    >
      <div
        className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-40 blur-3xl float-slow"
        style={{ background: "radial-gradient(circle, #4ade80, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-30 blur-3xl float-slow-reverse"
        style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #4ade80, transparent 70%)" }}
      />

      <svg
        className="sparkle absolute left-[8%] top-[15%] h-4 w-4"
        viewBox="0 0 24 24"
        fill="#4ade80"
        style={{ animationDelay: "0s" }}
      >
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
      </svg>
      <svg
        className="sparkle absolute right-[12%] top-[20%] h-5 w-5"
        viewBox="0 0 24 24"
        fill="#22c55e"
        style={{ animationDelay: "0.7s" }}
      >
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
      </svg>
      <svg
        className="sparkle absolute left-[15%] bottom-[18%] h-3 w-3"
        viewBox="0 0 24 24"
        fill="#16a34a"
        style={{ animationDelay: "1.4s" }}
      >
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
      </svg>
      <svg
        className="sparkle absolute right-[18%] bottom-[12%] h-4 w-4"
        viewBox="0 0 24 24"
        fill="#4ade80"
        style={{ animationDelay: "2.1s" }}
      >
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  🔥 FIXED: ProfileAvatar — cache-first, offline-safe
// ══════════════════════════════════════════════════════════════
//
//  Ye component:
//   1. Pehle IndexedDB cache check karta hai (offline-safe)
//   2. Cache miss → network URL try karta hai (online)
//   3. URL bhi fail → User icon fallback
//   4. Background: agar online hai to image cache kar leta hai
//
// ══════════════════════════════════════════════════════════════

interface ProfileAvatarProps {
  photoUrl?: string | null;
  studentName: string;
  /** Icon size class for fallback User icon */
  fallbackIconClassName: string;
}

function ProfileAvatar({
  photoUrl,
  studentName,
  fallbackIconClassName,
}: ProfileAvatarProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Reset state when URL changes
      setLoaded(false);

      // No photo URL → show fallback
      if (!photoUrl) {
        if (!cancelled) setImgSrc(null);
        return;
      }

      // ─── STEP 1: Try IndexedDB cache (offline-safe) ────
      try {
        const cached = await getCachedImage(photoUrl);
        if (cancelled) return;

        if (cached) {
          console.log("[dashboard] Profile pic from cache");
          setImgSrc(cached);
          return;
        }
      } catch (err) {
        console.warn("[dashboard] Cache lookup failed:", err);
      }

      if (cancelled) return;

      // ─── STEP 2: Fallback to network URL ──────────────
      setImgSrc(photoUrl);

      // ─── STEP 3: Background — try to cache it ─────────
      if (typeof navigator !== "undefined" && navigator.onLine) {
        cacheImage(photoUrl).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  // Fallback: User icon
  if (!imgSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-green-50">
        <User className={fallbackIconClassName} strokeWidth={2} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={studentName}
      className="h-full w-full object-cover"
      onLoad={() => setLoaded(true)}
      onError={() => {
        // Image failed to load — show fallback
        console.warn("[dashboard] Profile pic load failed:", imgSrc?.substring(0, 60));
        setImgSrc(null);
        setLoaded(false);
      }}
      style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
    />
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────
function StatPill({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl bg-white/25 px-1 py-1 text-white">
      <span className="text-[8px] font-extrabold uppercase leading-none tracking-wider text-white/80 sm:text-[9px]">
        {label}
      </span>
      <span className="mt-0.5 text-[10px] font-extrabold leading-none tabular-nums sm:text-xs">
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Subject Card ──────────────────────────────────────────────
function SubjectCard({
  title,
  subtitle,
  levels,
  lessons,
  percent,
  gradient,
  shadow,
  barColor,
  illustration,
  onClick,
}: {
  title: string;
  subtitle: string;
  levels: { done: number; total: number };
  lessons: { done: number; total: number };
  percent: number;
  gradient: string;
  shadow: string;
  barColor: string;
  illustration: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="clay group relative flex h-full w-full flex-col overflow-hidden border-4 border-white p-2.5 text-left transition-transform duration-150 hover:-translate-y-1 active:translate-y-0.5 sm:p-3 md:p-4"
      style={{ background: gradient, ["--clay-shadow" as string]: shadow }}
    >
      <div className="relative flex flex-1 items-center justify-center rounded-3xl bg-white/45 p-2 min-h-0">
        {illustration}
      </div>

      <h3 className="mt-2 text-center text-lg font-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] sm:text-xl md:text-2xl">
        {title}
      </h3>
      <p className="text-center text-[10px] font-bold text-white/90 sm:text-xs">
        {subtitle}
      </p>

      <div className="mt-2 flex items-stretch gap-1 px-0.5">
        <StatPill label="Levels" done={levels.done} total={levels.total} />
        <StatPill label="Lessons" done={lessons.done} total={lessons.total} />
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-bold text-white/95 sm:text-[11px]">
        <span>Overall Progress</span>
        <span>{percent}%</span>
      </div>

      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/40 sm:h-2.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-center">
        <span className="rounded-full bg-white/25 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white transition-colors group-hover:bg-white/40 group-active:bg-white/50 sm:text-[11px]">
          Tap to Start
        </span>
      </div>
    </button>
  );
}

// ─── Profile Popup ─────────────────────────────────────────────
type SyncState =
  | { type: "idle"; pendingCount: number }
  | { type: "syncing"; progress: number }
  | { type: "success"; uploaded: number }
  | { type: "no_pending" }
  | { type: "error"; message: string };

function ProfilePopup({
  open,
  onClose,
  student,
  onLogout,
  onSync,
  syncState,
}: {
  open: boolean;
  onClose: () => void;
  student: {
    studentName: string;
    studentId: string;
    photoUrl: string;
    grade?: string;
    fatherName?: string;
    schoolName?: string;
  } | null;
  onLogout: () => void;
  onSync: () => void;
  syncState: SyncState;
}) {
  if (!open || !student) return null;

  const isSyncing = syncState.type === "syncing";
  const isSuccess = syncState.type === "success";
  const isNoPending = syncState.type === "no_pending";
  const isError = syncState.type === "error";
  const isIdle = syncState.type === "idle";

  const hasPending = isIdle && syncState.pendingCount > 0;
  const noPending = isIdle && syncState.pendingCount === 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 popup-overlay-in">
      <div className="popup-in relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-b from-white to-green-50 p-6 text-center shadow-2xl">
        <div
          className="absolute left-0 right-0 top-0 h-2"
          style={{
            background: "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
          }}
        />

        <button
          onClick={onClose}
          disabled={isSyncing}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Photo — cache-first via ProfileAvatar */}
        <div className="mx-auto mb-3 mt-2 h-24 w-24 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 p-[3px] shadow-lg shadow-green-500/30 sm:h-28 sm:w-28">
          <div className="h-full w-full overflow-hidden rounded-full border-4 border-white bg-white">
            <ProfileAvatar
              photoUrl={student.photoUrl}
              studentName={student.studentName}
              fallbackIconClassName="h-12 w-12 text-green-400"
            />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
          {student.studentName}
        </h2>

        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-green-600">
          {student.studentId}
        </p>

        {(student.fatherName || student.schoolName || student.grade) && (
          <div className="mt-4 space-y-1.5 rounded-xl border-2 border-green-100 bg-white p-3 text-left">
            {student.fatherName && (
              <DetailRow label="Father" value={student.fatherName} />
            )}
            {student.schoolName && (
              <DetailRow label="School" value={student.schoolName} />
            )}
            {student.grade && (
              <DetailRow label="Grade" value={student.grade} />
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {isSyncing && (
            <div className="w-full">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-green-700">
                <span>Syncing Progress...</span>
                <span>{syncState.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-green-100">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${syncState.progress}%`,
                    background:
                      "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onSync}
            disabled={isSyncing || isSuccess}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-white px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed"
            style={{
              background: isSuccess
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
                : noPending || isNoPending
                  ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 50%, #64748b 100%)"
                  : "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
              boxShadow: isSuccess
                ? "0 6px 0 0 #15803d, 0 10px 20px -6px rgba(21, 128, 61, 0.5)"
                : noPending || isNoPending
                  ? "0 6px 0 0 #475569, 0 10px 20px -6px rgba(71, 85, 105, 0.4)"
                  : "0 6px 0 0 #14532d, 0 10px 20px -6px rgba(20, 83, 45, 0.5)",
            }}
          >
            {isSuccess ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Synced {syncState.uploaded} Record
                {syncState.uploaded !== 1 ? "s" : ""}
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                Syncing...
              </>
            ) : noPending || isNoPending ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Nothing to Sync
              </>
            ) : isError ? (
              <>
                <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
                Retry Sync
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" strokeWidth={2.5} />
                Sync Progress
                {hasPending && (
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold">
                    {syncState.pendingCount}
                  </span>
                )}
              </>
            )}
          </button>

          {isNoPending && (
            <p className="text-center text-[11px] font-bold text-slate-500">
              No Progress Pending to Sync
            </p>
          )}

          {isError && (
            <p className="text-center text-[11px] font-bold text-rose-600">
              {syncState.message}
            </p>
          )}

          <button
            onClick={onLogout}
            disabled={isSyncing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-white px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, #f87171 0%, #dc2626 50%, #b91c1c 100%)",
              boxShadow:
                "0 6px 0 0 #7f1d1d, 0 10px 20px -6px rgba(127, 29, 29, 0.5)",
            }}
          >
            <LogOut className="h-5 w-5" strokeWidth={2.5} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="truncate font-semibold text-slate-700">{value}</span>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();
  const now = useClock();

  const student = getCurrentStudent();

  const [subjectStats, setSubjectStats] = useState<
    Record<
      string,
      {
        levels: { done: number; total: number };
        lessons: { done: number; total: number };
      }
    >
  >({});

  const [profileOpen, setProfileOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({
    type: "idle",
    pendingCount: 0,
  });

  // ─── Load pending count when profile opens ─────────────────
  const refreshPendingCount = useCallback(async () => {
    if (!student?.studentId) return;
    const count = await getPendingCount(student.studentId);
    setSyncState({ type: "idle", pendingCount: count });
  }, [student?.studentId]);

  useEffect(() => {
    if (profileOpen && student?.studentId) {
      refreshPendingCount();
    }
  }, [profileOpen, student?.studentId, refreshPendingCount]);

  // Progress IndexedDB se (reinstall ke baad server se restore hua data bhi yahin hota hai)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = student?.studentId
        ? await getCompletedMap(student.studentId)
        : {};
      const stats: typeof subjectStats = {};
      for (const subjectId of ["english", "math", "urdu"] as const) {
        stats[subjectId] = getSubjectStats(map, subjectId);
      }
      if (!cancelled) setSubjectStats(stats);
    })();
    return () => {
      cancelled = true;
    };
  }, [student?.studentId]);

  const time = now
    ? now
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        .toLowerCase()
    : "--:--";
  const dateStr = now
    ? now
        .toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        .toUpperCase()
    : "";

  const goToLevels = (subject: string) =>
    navigate({ to: "/levels", search: { subject } });

  const pctOf = (id: string) => {
    const l = subjectStats[id]?.lessons;
    return l && l.total > 0 ? Math.round((l.done / l.total) * 100) : 0;
  };
  const englishPct = pctOf("english");
  const mathPct = pctOf("math");
  const urduPct = pctOf("urdu");

  const handleLogout = () => {
    clearSession();
    setProfileOpen(false);
    navigate({ to: "/" });
  };

  const handleSync = async () => {
    if (!student?.studentId) return;
    if (syncState.type === "syncing") return;

    const pendingCount = await getPendingCount(student.studentId);

    if (pendingCount === 0) {
      setSyncState({ type: "no_pending" });
      setTimeout(() => {
        setSyncState({ type: "idle", pendingCount: 0 });
      }, 3000);
      return;
    }

    setSyncState({ type: "syncing", progress: 0 });

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue = Math.min(progressValue + Math.random() * 15, 90);
      setSyncState({ type: "syncing", progress: Math.round(progressValue) });
    }, 200);

    const result = await syncToSupabase(student.studentId);

    clearInterval(progressInterval);
    setSyncState({ type: "syncing", progress: 100 });

    setTimeout(() => {
      if (result.ok) {
        setSyncState({ type: "success", uploaded: result.uploaded });

        setTimeout(async () => {
          const newCount = await getPendingCount(student.studentId);
          setSyncState({ type: "idle", pendingCount: newCount });
        }, 2500);
      } else {
        setSyncState({
          type: "error",
          message: result.error || "Sync failed. Please try again.",
        });

        setTimeout(async () => {
          const newCount = await getPendingCount(student.studentId);
          setSyncState({ type: "idle", pendingCount: newCount });
        }, 3000);
      }
    }, 300);
  };

  return (
    <main className="dashboard-screen relative h-[100dvh] w-screen overflow-hidden p-2 sm:p-3 md:p-4 lg:p-5">
      <SkyDecor />

      <style>{DASHBOARD_CSS}</style>

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col gap-2 sm:gap-3 md:gap-4">
        {/* ─── HEADER ROW ─── */}
        <header className="flex shrink-0 items-stretch gap-2 sm:gap-3 md:gap-4">
          {/* Taqseem logo */}
          <img
            src={taqseemLogo}
            alt="Taqseem Foundation"
            className="h-16 w-16 shrink-0 self-center rounded-full object-contain drop-shadow-[0_6px_10px_rgba(34,197,94,0.35)] sm:h-20 sm:w-20 md:h-24 md:w-24"
            width={512}
            height={512}
          />

          {/* ─── MIDDLE BAR: Time + Tagline (GREEN THEME) ─── */}
          <div
            className="clay-sm flex min-w-0 flex-1 items-center gap-2 border-4 border-white px-2.5 py-1.5 sm:gap-3 sm:px-4 sm:py-2 md:gap-4"
            style={{
              ["--clay-shadow" as string]: "oklch(0.5 0.18 145 / 0.5)",
              background:
                "linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
            }}
          >
            {/* Date / time — GREEN THEME */}
            <div
              className="flex shrink-0 flex-col items-center rounded-2xl px-2.5 py-1 sm:px-3 sm:py-1.5"
              style={{
                background: "linear-gradient(145deg, #4ade80, #16a34a)",
                boxShadow:
                  "0 4px 0 0 oklch(0.35 0.18 148 / 0.6), 0 8px 20px -4px rgba(22, 163, 74, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                color: "white",
                minWidth: "4.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  opacity: 0.9,
                  lineHeight: 1.2,
                }}
              >
                {dateStr || "SAT, OCT 14"}
              </span>
              <span
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                {time}
              </span>
              <span
                style={{
                  fontSize: "0.5rem",
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  opacity: 0.75,
                  textTransform: "uppercase",
                  marginTop: "1px",
                }}
              >
                Live
              </span>
            </div>

            <div className="h-8 w-px shrink-0 bg-green-200 sm:h-10" />

            {/* Tagline */}
            <div className="relative min-w-0 flex-1 self-stretch flex items-center justify-center overflow-hidden">
              <div
                className="text-xl font-extrabold uppercase tracking-widest sm:text-2xl md:text-3xl"
                style={{ fontFamily: "inherit", textAlign: "center" }}
              >
                <TaglineCycler />
              </div>
            </div>
          </div>

          {/* ─── STUDENT PROFILE CARD (GREEN THEME) ─── */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="clay-sm relative flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-4 border-white px-2 py-1.5 text-left transition-transform hover:scale-[1.02] active:scale-95 sm:gap-3 sm:px-4 sm:py-2.5"
            style={{
              ["--clay-shadow" as string]: "oklch(0.5 0.18 145 / 0.5)",
              background:
                "linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
            }}
          >
            {/* Decorative blobs */}
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-50 blur-2xl"
              style={{
                background: "radial-gradient(circle, #4ade80, transparent 70%)",
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full opacity-40 blur-2xl"
              style={{
                background: "radial-gradient(circle, #22c55e, transparent 70%)",
              }}
            />

            {/* 🔥 FIXED: Student photo with cache-first loading */}
            <div className="relative shrink-0">
              <div className="rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 p-[2px] shadow-md">
                <div className="h-14 w-14 overflow-hidden rounded-full border-[2px] border-white bg-white sm:h-16 sm:w-16 md:h-20 md:w-20">
                  <ProfileAvatar
                    photoUrl={student?.photoUrl}
                    studentName={student?.studentName || "Student"}
                    fallbackIconClassName="h-7 w-7 text-green-500 sm:h-9 sm:w-9 md:h-10 md:w-10"
                  />
                </div>
              </div>
            </div>

            {/* Student info */}
            <div className="relative flex min-w-0 flex-col justify-center pr-1">
              <div className="max-w-[8rem] truncate text-sm font-extrabold uppercase leading-tight tracking-wide text-slate-800 sm:max-w-[10rem] sm:text-base md:max-w-[12rem] md:text-lg">
                {student?.studentName || "Student"}
              </div>
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-green-600 sm:text-xs">
                {student?.studentId || ""}
              </div>
            </div>
          </button>
        </header>

        {/* ─── SUBJECT CARDS ROW ─── */}
        <section className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-3 md:gap-5">
          <SubjectCard
            title="English"
            subtitle="Learn & Read"
            levels={subjectStats.english?.levels ?? { done: 0, total: 30 }}
            lessons={subjectStats.english?.lessons ?? { done: 0, total: 300 }}
            percent={englishPct}
            gradient="linear-gradient(160deg, oklch(0.72 0.16 250), oklch(0.55 0.2 260))"
            shadow="oklch(0.35 0.2 260 / 0.85)"
            barColor="linear-gradient(90deg, #4ade80, #22c55e)"
            illustration={
              <img
                src={englishImg}
                alt="English"
                className="max-h-full max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.2)]"
              />
            }
            onClick={() => goToLevels("english")}
          />
          <SubjectCard
            title="Math"
            subtitle="Play with Numbers"
            levels={subjectStats.math?.levels ?? { done: 0, total: 30 }}
            lessons={subjectStats.math?.lessons ?? { done: 0, total: 300 }}
            percent={mathPct}
            gradient="linear-gradient(160deg, oklch(0.78 0.18 148), oklch(0.55 0.2 148))"
            shadow="oklch(0.32 0.2 148 / 0.85)"
            barColor="linear-gradient(90deg, #4ade80, #22c55e)"
            illustration={
              <img
                src={mathImg}
                alt="Math"
                className="max-h-full max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.2)]"
              />
            }
            onClick={() => goToLevels("math")}
          />
          <SubjectCard
            title="Urdu"
            subtitle="Parhna Likhna"
            levels={subjectStats.urdu?.levels ?? { done: 0, total: 30 }}
            lessons={subjectStats.urdu?.lessons ?? { done: 0, total: 300 }}
            percent={urduPct}
            gradient="linear-gradient(160deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))"
            shadow="oklch(0.4 0.2 40 / 0.85)"
            barColor="linear-gradient(90deg, #4ade80, #22c55e)"
            illustration={
              <img
                src={urduImg}
                alt="Urdu"
                className="max-h-full max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.2)]"
              />
            }
            onClick={() => goToLevels("urdu")}
          />
        </section>
      </div>

      {/* Profile Popup */}
      <ProfilePopup
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        student={student}
        onLogout={handleLogout}
        onSync={handleSync}
        syncState={syncState}
      />
    </main>
  );
}

// ─── DASHBOARD CSS ─────────────────────────────────────────────
const DASHBOARD_CSS = `
  .dashboard-screen {
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

  @keyframes popup-in {
    from { opacity: 0; transform: scale(0.85) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes popup-overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
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

  .popup-in {
    animation: popup-in 0.35s cubic-bezier(.34,1.4,.64,1) both;
  }
  .popup-overlay-in {
    animation: popup-overlay-in 0.2s ease-out both;
  }
`;

export default Dashboard;
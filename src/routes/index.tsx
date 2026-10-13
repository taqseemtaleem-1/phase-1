// src/routes/index.tsx
// QR Scanner + Manual Token — Token saved, force logout via dashboard
// ⚡ Heartbeat: 2 seconds
// 📄 Students: 4 per page, slider
// 📸 Offline images: cached in IndexedDB
// 🎨 Parrot Green Theme
// 🎬 Sequence: Tagline Fade → Brand Fade → Repeat (12s cycle)
// 🔥 Progress restore when token accepted
// 🔥 OFFLINE MODE: Full cache fallback (validated flow)
// ✅ UPDATED: Better offline detection + cache verification

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  User,
  X,
  LogIn,
  QrCode,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Camera,
  Keyboard,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import taqseemLogo from "../assets/taqseem-logo.png";
import { QRScanner } from "../components/QRScanner";
import {
  validateToken,
  getStudentsByToken,
  loginStudent,
  getSession,
  getSavedTokenAsync,
  saveToken,
  clearToken,
  clearSession,
  checkHeartbeat,
  getErrorMessage,
} from "../lib/auth";

import type { Student } from "../lib/types";
import { getCachedImage } from "../lib/image-cache";
import { restoreAllStudentsFromSupabase } from "../lib/progressSync";
import {
  getCachedStudentsByToken,
  getCachedDeviceByToken,
  cacheStudents,
  cacheDevices,
} from "../lib/cache-db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Login — Taqseem Taleem" }],
  }),
  component: LoginPage,
});

type Screen =
  | "loading"
  | "welcome"
  | "scanning"
  | "manual"
  | "restoring"
  | "students";

const CARDS_PER_PAGE = 4;

function isOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

function LoginPage() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>("loading");
  const [deviceToken, setDeviceToken] = useState("");
  const [deviceName, setDeviceName] = useState("");

  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState("");
  const [isCheckingToken, setIsCheckingToken] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [scanError, setScanError] = useState("");

  const [currentPage, setCurrentPage] = useState(0);

  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreError, setRestoreError] = useState("");

  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const lastTokenRef = useRef<string>("");

  const manualInputRef = useRef<HTMLInputElement>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Pagination ───────────────────────────────────────────
  const totalPages = Math.ceil(students.length / CARDS_PER_PAGE);
  const needsSlider = students.length > CARDS_PER_PAGE;
  const startIndex = currentPage * CARDS_PER_PAGE;
  const visibleStudents = useMemo(
    () => students.slice(startIndex, startIndex + CARDS_PER_PAGE),
    [students, startIndex],
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [students.length]);

  // ─── Initial Check ────────────────────────────────────────
  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/dashboard" });
      return;
    }

    (async () => {
      const savedToken = await getSavedTokenAsync();
      if (savedToken) {
        loadStudentsFromToken(savedToken);
      } else {
        setScreen("welcome");
      }
    })();
  }, [navigate]);

  // ─── HEARTBEAT ────────────────────────────────────────────
  useEffect(() => {
    if (!deviceToken) return;
    if (screen !== "students") return;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    const checkStatus = async () => {
      const status = await checkHeartbeat(deviceToken);

      if (status === "force_logout") {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        clearSession();
        setStudents([]);
        setSelectedStudent(null);
        setDeviceToken("");
        setDeviceName("");
        setIsOfflineMode(false);
        setScreen("welcome");
      }
    };

    checkStatus();
    heartbeatTimerRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [deviceToken, screen]);

  // ══════════════════════════════════════════════════════════
  //  🔥 LOAD STUDENTS + RESTORE PROGRESS (FULLY OFFLINE-CAPABLE)
  // ══════════════════════════════════════════════════════════
  const loadStudentsFromToken = useCallback(
    async (token: string) => {
      const normalizedToken = token.trim().toUpperCase();
      lastTokenRef.current = normalizedToken;

      console.log("🔵 [load] ══════════════════════════════════════");
      console.log("🔵 [load] Token:", normalizedToken);
      console.log("🔵 [load] Online:", !isOffline());

      setLoadingStudents(true);
      setStudentsError("");
      setRestoreError("");
      setIsOfflineMode(false);
      setDeviceToken(normalizedToken);

      // ═══════════════════════════════════════════════════════
      //  STEP 1: CACHE FIRST (guaranteed offline capability)
      // ═══════════════════════════════════════════════════════
      let cachedStudents: Student[] = [];
      try {
        cachedStudents = await getCachedStudentsByToken(normalizedToken);
        console.log(
          `🔵 [load] Cache: ${cachedStudents.length} students found`,
        );
      } catch (cacheErr) {
        console.warn("⚠️ [load] Cache read failed:", cacheErr);
      }

      // ✅ CACHE HIT — show students immediately
      if (cachedStudents.length > 0) {
        console.log("✅ [load] CACHE HIT — showing from cache");

        // Restore device name from cache
        try {
          const cachedDevice = await getCachedDeviceByToken(normalizedToken);
          if (cachedDevice) {
            setDeviceName(cachedDevice.deviceName || "Device");
          }
        } catch {}

        setStudents(cachedStudents);
        setCurrentPage(0);
        setScreen("students");
        setLoadingStudents(false);
        setIsOfflineMode(isOffline());

        // Background: refresh + restore progress if online
        if (!isOffline()) {
          (async () => {
            try {
              // Refresh students from Supabase (updates cache)
              const fresh = await getStudentsByToken(normalizedToken);
              if (fresh.ok && fresh.students && fresh.students.length > 0) {
                setStudents(fresh.students);
              }

              // Restore progress
              const restoreResult = await restoreAllStudentsFromSupabase(
                normalizedToken,
              );
              if (restoreResult.ok) {
                setIsOfflineMode(false);
              } else {
                console.warn("⚠️ Background restore failed");
                setIsOfflineMode(true);
              }
            } catch (err) {
              console.warn("⚠️ [load] Background refresh error:", err);
            }
          })();
        }

        return;
      }

      // ═══════════════════════════════════════════════════════
      //  STEP 2: NO CACHE — Must have network
      // ═══════════════════════════════════════════════════════
      console.log("🔵 [load] No cache — checking network");

      if (isOffline()) {
        console.warn("📴 [load] Offline AND no cache");
        setLoadingStudents(false);
        setStudentsError(
          "You're offline and no data is cached for this token yet. Please connect to internet once.",
        );
        setScreen("welcome");
        return;
      }

      // Online — fetch from Supabase
      setScreen("restoring");
      setRestoreProgress(0);
      setLoadingStudents(false);

      // Fake progress animation
      let fakeProgress = 0;
      const progressInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 12, 85);
        setRestoreProgress(Math.round(fakeProgress));
      }, 150);

      let fetchResult;
      try {
        fetchResult = await getStudentsByToken(normalizedToken);
      } catch (err) {
        clearInterval(progressInterval);
        setRestoreProgress(0);
        setLoadingStudents(false);
        setStudentsError("Network error. Please try again.");
        setScreen("welcome");
        return;
      }

      if (!fetchResult.ok || !fetchResult.students) {
        clearInterval(progressInterval);
        setRestoreProgress(0);
        setLoadingStudents(false);

        // Only clear token if truly invalid
        if (fetchResult.error === "invalid_token") {
          clearToken();
          setStudentsError("This QR code is not registered.");
        } else if (fetchResult.error === "offline_no_cache") {
          setStudentsError(
            "You're offline and no data is cached yet. Please connect once.",
          );
        } else {
          setStudentsError(getErrorMessage(fetchResult.error));
        }
        setScreen("welcome");
        return;
      }

      const studentsToShow: Student[] = fetchResult.students;

      // ═══════════════════════════════════════════════════════
      //  STEP 3: Restore progress
      // ═══════════════════════════════════════════════════════
      let restoreResult;
      try {
        restoreResult = await restoreAllStudentsFromSupabase(normalizedToken);
      } catch (restoreErr) {
        console.error("🔴 [load] Restore exception:", restoreErr);
        restoreResult = {
          ok: false,
          studentsRestored: 0,
          recordsRestored: 0,
          error: "Restore failed",
        };
      }

      clearInterval(progressInterval);
      setRestoreProgress(100);

      // ═══════════════════════════════════════════════════════
      //  STEP 4: Verify cache was actually written
      //  (🔥 NEW: ensures offline works next time)
      // ═══════════════════════════════════════════════════════
      try {
        const verifyStudents = await getCachedStudentsByToken(normalizedToken);
        if (verifyStudents.length !== studentsToShow.length) {
          console.warn("⚠️ [load] Cache mismatch — forcing re-write");
          await cacheStudents(studentsToShow);
        }

        const verifyDevice = await getCachedDeviceByToken(normalizedToken);
        if (!verifyDevice) {
          console.warn("⚠️ [load] Device not cached — forcing write");
          await cacheDevices([
            {
              token: normalizedToken,
              deviceName: "Device",
              isLoggedIn: false,
              lastLogin: "",
            },
          ]);
        }

        console.log("✅ [load] Cache verified");
      } catch (verifyErr) {
        console.warn("⚠️ [load] Cache verify failed:", verifyErr);
      }

      // ═══════════════════════════════════════════════════════
      //  STEP 5: Handle restore failure
      // ═══════════════════════════════════════════════════════
      if (!restoreResult.ok) {
        console.warn("⚠️ [load] Restore failed, showing students anyway");
        setIsOfflineMode(true);

        setTimeout(() => {
          setStudents(studentsToShow);
          setCurrentPage(0);
          setScreen("students");
          setRestoreProgress(0);
        }, 400);
        return;
      }

      // ═══════════════════════════════════════════════════════
      //  STEP 6: Show students
      // ═══════════════════════════════════════════════════════
      setTimeout(() => {
        setStudents(studentsToShow);
        setCurrentPage(0);
        setScreen("students");
        setRestoreProgress(0);
        setIsOfflineMode(false);
      }, 400);
    },
    [],
  );

  // ─── Retry Handler ────────────────────────────────────────
  const handleRetry = useCallback(() => {
    const token = lastTokenRef.current;
    if (token) {
      setStudentsError("");
      setRestoreError("");
      setScreen("loading");
      loadStudentsFromToken(token);
    } else {
      setScreen("welcome");
    }
  }, [loadStudentsFromToken]);

  // ─── QR Scan Success ──────────────────────────────────────
  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      setScanError("");
      setScreen("loading");

      let token = decodedText.trim();
      let name = "";

      try {
        const parsed = JSON.parse(decodedText);
        if (parsed && typeof parsed === "object" && parsed.token) {
          token = String(parsed.token).trim();
          name = String(parsed.deviceName || "").trim();
        }
      } catch {}

      token = token.toUpperCase();

      if (!token) {
        setScanError("Invalid QR code. Please try again.");
        setScreen("welcome");
        return;
      }

      console.log("🔵 [scan] Token:", token);
      console.log("🔵 [scan] Online:", !isOffline());

      // Validate token (cache-first)
      const validation = await validateToken(token);

      if (!validation.ok) {
        // Validation failed — check cache directly
        try {
          const cachedStudents = await getCachedStudentsByToken(token);
          if (cachedStudents.length > 0) {
            console.log("✅ [scan] Cache has students — proceeding offline");
            saveToken(token);
            setDeviceName(validation.deviceName || "Device");
            await loadStudentsFromToken(token);
            return;
          }
        } catch (cacheErr) {
          console.warn("⚠️ [scan] Cache check failed:", cacheErr);
        }

        // Distinguish errors for better UX
        if (validation.error === "offline_no_cache") {
          setScanError(
            "You're offline. Please connect to internet once to set up this device.",
          );
        } else if (validation.error === "network_error") {
          setScanError(
            "Network error. Please check your internet connection and try again.",
          );
        } else {
          setScanError(validation.error || "Could not verify token.");
        }
        setScreen("welcome");
        return;
      }

      if (!validation.valid) {
        setScanError(
          validation.error === "invalid_token"
            ? "This QR code is not registered. Please ask your teacher for a new one."
            : validation.error || "Invalid QR code",
        );
        setScreen("welcome");
        return;
      }

      saveToken(token);
      setDeviceName(name || validation.deviceName || "Device");
      await loadStudentsFromToken(token);
    },
    [loadStudentsFromToken],
  );

  // ─── Manual Token Submit ──────────────────────────────────
  const handleManualSubmit = useCallback(async () => {
    const token = manualInput.trim().toUpperCase();

    if (!token) {
      setManualError("Please enter a token");
      return;
    }

    setIsCheckingToken(true);
    setManualError("");

    console.log("🔵 [manual] Token:", token);
    console.log("🔵 [manual] Online:", !isOffline());

    const validation = await validateToken(token);

    if (!validation.ok) {
      // Check cache
      try {
        const cachedStudents = await getCachedStudentsByToken(token);
        if (cachedStudents.length > 0) {
          console.log("✅ [manual] Cache has students — proceeding");
          saveToken(token);
          setDeviceName(validation.deviceName || "Device");
          setScreen("loading");
          await loadStudentsFromToken(token);
          setIsCheckingToken(false);
          return;
        }
      } catch (cacheErr) {
        console.warn("⚠️ [manual] Cache check failed:", cacheErr);
      }

      if (validation.error === "offline_no_cache") {
        setManualError(
          "You're offline. Please connect to internet once to set up this device.",
        );
      } else if (validation.error === "network_error") {
        setManualError(
          "Network error. Please check your internet connection and try again.",
        );
      } else {
        setManualError(validation.error || "Could not verify token.");
      }
      setIsCheckingToken(false);
      return;
    }

    if (!validation.valid) {
      setManualError(
        validation.error === "invalid_token"
          ? "This token is not registered. Please check and try again."
          : validation.error || "Invalid token",
      );
      setIsCheckingToken(false);
      return;
    }

    saveToken(token);
    setDeviceName(validation.deviceName || "Device");
    setScreen("loading");
    await loadStudentsFromToken(token);
    setIsCheckingToken(false);
  }, [manualInput, loadStudentsFromToken]);

  // ─── Slider ───────────────────────────────────────────────
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  // ─── Card Tap ─────────────────────────────────────────────
  const handleCardTap = (student: Student) => {
    setSelectedStudent(student);
    setLoginError("");
  };

  // ─── Login ────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!selectedStudent) return;
    setIsLoggingIn(true);
    setLoginError("");

    const result = await loginStudent(selectedStudent.studentId);

    if (result.ok && result.student) {
      navigate({ to: "/dashboard" });
    } else {
      setLoginError(getErrorMessage(result.error));
      setIsLoggingIn(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  //  RESTORING SCREEN
  // ══════════════════════════════════════════════════════════
  if (screen === "restoring") {
    return (
      <main className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden">
        <style>{LOGIN_CSS}</style>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #dcfce7 0%, #bbf7d0 35%, #86efac 70%, #4ade80 100%)",
          }}
        />

        <div className="popup-in relative z-10 w-full max-w-md px-4">
          <div
            className="clay relative overflow-hidden rounded-[2.5rem] border-[6px] border-white"
            style={{
              background:
                "linear-gradient(180deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
              ["--clay-shadow" as string]: "oklch(0.5 0.18 145 / 0.55)",
            }}
          >
            <div
              className="h-2 w-full"
              style={{
                background: "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
              }}
            />

            <div className="relative p-7 pt-6 text-center">
              <div className="flex justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-40 blur-xl" />
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white shadow-xl"
                    style={{
                      background: "linear-gradient(145deg, #4ade80, #16a34a)",
                    }}
                  >
                    <Loader2
                      className="h-10 w-10 text-white animate-spin"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
              </div>

              <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                {restoreError ? "Restore Failed" : "Loading Your Progress"}
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-600">
                {restoreError
                  ? restoreError
                  : "Syncing all students' progress from cloud..."}
              </p>

              {!restoreError && (
                <div className="mt-6 w-full">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-green-700">
                    <span>Progress</span>
                    <span>{restoreProgress}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border-2 border-white bg-green-100 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${restoreProgress}%`,
                        background:
                          "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
                        boxShadow: "0 0 12px rgba(34, 197, 94, 0.5)",
                      }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-green-600/80">
                    Please wait — Do not close the app
                  </p>
                </div>
              )}

              {restoreError && (
                <div className="mt-5 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Restore failed</span>
                  </div>

                  <button
                    onClick={handleRetry}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-white px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                      boxShadow:
                        "0 6px 0 0 #14532d, 0 10px 20px -6px rgba(20, 83, 45, 0.5)",
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  LOADING
  // ══════════════════════════════════════════════════════════
  if (screen === "loading") {
    return (
      <main className="sky-bg relative flex h-[100dvh] w-screen items-center justify-center">
        <style>{LOGIN_CSS}</style>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />
          <p className="text-sm font-bold text-slate-600">Loading...</p>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  SCANNING
  // ══════════════════════════════════════════════════════════
  if (screen === "scanning") {
    return (
      <QRScanner
        onScanSuccess={handleScanSuccess}
        onClose={() => setScreen("welcome")}
        onError={(err) => console.warn("Scanner error:", err)}
      />
    );
  }

  // ══════════════════════════════════════════════════════════
  //  MANUAL TOKEN INPUT
  // ══════════════════════════════════════════════════════════
  if (screen === "manual") {
    return (
      <main className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden">
        <style>{LOGIN_CSS}</style>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #dcfce7 0%, #bbf7d0 35%, #86efac 70%, #4ade80 100%)",
          }}
        />

        <div className="popup-in relative z-10 w-full max-w-md px-4">
          <div
            className="clay relative overflow-hidden rounded-[2.5rem] border-[6px] border-white"
            style={{
              background:
                "linear-gradient(180deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
              ["--clay-shadow" as string]: "oklch(0.5 0.18 145 / 0.55)",
            }}
          >
            <div
              className="h-2 w-full"
              style={{
                background: "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
              }}
            />

            <div className="relative p-7 pt-6">
              <div className="flex justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <div
                    className="popup-ring absolute inset-0 rounded-full"
                    style={{ border: "3px solid #4ade80" }}
                  />
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white shadow-xl"
                    style={{
                      background: "linear-gradient(145deg, #22c55e, #16a34a)",
                    }}
                  >
                    <Keyboard className="h-9 w-9 text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Enter Token
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Type your device token to continue
                </p>
              </div>

              <div className="mt-6">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Device Token
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                    <ShieldCheck
                      className="h-5 w-5 text-green-500"
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value.toUpperCase());
                      setManualError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isCheckingToken) {
                        e.preventDefault();
                        handleManualSubmit();
                      }
                    }}
                    placeholder="TT-ABCD-1234"
                    disabled={isCheckingToken}
                    autoFocus
                    className="no-focus-ring w-full rounded-2xl border-[3px] border-green-200 bg-white py-4 pl-12 pr-4 font-mono text-lg font-extrabold uppercase tracking-wider text-slate-900 placeholder:text-green-200 placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal disabled:opacity-60"
                  />
                </div>

                {manualError && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={isCheckingToken || !manualInput.trim()}
                className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-4 border-white px-6 py-4 text-base font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow:
                    "0 8px 0 0 #14532d, 0 12px 24px -8px rgba(20, 83, 45, 0.6)",
                }}
              >
                {isCheckingToken ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={3} />
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setManualInput("");
                  setManualError("");
                  setScreen("welcome");
                }}
                className="no-focus-ring mt-3 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  WELCOME SCREEN
  // ══════════════════════════════════════════════════════════
  if (screen === "welcome") {
    return (
      <main className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden">
        <style>{LOGIN_CSS}</style>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #dcfce7 0%, #bbf7d0 30%, #86efac 60%, #4ade80 100%)",
          }}
        />

        <div className="popup-in relative z-10 w-full max-w-md px-4">
          <div
            className="clay relative overflow-hidden rounded-[2.5rem] border-[6px] border-white"
            style={{
              background:
                "linear-gradient(180deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
              ["--clay-shadow" as string]: "oklch(0.5 0.18 145 / 0.55)",
            }}
          >
            <div
              className="h-2 w-full"
              style={{
                background: "linear-gradient(90deg, #4ade80, #22c55e, #16a34a)",
              }}
            />

            <div className="relative p-7 pt-6">
              <div className="flex justify-center">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <div
                    className="popup-ring absolute inset-0 rounded-full"
                    style={{ border: "3px solid #4ade80" }}
                  />
                  <div
                    className="popup-ring-2 absolute inset-2 rounded-full"
                    style={{ border: "3px solid #22c55e" }}
                  />

                  <div
                    className="relative flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white shadow-xl"
                    style={{
                      background: "linear-gradient(145deg, #4ade80, #16a34a)",
                    }}
                  >
                    <QrCode className="h-12 w-12 text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Scan QR code or enter token to login
                </p>
              </div>

              {scanError && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              <button
                onClick={() => {
                  setScanError("");
                  setScreen("scanning");
                }}
                className="group relative mt-5 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-4 border-white px-6 py-4 text-base font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow:
                    "0 8px 0 0 #14532d, 0 12px 24px -8px rgba(20, 83, 45, 0.6)",
                }}
              >
                <Camera className="h-5 w-5" strokeWidth={2.5} />
                <span>Scan QR Code</span>
              </button>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                onClick={() => setScreen("manual")}
                className="group relative mt-4 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-4 border-white px-6 py-4 text-base font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow:
                    "0 8px 0 0 #14532d, 0 12px 24px -8px rgba(20, 83, 45, 0.6)",
                }}
              >
                <Keyboard className="h-5 w-5" strokeWidth={2.5} />
                <span>Enter Token</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  STUDENTS SCREEN
  // ══════════════════════════════════════════════════════════
  return (
    <main className="students-screen relative h-[100dvh] w-screen overflow-hidden">
      <style>{LOGIN_CSS}</style>
      <style>{SLIDER_CSS}</style>
      <style>{STUDENTS_CSS}</style>

      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-40 blur-3xl float-slow"
          style={{
            background: "radial-gradient(circle, #4ade80, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl float-slow-reverse"
          style={{
            background: "radial-gradient(circle, #22c55e, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        <header className="shrink-0 px-3 pt-4 sm:px-5 sm:pt-5">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-3xl border-2 border-white/80 bg-white/60 px-4 py-3 shadow-lg shadow-green-500/10 backdrop-blur-md sm:gap-5 sm:px-6 sm:py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-50 blur-xl" />
                <img
                  src={taqseemLogo}
                  alt="Taqseem"
                  className="relative h-14 w-14 rounded-full object-contain drop-shadow-[0_4px_12px_rgba(34,197,94,0.4)] sm:h-16 sm:w-16"
                />
              </div>

              <TaglineSlider />
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 px-3 py-2 shadow-sm sm:gap-2.5 sm:px-4 sm:py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-md sm:h-9 sm:w-9">
                <ShieldCheck
                  className="h-4 w-4 text-white sm:h-[18px] sm:w-[18px]"
                  strokeWidth={3}
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-[8px] font-extrabold uppercase tracking-wider leading-none text-green-600/80 sm:text-[9px]">
                  Device ID
                </span>
                <span className="mt-0.5 truncate font-mono text-[11px] font-extrabold uppercase tracking-wider leading-none text-green-800 sm:text-xs">
                  {deviceToken || deviceName || "—"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-5 sm:pt-4">
          {loadingStudents && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-30" />
                <Loader2 className="relative h-14 w-14 animate-spin text-green-500" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                Loading students...
              </p>
            </div>
          )}

          {!loadingStudents && studentsError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
              <div className="clay max-w-md border-4 border-white bg-white p-8 text-center">
                <div className="mb-3 text-6xl">⚠️</div>
                <p className="text-base font-bold text-red-600">
                  {studentsError}
                </p>
                <button
                  onClick={handleRetry}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border-4 border-white px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                    boxShadow:
                      "0 6px 0 0 #14532d, 0 10px 20px -6px rgba(20, 83, 45, 0.5)",
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loadingStudents && !studentsError && students.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
              <div className="clay max-w-md border-4 border-white bg-white p-8 text-center">
                <div className="mb-3 text-6xl">👥</div>
                <p className="text-base font-bold text-slate-700">
                  No students found on this device
                </p>
              </div>
            </div>
          )}

          {!loadingStudents && !studentsError && students.length > 0 && (
            <div className="flex h-full w-full flex-col items-center justify-center">
              {isOfflineMode && (
                <div className="mb-4 w-full max-w-5xl px-2">
                  <div className="offline-banner-in flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400">
                      <AlertCircle
                        className="h-4 w-4 text-white"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                        Offline Mode
                      </p>
                      <p className="text-[11px] font-semibold text-amber-700">
                        Progress will sync when internet is available
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative flex w-full max-w-5xl items-center justify-center gap-3 sm:gap-5 px-2">
                {needsSlider && (
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`slider-nav-btn ${
                      currentPage === 0 ? "slider-nav-disabled" : ""
                    }`}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={3} />
                  </button>
                )}

                <div className="grid grid-cols-4 gap-3 sm:gap-4 flex-1">
                  {visibleStudents.map((student, idx) => (
                    <StudentCard
                      key={student.studentId}
                      student={student}
                      onClick={() => handleCardTap(student)}
                      delay={idx * 40}
                    />
                  ))}
                </div>

                {needsSlider && (
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={`slider-nav-btn ${
                      currentPage >= totalPages - 1 ? "slider-nav-disabled" : ""
                    }`}
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={3} />
                  </button>
                )}
              </div>

              {needsSlider && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`slider-dot ${
                        i === currentPage ? "slider-dot-active" : ""
                      }`}
                      aria-label={`Go to page ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <LoginPopup
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onLogin={handleLogin}
          isLoggingIn={isLoggingIn}
          error={loginError}
        />
      )}
    </main>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAGLINE SLIDER
// ══════════════════════════════════════════════════════════════

function TaglineSlider() {
  const words = ["Educate", "Empower", "Transform"];

  return (
    <div className="tagline-slider">
      <div className="tagline-cycle">
        {words.map((word, i) => (
          <span
            key={i}
            className="tagline-word"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {word}
            {i < words.length - 1 && <span className="tagline-dot">•</span>}
          </span>
        ))}
      </div>

      <div className="tagline-brand">Taqseem Taleem</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  STUDENT CARD
// ══════════════════════════════════════════════════════════════

function StudentCard({
  student,
  onClick,
  delay,
}: {
  student: Student;
  onClick: () => void;
  delay: number;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!student.photoUrl) return;
      const cached = await getCachedImage(student.photoUrl);
      if (cancelled) return;
      setImgSrc(cached || student.photoUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [student.photoUrl]);

  return (
    <button
      onClick={onClick}
      className="student-card group relative flex flex-col items-center overflow-hidden rounded-3xl p-3 text-center transition-all duration-300 hover:-translate-y-2 active:translate-y-0 active:scale-95 w-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white to-green-50/60 backdrop-blur-xl" />
      <div className="absolute inset-0 rounded-3xl border-[3px] border-white/90 transition-all duration-300 group-hover:border-green-400" />
      <div className="absolute left-0 right-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-green-400 via-green-500 to-green-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex w-full flex-col items-center">
        <div className="relative mb-3 aspect-square w-full max-w-[140px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-300 to-emerald-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-80" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 p-[3px] shadow-lg shadow-green-500/40">
            <div className="h-full w-full rounded-full bg-white p-[2px]">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={student.studentName}
                  className="h-full w-full rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-emerald-50">
                  <User className="h-12 w-12 text-green-500" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full truncate px-1 text-sm font-extrabold tracking-tight text-slate-800 sm:text-base">
          {student.studentName || "Student"}
        </div>

        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-green-700 ring-1 ring-green-200 sm:text-[10px]">
          <span className="h-1 w-1 rounded-full bg-green-500" />
          {student.studentId}
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
//  LOGIN POPUP
// ══════════════════════════════════════════════════════════════

function LoginPopup({
  student,
  onClose,
  onLogin,
  isLoggingIn,
  error,
}: {
  student: Student;
  onClose: () => void;
  onLogin: () => void;
  isLoggingIn: boolean;
  error: string | null;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!student.photoUrl) return;
      const cached = await getCachedImage(student.photoUrl);
      if (cancelled) return;
      setImgSrc(cached || student.photoUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [student.photoUrl]);

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
          disabled={isLoggingIn}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mt-2">
          <div className="mx-auto mb-3 h-24 w-24 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 p-[3px] shadow-lg shadow-green-500/30 sm:h-28 sm:w-28">
            <div className="h-full w-full overflow-hidden rounded-full border-4 border-white">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={student.studentName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-green-50">
                  <User className="h-12 w-12 text-green-400" strokeWidth={2} />
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
          {student.studentName}
        </h2>

        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-green-600">
          {student.studentId}
        </p>

        <div className="mt-3 space-y-1.5 rounded-xl border-2 border-green-100 bg-white p-3 text-left">
          {student.fatherName && (
            <DetailRow label="Father" value={student.fatherName} />
          )}
          {student.schoolName && (
            <DetailRow label="School" value={student.schoolName} />
          )}
          {student.grade && <DetailRow label="Grade" value={student.grade} />}
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={onLogin}
          disabled={isLoggingIn}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-white px-6 py-3 text-base font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70"
          style={{
            background:
              "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
            boxShadow:
              "0 6px 0 0 #14532d, 0 10px 20px -6px rgba(20, 83, 45, 0.5)",
          }}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              Login
            </>
          )}
        </button>
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

// ══════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════

const LOGIN_CSS = `
  @keyframes popup-in {
    from { opacity: 0; transform: scale(0.85) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes popup-overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes popup-ring-pulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.35); opacity: 0; }
  }

  @keyframes offline-banner-slide {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .popup-in { animation: popup-in 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .popup-overlay-in { animation: popup-overlay-in 0.2s ease-out both; }
  .popup-ring { animation: popup-ring-pulse 2s ease-out infinite; }
  .popup-ring-2 { animation: popup-ring-pulse 2s ease-out infinite 0.7s; }

  .offline-banner-in {
    animation: offline-banner-slide 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
`;

const SLIDER_CSS = `
  .slider-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 9999px;
    background: linear-gradient(145deg, #ffffff, #f0fdf4);
    border: 3px solid #ffffff;
    color: #22c55e;
    box-shadow:
      0 4px 0 0 rgba(34, 197, 94, 0.2),
      0 8px 24px -4px rgba(34, 197, 94, 0.3);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(.34, 1.4, .64, 1);
  }

  .slider-nav-btn:hover:not(.slider-nav-disabled) {
    transform: scale(1.12);
    color: #16a34a;
  }

  .slider-nav-btn:active:not(.slider-nav-disabled) {
    transform: scale(0.95);
  }

  .slider-nav-disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .slider-nav-btn {
      width: 40px;
      height: 40px;
    }
  }

  .slider-dot {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background: rgba(34, 197, 94, 0.25);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0;
  }

  .slider-dot:hover {
    background: rgba(34, 197, 94, 0.5);
    transform: scale(1.2);
  }

  .slider-dot-active {
    width: 32px;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    box-shadow: 0 3px 12px rgba(34, 197, 94, 0.5);
  }
`;

const STUDENTS_CSS = `
  .students-screen {
    background:
      radial-gradient(ellipse at 20% 0%, #dcfce7 0%, transparent 55%),
      radial-gradient(ellipse at 80% 100%, #bbf7d0 0%, transparent 55%),
      radial-gradient(ellipse at 50% 50%, #f0fdf4 0%, transparent 65%),
      linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  }

  .gradient-title-parrot {
    background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  .tagline-slider {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-width: 0;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 640px) {
    .tagline-slider {
      height: 40px;
    }
  }

  @media (min-width: 768px) {
    .tagline-slider {
      height: 48px;
    }
  }

  .tagline-cycle {
    position: absolute;
    inset: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    white-space: nowrap;
    animation: tagline-cycle-anim 12s ease-in-out infinite;
    will-change: opacity;
  }

  @media (min-width: 640px) {
    .tagline-cycle {
      gap: 0.75rem;
    }
  }

  @media (min-width: 768px) {
    .tagline-cycle {
      gap: 1rem;
    }
  }

  .tagline-word {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-display, system-ui);
    font-weight: 800;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    white-space: nowrap;
    opacity: 0;
    animation: tagline-word-anim 12s ease-out infinite;
    will-change: opacity;
  }

  @media (min-width: 640px) {
    .tagline-word {
      font-size: 1.5rem;
      gap: 0.75rem;
    }
  }

  @media (min-width: 768px) {
    .tagline-word {
      font-size: 1.875rem;
      gap: 1rem;
    }
  }

  .tagline-dot {
    color: #4ade80;
    -webkit-text-fill-color: #4ade80;
    font-size: 0.7em;
    opacity: 0.7;
  }

  @keyframes tagline-word-anim {
    0%   { opacity: 0; }
    6%   { opacity: 1; }
    40%  { opacity: 1; }
    46%  { opacity: 0; }
    100% { opacity: 0; }
  }

  @keyframes tagline-cycle-anim {
    0%   { opacity: 1; }
    40%  { opacity: 1; }
    46%  { opacity: 0; }
    100% { opacity: 0; }
  }

  .tagline-brand {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display, system-ui);
    font-weight: 800;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    white-space: nowrap;
    opacity: 0;
    animation: tagline-brand-anim 12s ease-in-out infinite;
    will-change: opacity;
  }

  @media (min-width: 640px) {
    .tagline-brand {
      font-size: 1.5rem;
    }
  }

  @media (min-width: 768px) {
    .tagline-brand {
      font-size: 1.875rem;
    }
  }

  @keyframes tagline-brand-anim {
    0%   { opacity: 0; }
    50%  { opacity: 0; }
    58%  { opacity: 1; }
    82%  { opacity: 1; }
    90%  { opacity: 0; }
    100% { opacity: 0; }
  }

  .student-card {
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 4px 8px -2px rgba(15, 23, 42, 0.06),
      0 12px 32px -8px rgba(34, 197, 94, 0.25);
    animation: student-card-pop 0.5s cubic-bezier(.34, 1.4, .64, 1) both;
  }

  .student-card:hover {
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.06),
      0 8px 16px -4px rgba(15, 23, 42, 0.08),
      0 24px 48px -12px rgba(34, 197, 94, 0.45);
  }

  @keyframes student-card-pop {
    0%   { opacity: 0; transform: scale(0.85) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.03) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes float-slow {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(20px, -30px) scale(1.1); }
  }

  @keyframes float-slow-reverse {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-20px, 30px) scale(1.1); }
  }

  .float-slow {
    animation: float-slow 12s ease-in-out infinite;
  }

  .float-slow-reverse {
    animation: float-slow-reverse 14s ease-in-out infinite;
  }
`;

export default LoginPage;
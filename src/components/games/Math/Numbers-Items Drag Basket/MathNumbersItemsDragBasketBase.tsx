// src/components/games/Math/Numbers-Items Drag Basket/MathNumbersItemsDragBasketBase.tsx
// 🫙 Jar = main source, items hamesha andar
// 🔥 NO assistant phase — game starts immediately
// 🔥 AUDIO: intro.wav (once at start) + correct.wav (on correct drop/check) + wrong.wav (on wrong check)
// 🎯 CHECK BUTTON: right side of jar — ALWAYS VISIBLE
//   ✅ Correct (jar full / jar empty for 0) → correct audio + celebration → next group
//   ❌ Wrong  (items mismatch)              → wrong audio + items wapas → dobara try
// 🔢 NUMBER 0 SPECIAL: empty jar + check = correct
// 📊 PER-GROUP wrong attempts tracked (pencils / bags / cars)
//
// 📝 Summary formats:
//   First try: "Ahmed successfully dragged all pencils, bags, and cars into the jar for the number '3' on the very first attempt."
//   Wrong:     "Ahmed made 2 wrong attempts in pencils, 0 in bags, and 1 in cars before successfully dragging all pencils, bags, and cars into the jar for the number '3'."

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";

import {
  ITEM_COMPONENTS,
  ITEM_PLURALS,
  type ItemType,
} from "./itemSvgs";
import { BasketBackSVG, BasketFrontSVG } from "./JarSVG";

// 🔥 CELEBRATION SVG
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 AUDIO IMPORTS
const IntroAudio = "/assets/Math Assets/Items Drag Basket/intro.wav";
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

function getNumberColor(subject: string = "math"): string {
  const colors: Record<string, string> = {
    math: "#2E8B57",
    english: "#4D82F6",
    urdu: "#CC6B2C",
  };
  return colors[subject] || "#2E8B57";
}

const GROUP_ORDER: ItemType[] = ["pencil", "bag", "car"];
const TOTAL_SLOTS = 10;

const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

const ANIMATION_CSS = `
  @keyframes db-items-fade-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes db-item-pop {
    0% { opacity: 0; transform: scale(0.3) translateY(15px); }
    60% { opacity: 1; transform: scale(1.08) translateY(-3px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes db-item-drop-in {
    0% { opacity: 0; transform: scale(0.4); }
    55% { opacity: 1; transform: scale(1.05); }
    75% { transform: scale(0.98); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes db-group-fade-out { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.9); } }
  @keyframes db-group-fade-in { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes db-wrong-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-8px); }
    80% { transform: translateX(8px); }
  }
  @keyframes db-jar-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
  @keyframes db-badge-pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes db-number-pop { 0% { transform: scale(1); } 35% { transform: scale(1.15); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }
  @keyframes db-check-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes db-check-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55), 0 0 0 0 rgba(34, 197, 94, 0.3); }
    50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0), 0 0 0 20px rgba(34, 197, 94, 0); }
  }
  @keyframes db-wrong-fade-out {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.7); }
  }

  /* 🔥 CELEBRATION ANIMATIONS */
  @keyframes db-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes db-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }

  .db-items-fade-in { animation: db-items-fade-in 0.5s ease-out both; }
  .db-item-pop { animation: db-item-pop 0.45s cubic-bezier(.34,1.4,.64,1) both; }
  .db-item-drop-in { animation: db-item-drop-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .db-group-fade-out { animation: db-group-fade-out 0.35s ease-in both; }
  .db-group-fade-in { animation: db-group-fade-in 0.4s ease-out both; }
  .db-wrong-shake { animation: db-wrong-shake 0.5s ease-in-out both; }
  .db-jar-pulse { animation: db-jar-pulse 1.2s ease-in-out infinite; }
  .db-badge-pop { animation: db-badge-pop 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .db-number-pop { animation: db-number-pop 0.4s ease-out both; }
  .db-check-pop { animation: db-check-pop 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .db-check-pulse { animation: db-check-pulse 1.4s ease-out infinite; }
  .db-wrong-fade-out { animation: db-wrong-fade-out 0.4s ease-in both; }

  .db-celebration-pop { 
    animation: db-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .db-celebration-fade-out {
    animation: db-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }

  .db-floating-item { will-change: transform; transform-origin: center; pointer-events: none; }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — Per-group wrong attempts
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  numberChar: string,
  qty: number,
  completed: boolean,
  wrongByGroup: Record<ItemType, number>,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  // 🔥 Zero
  if (numberChar === "0" || qty === 0) {
    const totalWrong =
      wrongByGroup.pencil + wrongByGroup.bag + wrongByGroup.car;

    if (totalWrong === 0) {
      return `${studentName} successfully kept the jar empty for the number '0' on the very first attempt.`;
    }
    return `${studentName} made ${totalWrong} wrong ${totalWrong === 1 ? "attempt" : "attempts"} before successfully keeping the jar empty for the number '0'.`;
  }

  const pencilWrong = wrongByGroup.pencil;
  const bagWrong = wrongByGroup.bag;
  const carWrong = wrongByGroup.car;
  const totalWrong = pencilWrong + bagWrong + carWrong;

  const allItemsDragged =
    "successfully dragged all pencils, bags, and cars into the jar";

  // 🔥 No wrong attempts
  if (totalWrong === 0) {
    return `${studentName} ${allItemsDragged} for the number '${numberChar}' on the very first attempt.`;
  }

  // 🔥 Wrong attempts — per group
  const wrongPhrase = `${pencilWrong} wrong ${pencilWrong === 1 ? "attempt" : "attempts"} in pencils, ${bagWrong} in bags, and ${carWrong} in cars`;

  return `${studentName} made ${wrongPhrase} before ${allItemsDragged} for the number '${numberChar}'.`;
}

interface Props {
  number: string;
  numberName?: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
  onNext?: () => void;
}

interface DraggedItem {
  id: string;
  type: ItemType;
}

export function MathNumbersItemsDragBasketBase({
  number,
  numberName,
  subject = "math",
  level,
  lessonId,
  onComplete,
  onNext,
}: Props) {
  const navigate = useNavigate();

  const numberChar = number;
  const numberColor = getNumberColor(subject);
  const qty = parseInt(numberChar, 10) || 0;
  const isZero = numberChar === "0" || qty === 0;

  type Phase = "game" | "finished";
  const [phase, setPhase] = useState<Phase>("game");

  const [groupIndex, setGroupIndex] = useState(0);
  const [groupStage, setGroupStage] = useState<"entering" | "idle" | "exiting">("entering");
  const [itemsInBasket, setItemsInBasket] = useState<DraggedItem[]>([]);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [usedSlotIndices, setUsedSlotIndices] = useState<Set<number>>(new Set());

  const [isDragging, setIsDragging] = useState(false);
  const [dragItemType, setDragItemType] = useState<ItemType | null>(null);
  const [isBasketHovered, setIsBasketHovered] = useState(false);

  // 🔥 CHECK BUTTON STATE
  const [isCheckActive, setIsCheckActive] = useState(false);
  const [isCheckLocked, setIsCheckLocked] = useState(false);

  // 🔥 WRONG STATE
  const [isWrongState, setIsWrongState] = useState(false);

  // 🔥 CELEBRATION STATE
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  const dragSourceIndexRef = useRef<number | null>(null);
  const dragItemTypeRef = useRef<ItemType | null>(null);
  const floatingItemRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  const basketRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 🔥 AUDIO REFS
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);
  const correctAudioRefs = useRef<HTMLAudioElement[]>([]);
  const wrongAudioRefs = useRef<HTMLAudioElement[]>([]);

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isNavigatingRef = useRef(false);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  // 🔥 PER-GROUP WRONG ATTEMPTS
  const wrongByGroupRef = useRef<Record<ItemType, number>>({
    pencil: 0,
    bag: 0,
    car: 0,
  });

  const currentGroupType = GROUP_ORDER[groupIndex] || "pencil";
  const currentGroupPlural = ITEM_PLURALS[currentGroupType];
  const ItemComponent = ITEM_COMPONENTS[currentGroupType];
  const totalGroups = GROUP_ORDER.length;
  const isLastGroup = groupIndex === totalGroups - 1;

  const goToLevelPopupRef = useRef<() => void>(() => {});

  // ═══════════════════════════════════════════════════════════
  //  🔥 INTRO AUDIO
  // ═══════════════════════════════════════════════════════════

  const stopIntroAudio = useCallback(() => {
    if (!introAudioRef.current) return;
    try {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
      introAudioRef.current.onended = null;
      introAudioRef.current.onerror = null;
    } catch {}
    introAudioRef.current = null;
  }, []);

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;

    try {
      const audio = new Audio(IntroAudio);
      introAudioRef.current = audio;

      const finish = () => {
        introAudioRef.current = null;
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => {
        introAudioRef.current = null;
      });
    } catch {
      introAudioRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 CORRECT AUDIO
  // ═══════════════════════════════════════════════════════════

  const stopCorrectAudio = useCallback(() => {
    correctAudioRefs.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onerror = null;
      } catch {}
    });
    correctAudioRefs.current = [];
  }, []);

  const playCorrectAudio = useCallback(() => {
    stopCorrectAudio();

    const srcs = [correctMP3, correctWAV];
    let completedCount = 0;
    const totalFiles = srcs.length;

    srcs.forEach((src) => {
      try {
        const audio = new Audio(src);
        correctAudioRefs.current.push(audio);

        const done = () => {
          completedCount++;
          if (completedCount >= totalFiles) {
            correctAudioRefs.current = [];
          }
        };

        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      } catch {
        completedCount++;
      }
    });
  }, [stopCorrectAudio]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 WRONG AUDIO
  // ═══════════════════════════════════════════════════════════

  const stopWrongAudio = useCallback(() => {
    wrongAudioRefs.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onerror = null;
      } catch {}
    });
    wrongAudioRefs.current = [];
  }, []);

  const playWrongAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      stopWrongAudio();

      const srcs = [wrongMP3, wrongWAV];
      let completedCount = 0;
      const totalFiles = srcs.length;
      let isResolved = false;

      srcs.forEach((src) => {
        try {
          const audio = new Audio(src);
          wrongAudioRefs.current.push(audio);

          const done = () => {
            completedCount++;
            if (completedCount >= totalFiles && !isResolved) {
              isResolved = true;
              wrongAudioRefs.current = [];
              resolve();
            }
          };

          audio.onended = done;
          audio.onerror = done;
          audio.play().catch(done);
        } catch {
          completedCount++;
          if (completedCount >= totalFiles && !isResolved) {
            isResolved = true;
            wrongAudioRefs.current = [];
            resolve();
          }
        }
      });
    });
  }, [stopWrongAudio]);

  const clearAllTimers = useCallback(() => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    stageTimerRef.current = null;
    celebrationTimerRef.current = null;
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 MOUNT
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    introPlayedRef.current = false;
    wrongByGroupRef.current = { pencil: 0, bag: 0, car: 0 };

    // 🔥 PLAY INTRO AUDIO IMMEDIATELY (fire-and-forget)
    playIntroAudio();

    setPhase("game");
    setGroupIndex(0);
    setGroupStage("entering");
    setUsedSlotIndices(new Set());

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      stopIntroAudio();
      stopCorrectAudio();
      stopWrongAudio();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;
            const studentName = session.student.studentName || "Student";
            const summary = buildSummary(
              studentName,
              numberChar,
              qty,
              false,
              wrongByGroupRef.current,
            );

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject,
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                number: numberChar,
                numberName: numberName || "",
                qty,
                wrongByGroup: { ...wrongByGroupRef.current },
                completed: false,
              },
            }).catch((err) => console.warn("[DragJar] Save partial failed:", err));
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── GROUP ENTERING → IDLE ─────────────────────────────────
  useEffect(() => {
    if (phase === "game" && groupStage === "entering") {
      const t = setTimeout(() => {
        if (isMountedRef.current) {
          setGroupStage("idle");
        }
      }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, groupIndex]);

  // ─── CHECK BUTTON ACTIVE ───
  useEffect(() => {
    const canCheck =
      groupStage === "idle" &&
      phase === "game" &&
      !isWrongState &&
      !isCheckLocked;
    setIsCheckActive(canCheck);
  }, [groupStage, phase, isWrongState, isCheckLocked]);

  const isOverBasket = useCallback((clientX: number, clientY: number): boolean => {
    const el = basketRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const padding = 20;
    return (
      clientX >= r.left - padding &&
      clientX <= r.right + padding &&
      clientY >= r.top - padding &&
      clientY <= r.bottom + padding
    );
  }, []);

  const scheduleFloatingUpdate = useCallback((x: number, y: number) => {
    pendingPosRef.current = { x, y };
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pos = pendingPosRef.current;
      const el = floatingItemRef.current;
      if (pos && el) {
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(1.1) rotate(-5deg)`;
      }
    });
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent, itemType: ItemType, sourceIndex: number) => {
      if (phase !== "game") return;
      if (groupStage !== "idle") return;
      if (isDragging) return;
      if (isWrongState) return;
      if (isCheckLocked) return;
      if (itemType !== currentGroupType) return;
      if (usedSlotIndices.has(sourceIndex)) return;
      if (itemsInBasket.length >= qty) return;

      e.preventDefault();
      e.stopPropagation();

      dragSourceIndexRef.current = sourceIndex;
      dragItemTypeRef.current = itemType;

      const el = floatingItemRef.current;
      if (el) {
        el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(1.1) rotate(-5deg)`;
      }

      setIsDragging(true);
      setDragItemType(itemType);
      setIsBasketHovered(false);
    },
    [phase, groupStage, isDragging, isWrongState, isCheckLocked, currentGroupType, usedSlotIndices, itemsInBasket.length, qty],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      scheduleFloatingUpdate(e.clientX, e.clientY);
      const hovered = isOverBasket(e.clientX, e.clientY);
      setIsBasketHovered((prev) => (prev === hovered ? prev : hovered));
    };

    const onEnd = (e: PointerEvent) => onMoveEnd(e);

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 SHOW CELEBRATION
  // ═══════════════════════════════════════════════════════════
  const triggerCelebration = useCallback(
    (onComplete?: () => void) => {
      setShowCelebration(true);
      setCelebrationPhase("pop");

      celebrationTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        setCelebrationPhase("fade");

        celebrationTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setShowCelebration(false);
          setCelebrationPhase("idle");
          onComplete?.();
        }, 500);
      }, 1200);
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════
  //  🔥 DRAG DROP HANDLER
  // ═══════════════════════════════════════════════════════════
  const onMoveEnd = useCallback(
    (e: PointerEvent) => {
      const sourceIndex = dragSourceIndexRef.current;
      const itemType = dragItemTypeRef.current;

      dragSourceIndexRef.current = null;
      dragItemTypeRef.current = null;
      setIsDragging(false);
      setDragItemType(null);
      setIsBasketHovered(false);

      if (sourceIndex === null || !itemType) return;

      const overBasket = isOverBasket(e.clientX, e.clientY);

      if (!overBasket) {
        return;
      }

      if (itemType !== currentGroupType) return;

      if (itemsInBasket.length >= qty) {
        return;
      }

      const newItem: DraggedItem = {
        id: `${itemType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: itemType,
      };

      const newBasket = [...itemsInBasket, newItem];
      setItemsInBasket(newBasket);

      setUsedSlotIndices((prev) => {
        const next = new Set(prev);
        next.add(sourceIndex);
        return next;
      });

      // 🔥 PLAY CORRECT AUDIO on each drop
      playCorrectAudio();
    },
    [
      isOverBasket,
      currentGroupType,
      itemsInBasket,
      qty,
      playCorrectAudio,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  //  🎯 CHECK BUTTON CLICK
  //  qty=0: correct = jar empty | qty>0: correct = jar full
  // ═══════════════════════════════════════════════════════════
  const handleCheckClick = useCallback(async () => {
    if (!isCheckActive) return;
    if (phase !== "game") return;
    if (isCheckLocked) return;

    setIsCheckLocked(true);

    const currentCount = itemsInBasket.length;

    const isCorrect = qty === 0
      ? currentCount === 0
      : currentCount === qty;

    if (isCorrect) {
      // ✅ CORRECT
      triggerCelebration(() => {
        if (!isMountedRef.current) return;

        if (isLastGroup) {
          finishGame();
        } else {
          setGroupStage("exiting");
          stageTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            setGroupIndex((prev) => prev + 1);
            setItemsInBasket([]);
            setUsedSlotIndices(new Set());
            setGroupStage("entering");
            setIsCheckLocked(false);
          }, 400);
        }
      });
    } else {
      // ❌ WRONG — count this attempt for the current group
      wrongByGroupRef.current[currentGroupType] += 1;
      setIsWrongState(true);

      await playWrongAudio();

      if (!isMountedRef.current) return;

      setItemsInBasket([]);
      setUsedSlotIndices(new Set());

      stageTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setIsWrongState(false);
        setIsCheckLocked(false);
      }, 300);
    }
  }, [
    isCheckActive,
    phase,
    isCheckLocked,
    itemsInBasket.length,
    qty,
    currentGroupType,
    triggerCelebration,
    isLastGroup,
    playWrongAudio,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 FINISH GAME
  // ═══════════════════════════════════════════════════════════
  const finishGame = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setPhase("finished");
    onComplete?.();

    if (!completedRef.current && !progressSavedRef.current) {
      completedRef.current = true;
      progressSavedRef.current = true;

      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const session = getSession();
      if (session?.student) {
        const studentName = session.student.studentName || "Student";
        const summary = buildSummary(
          studentName,
          numberChar,
          qty,
          true,
          wrongByGroupRef.current,
        );

        saveProgress({
          studentId: session.student.studentId,
          deviceToken: session.student.token,
          subject,
          level: level || 1,
          lessonId: lessonId || 1,
          status: "completed",
          timeSpentSec: elapsed,
          summary,
          gameData: {
            number: numberChar,
            numberName: numberName || "",
            qty,
            wrongByGroup: { ...wrongByGroupRef.current },
            completed: true,
          },
        }).catch((err) => console.warn("[DragJar] Save completed failed:", err));
      }
    }

    stageTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      goToLevelPopupRef.current();
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numberChar, numberName, qty, subject, level, lessonId, onComplete]);

  const goToLevelPopup = useCallback(() => {
    stopIntroAudio();
    stopCorrectAudio();
    stopWrongAudio();
    if (onNext) { onNext(); return; }
    if (subject !== undefined && level !== undefined) {
      navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
    }
  }, [navigate, subject, level, onNext, stopIntroAudio, stopCorrectAudio, stopWrongAudio]);

  useEffect(() => {
    goToLevelPopupRef.current = goToLevelPopup;
  }, [goToLevelPopup]);

  const numberSize = "min(26vh, 220px)";

  const isExiting = groupStage === "exiting";
  const isEntering = groupStage === "entering";
  const isFinished = phase === "finished";

  const leftSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
    index: i,
    type: currentGroupType,
    isUsed: usedSlotIndices.has(i),
    isDraggable:
      !usedSlotIndices.has(i) &&
      groupStage === "idle" &&
      !isFinished &&
      !isWrongState &&
      !isCheckLocked &&
      itemsInBasket.length < qty,
  }));

  const getJarGrid = (n: number): { cols: number; rows: number } => {
    if (n <= 1) return { cols: 1, rows: 1 };
    if (n <= 2) return { cols: 2, rows: 1 };
    if (n <= 3) return { cols: 3, rows: 1 };
    if (n <= 4) return { cols: 2, rows: 2 };
    if (n <= 6) return { cols: 3, rows: 2 };
    if (n <= 8) return { cols: 4, rows: 2 };
    if (n <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: 3 };
  };

  const jarGrid = getJarGrid(qty);
  const totalCells = jarGrid.cols * jarGrid.rows;
  const emptyCells = totalCells - itemsInBasket.length;

  const gridCells: (DraggedItem | null)[] = [
    ...Array(Math.max(0, emptyCells)).fill(null),
    ...itemsInBasket.slice(0, totalCells),
  ];

  const itemScale = (() => {
    if (qty <= 1) return 88;
    if (qty <= 2) return 86;
    if (qty <= 3) return 84;
    if (qty <= 4) return 82;
    if (qty <= 6) return 78;
    if (qty <= 8) return 74;
    if (qty <= 10) return 70;
    return 68;
  })();

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-transparent p-2 sm:p-3 overflow-hidden db-items-fade-in"
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* 🔥 CELEBRATION SVG OVERLAY */}
      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl z-50 pointer-events-none
            ${celebrationPhase === "pop" ? "db-celebration-pop" : ""}
            ${celebrationPhase === "fade" ? "db-celebration-fade-out" : ""}
          `}
        >
          <div className="h-[110%] w-[110%]">
            <img
              src={CelebrationSVG}
              alt="Celebration"
              className="h-full w-full object-contain"
              style={{ pointerEvents: "none" }}
            />
          </div>
        </div>
      )}

      <div className="h-full w-full flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6">

        {/* LEFT: 10 items */}
        <div className="flex-1 flex items-center justify-center h-full" style={{ overflow: "visible" }}>
          <div
            className={`
              w-full max-w-[70vh] aspect-square p-2
              ${isEntering ? "db-group-fade-in" : ""}
              ${isExiting ? "db-group-fade-out" : ""}
            `}
          >
            <div className="grid grid-cols-5 grid-rows-2 gap-2 w-full h-full" style={{ padding: "2%" }}>
              {leftSlots.map((slot) => {
                const isDraggable = slot.isDraggable;
                const isBeingDragged =
                  isDragging &&
                  dragSourceIndexRef.current === slot.index &&
                  dragItemType === currentGroupType;

                return (
                  <div
                    key={`slot-${groupIndex}-${slot.index}`}
                    className={`
                      flex items-center justify-center
                      ${isDraggable && !isBeingDragged ? "db-item-pop cursor-grab active:scale-95" : ""}
                      ${isBeingDragged ? "opacity-0" : ""}
                      ${slot.isUsed ? "opacity-0 pointer-events-none" : ""}
                    `}
                    style={{
                      width: "100%",
                      height: "100%",
                      aspectRatio: "1 / 1",
                      animationDelay: `${slot.index * 40}ms`,
                      touchAction: "none",
                      transition: "opacity 0.2s ease, transform 0.2s ease",
                    }}
                    onPointerDown={(e) => {
                      if (!isDraggable || isBeingDragged) return;
                      handleDragStart(e, currentGroupType, slot.index);
                    }}
                  >
                    {!slot.isUsed && <ItemComponent size="100%" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Number + Jar + CHECK BUTTON */}
        <div className="flex-1 flex flex-col items-center justify-center h-full gap-1 sm:gap-2" style={{ overflow: "visible" }}>

          {/* Number */}
          <div className={`db-number-pop ${isFinished ? "opacity-40" : ""}`}>
            <span
              style={{
                fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: numberSize,
                color: numberColor,
                textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                lineHeight: 1,
                display: "block",
                letterSpacing: "0.02em",
              }}
            >
              {numberChar}
            </span>
          </div>

          {/* 🫙 JAR + CHECK BUTTON ROW */}
          <div className="w-full flex flex-row items-center justify-center gap-2 sm:gap-3">

            {/* JAR */}
            <div
              ref={basketRef}
              className={`
                relative flex-1 max-w-[60vh] aspect-[400/320]
                ${isBasketHovered && isDragging ? "db-jar-pulse" : ""}
                ${wrongAttempt || isWrongState ? "db-wrong-shake" : ""}
              `}
              style={{
                transition: "transform 0.2s ease",
                touchAction: "none",
              }}
            >
              {/* LAYER 1: Jar BACK */}
              <div className="absolute inset-0" style={{ zIndex: 1 }}>
                <BasketBackSVG size="100%" isHovered={isBasketHovered && isDragging} />
              </div>

              {/* LAYER 2: Items INSIDE jar */}
              <div
                style={{
                  position: "absolute",
                  left: "22%",
                  right: "22%",
                  top: "42%",
                  bottom: "6%",
                  display: "grid",
                  gridTemplateColumns: `repeat(${jarGrid.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${jarGrid.rows}, 1fr)`,
                  placeItems: "center",
                  gap: "1%",
                  pointerEvents: "none",
                  zIndex: 2,
                  overflow: "hidden",
                }}
              >
                {gridCells.map((item, idx) => {
                  if (!item) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        style={{ width: "100%", height: "100%" }}
                      />
                    );
                  }
                  const IC = ITEM_COMPONENTS[item.type];
                  return (
                    <div
                      key={item.id}
                      className={`db-item-drop-in ${isWrongState ? "db-wrong-fade-out" : ""}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${itemScale}%`,
                          height: `${itemScale}%`,
                          maxWidth: "100%",
                          maxHeight: "100%",
                          aspectRatio: "1 / 1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                        }}
                      >
                        <IC size="100%" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LAYER 3: Jar FRONT */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
                <BasketFrontSVG size="100%" isHovered={isBasketHovered && isDragging} />
              </div>
            </div>

            {/* ✅ CHECK BUTTON — ALWAYS VISIBLE */}
            {!isFinished && (
              <div className="flex flex-col items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={handleCheckClick}
                  disabled={!isCheckActive}
                  className={`
                    db-check-pop flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center
                    rounded-full border-4 border-white
                    transition-all
                    ${isCheckActive
                      ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg db-check-pulse hover:scale-110 active:scale-95 cursor-pointer"
                      : "bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed"
                    }
                  `}
                  aria-label="Check answer"
                  title="Check answer"
                >
                  <Check className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={4} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating dragged item */}
      {isDragging && dragItemType && (
        <div
          ref={floatingItemRef}
          className="db-floating-item fixed left-0 top-0 z-[999]"
          style={{
            width: "min(14vh, 120px)",
            height: "min(14vh, 120px)",
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.3))",
            transform: "translate3d(0px, 0px, 0) translate(-50%, -50%) scale(1.1)",
          }}
        >
          {(() => {
            const DC = ITEM_COMPONENTS[dragItemType];
            return <DC size="100%" />;
          })()}
        </div>
      )}
    </div>
  );
}

export default MathNumbersItemsDragBasketBase;
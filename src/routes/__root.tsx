// src/routes/__root.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react"; // ← ✅ FIXED: Added useCallback

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import IntroScreen from "../pages/IntroScreen";

// ─── 🔥 GLOBAL AUDIO CLEANUP TYPES ──────────────────────────────
declare global {
  interface Window {
    __lessonAudioCleanup?: {
      registerAudio: (audio: HTMLAudioElement) => () => void;
      registerAudios: (audios: HTMLAudioElement[]) => () => void;
      cleanupAllAudio: () => void;
      getActiveAudios?: () => HTMLAudioElement[];
    };
    _audioElements?: HTMLAudioElement[];
  }
}

// ─── 🔥 GLOBAL AUDIO REGISTRY ──────────────────────────────────
interface AudioRegistry {
  registerAudio: (audio: HTMLAudioElement) => () => void;
  registerAudios: (audios: HTMLAudioElement[]) => () => void;
  cleanupAllAudio: () => void;
  getActiveAudios: () => HTMLAudioElement[];
}

// ─── 🔥 STRICT AUDIO CLEANUP ──────────────────────────────────
const createAudioRegistry = (): AudioRegistry => {
  const activeAudios = new Set<HTMLAudioElement>();
  let isCleaning = false;

  const cleanupAudio = (audio: HTMLAudioElement) => {
    try {
      // 🔥 Remove all event listeners
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onloadstart = null;
      audio.onloadeddata = null;
      audio.oncanplay = null;
      audio.oncanplaythrough = null;
      audio.ontimeupdate = null;
      audio.onvolumechange = null;
      audio.onratechange = null;
      audio.ondurationchange = null;
      
      // 🔥 Stop playback
      if (!audio.paused) {
        audio.pause();
      }
      
      // 🔥 Reset audio — releases browser resources
      audio.currentTime = 0;
      audio.src = "";
      audio.load();
      
      // 🔥 Remove from DOM
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      
    } catch (error) {
      // Silently ignore cleanup errors
    }
  };

  const registerAudio = (audio: HTMLAudioElement): (() => void) => {
    // 🔥 Don't add if already cleaned
    if (!audio || audio.src === "") return () => {};
    
    activeAudios.add(audio);
    
    // 🔥 Auto-cleanup on audio end/error
    const cleanup = () => {
      if (activeAudios.has(audio)) {
        activeAudios.delete(audio);
        cleanupAudio(audio);
      }
    };
    
    audio.onended = cleanup;
    audio.onerror = cleanup;
    
    return () => {
      if (activeAudios.has(audio)) {
        activeAudios.delete(audio);
        cleanupAudio(audio);
      }
    };
  };

  const registerAudios = (audios: HTMLAudioElement[]): (() => void) => {
    const cleanups = audios.map(audio => registerAudio(audio));
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  };

  const cleanupAllAudio = () => {
    if (isCleaning) return;
    isCleaning = true;
    
    try {
      const audios = Array.from(activeAudios);
      audios.forEach(audio => {
        activeAudios.delete(audio);
        cleanupAudio(audio);
      });
      
      // 🔥 Safety: Also clean any orphaned audio elements in DOM
      try {
        const domAudios = document.querySelectorAll('audio');
        domAudios.forEach(audio => {
          try {
            if (!audio.paused) audio.pause();
            audio.currentTime = 0;
            audio.src = "";
            audio.load();
            audio.onended = null;
            audio.onerror = null;
          } catch {
            // Silently ignore
          }
        });
      } catch {
        // Silently ignore
      }
      
    } finally {
      isCleaning = false;
    }
  };

  const getActiveAudios = (): HTMLAudioElement[] => {
    return Array.from(activeAudios);
  };

  return {
    registerAudio,
    registerAudios,
    cleanupAllAudio,
    getActiveAudios,
  };
};

// ─── 🔥 404 COMPONENT ──────────────────────────────────────────
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── 🔥 ERROR COMPONENT ──────────────────────────────────────
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── 🔥 ROUTE EXPORT ──────────────────────────────────────────
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Taqseem Taleem — Fun Learning for Kids" },
      {
        name: "description",
        content: "A playful tablet learning app for kids — English, Math and Urdu adventures.",
      },
      { property: "og:title", content: "Taqseem Taleem" },
      { property: "og:description", content: "A playful tablet learning app for kids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Amiri:wght@700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// ─── 🔥 SHELL COMPONENT ──────────────────────────────────────
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ─── 🔥 ROOT COMPONENT ────────────────────────────────────────
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showIntro, setShowIntro] = useState(true);
  const audioRegistryRef = useRef<AudioRegistry | null>(null);
  const isInitializedRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── 🔥 IDLE CLEANUP FUNCTION ──────────────────────────────
  const cleanupOnIdle = useCallback(() => {
    console.log('🧹 Idle cleanup: No user activity for 10 minutes, cleaning audio');
    if (audioRegistryRef.current) {
      audioRegistryRef.current.cleanupAllAudio();
    }
  }, []);

  // ─── 🔥 RESET IDLE TIMER ──────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    // Set new timer for 10 minutes
    idleTimerRef.current = setTimeout(cleanupOnIdle, 600000); // 10 minutes
  }, [cleanupOnIdle]);

  // ─── 🔥 USER ACTIVITY HANDLERS ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset timer on any user activity
    const events = ['click', 'touchstart', 'mousemove', 'keydown', 'scroll'];
    const handleUserActivity = () => resetIdleTimer();

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [resetIdleTimer]);

  // ─── 🔥 VISIBILITY CHANGE HANDLER ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔇 Tab hidden — cleaning all audio');
        if (audioRegistryRef.current) {
          audioRegistryRef.current.cleanupAllAudio();
        }
      } else {
        // Tab becomes visible again — reset idle timer
        resetIdleTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetIdleTimer]);

  // ─── 🔥 BEFORE UNLOAD CLEANUP ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      console.log('🔇 Page unloading — cleaning all audio');
      if (audioRegistryRef.current) {
        audioRegistryRef.current.cleanupAllAudio();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ─── 🔥 INITIALIZATION ──────────────────────────────────────
  useEffect(() => {
    // 🔥 Only run in browser
    if (typeof window === 'undefined') return;
    
    // 🔥 Prevent double initialization
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // 🔥 Initialize global audio registry
    const registry = createAudioRegistry();
    audioRegistryRef.current = registry;
    
    // 🔥 Expose to window for all components
    window.__lessonAudioCleanup = {
      registerAudio: registry.registerAudio,
      registerAudios: registry.registerAudios,
      cleanupAllAudio: registry.cleanupAllAudio,
      getActiveAudios: registry.getActiveAudios,
    };
    
    // 🔥 Initialize window audio array
    if (!window._audioElements) {
      window._audioElements = [];
    }

    // 🔥 Start idle timer
    resetIdleTimer();

    // 🔥 Log that audio system is ready
    console.log('🔊 Audio registry initialized with auto-cleanup');
    
    // 🔥 Cleanup on unmount
    return () => {
      if (audioRegistryRef.current) {
        audioRegistryRef.current.cleanupAllAudio();
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      // @ts-ignore - Clean up window property
      window.__lessonAudioCleanup = undefined;
      window._audioElements = [];
    };
  }, [resetIdleTimer]);

  return (
    <QueryClientProvider client={queryClient}>
      {showIntro ? (
        <IntroScreen onFinish={() => setShowIntro(false)} />
      ) : (
        <Outlet />
      )}
    </QueryClientProvider>
  );
}
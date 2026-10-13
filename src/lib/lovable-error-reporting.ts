// Lightweight client-side error reporter.
// On Lovable's own hosting this file is auto-injected by the
// @lovable.dev/vite-tanstack-config plugin to forward errors to their
// dashboard. When a project is exported/downloaded that generated file
// isn't included, which breaks the build (see src/routes/__root.tsx).
// This stub keeps the same API so the app builds and runs standalone,
// simply logging errors to the console instead.

export function reportLovableError(error: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error("[error boundary]", error, context);
  } else {
    console.error(error);
  }
}

// src/components/QRScanner.tsx
// QR Scanner component using html5-qrcode

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { X, Camera, RefreshCw, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

const SCANNER_CSS = `
  @keyframes qr-scan-line {
    0%   { top: 0%; }
    100% { top: 100%; }
  }
  @keyframes qr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes qr-pop-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }

  .qr-scanner-container {
    animation: qr-fade-in 0.3s ease-out both;
  }
  .qr-scan-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      #22c55e 20%, 
      #22c55e 80%, 
      transparent 100%);
    box-shadow: 0 0 20px 4px rgba(34, 197, 94, 0.6);
    animation: qr-scan-line 2.2s ease-in-out infinite;
    z-index: 10;
  }
  .qr-corner {
    position: absolute;
    width: 40px;
    height: 40px;
    border-color: #22c55e;
  }
  .qr-corner-tl { top: 0; left: 0; border-top: 4px solid; border-left: 4px solid; border-top-left-radius: 12px; }
  .qr-corner-tr { top: 0; right: 0; border-top: 4px solid; border-right: 4px solid; border-top-right-radius: 12px; }
  .qr-corner-bl { bottom: 0; left: 0; border-bottom: 4px solid; border-left: 4px solid; border-bottom-left-radius: 12px; }
  .qr-corner-br { bottom: 0; right: 0; border-bottom: 4px solid; border-right: 4px solid; border-bottom-right-radius: 12px; }
  
  .qr-pop-in {
    animation: qr-pop-in 0.35s cubic-bezier(.34,1.4,.64,1) both;
  }
`;

export function QRScanner({ onScanSuccess, onClose, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerIdRef = useRef<string>(`qr-reader-${Date.now()}`);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);

  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string>("");
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");

  // ─── Stop Scanner ────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const state = scannerRef.current.getState();
      if (state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch (err) {
      console.warn("[QRScanner] Stop failed:", err);
    }
    scannerRef.current = null;
  }, []);

  // ─── Start Scanner ───────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!isMountedRef.current) return;

    setError("");
    setIsStarting(true);
    hasScannedRef.current = false;

    await stopScanner();

    try {
      try {
        const permissions = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        if (permissions.state === "denied") {
          setCameraPermission("denied");
          setError("Camera permission denied. Please enable in settings.");
          setIsStarting(false);
          return;
        }
      } catch {
        // permissions API not supported — continue
      }

      const scanner = new Html5Qrcode(containerIdRef.current, {
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          stopScanner().then(() => {
            if (isMountedRef.current) {
              onScanSuccess(decodedText);
            }
          });
        },
        () => {
          // Per-frame error — ignore
        }
      );

      setCameraPermission("granted");
      setIsStarting(false);
    } catch (err) {
      console.error("[QRScanner] Start failed:", err);
      const message = err instanceof Error ? err.message : "Camera failed to start";

      if (message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("notallowed")) {
        setCameraPermission("denied");
        setError("Camera permission denied. Please allow camera access.");
      } else if (message.toLowerCase().includes("notfound") ||
                 message.toLowerCase().includes("no camera")) {
        setError("No camera found on this device.");
      } else {
        setError(message);
      }

      setIsStarting(false);
      onError?.(message);
    }
  }, [stopScanner, onScanSuccess, onError]);

  // ─── Mount / Unmount ─────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose?.();
  };

  const handleRetry = () => {
    startScanner();
  };

  return (
    <>
      <style>{SCANNER_CSS}</style>

      <div className="qr-scanner-container fixed inset-0 z-[300] flex flex-col bg-black">
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 shadow-lg">
              <Camera className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white sm:text-lg">
                Scan QR Code
              </h2>
              <p className="text-[11px] font-medium text-white/70 sm:text-xs">
                Scan the QR code on your tablet
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="no-focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* ─── Camera View ────────────────────────────────── */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div
            id={containerIdRef.current}
            className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
          />

          {!isStarting && !error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: "70vmin", height: "70vmin", maxWidth: "400px", maxHeight: "400px" }}>
                <div className="qr-corner qr-corner-tl" />
                <div className="qr-corner qr-corner-tr" />
                <div className="qr-corner qr-corner-bl" />
                <div className="qr-corner qr-corner-br" />

                <div className="qr-scan-line" />

                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                    borderRadius: "16px",
                  }}
                />
              </div>
            </div>
          )}

          {isStarting && !error && (
            <div className="qr-pop-in absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/30" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                  <Camera className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-sm font-bold text-white">Starting camera...</p>
              <p className="text-xs text-white/60">Please allow camera access</p>
            </div>
          )}

          {error && !isStarting && (
            <div className="qr-pop-in absolute inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-md">
              <div className="rounded-3xl border-4 border-white bg-white p-6 text-center shadow-2xl">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-8 w-8 text-red-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-extrabold text-gray-800 sm:text-lg">
                  {cameraPermission === "denied" ? "Camera Permission Denied" : "Camera Error"}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{error}</p>

                {cameraPermission === "denied" && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-left">
                    <p className="text-xs font-bold text-amber-800">How to enable:</p>
                    <ol className="mt-1 list-inside list-decimal space-y-0.5 text-xs text-amber-700">
                      <li>Open browser settings</li>
                      <li>Site permissions → Camera</li>
                      <li>Select Allow</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-2.5 text-sm font-extrabold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRetry}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-green-500 bg-green-500 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-green-600 active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Hint ────────────────────────────────── */}
        <div className="relative z-20 px-4 py-4 text-center sm:px-6 sm:py-5"
          style={{
            background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          }}
        >
          <p className="text-xs font-semibold text-white/80 sm:text-sm">
            Get your QR code from the teacher
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            Hold the tablet steady and align the QR code in the frame
          </p>
        </div>
      </div>
    </>
  );
}

export default QRScanner;
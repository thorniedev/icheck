"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  XIcon,
  CameraIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LoaderCircleIcon,
  MapPinIcon,
} from "lucide-react";
import { parseQrPayload, type QrKind } from "@/lib/auth/qr-token";
import { useLiveLocation } from "@/lib/utils/geolocation";
import { getCheckInErrorMessage } from '@/lib/utils/check-in-error';

interface Props {
  onClose: () => void;
}

type ScanState = "scanning" | "submitting" | "needReason" | "success" | "error";

const READER_ID = "qr-reader";

export function QrScanner({ onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false); // dedupe rapid-fire decode callbacks

  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  // The last decoded scan, so Retry can re-submit without re-scanning. Kept in
  // state (not a ref) because the Retry button's visibility depends on it.
  const [lastScan, setLastScan] = useState<{ token: string; kind: QrKind } | null>(null);

  // Pre-warm GPS the moment the scanner opens, so a fix is ready by the time the
  // QR decodes (instead of failing on the first read and needing a refresh).
  const { status: locStatus, getFreshCoords } = useLiveLocation();

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      /* already stopped */
    }
  }, []);

  // Submit a scanned token. Always fetches a fresh, live location first so we
  // never post a stale/null position that the backend would reject. If the
  // guessed kind is wrong (e.g. a static QR whose link lacked &kind=static), the
  // backend returns "only accepts … QR codes" — we flip to the other endpoint
  // once and retry, so the student never sees that error.
  const submit = useCallback(
    async (token: string, initialKind: QrKind, reasonText?: string) => {
      setScanState("submitting");
      setMessage("");

      const coords = await getFreshCoords();
      if (!coords) {
        setScanState("error");
        setMessage(
          "We couldn't read your location. Turn on GPS / Location for this site, then tap Retry."
        );
        return;
      }

      let kind = initialKind;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // deviceId + IP are added server-side by the proxy (httpOnly cookie).
          const res = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              qrToken: token,
              kind,
              reason: reasonText,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }),
          });
          const json = await res.json().catch(() => ({}));

          if (res.ok) {
            setLastScan({ token, kind });
            setScanState("success");
            setMessage(
              reasonText
                ? "Late check-in recorded — your reason was sent for review."
                : "Attendance recorded successfully!"
            );
            return;
          }

          const errMsg = getCheckInErrorMessage(json, "Check-in failed. Try again.");

          // Wrong endpoint for this token type → flip kind once and retry.
          if (/only accepts (dynamic|static) qr codes/i.test(errMsg) && attempt === 0) {
            kind = kind === "static" ? "dynamic" : "static";
            setLastScan({ token, kind });
            continue;
          }

          // Static (classroom) QR scanned late → backend asks for a reason.
          if (/reason is required/i.test(errMsg)) {
            setLastScan({ token, kind: "static" });
            setScanState("needReason");
            setMessage("This is a classroom (static) QR — add a short reason for your late scan.");
            return;
          }

          setScanState("error");
          setMessage(errMsg);
          return;
        } catch {
          setScanState("error");
          setMessage("Network error. Check your connection and tap Retry.");
          return;
        }
      }
    },
    [getFreshCoords]
  );

  // (Re)start the camera whenever we enter the "scanning" state. Cleanup stops
  // it on unmount and on every transition away from scanning.
  useEffect(() => {
    if (scanState !== "scanning") return;
    busyRef.current = false;

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          // Responsive box — avoids "qrbox larger than video" errors on phones.
          qrbox: (vw: number, vh: number) => {
            const size = Math.floor(Math.min(vw, vh) * 0.7);
            return { width: size, height: size };
          },
        },
        async (decodedText) => {
          if (busyRef.current) return;
          busyRef.current = true;
          await stopCamera();

          const { token, kind } = parseQrPayload(decodedText);
          if (!token) {
            setScanState("error");
            setMessage("That QR couldn't be read. Make sure you're scanning the i-Check class QR.");
            return;
          }
          setLastScan({ token, kind });
          await submit(token, kind);
        },
        undefined
      )
      .catch(() => {
        setScanState("error");
        setMessage("Camera access denied. Allow camera permission for this site, then tap Retry.");
      });

    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  // Make sure the camera is released if the modal is closed mid-scan.
  useEffect(() => () => void stopCamera(), [stopCamera]);

  const rescan = () => {
    setReason("");
    setMessage("");
    setScanState("scanning");
  };

  const retrySubmit = () => {
    if (!lastScan) return rescan();
    void submit(lastScan.token, lastScan.kind);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <CameraIcon className="size-5 text-primary" />
            <span className="font-semibold">Scan QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground/70 hover:text-muted-foreground"
            aria-label="Close scanner"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="p-5">
          {scanState === "scanning" && (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Point your camera at the QR code shown in class
              </p>
              <div
                id={READER_ID}
                className="rounded-2xl overflow-hidden border-2 border-dashed border-primary/30"
              />
              {/* Live location hint — reassures the student GPS is being read. */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                {locStatus === "ready"
                  ? "Location ready"
                  : locStatus === "denied"
                    ? "Location blocked — enable it for this site"
                    : locStatus === "unavailable"
                      ? "Location not available on this device"
                      : "Getting your location…"}
              </div>
            </>
          )}

          {scanState === "submitting" && (
            <div className="py-12 flex flex-col items-center gap-3">
              <LoaderCircleIcon className="size-12 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Getting location &amp; recording…</p>
            </div>
          )}

          {scanState === "needReason" && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <AlertCircleIcon className="size-12 text-amber-500" />
              <p className="font-semibold text-foreground">Reason required</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Traffic delay, ran late from lab…"
                className="w-full"
                autoFocus
              />
              <Button
                className="mt-1 w-full bg-primary hover:bg-primary/90"
                disabled={reason.trim().length < 3}
                onClick={() => {
                  if (lastScan) void submit(lastScan.token, "static", reason.trim());
                }}
              >
                Submit reason &amp; check in
              </Button>
            </div>
          )}

          {scanState === "success" && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircleIcon className="size-14 text-green-500" />
              <p className="font-semibold text-foreground">Check-in Successful!</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button className="mt-2 w-full bg-primary" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {scanState === "error" && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertCircleIcon className="size-14 text-red-400" />
              <p className="font-semibold text-foreground">Check-in Failed</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              {/* Retry re-reads a fresh location and re-submits the same scan —
                  no page refresh needed. Rescan opens the camera again. */}
              {lastScan && (
                <Button className="mt-2 w-full bg-primary hover:bg-primary/90" onClick={retrySubmit}>
                  Retry
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={rescan}>
                Scan again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

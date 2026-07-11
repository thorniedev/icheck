"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationStatus =
  | "locating"
  | "ready"
  | "denied"
  | "unavailable";

function geolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

// `maximumAge: 0` is the key fix: never accept a cached/stale browser fix — the
// classroom GPS check is tight (~40 m), so a 60s-old position from another room
// would fail validation and force the student to "refresh and submit again".
const LIVE_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

function toCoords(pos: GeolocationPosition): Coords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

/**
 * Live, always-fresh geolocation for the check-in flow.
 *
 * Why a hook instead of a one-shot `getCurrentPosition`: on many phones the very
 * first GPS read after page load is slow or fails — which is exactly why
 * students had to refresh and submit again. We start a `watchPosition` the
 * moment the screen mounts so a fix is already warming up by the time the QR
 * decodes, and we keep the latest fix continuously updated. At submit time
 * `getFreshCoords()` forces a brand-new high-accuracy read and falls back to the
 * most recent watch fix only if that read times out — so we (almost) never
 * submit with a null or stale location.
 */
export function useLiveLocation() {
  const latestRef = useRef<Coords | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // Lazy init (instead of setState in the effect) keeps the linter happy and
  // avoids a cascading render: we already know at mount whether geolocation
  // exists, so seed the status directly.
  const [status, setStatus] = useState<LocationStatus>(() =>
    geolocationSupported() ? "locating" : "unavailable"
  );

  useEffect(() => {
    if (!geolocationSupported()) return; // status already "unavailable"
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        latestRef.current = toCoords(pos);
        setStatus("ready");
      },
      (err) => {
        // Permission denied is terminal; transient errors keep the watch alive.
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
      },
      LIVE_OPTS
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  /**
   * Returns the freshest possible fix. Forces a live one-shot read; on timeout
   * falls back to the latest watch fix. Never throws. Returns null only when
   * location is genuinely unavailable/denied — the caller should then prompt the
   * student to enable location rather than submit a null position.
   */
  const getFreshCoords = useCallback(async (maxWaitMs = 10_000): Promise<Coords | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return latestRef.current;
    }
    return new Promise<Coords | null>((resolve) => {
      let settled = false;
      const finish = (c: Coords | null) => {
        if (settled) return;
        settled = true;
        resolve(c);
      };
      const timer = setTimeout(() => finish(latestRef.current), maxWaitMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const c = toCoords(pos);
          latestRef.current = c;
          setStatus("ready");
          finish(c);
        },
        (err) => {
          clearTimeout(timer);
          if (err.code === err.PERMISSION_DENIED) setStatus("denied");
          finish(latestRef.current); // fall back to the last good watch fix (may be null)
        },
        { ...LIVE_OPTS, timeout: maxWaitMs }
      );
    });
  }, []);

  return { status, getFreshCoords };
}

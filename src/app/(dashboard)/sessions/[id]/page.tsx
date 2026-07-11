"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCwIcon,
  XCircleIcon,
  UsersIcon,
  ClockIcon,
} from "lucide-react";
import { API_URL } from "@/lib/api-config";
import { useUser } from "@/components/user-provider";

const QR_TTL_SECONDS = 30;

interface QrData {
  codeValue: string;
  expireTime: string;
}

export default function SessionQrPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();

  const [qr, setQr] = useState<QrData | null>(null);
  const [countdown, setCountdown] = useState(QR_TTL_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{
    classroomName: string;
    subjectName: string | null;
    teacherName: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  const generateQr = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/qr-codes/sessions/${id}/dynamic`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.payload?.message ?? json?.message ?? "Failed to generate QR");
        return;
      }
      setQr(json.payload);
      setCountdown(QR_TTL_SECONDS);
    } catch {
      setError("Network error. Check connection.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load session info once
  useEffect(() => {
    fetch(`${API_URL}/sessions/${id}`)
      .then((r) => r.json())
      .then((json) => setSessionInfo(json.payload))
      .catch(() => {});
  }, [id]);

  // Open session then generate first QR
  useEffect(() => {
    if (initRef.current || !user) return;
    initRef.current = true;

    const init = async () => {
      if (user?.role === "ADMIN") {
        const res = await fetch(`${API_URL}/sessions/${id}/open`, { method: "POST" });
        if (!res.ok) throw new Error("Could not start this session yet.");
      } else if (user?.id) {
        const res = await fetch(`${API_URL}/sessions/${id}/teacher-check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId: Number(user.id), deviceId: null }),
        });
        if (!res.ok) throw new Error("Could not start this session yet.");
      }
      await generateQr();
    };
    init().catch((e) => setError(e instanceof Error ? e.message : "Could not start this session yet."));
  }, [id, generateQr, user?.id, user?.role]);

  // Countdown ticker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          generateQr();
          return QR_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generateQr]);

  const circumference = 2 * Math.PI * 28;
  const progress = (countdown / QR_TTL_SECONDS) * circumference;
  const urgent = countdown <= 8;

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between text-white">
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider">Live Session</p>
          <h1 className="text-xl font-bold">
            {sessionInfo ? (sessionInfo.subjectName || "Attendance Session") : "Loading…"}
          </h1>
          <p className="text-white/70 text-sm">
            {sessionInfo?.classroomName} &nbsp;·&nbsp;
            {sessionInfo?.startTime?.slice(0, 5)}–{sessionInfo?.endTime?.slice(0, 5)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => router.push("/schedule")}
        >
          <XCircleIcon className="size-5" />
        </Button>
      </div>

      {/* QR Card */}
      <div className="bg-card rounded-3xl p-8 w-full max-w-lg flex flex-col items-center gap-6 shadow-2xl">
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <Button onClick={generateQr} disabled={loading}>
              <RefreshCwIcon className="size-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* QR code */}
            <div className="relative">
              {qr ? (
                <div
                  className={`transition-opacity duration-300 bg-card p-3 rounded-xl ${
                    urgent ? "opacity-60" : "opacity-100"
                  }`}
                >
                  <QRCode
                    // QR is scanned by a student's phone camera, so the value
                    // MUST be an absolute URL — relative paths can't be opened
                    // from a camera scan.
                    value={`${window.location.origin}/check-in?token=${qr.codeValue}`}
                    size={260}
                    level="H"
                    style={{ height: "auto", maxWidth: "100%", width: "260px" }}
                    viewBox="0 0 256 256"
                  />
                </div>
              ) : (
                <div className="w-65 h-65 bg-muted rounded-xl animate-pulse" />
              )}
            </div>

            {/* Countdown ring */}
            <div className="flex flex-col items-center gap-2">
              <svg width="72" height="72" className="-rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="5"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke={urgent ? "#ef4444" : "#273C97"}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <text
                  x="36"
                  y="36"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="rotate-90"
                  style={{
                    transform: "rotate(90deg) translate(0px, -72px)",
                    fontSize: "18px",
                    fontWeight: "bold",
                    fill: urgent ? "#ef4444" : "#273C97",
                  }}
                >
                  {countdown}s
                </text>
              </svg>
              <p className="text-sm text-muted-foreground/70">
                {urgent ? "Refreshing soon…" : "QR refreshes automatically"}
              </p>
            </div>

            {/* Manual refresh */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                generateQr().then(() => {
                  setCountdown(QR_TTL_SECONDS);
                  timerRef.current = setInterval(() => {
                    setCountdown((prev) => {
                      if (prev <= 1) { generateQr(); return QR_TTL_SECONDS; }
                      return prev - 1;
                    });
                  }, 1000);
                });
              }}
              disabled={loading}
            >
              <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Now
            </Button>
          </>
        )}
      </div>

      {/* Footer hint */}
      <p className="mt-6 text-white/50 text-xs text-center">
        Students scan this QR with i-Check to mark attendance
      </p>
    </div>
  );
}

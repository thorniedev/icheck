"use client";

import { useEffect, useRef } from "react";
import { Client, type IFrame, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { ATTENDANCE_PUBLIC_URL } from "@/lib/ws-config";

/** Mirror of the backend `AttendanceUpdateEvent` record. */
export interface AttendanceUpdateEvent {
  id?: number;
  sessionId?: number;
  classroomId?: number;
  studentId?: number;
  studentName?: string;
  studentNo?: string;
  status?: string;
  method?: string;
  checkInTime?: string;
  isSuspicious?: boolean;
  isValidLocation?: boolean;
  type?: "CHECK_IN" | "UPDATE" | "AMENDMENT_APPROVED";
}

type Listener = (event: AttendanceUpdateEvent) => void;

/**
 * Subscribes to live attendance updates for one classroom (and optionally a
 * specific session) via the backend STOMP broker. Used by the take-attendance
 * page so the teacher sees student rows flip from "pending" → "present" the
 * moment each scan lands — no page refresh required.
 *
 * Backend topics (see `AttendanceNotifier`):
 *   /topic/classrooms/{classroomId}/attendance   — every event for this class
 *   /topic/attendance/{sessionId}                — narrowed to one session
 *
 * Connection lifecycle: opens on mount, closes on unmount. Auto-reconnects
 * with exponential-ish backoff (handled by the stomp client). Safe in React
 * StrictMode: the cleanup deactivates the client.
 */
export function useAttendanceStream(
  classroomId: number | null | undefined,
  onEvent: Listener,
  sessionId?: number | null,
) {
  // Stash the latest listener in a ref so the effect doesn't re-subscribe on
  // every render (the table callback is naturally recreated each pass).
  const listenerRef = useRef<Listener>(onEvent);
  useEffect(() => {
    listenerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!classroomId) return;
    if (!ATTENDANCE_PUBLIC_URL) return;

    const client = new Client({
      // SockJS endpoint matches the backend `WebSocketConfig#addEndpoint("/ws")`.
      // SockJS (vs native WS) survives strict proxies that strip the Upgrade
      // header — Cloudflare in our case.
      webSocketFactory: () => new SockJS(`${ATTENDANCE_PUBLIC_URL}/ws`),
      reconnectDelay: 4_000,
      heartbeatIncoming: 25_000,
      heartbeatOutgoing: 25_000,
      onConnect: () => {
        client.subscribe(`/topic/classrooms/${classroomId}/attendance`, (msg: IMessage) => {
          handle(msg, listenerRef.current);
        });
        if (sessionId) {
          client.subscribe(`/topic/attendance/${sessionId}`, (msg: IMessage) => {
            handle(msg, listenerRef.current);
          });
        }
      },
      onStompError: (frame: IFrame) => {
        // Useful in dev logs but never fatal.
        console.warn("[attendance-stream] STOMP error", frame.headers?.message);
      },
    });

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [classroomId, sessionId]);
}

function handle(msg: IMessage, listener: Listener) {
  try {
    const event = JSON.parse(msg.body) as AttendanceUpdateEvent;
    listener(event);
  } catch (err) {
    console.warn("[attendance-stream] malformed event", err);
  }
}

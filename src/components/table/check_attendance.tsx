"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Student } from "@/types/student";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Input } from '@/components/ui/input';
import { useAttendanceStream, type AttendanceUpdateEvent } from '@/lib/utils/attendance-stream';
import { useGetSessionAttendanceStatusQuery } from "@/store/api/attendanceApi";

type AttendanceCheckingListProps = {
  students?: Student[];
  studentProfileBasePath?: string;
  /** Today's session id — enables the polling fallback for live status. */
  sessionId?: number | null;
  /** ISO date (yyyy-MM-dd) of today's session. */
  sessionDate?: string | null;
  /** HH:mm[:ss] start time of today's session. */
  startTime?: string | null;
  /** HH:mm[:ss] end time of today's session. */
  endTime?: string | null;
  /** Classroom code shown next to the date/time block. */
  classCode?: string | null;
  /** Counts shown in the header summary box. */
  totalStudents?: number;
  femaleStudents?: number;
};

/** Renders 14:30:00 / 14:30 → "2:30 PM" (12-hour with am/pm). */
function fmt12(raw?: string | null): string {
  if (!raw) return "—";
  const [hh, mm] = raw.split(":");
  const h = Number(hh);
  if (Number.isNaN(h)) return raw;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mm ?? "00"} ${period}`;
}

/** Formats "yyyy-MM-dd" into a readable day-month-year label. */
function fmtDate(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${String(d.getDate()).padStart(2, "0")}-${month}-${d.getFullYear()}`;
}

export default function AttendanceCheckingList({
  students = [],
  studentProfileBasePath,
  sessionId,
  sessionDate,
  startTime,
  endTime,
  classCode,
  totalStudents,
  femaleStudents,
}: AttendanceCheckingListProps) {
  const params = useParams<{ id?: string | string[] }>();
  const classroomId = Array.isArray(params.id) ? params.id[0] : params.id;
  const resolvedStudentProfileBasePath =
    studentProfileBasePath ??
    (classroomId
      ? `/dashboard/classrooms/${classroomId}/student-profile`
      : undefined);

  // Status is READ-ONLY here — it reflects the real attendance from the
  // backend, updated live as students scan. The teacher cannot edit it inline;
  // to change a status they use the Amendment button (which requires a reason).
  const seed = () => Object.fromEntries(students.map((s) => [s.id, String(s.status ?? "pending")]));
  const [statusById, setStatusById] = useState<Record<string, string>>(seed);
  // Reseed when the server re-renders with new statuses (adjust-state-during-
  // render with a prev-prop guard, avoiding the set-state-in-effect lint).
  const studentsKey = students.map((s) => `${s.id}:${s.status}`).join("|");
  const [prevKey, setPrevKey] = useState(studentsKey);
  if (studentsKey !== prevKey) {
    setPrevKey(studentsKey);
    setStatusById(seed());
  }

  // Live updates — when a student scans (or a teacher amends), patch the row.
  const numericClassroomId = classroomId ? Number(classroomId) : null;
  useAttendanceStream(numericClassroomId, (event: AttendanceUpdateEvent) => {
    if (!event.studentId || !event.status) return;
    const key = String(event.studentId);
    setStatusById((prev) =>
      prev[key] === event.status?.toLowerCase()
        ? prev
        : { ...prev, [key]: String(event.status).toLowerCase() },
    );
  });

  // Polling fallback — guarantees the list still updates if the WebSocket can't
  // connect (e.g. a proxy strips the Upgrade header). Every 8s we re-fetch the
  // session's status map and merge it in. Merge (not replace) so an instant WS
  // patch is never clobbered back to "pending" between polls.
  const { data: polledStatus } = useGetSessionAttendanceStatusQuery(sessionId ?? 0, {
    skip: !sessionId,
    pollingInterval: 8_000,
  });
  const polledKey = polledStatus ? JSON.stringify(polledStatus) : "";
  const [prevPolledKey, setPrevPolledKey] = useState(polledKey);
  if (polledKey !== prevPolledKey) {
    setPrevPolledKey(polledKey);
    if (polledStatus) setStatusById((prev) => ({ ...prev, ...polledStatus }));
  }

  const [search, setSearch] = useState("");
  const visible = students.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <main>
      <div className="flex items-center justify-between gap-3 pb-4">
        <Input
          placeholder="Search name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm py-5"
        />

         <div className="flex justify-start text-sm items-center gap-4 text-gray-600 border px-4 py-2 rounded-lg">
              <div>
                <p>Date: <span className="text-black dark:text-white">{fmtDate(sessionDate)}</span></p>
                <p className="text-right">Student(Total/ Female): <span className="text-black dark:text-white"> {totalStudents ?? students.length}/{femaleStudents ?? 0}</span></p>
              </div>
              <div>
                <p className="text-black dark:text-white">|</p>
                <p className="text-black dark:text-white">|</p>
              </div>
              <div>
                <p>Time: <span className="text-black dark:text-white"> {fmt12(startTime)} - {fmt12(endTime)}</span></p>
                <p>Class Code: <span className="text-black dark:text-white">{classCode ?? "—"}</span> </p>
              </div>
            </div>
      </div>
      <div className="overflow-hidden rounded-md border" >
        <Table >
          <TableHeader >
            <TableRow>
              <TableHead className="text-center">No.</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visible.map((student, index) => {
              const status = statusById[student.id] ?? "pending";
              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-center">
                    {String(index + 1).padStart(3, "0")}
                  </TableCell>

                  <TableCell>{student.id}</TableCell>

                  <TableCell>
                    <Link
                      href={
                        resolvedStudentProfileBasePath
                          ? `${resolvedStudentProfileBasePath}/${student.id}`
                          : `/students/${student.id}`
                      }
                      aria-label={`View ${student.name} profile`}
                    >
                      <Image
                        src={student.profile}
                        alt={student.name}
                        width={50}
                        height={50}
                        className="rounded-xl object-cover w-12 h-12"
                      />
                    </Link>
                  </TableCell>

                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.gender}</TableCell>

                  {/* Read-only — live status. To change it, use Amendment. */}
                  <TableCell className="text-center">
                    <StatusBadge status={status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

/** Read-only status pill — color-coded, live-updated. */
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "present"    ? "bg-green-100 text-green-700" :
    s === "late"       ? "bg-amber-100 text-amber-700" :
    s === "permission" ? "bg-blue-100 text-blue-700" :
    s === "late_out"   ? "bg-orange-100 text-orange-700" :
    s === "absent"     ? "bg-red-100 text-red-700" :
                         "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {s.replace("_", " ")}
    </span>
  );
}

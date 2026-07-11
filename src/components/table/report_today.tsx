"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceStatus, Student } from "@/types/student";
import { CheckIcon, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useState } from "react";
import { Input } from '@/components/ui/input';
import { useAttendanceStream, type AttendanceUpdateEvent } from '@/lib/utils/attendance-stream';
import { useGetSessionAttendanceStatusQuery } from "@/store/api/attendanceApi";

type ReportTodayProps = {
  students?: Student[];
  studentProfileBasePath?: string;
  /** Today's session id — enables live status (WS + polling). */
  sessionId?: number | null;
  sessionDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  classCode?: string | null;
  totalStudents?: number;
  femaleStudents?: number;
};

function AttendanceMark({
  checked,
}: {
  checked: boolean;
  className?: string;
}) {
  if (!checked) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span className={`inline-flex justify-center`}>
      <CheckIcon className="size-5" />
    </span>
  );
}

export default function ReportToday({
  students = [],
  studentProfileBasePath,
  sessionId,
  sessionDate,
  startTime,
  endTime,
  classCode,
  totalStudents,
  femaleStudents,
}: ReportTodayProps) {
  const params = useParams<{ id?: string | string[] }>();
  const classroomId = Array.isArray(params.id) ? params.id[0] : params.id;
  const resolvedStudentProfileBasePath =
    studentProfileBasePath ??
    (classroomId
      ? `/dashboard/classrooms/${classroomId}/student-profile`
      : undefined);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Live status overlay — WebSocket (instant) + 8s polling fallback, so the
  // P/PM/L columns flip the moment a student scans, without a refresh.
  const numericClassroomId = classroomId ? Number(classroomId) : null;
  const [liveById, setLiveById] = useState<Record<string, string>>({});
  useAttendanceStream(
    numericClassroomId,
    (e: AttendanceUpdateEvent) => {
      if (!e.studentId || !e.status) return;
      const k = String(e.studentId);
      const v = String(e.status).toLowerCase();
      setLiveById((prev) => (prev[k] === v ? prev : { ...prev, [k]: v }));
    },
    sessionId ?? undefined,
  );
  const { data: polled } = useGetSessionAttendanceStatusQuery(sessionId ?? 0, {
    skip: !sessionId,
    pollingInterval: 8_000,
  });
  const polledKey = polled ? JSON.stringify(polled) : "";
  const [prevPolledKey, setPrevPolledKey] = useState(polledKey);
  if (polledKey !== prevPolledKey) {
    setPrevPolledKey(polledKey);
    if (polled) setLiveById((prev) => ({ ...prev, ...polled }));
  }

  const liveStudents = students.map((s) =>
    liveById[s.id] ? { ...s, status: liveById[s.id] as AttendanceStatus } : s,
  );

  const presentCount = liveStudents.filter((s) => s.status === AttendanceStatus.PRESENT).length;
  const permissionCount = liveStudents.filter((s) => s.status === AttendanceStatus.PERMISSION).length;
  const lateCount = liveStudents.filter((s) => s.status === AttendanceStatus.LATE).length;

  function formatDate(raw?: string | null) {
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    const month = date.toLocaleString("en-US", { month: "short" });
    return `${String(date.getDate()).padStart(2, "0")}-${month}-${date.getFullYear()}`;
  }

  function formatTime(raw?: string | null) {
    if (!raw) return "—";
    const [hoursRaw, minutes = "00"] = raw.split(":");
    const hours = Number(hoursRaw);
    if (Number.isNaN(hours)) return raw;
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutes} ${period}`;
  }

  const toggleExpanded = (studentId: string) => {
    setExpandedRowId((prev) => (prev === studentId ? null : studentId));
  };

  const renderStatus = (studentId: string, status: AttendanceStatus) => {
    if (status === AttendanceStatus.PRESENT) {
      return <span className="text-black dark:text-white">{AttendanceStatus.PRESENT}</span>;
    }

    const isExpanded = expandedRowId === studentId;
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => toggleExpanded(studentId)}
          aria-label={isExpanded ? "Collapse details" : "Expand details"}
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-black transition hover:bg-gray-100"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-black dark:text-white" />
          ) : (
            <ChevronDown className="h-4 w-4 text-black dark:text-white" />
          )}
        </button>
      </div>
    );
  };

  return (
    <main>
      <div className="flex items-center justify-between gap-3 pb-4">
        <Input
          placeholder="Search name..."
            className="max-w-sm py-5"
        />

         <div className="flex justify-start text-sm items-center gap-4 text-gray-600 border px-4 py-2 rounded-lg">
              <div>
                <p>Date: <span className="text-black dark:text-white">{formatDate(sessionDate)}</span></p>
                <p className="text-right">Student(Total/ Female): <span className="text-black dark:text-white"> {totalStudents ?? students.length}/{femaleStudents ?? 0}</span></p>
              </div>
              <div>
                <p className="text-black dark:text-white">|</p>
                <p className="text-black dark:text-white">|</p>
              </div>
              <div>
                <p >Time: <span className="text-black dark:text-white"> {formatTime(startTime)} - {formatTime(endTime)}</span></p>
                <p >Class Code: <span className="text-black dark:text-white">{classCode ?? "—"}</span> </p>
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
              <TableHead className="w-37.5">
                <div className="grid grid-cols-3 text-center">
                <span>P</span>
                <span>PM</span>
                <span>L</span>
                </div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
            <TableRow className="bg-primary/15 font-semibold">
              <TableHead colSpan={5} className="text-right font-bold text-lg text-foreground">
                Total: 
              </TableHead>
              <TableHead className="w-37.5 text-foreground">
                <div className="grid text-lg grid-cols-3 text-center">
                  <span>{presentCount}</span>
                  <span>{permissionCount}</span>
                  <span>{lateCount}</span>
                </div>
              </TableHead>
              <TableHead className="text-center text-muted-foreground">
                
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {liveStudents.map((student, index) => {
              const status = student.status;
              const isExpanded = expandedRowId === student.id;
              const hasDetails =
                status === AttendanceStatus.PERMISSION || status === AttendanceStatus.LATE;

              return (
                <Fragment key={student.id}>
                  <TableRow
                    className={
                      status === null ? "text-gray-400 dark:text-gray-500" : ""
                    }
                  >
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

                    <TableCell className="w-37.5">
                      <div className="grid grid-cols-3 items-center text-center">
                        <AttendanceMark
                          checked={status === AttendanceStatus.PRESENT}
                        />
                        <AttendanceMark
                          checked={status === AttendanceStatus.PERMISSION}
                        />
                        <AttendanceMark
                          checked={status === AttendanceStatus.LATE}
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {renderStatus(student.id, status)}
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasDetails && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-white px-8 py-4">
                        <div className="space-y-2 text-right text-sm">
                          {status === AttendanceStatus.PERMISSION && (
                            <p>
                              <span className="text-blue-500">Permission:</span>{" "}
                              <span className="text-[#1f1f1f] dark:text-white">
                                {student.reason?.trim() || "No reason provided"}
                              </span>
                            </p>
                          )}
                          {status === AttendanceStatus.LATE && (
                            <p>
                              <span className="text-amber-500">Late:</span>{" "}
                              <span className="text-[#1f1f1f] dark:text-white">
                                {student.reason?.trim() || "No reason provided"}
                              </span>
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

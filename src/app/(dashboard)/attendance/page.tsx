"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheckIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { API_URL } from "@/lib/api-config";

interface Session {
  id: number;
  classroomId: number;
  classroomName: string;
  subjectName: string | null;
  teacherName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Classroom {
  id: number;
  className: string;
  programTypeName: string;
  generation: number;
  year: number | null;
  semester: number | null;
  shift: string;
}

const SHIFTS = ["MORNING", "AFTERNOON", "EVENING"];
const SHIFT_LABEL: Record<string, string> = { MORNING: "Morning", AFTERNOON: "Afternoon", EVENING: "Evening" };
const SCHOLARSHIP_COURSES = ["Fullstack", "Foundation", "Pre-Uni", "ITP", "ITE"];

const statusColor: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE:    "bg-green-100 text-green-700",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function AttendancePage() {
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading]       = useState(true);

  const [programType, setProgramType]           = useState<"ALL" | "BACHELOR" | "SCHOLARSHIP">("ALL");
  const [filterYear, setFilterYear]             = useState("");
  const [filterSemester, setFilterSemester]     = useState("");
  const [filterShift, setFilterShift]           = useState("");
  const [filterGeneration, setFilterGeneration] = useState("");
  const [filterCourse, setFilterCourse]         = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sesRes, clsRes] = await Promise.all([
        fetch(`${API_URL}/sessions?size=100`),
        fetch(`${API_URL}/classrooms?size=200`),
      ]);
      const sesJson = await sesRes.json();
      const clsJson = await clsRes.json();
      setSessions(sesJson?.payload?.content ?? []);
      setClassrooms(clsJson?.payload?.content ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const classMap = useMemo(() => {
    const m = new Map<string, Classroom>();
    for (const c of classrooms) m.set(c.className, c);
    return m;
  }, [classrooms]);

  const bachelorCls    = useMemo(() => classrooms.filter((c) => c.programTypeName?.toUpperCase().includes("BACHELOR")), [classrooms]);
  const scholarshipCls = useMemo(() => classrooms.filter((c) => c.programTypeName?.toUpperCase().includes("SCHOLARSHIP")), [classrooms]);

  const years       = useMemo(() => [...new Set(bachelorCls.map((c) => c.year).filter(Boolean))].sort() as number[], [bachelorCls]);
  const semesters   = useMemo(() => [...new Set(bachelorCls.map((c) => c.semester).filter(Boolean))].sort() as number[], [bachelorCls]);
  const generations = useMemo(() => [...new Set(
    (programType === "BACHELOR" ? bachelorCls : scholarshipCls).map((c) => c.generation).filter(Boolean)
  )].sort() as number[], [programType, bachelorCls, scholarshipCls]);

  function getCourse(name: string) {
    return SCHOLARSHIP_COURSES.find((c) => name?.toLowerCase().includes(c.toLowerCase())) ?? null;
  }

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const cls = classMap.get(s.classroomName);
      if (programType === "BACHELOR") {
        if (!cls?.programTypeName?.toUpperCase().includes("BACHELOR")) return false;
        if (filterYear && String(cls?.year) !== filterYear) return false;
        if (filterSemester && String(cls?.semester) !== filterSemester) return false;
        if (filterShift && cls?.shift !== filterShift) return false;
        if (filterGeneration && String(cls?.generation) !== filterGeneration) return false;
      } else if (programType === "SCHOLARSHIP") {
        if (!cls?.programTypeName?.toUpperCase().includes("SCHOLARSHIP")) return false;
        if (filterCourse && !getCourse(s.classroomName)?.toLowerCase().includes(filterCourse.toLowerCase())) return false;
        if (filterShift && cls?.shift !== filterShift) return false;
        if (filterGeneration && String(cls?.generation) !== filterGeneration) return false;
      }
      return true;
    });
  }, [sessions, classMap, programType, filterYear, filterSemester, filterShift, filterGeneration, filterCourse]);

  function resetFilters() {
    setFilterYear(""); setFilterSemester(""); setFilterShift("");
    setFilterGeneration(""); setFilterCourse("");
  }

  return (
    <div className="px-4 sm:px-5 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Attendance</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} of {sessions.length} sessions</span>
      </div>

      {/* Program type tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["ALL", "BACHELOR", "SCHOLARSHIP"] as const).map((pt) => (
          <button
            key={pt}
            onClick={() => { setProgramType(pt); resetFilters(); }}
            className={`px-4 py-1.5 rounded-full text-base font-medium transition-all border ${
              programType === pt
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {pt === "ALL" ? "All" : pt === "BACHELOR" ? "Bachelor" : "Scholarship"}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      {programType !== "ALL" && (
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterSelect label="Generation" value={filterGeneration} onChange={setFilterGeneration}
            options={generations.map((g) => ({ label: `Gen ${g}`, value: String(g) }))} />
          {programType === "BACHELOR" && (
            <>
              <FilterSelect label="Year" value={filterYear} onChange={setFilterYear}
                options={years.map((y) => ({ label: `Year ${y}`, value: String(y) }))} />
              <FilterSelect label="Semester" value={filterSemester} onChange={setFilterSemester}
                options={semesters.map((s) => ({ label: `Sem ${s}`, value: String(s) }))} />
            </>
          )}
          {programType === "SCHOLARSHIP" && (
            <FilterSelect label="Course" value={filterCourse} onChange={setFilterCourse}
              options={SCHOLARSHIP_COURSES.map((c) => ({ label: c, value: c }))} />
          )}
          <FilterSelect label="Shift" value={filterShift} onChange={setFilterShift}
            options={SHIFTS.map((s) => ({ label: SHIFT_LABEL[s], value: s }))} />
          {(filterYear || filterSemester || filterShift || filterGeneration || filterCourse) && (
            <Button variant="ghost" size="sm" className="text-muted-foreground/70 hover:text-muted-foreground" onClick={resetFilters}>
              Clear
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground/70">Loading sessions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <ClipboardCheckIcon className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No sessions match your filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Class</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, index) => (
                <tr key={s.id}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${index === filtered.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{s.subjectName || "Attendance Session"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.classroomName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.sessionDate}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground/70 lg:table-cell">
                    {s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${statusColor[s.status] ?? "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/attendance/${s.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      View <ChevronRightIcon className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-7 py-1.5 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border bg-card text-muted-foreground"
        }`}>
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/70" />
    </div>
  );
}

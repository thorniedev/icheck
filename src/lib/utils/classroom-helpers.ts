import { backendFetch } from '@/lib/api/api-fetch';
import { todayIso } from "@/lib/utils/school-time";

export interface ClassroomSummary {
  id: number;
  className: string;
  classCode: string;
  programTypeName: string;
  generation: number;
  year: number | null;
  semester: number | null;
  shift: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  /** Lab/room name, e.g. "Lab DevOps", "Lab AI", "Lab Data Analytics". */
  lab?: string | null;
  status: boolean;
}

interface ScheduleSummary {
  className: string;
}

interface TeacherSession {
  classroomName: string;
  substituteTeacherId: number | null;
}

interface StudentSummary {
  gender?: string;
}

export async function fetchAllClassrooms(size = 200): Promise<ClassroomSummary[]> {
  try {
    const res = await backendFetch(`/classrooms?size=${size}`);
    if (!res.ok) return [];
    return (await res.json())?.payload?.content ?? [];
  } catch {
    return [];
  }
}

export async function fetchClassCounts(
  classrooms?: Pick<ClassroomSummary, "id">[]
): Promise<Record<number, { total: number; female: number }>> {
  const list = classrooms ?? await fetchAllClassrooms();
  const entries = await Promise.all(
    list.map(async (classroom) => {
      try {
        const res = await backendFetch(`/classrooms/${classroom.id}/students?size=500`);
        if (!res.ok) return [classroom.id, { total: 0, female: 0 }] as const;
        const json = await res.json();
        const students: StudentSummary[] = json?.payload?.content ?? json?.payload ?? [];
        const female = students.filter((s) => s.gender?.toUpperCase().startsWith("F")).length;
        return [classroom.id, { total: students.length, female }] as const;
      } catch {
        return [classroom.id, { total: 0, female: 0 }] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

export async function fetchTeacherClassrooms(teacherId: string, size = 200): Promise<ClassroomSummary[]> {
  try {
    const date = new Date();
    const from = new Date(date); from.setDate(from.getDate() - 7);
    const to = new Date(date); to.setDate(to.getDate() + 30);

    const [schedRes, clsRes, sessRes] = await Promise.all([
      backendFetch(`/schedules/teachers/${teacherId}?size=${size}`),
      backendFetch(`/classrooms?size=${size}`),
      backendFetch(`/sessions/teachers/${teacherId}?from=${todayIso(from)}&to=${todayIso(to)}&size=${size}`),
    ]);
    const schedules: ScheduleSummary[] =
      (await schedRes.json())?.payload?.content ?? [];
    const classrooms: ClassroomSummary[] =
      (await clsRes.json())?.payload?.content ?? [];
    const sessions: TeacherSession[] =
      (await sessRes.json())?.payload?.content ?? [];

    const teacherClassNames = new Set(schedules.map((s) => s.className));
    const teacherIdNum = Number(teacherId);
    for (const session of sessions) {
      if (session.substituteTeacherId === teacherIdNum && session.classroomName) {
        teacherClassNames.add(session.classroomName);
      }
    }
    return classrooms.filter((c) => teacherClassNames.has(c.className));
  } catch {
    return [];
  }
}

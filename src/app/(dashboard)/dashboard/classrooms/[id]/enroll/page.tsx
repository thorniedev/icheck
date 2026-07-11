import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { backendFetch } from "@/lib/api-fetch";
import { EnrollmentClient, type StudentRow } from "@/components/enrollment-client";

interface Classroom {
  id: number;
  className: string;
  classCode: string;
  programTypeName: string;
}

async function fetchClassroom(id: string): Promise<Classroom | null> {
  try {
    const res = await backendFetch(`/classrooms/${id}`);
    if (!res.ok) return null;
    return (await res.json())?.payload ?? null;
  } catch { return null; }
}

interface EnrollmentResponse {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  studentNo: string | null;
  classroomName: string;
  status: string | null;
}

/** Students currently enrolled in this classroom, via the Enrollment table (many-to-many). */
async function fetchEnrolled(id: string): Promise<StudentRow[]> {
  try {
    const res = await backendFetch(`/classrooms/${id}/enrollments?size=500`);
    if (!res.ok) return [];
    const enrollments: EnrollmentResponse[] = (await res.json())?.payload?.content ?? [];
    return enrollments.map((e) => ({
      id: e.userId,
      studentNo: e.studentNo ?? "",
      name: e.userName,
      email: e.userEmail,
      className: e.classroomName,
      status: e.status ?? undefined,
    }));
  } catch { return []; }
}

async function fetchAllStudents(): Promise<StudentRow[]> {
  try {
    const res = await backendFetch(`/users/students?size=1000`);
    if (!res.ok) return [];
    return (await res.json())?.payload?.content ?? [];
  } catch { return []; }
}

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [classroom, enrolled, allStudents] = await Promise.all([
    fetchClassroom(id),
    fetchEnrolled(id),
    fetchAllStudents(),
  ]);
  if (!classroom) notFound();

  return (
    <div className="px-5 py-8">
      <Link
        href={`/dashboard/classrooms/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeftIcon className="size-4" />
        Back to class
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Enroll Students</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {classroom.className}
          <span className="text-muted-foreground/60 ml-2 font-mono text-xs">
            {classroom.classCode}
          </span>
        </p>
      </div>

      <EnrollmentClient
        classroomId={Number(id)}
        classroomName={classroom.className}
        initialEnrolled={enrolled}
        allStudents={allStudents}
      />
    </div>
  );
}

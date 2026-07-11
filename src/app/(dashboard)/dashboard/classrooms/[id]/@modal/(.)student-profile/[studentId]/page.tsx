import { StudentProfilePanel } from "@/components/classdetail/student-profile-panel";

export default async function StudentProfileModal({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;

  return (
    <StudentProfilePanel
      classroomId={id}
      studentId={studentId}
      mode="modal"
    />
  );
}

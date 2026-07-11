import { StudentProfilePanel } from '@/components/marketing/classdetail/student-profile-panel';

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;

  return <StudentProfilePanel classroomId={id} studentId={studentId} />;
}

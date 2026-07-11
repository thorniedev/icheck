import { TakeAttendanceQrCode } from "@/components/take-attendance-qr-code";

export default async function MyQR({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex h-screen items-center justify-center px-4 py-6">
      <TakeAttendanceQrCode
        classroomId={Number(id)}
        closeHref={`/dashboard/classrooms/${id}/take-attendance/checked_attendance`}
        qrSize="min(76vmin, calc(100vw - 4rem), calc(100vh - 12rem))"
        logoSize={220}
      />
    </main>
  );
}

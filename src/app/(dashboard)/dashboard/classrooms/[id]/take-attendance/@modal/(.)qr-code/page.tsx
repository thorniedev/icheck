import { Modal } from "@/components/modal";
import { TakeAttendanceQrCode } from "@/components/take-attendance-qr-code";

export default async function PopupQRCode({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Modal
      className="h-screen max-h-screen max-w-none rounded-none px-4 py-4 sm:max-w-none"
      closeButtonClassName="top-5 right-5 size-14 rounded-full bg-background/90 shadow-md hover:bg-muted [&_svg]:size-8"
    >
      <TakeAttendanceQrCode
        classroomId={Number(id)}
        closeHref={`/dashboard/classrooms/${id}/take-attendance/checked_attendance`}
      />
    </Modal>
  );
}

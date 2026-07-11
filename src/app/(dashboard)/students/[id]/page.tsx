export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-5 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
        Student #{params.id}
      </h1>
    </div>
  );
}

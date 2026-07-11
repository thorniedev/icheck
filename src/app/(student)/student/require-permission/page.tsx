import RequirePermissionForm from '@/components/marketing/form/requireStudentForm';

export default function RequirePermissionPage() {
  return (
    <main className="px-3 py-4 sm:px-6 lg:px-7">
      <section className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-4 sm:p-6">
        <RequirePermissionForm />
      </section>
    </main>
  );
}

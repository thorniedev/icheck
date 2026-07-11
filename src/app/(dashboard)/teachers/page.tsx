import { getServerUser } from "@/auth-server";
import { redirect } from "next/navigation";
import { TeachersView } from "@/components/teachers-view";

/**
 * Admin-only Teachers page — full CRUD over /api/v1/users/lecturers.
 * Non-admins are redirected to /dashboard.
 */
export default async function TeachersPage() {
  const user = await getServerUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="px-4 sm:px-5 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Teachers</h1>
            <p className="text-sm text-muted-foreground">
              Manage lecturer accounts. register, edit, or remove teachers.
            </p>
          </div>
        </div>
      </div>

      <TeachersView />
    </div>
  );
}

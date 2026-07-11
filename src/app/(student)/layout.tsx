import { getServerUser } from "@/auth-server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/common/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OAUTH2_LOGIN_URL } from "@/lib/api-config";
import { backendFetch } from "@/lib/api-fetch";

type OnboardingStatus = {
  needsOnboarding?: boolean;
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) redirect(OAUTH2_LOGIN_URL);
  if (user && user.role !== "STUDENT") redirect("/dashboard");

  let needsOnboarding = false;
  try {
    const response = await backendFetch("/onboarding/status");
    if (response.ok) {
      const status = (await response.json()) as OnboardingStatus;
      needsOnboarding = Boolean(status.needsOnboarding);
    }
  } catch {
    // Keep existing student dashboard behavior if the onboarding probe is unavailable.
  }
  if (needsOnboarding) redirect("/onboarding");

  const displayUser = {
    name:        user?.name  ?? "",
    email:       user?.email ?? "",
    role:        user?.role  ?? "STUDENT",
    displayRole: user?.displayRole ?? "Student",
    profileImage: user?.profileImage ?? null,
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={displayUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

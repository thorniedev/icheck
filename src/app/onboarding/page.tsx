import { redirect } from "next/navigation";
import { getServerUser } from "@/auth-server";
import { LogoWordmark } from "@/components/common/logo";
import { backendFetch } from "@/lib/api-fetch";
import { OAUTH2_LOGIN_URL } from "@/lib/api-config";
import { OnboardingForm } from "./onboarding-form";

type OnboardingStatus = {
  needsOnboarding?: boolean;
};

export default async function OnboardingPage() {
  const user = await getServerUser();

  if (!user) redirect(OAUTH2_LOGIN_URL);

  let onboardingComplete = false;
  try {
    const response = await backendFetch("/onboarding/status");
    if (response.ok) {
      const status = (await response.json()) as OnboardingStatus;
      onboardingComplete = status.needsOnboarding === false;
    }
  } catch {
    // If the status check fails, keep the onboarding form available so the user is not trapped.
  }
  if (onboardingComplete) redirect(user.role === "STUDENT" ? "/student" : "/dashboard");

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section>
          <LogoWordmark height={44} />
          <p className="mt-10 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
            Organization setup
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight">
            Create your iCheck workspace
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            Your account is ready. Add your school or training center details and start the 30-day trial.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <OnboardingForm email={user.email ?? ""} />
        </section>
      </div>
    </main>
  );
}

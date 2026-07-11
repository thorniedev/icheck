import Link from "next/link";
import type React from "react";
import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  FingerprintIcon,
  LockKeyholeIcon,
  MapPinIcon,
  QrCodeIcon,
  RadioIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/common/logo";
import { cn } from "@/lib/utils";

const features = [
  { title: "QR Attendance", description: "Static and dynamic QR sessions for fast classroom check-ins.", icon: QrCodeIcon },
  { title: "GPS Validation", description: "Location checks help keep attendance tied to the actual classroom.", icon: MapPinIcon },
  { title: "Device Control", description: "Student device binding reduces shared-login and proxy attendance risk.", icon: FingerprintIcon },
  { title: "Live Monitoring", description: "Teachers see check-ins update while the session is running.", icon: RadioIcon },
  { title: "Telegram Alerts", description: "Classroom groups receive session alerts and attendance summaries.", icon: BellRingIcon },
  { title: "Reports", description: "Attendance scoring, eligibility warnings, PDF, and Excel-ready exports.", icon: FileSpreadsheetIcon },
];

const plans = [
  { name: "Starter", price: "$29", detail: "For small programs", points: ["300 students", "20 teachers", "20 classes", "Report exports"] },
  { name: "School", price: "$99", detail: "For growing institutes", points: ["1,500 students", "100 teachers", "Telegram alerts", "Report exports"] },
  { name: "Enterprise", price: "Custom", detail: "For multi-campus operations", points: ["High limits", "Custom support", "Advanced controls", "Priority rollout"] },
];

const stats = [
  ["40m", "GPS radius"],
  ["30d", "Free trial"],
  ["10%", "Attendance weight"],
  ["Live", "Session updates"],
];

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center" aria-label="iCheck home">
          <LogoWordmark height={38} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/features" className="transition hover:text-slate-950">Features</Link>
          <Link href="/pricing" className="transition hover:text-slate-950">Pricing</Link>
          <Link href="/security" className="transition hover:text-slate-950">Security</Link>
          <Link href="/contact" className="transition hover:text-slate-950">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden text-slate-900 hover:bg-slate-100 sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="bg-[#253c95] px-4 text-white hover:bg-[#1f317a]">
            <Link href="/api/auth/login?mode=signup">Start free trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProductMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "mx-auto mt-10 w-full max-w-[680px]" : "w-[680px]"}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#ffbd2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            iCheck workspace
          </div>
        </div>
        <div
          className={cn(
            "grid min-h-[430px] bg-white",
            compact ? "grid-cols-1 sm:grid-cols-[180px_1fr]" : "grid-cols-[180px_1fr]",
          )}
        >
          <aside className={cn("border-r border-slate-200 bg-slate-50/80 p-5", compact && "hidden sm:block")}>
            <LogoWordmark height={30} />
            <div className="mt-8 space-y-3 text-sm font-medium">
              {["Dashboard", "Classes", "Schedule", "Reports"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-xl px-3 py-3 ${index === 1 ? "bg-[#253c95] text-white" : "text-slate-500"}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <section className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase text-[#253c95]">Today</p>
                <h3 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">Active attendance</h3>
                <p className="mt-1 text-sm text-slate-500">Foundation Gen 2 Afternoon</p>
              </div>
              <div className="rounded-2xl bg-[#253c95] px-5 py-3 text-sm font-semibold text-white">
                Start Session
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-4">
              {[
                ["Present", "35", "text-emerald-600"],
                ["Late", "10", "text-amber-600"],
                ["Permission", "5", "text-sky-600"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
              {[
                ["Net Pisoth", "Present", "bg-emerald-50 text-emerald-700"],
                ["Moung Meyneang", "Late", "bg-amber-50 text-amber-700"],
                ["Nhim Puthyseth", "Permission", "bg-sky-50 text-sky-700"],
                ["Kim Chanthorn", "Present", "bg-emerald-50 text-emerald-700"],
              ].map(([name, status, tone]) => (
                <div key={name} className="flex items-center justify-between border-b border-slate-100 px-4 py-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-slate-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">Student</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f7f9fd] pt-18 text-slate-950">
      <div className="absolute inset-x-0 top-18 h-px bg-slate-200" />
      <div className="absolute right-[max(1.25rem,calc((100vw-80rem)/2))] top-42 hidden xl:block">
        <ProductMockup />
      </div>
      <div className="mx-auto min-h-[780px] max-w-7xl px-5 py-20 md:py-28">
        <div className="relative z-10 max-w-[560px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <ShieldCheckIcon className="size-4 text-[#253c95]" />
            30-day free trial for schools and training centers
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-[1.02] tracking-normal text-slate-950 md:text-6xl lg:text-[68px]">
            Smart attendance, built for real classrooms
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Run QR attendance with GPS and device validation, teacher dashboards, student requests, Telegram alerts, and audit-ready reports.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 bg-[#253c95] px-6 text-base text-white hover:bg-[#1f317a]">
              <Link href="/api/auth/login?mode=signup">
                Start free trial
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 bg-white px-6 text-base text-slate-900">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-2xl font-bold tracking-normal text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:hidden">
          <ProductMockup compact />
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase text-[#253c95]">Platform</p>
            <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">Everything attendance teams expect</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Built for repeated daily use by admins, teachers, and students.
            </p>
          </div>
          <Button asChild variant="outline" className="border-slate-300 bg-white">
            <Link href="/features">Explore features</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#253c95]">
                <feature.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-normal text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-slate-200 bg-[#f7f9fd]">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-24 md:grid-cols-3">
        {[
          [UsersRoundIcon, "Create organization", "Sign up, create your school workspace, and start the trial."],
          [CalendarClockIcon, "Set classes", "Invite teachers, add students, schedules, policies, and Telegram groups."],
          [SparklesIcon, "Run attendance", "Teachers start sessions, students scan, and reports stay auditable."],
        ].map(([Icon, title, description]) => (
          <div key={title as string} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#253c95]">
              <Icon className="size-6" />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-normal text-slate-950">{title as string}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description as string}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-[#253c95]">Pricing</p>
            <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">Plans that grow with your institute</h2>
            <p className="mt-4 text-lg text-slate-600">Start with a free trial. Upgrade when your team is ready.</p>
          </div>
          <Button asChild variant="outline" className="border-slate-300 bg-white">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-7 shadow-sm ${index === 1 ? "border-[#253c95] bg-[#253c95] text-white" : "border-slate-200 bg-white text-slate-950"}`}
            >
              <h3 className="text-2xl font-bold tracking-normal">{plan.name}</h3>
              <p className={`mt-2 text-sm ${index === 1 ? "text-white/75" : "text-slate-600"}`}>{plan.detail}</p>
              <div className="mt-7 text-4xl font-bold tracking-normal">
                {plan.price}<span className={`text-sm font-normal ${index === 1 ? "text-white/70" : "text-slate-500"}`}> / month</span>
              </div>
              <ul className={`mt-7 space-y-3 text-sm ${index === 1 ? "text-white/85" : "text-slate-600"}`}>
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <CheckCircle2Icon className={`mt-0.5 size-4 ${index === 1 ? "text-white" : "text-[#253c95]"}`} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="border-y border-slate-200 bg-[#f7f9fd]">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <LockKeyholeIcon className="size-9 text-[#253c95]" />
            <h2 className="mt-5 text-4xl font-bold tracking-normal text-slate-950">Designed for school data boundaries</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Keycloak authentication, role-based access, organization isolation, audit logs, HTTPS, and secure file storage form the SaaS security baseline.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Tenant data isolation", "Keycloak OAuth2/JWT", "Role-based access", "Audit-ready reports"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-800 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-5 py-24">
        <h2 className="text-4xl font-bold tracking-normal text-slate-950">FAQ</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white shadow-sm">
          {[
            ["Can we use our own Telegram groups?", "Yes. Each class can connect to a different Telegram group."],
            ["Does iCheck support static and dynamic QR?", "Yes. Static QR supports classroom check-in and dynamic QR supports teacher-started sessions."],
            ["Can policies change later?", "Yes. Reports snapshot attendance policy values so old reports stay stable."],
          ].map(([q, a]) => (
            <div key={q} className="p-6">
              <h3 className="font-bold tracking-normal text-slate-950">{q}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-white px-5 pb-24">
      <div className="mx-auto max-w-7xl rounded-[32px] bg-[#253c95] p-8 text-white shadow-[0_30px_80px_rgba(37,60,149,0.24)] md:p-12">
        <h2 className="max-w-3xl text-4xl font-bold tracking-normal">Start your iCheck workspace</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">
          Create your organization, invite your team, and run your first attendance flow during the free trial.
        </p>
        <Button asChild variant="secondary" className="mt-8 bg-white text-[#253c95] hover:bg-slate-100">
          <Link href="/api/auth/login?mode=signup">Start free trial</Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <LogoWordmark height={30} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p>QR attendance, reporting, and alerts for modern classrooms.</p>
          <Link href="/privacy" className="transition hover:text-slate-950">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-slate-950">
            Terms
          </Link>
          <Link href="/data-deletion" className="transition hover:text-slate-950">
            Data deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function MarketingHome() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />
      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <PricingSection />
      <SecuritySection />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

export function MarketingPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-36">
        <h1 className="text-5xl font-bold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
      </section>
      {children}
      <CTA />
      <Footer />
    </main>
  );
}

export { features, plans, FeatureGrid, PricingSection, SecuritySection };

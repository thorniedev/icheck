import type { Metadata } from "next";
import { LockKeyholeIcon } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | iCheck",
  description: "Privacy policy for the iCheck attendance platform.",
};

const sections = [
  {
    title: "Information we collect",
    body: "iCheck may collect account information, organization information, classroom data, attendance records, profile images, device identifiers used for attendance validation, approximate location data during check-in, and authentication information from login providers such as Keycloak, Google, or Facebook.",
  },
  {
    title: "How we use information",
    body: "We use this information to authenticate users, manage classroom attendance, validate check-ins, generate reports, provide notifications, support account administration, and improve platform security.",
  },
  {
    title: "How we protect information",
    body: "iCheck uses role-based access, tenant data boundaries, HTTPS, secure authentication, audit records, and controlled storage access to protect school and user data.",
  },
  {
    title: "Data sharing",
    body: "We do not sell user data. We only share data with trusted service providers needed to operate iCheck, such as authentication, storage, hosting, or notification services.",
  },
  {
    title: "Data deletion",
    body: "Users may request deletion of their account and authentication-linked data by following the instructions on the iCheck data deletion page.",
  },
];

export default function PrivacyPage() {
  return (
    <MarketingPage
      title="Privacy Policy"
      description="This policy explains what iCheck collects, how it is used, and how users can request deletion of their data."
    >
      <section className="bg-[#f7f9fd]">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
            <LockKeyholeIcon className="size-10 text-[#253c95]" />
            <p className="mt-6 text-sm font-semibold uppercase text-slate-500">
              Effective date: June 22, 2026
            </p>
            <div className="mt-8 space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="text-xl font-bold tracking-normal text-slate-950">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              For privacy questions, contact{" "}
              <a
                href="mailto:kimchanthon46@gmail.com"
                className="font-semibold text-[#253c95] underline-offset-4 hover:underline"
              >
                kimchanthon46@gmail.com
              </a>
              .
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}

import type { Metadata } from "next";
import { CheckCircle2Icon, MailIcon, ShieldOffIcon } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Data Deletion | iCheck",
  description: "Instructions for requesting deletion of iCheck account and Facebook login data.",
};

export default function DataDeletionPage() {
  return (
    <MarketingPage
      title="Data Deletion"
      description="iCheck gives users a clear way to request deletion of account data, authentication data, and profile information."
    >
      <section className="bg-[#f7f9fd]">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
            <ShieldOffIcon className="size-10 text-[#253c95]" />
            <h2 className="mt-6 text-3xl font-bold tracking-normal text-slate-950">
              How to request data deletion
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              If you signed in to iCheck using Facebook, Google, or email and want your
              account data deleted, send a request to our support email.
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <MailIcon className="mt-1 size-5 text-[#253c95]" />
                <div>
                  <p className="font-bold text-slate-950">Email</p>
                  <a
                    href="mailto:kimchanthon46@gmail.com?subject=Delete%20my%20iCheck%20data"
                    className="mt-1 inline-block text-[#253c95] underline-offset-4 hover:underline"
                  >
                    kimchanthon46@gmail.com
                  </a>
                  <p className="mt-2 text-sm text-slate-600">
                    Use the subject line: Delete my iCheck data
                  </p>
                </div>
              </div>
            </div>

            <ol className="mt-8 space-y-4">
              {[
                "Send an email from the address connected to your iCheck account.",
                "Include your full name and the login provider you used, such as Facebook, Google, or email.",
                "We will verify the request and delete your account data, profile data, and authentication-linked data from iCheck.",
                "Deletion requests are processed within 7 business days after verification.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950">Remove iCheck from Facebook</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You can also remove iCheck from your Facebook account by opening
                Facebook Settings, then Apps and Websites, selecting iCheck, and
                choosing Remove.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}

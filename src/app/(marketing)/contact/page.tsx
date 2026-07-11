import Link from "next/link";
import { MailIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <MarketingPage
      title="Contact"
      description="Talk with the iCheck team about rollout, pricing, migration, or a pilot for your institute."
    >
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-3">
        {[
          {
            title: "Email",
            detail: "hello@icheck.today",
            icon: MailIcon,
            href: "mailto:hello@icheck.today",
          },
          {
            title: "Sales",
            detail: "Plan a school rollout",
            icon: PhoneIcon,
            href: "/api/auth/login?mode=signup",
          },
          {
            title: "Support",
            detail: "Get setup help",
            icon: MessageCircleIcon,
            href: "mailto:support@icheck.today",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-card p-6">
            <item.icon className="size-6 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href={item.href}>Open</Link>
            </Button>
          </div>
        ))}
      </section>
    </MarketingPage>
  );
}

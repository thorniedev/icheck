import { MarketingPage, PricingSection } from "@/components/marketing/marketing-shell";

export default function PricingPage() {
  return (
    <MarketingPage
      title="Pricing"
      description="Choose a plan for your institute, start with a 30-day trial, and upgrade when your team is ready."
    >
      <PricingSection />
    </MarketingPage>
  );
}

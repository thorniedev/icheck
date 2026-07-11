import { FeatureGrid, MarketingPage, SecuritySection } from "@/components/marketing/marketing-shell";

export default function FeaturesPage() {
  return (
    <MarketingPage
      title="Features"
      description="QR attendance, validation controls, dashboards, reports, and alerts built for modern schools."
    >
      <FeatureGrid />
      <SecuritySection />
    </MarketingPage>
  );
}
